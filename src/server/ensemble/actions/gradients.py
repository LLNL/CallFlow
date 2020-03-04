import numpy as np
from scipy import stats
import statsmodels.nonparametric.api as smnp
import matplotlib.pyplot as plt
import math

class KDE_gradients:
    def __init__(self, states, binCount="20"):
        self.states = states
        self.binCount = binCount

        # Find the rank information.
        self.num_of_ranks = {}
        max_ranks = 0
        for state in states:
            self.num_of_ranks[state] = len(self.states[state].df["rank"].unique())
            max_ranks = max(max_ranks, self.num_of_ranks[state])
        self.max_ranks = max_ranks


    def iqr(self, arr):
        """Calculate the IQR for an array of numbers."""
        a = np.asarray(arr)
        self.q1 = stats.scoreatpercentile(a, 25)
        self.q2 = stats.scoreatpercentile(a, 50)
        self.q3 = stats.scoreatpercentile(a, 75)


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

    def kde(
        self,
        data,
        gridsize=10,
        fft=True,
        kernel="gau",
        bw="scott",
        cut=3,
        clip=(-np.inf, np.inf),
    ):
        if bw == "scott":
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

    def histogram(self, data):
        h, b = np.histogram(data, range=[0, data.max()], bins=int(self.binCount))
        return 0.5 * (b[1:] + b[:-1]), h

    def clean_dict(self, in_dict):
        ret = {k: in_dict[k] for k in in_dict if not math.isnan(in_dict[k])}
        return np.array(tuple(ret))

    def packByRankDistribution(self, df, metric):
        ret = {}
        if df.empty:
            ret = dict((rank,0) for rank in range(0, self.max_ranks))
        else:
            ranks = df['rank'].tolist()
            metric_vals = df[metric].tolist()
            ret = dict(zip(ranks, metric_vals))
        return ret

    def get_runtime_data(self, df, column_name):
        time_df = df[column_name]
        time_list = time_df.tolist()

        if len(time_list) == 0:
            time_list = [0] * self.max_ranks

        ret = self.packByRankDistribution(df, column_name)
        return ret

    def run(self, columnName='name', callsiteOrModule='', targetDataset=''):
        dist_inc = {}
        dist_exc = {}
        mean_inc_dist = {}
        max_inc_dist = {}
        mean_exc_dist = {}
        max_exc_dist = {}
        mean_time_inc_map = {}
        num_of_bins = {}
        kde_grid = {}
        hist_inc_grid = {}
        hist_exc_grid = {}

        # Get the runtimes for all the runs.
        for idx, state in enumerate(self.states):
            if state != "ensemble":
                node_df = self.states[state].df.loc[
                    (self.states[state].df[columnName] == callsiteOrModule)
                ]

                dist_inc[state] = self.get_runtime_data(node_df, 'time (inc)')
                dist_exc[state] = self.get_runtime_data(node_df, 'time')

        #         mean_inc_dist[state] = np.mean(dist_inc[state])
        #         max_inc_dist[state] = np.max(dist_inc[state])

        #         mean_exc_dist[state] = mean_time
        #         max_exc_dist[state] = max_time

        # # calculate mean runtime.
        # np_mean_inc_dist = self.clean_dict(mean_inc_dist).values()
        # np_mean_exc_dist = self.clean_dict(mean_exc_dist).values()

        # np_max_inc_dist = self.clean_dict(max_inc_dist).values()
        # np_max_exc_dist = self.clean_dict(max_exc_dist).values()

        # convert the dictionary of values to list of values.
        dist_inc_list = self.convert_dictmean_to_list(dist_inc)
        dist_exc_list = self.convert_dictmean_to_list(dist_exc)

        # Calculate appropriate number of bins automatically.
        num_of_bins = self.binCount

        hist_inc_grid = self.histogram(np.array(dist_inc_list))
        hist_exc_grid = self.histogram(np.array(dist_exc_list))

        # max_num_of_bins = min(self.freedman_diaconis_bins(np.array(dist_list)), 50)

        # Calculate the KDE grid (x, y)
        # kde_grid[vis_node_name] = self.kde(np.array(dist_list), 10)
        # kde_x_min = np.min(kde_grid[vis_node_name][0])
        # kde_x_max = np.max(kde_grid[vis_node_name][0])
        # kde_y_min = np.min(kde_grid[vis_node_name][1])
        # kde_y_max = np.max(kde_grid[vis_node_name][1])

        # print("hist ranges = {} {} {} {}\n"
        #     .format(hist_x_min, hist_x_max, hist_y_min, hist_y_max))

        results = {
            "Inclusive": {
                "dist": dist_inc,
                "mean": mean_inc_dist,
                "max": max_inc_dist,
                "bins": num_of_bins,
                # "kde": {
                #     "x": kde_grid[vis_node_name][0].tolist(),
                #     "y": kde_grid[vis_node_name][1].tolist(),
                #     "x_min": kde_x_min,
                #     "x_max": kde_x_max,
                #     "y_min": kde_y_min,
                #     "y_max": kde_y_max,
                # },
                "hist": {
                    "x": hist_inc_grid[0].tolist(),
                    "y": hist_inc_grid[1].tolist(),
                    "x_min": hist_inc_grid[0][0],
                    "x_max": hist_inc_grid[0][-1],
                    "y_min": np.min(hist_inc_grid[1]).astype(np.float64),
                    "y_max": np.max(hist_inc_grid[1]).astype(np.float64),
                },
            },
            "Exclusive": {
                "dist": dist_exc,
                "mean": mean_exc_dist,
                "max": max_exc_dist,
                "bins": num_of_bins,
                # "kde": {
                #     "x": kde_grid[vis_node_name][0].tolist(),
                #     "y": kde_grid[vis_node_name][1].tolist(),
                #     "x_min": kde_x_min,
                #     "x_max": kde_x_max,
                #     "y_min": kde_y_min,
                #     "y_max": kde_y_max,
                # },
                "hist": {
                    "x": hist_exc_grid[0].tolist(),
                    "y": hist_exc_grid[1].tolist(),
                    "x_min": hist_inc_grid[0][0],
                    "x_max": hist_inc_grid[0][-1],
                    "y_min": np.min(hist_inc_grid[1]).astype(np.float64),
                    "y_max": np.max(hist_inc_grid[1]).astype(np.float64),
                },
            },
        }

        return results