import numpy as np
from scipy import stats
import statsmodels.nonparametric.api as smnp
import math

class KDE_gradients:
    def __init__(self, states):
        self.states = states
        self.nodes = states['calc-pi'].g.nodes()
        self.results = self.run()

    def iqr(self, arr):
        """Calculate the IQR for an array of numbers."""
        a = np.asarray(arr)
        q1 = stats.scoreatpercentile(a, 25)
        q3 = stats.scoreatpercentile(a, 75)
        return q3 - q1

    def freedman_diaconis_bins(self, arr):
        """Calculate number of hist bins using Freedman-Diaconis rule."""
        # From https://stats.stackexchange.com/questions/798/
        a = np.asarray(arr)
        if len(arr) < 2:
            return 1
        h = 2 * self.iqr(arr) / (len(arr) ** (1 / 3))
        # fall back to sqrt(a) bins if iqr is 0
        if h == 0:
            return int(np.sqrt(arr.size))
        else:
            return int(np.ceil((arr.max() - arr.min()) / h))

    def kde(self, data, gridsize=10, fft=True, kernel='gau', bw='scott', cut=3, clip=(-np.inf, np.inf)):
        # if(gridsize < 10):
        gridsize = 500
        
        print("Data is ", data)
        
        # assign binwidth using scott's factor
        if bw == 'scott':
            bw = stats.gaussian_kde(data).scotts_factor() * data.std(ddof=1)
        print("biwidth is: ", bw)    
        
        kde = smnp.KDEUnivariate(data)
        kde_gau = stats.gaussian_kde(data, bw_method=bw)
        
        # create the grid to fit the estimation.
        # clip = (0, data.max())
        # print(clip)
        support_min = max(data.min() - bw * cut, clip[0])
        support_max = min(data.max() + bw * cut, clip[1])
        # support_min = max(0, clip[0])
        # support_max = min(data.max(), clip[1])
        grid = np.linspace(support_min, support_max, gridsize)
        # clip = (support_min, support_max)
        print("Grid is: ", grid.shape)
        
        kde.fit("gau", bw, fft, gridsize=gridsize, cut=cut, clip=clip)
        y = kde.density
        print("Y is: ", y.shape)
        x = grid
                
        return grid, y
 
    def replace_nan_with_zero(self, arr):
        print("Before removing NaNs", arr)
        if math.isnan(arr):
            return 0.0
        else:
            return arr

    def clean_dict(self, in_dict):
        ret = {k: in_dict[k] for k in in_dict if not math.isnan(in_dict[k])}
        return ret

    def run(self):
        results = {}
        num_of_bins = {}
        kde_grid = {}
        data_max = {}

        # Calculate for each module
        for node in self.nodes:
            dist = {}
            mean_dist = {}
            module = node.split('+')[0]
            function = node.split('+')[1]
            data_max[node] = 0

            # Get the runtimes for all the runs. 
            for idx, state in enumerate(self.states):
                time_inc_df = self.states[state].df.loc[(self.states[state].df['module'] == module) & (self.states[state].df['name'] == function)]['time (inc)'].mean()
                time_inc_df = self.replace_nan_with_zero(time_inc_df)
                dist[state] = time_inc_df

                mean_dist[state] = np.mean(time_inc_df)
                    # data_max[node] = np.max(int(data_max[node]), time_inc_df )

            # calculate mean runtime. 
            np_mean_dist = np.array(tuple(self.clean_dict(mean_dist).values()))
            
            # Calculate appropriate number of bins automatically. 
            num_of_bins[node] = min(self.freedman_diaconis_bins(np_mean_dist), 50)
 
            # Calculate the KDE grid (x, y)
            kde_grid[node] = self.kde(np_mean_dist, num_of_bins[node])
            y_min = np.min(kde_grid[node][1])
            y_max = np.max(kde_grid[node][1])
            print("KDE _ y: ", kde_grid[node][1].tolist()   )
            
            
            results[node] = {
                "dist": dist,
                "mean_dist": mean_dist, 
                "bins": num_of_bins,
                "kde_x": kde_grid[node][0].tolist(),
                "kde_y": kde_grid[node][1].tolist(),
                "kde_y_min": y_min,
                "kde_y_max": y_max,
                "data_min": 0,
                "data_max": 999560
            }
        return results


