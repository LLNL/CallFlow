# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------
import math
import numpy as np
from scipy import stats
import statsmodels.nonparametric.api as smnp

# ------------------------------------------------------------------------------
class Gradients:
    def __init__(self, dfs, binCount="20"):
        self.dfs = dfs
        self.binCount = binCount

        # Find the rank information.
        self.num_of_ranks = {}
        max_ranks = 0
        for dataset in self.dfs:
            self.num_of_ranks[dataset] = len(self.dfs[dataset]["rank"].unique())
            max_ranks = max(max_ranks, self.num_of_ranks[dataset])
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
        mean = []
        dataset = {}
        for state in dictionary:
            d = list(dictionary[state].values())
            # ret.append(max(d))
            mean.append(np.mean(np.array(d)))
            dataset[state] = np.mean(np.array(d))
        return [mean, dataset]

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

        kde = smnp.KDEUnivariate(data)

        # create the grid to fit the estimation.
        support_min = min(max(data.min() - bw * cut, clip[0]), 0)
        support_max = min(data.max() + bw * cut, clip[1])
        x = np.linspace(support_min, support_max, gridsize)

        kde.fit("gau", bw, fft, gridsize=gridsize, cut=cut, clip=clip)
        y = kde.density

        return x, y

    def histogram(self, data, dataset_dict={}, data_min=np.nan, data_max=np.nan):
        if np.isnan(data_min) or np.isnan(data_max):
            data_min = data.min()
            data_max = data.max()

        h, b = np.histogram(data, range=[data_min, data_max], bins=int(self.binCount))

        # Map the datasets to their histogram indexes.
        dataset_position_dict = {}
        for dataset in dataset_dict:
            mean = dataset_dict[dataset]
            for idx, x in np.ndenumerate(b):
                if x > float(mean):
                    dataset_position_dict[dataset] = idx[0] - 1
                    break
                if idx[0] == len(b) - 1:
                    dataset_position_dict[dataset] = len(b) - 2

        return 0.5 * (b[1:] + b[:-1]), h, dataset_position_dict

    def clean_dict(self, in_dict):
        ret = {k: in_dict[k] for k in in_dict if not math.isnan(in_dict[k])}
        return np.array(tuple(ret))

    def packByRankDistribution(self, df, metric):
        ret = {}
        if df.empty:
            ret = dict((rank, 0) for rank in range(0, self.max_ranks))
        else:
            ranks = df["rank"].tolist()
            metric_vals = df[metric].tolist()
            # metric_vals = df.groupby("rank").max()[metric].tolist()
            ret = dict(zip(ranks, metric_vals))
        return ret

    def get_runtime_data(self, df, column_name, debug=False):
        time_df = df[column_name]
        time_list = time_df.tolist()

        if len(time_list) == 0:
            time_list = [0] * self.max_ranks

        ret = self.packByRankDistribution(df, column_name)
        return ret

    def run(self, columnName="name", callsiteOrModule="", targetDataset=""):
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
        for idx, dataset in enumerate(self.dfs):
            node_df = self.dfs[dataset].loc[
                (self.dfs[dataset][columnName] == callsiteOrModule)
            ]
            debug = False
            dist_inc[dataset] = self.get_runtime_data(node_df, "time (inc)", debug)
            dist_exc[dataset] = self.get_runtime_data(node_df, "time", debug)

        # convert the dictionary of values to list of values.
        temp_inc = self.convert_dictmean_to_list(dist_inc)
        dist_inc_list = temp_inc[0]
        dataset_inc_list = temp_inc[1]

        temp_exc = self.convert_dictmean_to_list(dist_exc)
        dist_exc_list = temp_exc[0]
        dataset_exc_list = temp_exc[1]

        # Calculate appropriate number of bins automatically.
        num_of_bins = self.binCount

        hist_inc_grid = self.histogram(np.array(dist_inc_list), dataset_inc_list)
        hist_exc_grid = self.histogram(np.array(dist_exc_list), dataset_exc_list)

        # max_num_of_bins = min(self.freedman_diaconis_bins(np.array(dist_list)), 50)

        # Calculate the KDE grid (x, y)
        # kde_grid[vis_node_name] = self.kde(np.array(dist_list), 10)
        # kde_x_min = np.min(kde_grid[vis_node_name][0])
        # kde_x_max = np.max(kde_grid[vis_node_name][0])
        # kde_y_min = np.min(kde_grid[vis_node_name][1])
        # kde_y_max = np.max(kde_grid[vis_node_name][1])

        results = {
            "Inclusive": {
                "bins": num_of_bins,
                "dataset": {"mean": dataset_inc_list, "position": hist_inc_grid[2]},
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
                "bins": num_of_bins,
                "dataset": {"mean": dataset_exc_list, "position": hist_exc_grid[2]},
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
                    "x_min": hist_exc_grid[0][0],
                    "x_max": hist_exc_grid[0][-1],
                    "y_min": np.min(hist_exc_grid[1]).astype(np.float64),
                    "y_max": np.max(hist_exc_grid[1]).astype(np.float64),
                },
            },
        }

        return results
