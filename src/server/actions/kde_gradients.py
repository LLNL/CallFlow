import numpy as np
from scipy import stats
import statsmodels.nonparametric.api as smnp
import math

class KDE_gradients:
    def __init__(self, states):
        self.states = states
        self.modules = states['calc-pi'].df['module'].unique()
        print(self.modules)
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

    def kde(self, data, fft=True, kernel='gau', bw='scott', gridsize=100, cut=3, clip=(-np.inf, np.inf)):
        kde = smnp.KDEUnivariate(data)
        kde.fit(kernel, bw, fft, gridsize=gridsize, cut=cut, clip=clip)
        cumulative = False
        if cumulative:
            grid, y = kde.support, kde.cdf
        else:
            grid, y = kde.support, kde.density
        return (grid, y)

    def remove_nan(self, arr):
        ret = []
        for idx, elem in enumerate(arr):
            if (math.isnan(elem)):
                print('yes')
                ret.append(0.0)
            else:
                ret.append(elem)
        return ret

    def run(self):
        results = {}
        num_of_bins = {}
        kde_grid = {}

        # Calculate for each module
        for module in self.modules:
            dist = {}
            mean_dist = {}

            # Get the runtimes for all the runs. 
            for idx, state in enumerate(self.states):
                time_inc_df = self.states[state].df.loc[self.states[state].df['module'] == module]['time (inc)'].tolist()
                time_inc_df = self.remove_nan(time_inc_df)
                dist[state] = time_inc_df
                mean_dist[state] = np.mean(time_inc_df)
            print(module, mean_dist)
  
            # calculate mean runtime. 
            np_mean_dist = np.array(tuple(mean_dist.values()))
            print(np_mean_dist)
            
            # Calculate appropriate number of bins automatically. 
            num_of_bins[module] = self.freedman_diaconis_bins(np_mean_dist)
 
            # Calculate the KDE grid (x, y)
            kde_grid[module] = self.kde(np_mean_dist)
            
            results[module] = {
                "dist": dist,
                "mean_dist": mean_dist, 
                "bins": num_of_bins,
                "kde_x": kde_grid[module][0],
                "kde_y": kde_grid[module][1]
            }
        return results


