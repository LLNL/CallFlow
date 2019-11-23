import numpy as np
from scipy import stats
import statsmodels.nonparametric.api as smnp
import matplotlib.pyplot as plt
import math

class KDE_gradients:
    def __init__(self, states):
        self.states = states
        self.nodes = states['union_graph'].g.nodes()
        self.results = self.run()

    def iqr(self, arr):
        """Calculate the IQR for an array of numbers."""
        a = np.asarray(arr)
        self.q1 = stats.scoreatpercentile(a, 25)
        self.q2 = stats.scoreatpercentile(a, 50)
        self.q3 = stats.scoreatpercentile(a, 75)

    def dist(self, df):
        ret = {}
        if df.empty:
            for i in range(0, self.num_of_ranks):
                ret[i] = 0.0
        else:
            for idx, row in df.iterrows():
                rank = int(row['rank'])
                ret[rank] = float(row["time (inc)"])
        return ret

    def freedman_diaconis_bins(self, arr):
        """Calculate number of hist bins using Freedman-Diaconis rule."""
        # From https://stats.stackexchange.com/questions/798/
        a = np.asarray(arr)
        if len(arr) < 2:
            return 1
        # Calculate the iqr ranges.
        self.iqr(arr)
        # Calculate the h
        h = 2 * (self.q3 - self.q1) / (len(arr) ** (1 / 3))
        # fall back to sqrt(a) bins if iqr is 0
        if h == 0:
            return int(np.sqrt(arr.size))
        else:
            return int(np.ceil((arr.max() - arr.min()) / h))

    def convert_dictmean_to_list(self, dictionary):
        ret = []
        for state in dictionary:
            d = list(dictionary[state].values())
            ret.append(max(d))
            # ret.append(np.mean(np.array(d)))
        return ret


    def kde(self, data, gridsize=10, fft=True, kernel='gau', bw='scott', cut=3, clip=(-np.inf, np.inf)):
        if bw == 'scott':
            bw = stats.gaussian_kde(data).scotts_factor() * data.std(ddof=1)
        # print("biwidth is: ", bw)    
        
        kde = smnp.KDEUnivariate(data)
        
        # create the grid to fit the estimation.
        support_min = min(max(data.min() - bw * cut, clip[0]), 0)
        support_max = min(data.max() + bw * cut, clip[1])
        # print(support_max, support_min)
        x = np.linspace(support_min, support_max, gridsize)
        
        kde.fit("gau", bw, fft, gridsize=gridsize, cut=cut, clip=clip)
        y = kde.density
        # print("Y is: ", y.shape)  
                
        return x, y

    def histogram(self, data, nbins=20):
        h, b = np.histogram(data, range=[0, data.max()], bins=nbins)
        return 0.5*(b[1:]+b[:-1]), h

    def clean_dict(self, in_dict):
        ret = {k: in_dict[k] for k in in_dict if not math.isnan(in_dict[k])}
        return ret

    def run(self):
        results = {}
        num_of_bins = {}
        kde_grid = {}
        hist_grid = {}
        data_max = {}

        # Calculate for each module
        for node in self.nodes:
            dist = {}
            mean_dist = {}
            max_dist = {}
            mean_time_inc_map = {}
            module = node.split('=')[0]
            function = node.split('=')[1]
            mean_time_inc_map[node] = 0

            # Get the runtimes for all the runs. 
            for idx, state in enumerate(self.states):
                if(state != "union_graph"):
                    node_df = self.states[state].df.loc[(self.states[state].df['module'] == module) & (self.states[state].df['name'] == function)]
                    time_inc_df = node_df['time (inc)']
                    self.num_of_ranks = len(self.states[state].df['rank'].unique())
                    time_inc_list = time_inc_df.tolist()

                    if len(time_inc_list) == 0:
                        time_inc_list = [0]*self.num_of_ranks

                    mean_time_inc = np.mean(time_inc_list)
                    max_time_inc = max(time_inc_list)
                
                    # print('=================================')
                    # print("Module: {0}".format(module))
                    # print("Function: {0}".format(function))
                    # print("Time (inc): {0}".format(time_inc_df.tolist()))
                    # print("mean Time (inc): {0}".format(mean_time_inc))
                    # print("max Time (inc): {0}".format(max_time_inc)) 
                    # print('=================================')

                    mean_dist[state] = mean_time_inc
                    max_dist[state] = max_time_inc
                    dist[state] = self.dist(node_df)

            # calculate mean runtime. 
            np_mean_dist = np.array(tuple(self.clean_dict(mean_dist).values()))
            
            np_max_dist = np.array(tuple(self.clean_dict(max_dist).values()))

            # convert the dictionary of values to list of values. 
            dist_list = self.convert_dictmean_to_list(dist)        

            # Calculate appropriate number of bins automatically. 
            num_of_bins[node] = 10 
            num_of_bins[node] = min(self.freedman_diaconis_bins(np.array(dist_list)), 50)
 
            # Calculate the KDE grid (x, y)
            kde_grid[node] = self.kde(np.array(dist_list), 10)
            kde_x_min = np.min(kde_grid[node][0])
            kde_x_max = np.max(kde_grid[node][0])
            kde_y_min = np.min(kde_grid[node][1])
            kde_y_max = np.max(kde_grid[node][1])

            hist_grid[node] = self.histogram(np.array(dist_list))
            hist_x_min = hist_grid[node][0][0] #np.min(hist_grid[node][0])
            hist_x_max = hist_grid[node][0][-1] #np.max(hist_grid[node][0])
            hist_y_min = np.min(hist_grid[node][1]).astype(np.float64)
            hist_y_max = np.max(hist_grid[node][1]).astype(np.float64)
            
            # print("hist ranges = {} {} {} {}\n"
            #     .format(hist_x_min, hist_x_max, hist_y_min, hist_y_max)) 

            results[node] = {
                "dist": dist,
                "mean": mean_dist, 
                "max": max_dist,
                "bins": num_of_bins[node],
                "kde": {
                    "x": kde_grid[node][0].tolist(),
                    "y": kde_grid[node][1].tolist(),
                    "x_min": kde_x_min,
                    "x_max": kde_x_max,
                    "y_min": kde_y_min,
                    "y_max": kde_y_max,
                },
                "hist": {
                    "x": hist_grid[node][0].tolist(),
                    "y": hist_grid[node][1].tolist(),
                    "x_min": hist_x_min,
                    "x_max": hist_x_max,
                    "y_min": hist_y_min,
                    "y_max": hist_y_max,
                },
                "data_min": 0,
                "data_max": np_max_dist.tolist()
            }
        # print(results)
        return results


