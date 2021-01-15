# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

import math
import numpy as np
from scipy import stats
import statsmodels.nonparametric.api as smnp


class Gradients:
    def __init__(self, df_dict, callsite: str, binCount="20"):
        assert isinstance(callsite, str)
        self.df_dict = df_dict
        self.binCount = binCount

        # Find the rank information.
        self.num_of_ranks = {}
        max_ranks = 0
        for dataset in self.df_dict:
            self.num_of_ranks[dataset] = len(self.df_dict[dataset]["rank"].unique())
            max_ranks = max(max_ranks, self.num_of_ranks[dataset])
        self.max_ranks = max_ranks

        self.result = self.compute(columnName="name", callsiteOrModule=callsite)

    @staticmethod
    def iqr(arr):
        """Calculate the IQR for an array of numbers."""
        a = np.asarray(arr)
        q1 = stats.scoreatpercentile(a, 25)
        q2 = stats.scoreatpercentile(a, 50)
        q3 = stats.scoreatpercentile(a, 75)
        q4 = stats.scoreatpercentile(a, 100)
        return [q1, q2, q3, q4]

    @staticmethod
    def freedman_diaconis_bins(arr):
        """Calculate number of hist bins using Freedman-Diaconis rule."""
        # From https://stats.stackexchange.com/questions/798/
        if len(arr) < 2:
            return 1
        # Calculate the iqr ranges.
        [q1, q2, q3, q4] = Gradients.iqr(arr)
        # Calculate the h
        h = 2 * (q3 - q1) / (len(arr) ** (1 / 3))
        # fall back to sqrt(a) bins if iqr is 0
        if h == 0:
            return int(np.sqrt(arr.size))
        else:
            return int(np.ceil((arr.max() - arr.min()) / h))

    @staticmethod
    def convert_dictmean_to_list(dictionary):
        mean = []
        dataset = {}
        for state in dictionary:
            d = list(dictionary[state].values())
            # ret.append(max(d))
            mean.append(np.mean(np.array(d)))
            dataset[state] = np.mean(np.array(d))
        return [mean, dataset]

    @staticmethod
    def kde(
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

    @staticmethod
    def histogram(data, dataset_dict={}, data_min=np.nan, data_max=np.nan):
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

    @staticmethod
    def clean_dict(in_dict):
        # TODO: Remove, not in use
        ret = {k: in_dict[k] for k in in_dict if not math.isnan(in_dict[k])}
        return np.array(tuple(ret))

    @staticmethod
    def _pack_by_rank(df, metric):
        ret = {}
        if df.empty:
            ret = dict((rank, 0) for rank in range(0, self.max_ranks))
        else:
            ranks = df["rank"].tolist()
            metric_vals = df[metric].tolist()
            ret = dict(zip(ranks, metric_vals))
        return ret

    @staticmethod
    def get_runtime_data(df, column_name, debug=False):
        time_df = df[column_name]
        time_list = time_df.tolist()

        if len(time_list) == 0:
            time_list = [0] * self.max_ranks

        ret = Gradients._pack_by_rank(df, column_name)
        return ret

    def compute(self, columnName="name", callsiteOrModule="", targetDataset=""):
        dist_inc = {}
        dist_exc = {}
        num_of_bins = {}
        hist_inc_grid = {}
        hist_exc_grid = {}

        # Get the runtimes for all the runs.
        for idx, dataset in enumerate(self.df_dict):
            node_df = self.df_dict[dataset].loc[
                (self.df_dict[dataset][columnName] == callsiteOrModule)
            ]
            debug = False
            dist_inc[dataset] = Gradients.get_runtime_data(node_df, "time (inc)", debug)
            dist_exc[dataset] = Gradients.get_runtime_data(node_df, "time", debug)

        # convert the dictionary of values to list of values.
        temp_inc = Gradients.convert_dictmean_to_list(dist_inc)
        dist_inc_list = temp_inc[0]
        dataset_inc_list = temp_inc[1]

        temp_exc = Gradients.convert_dictmean_to_list(dist_exc)
        dist_exc_list = temp_exc[0]
        dataset_exc_list = temp_exc[1]

        # Calculate appropriate number of bins automatically.
        num_of_bins = self.binCount

        hist_inc_grid = Gradients.histogram(np.array(dist_inc_list), dataset_inc_list)
        hist_exc_grid = Gradients.histogram(np.array(dist_exc_list), dataset_exc_list)

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
