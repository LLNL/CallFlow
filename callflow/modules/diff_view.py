# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

#------------------------------------------------------------------------------
import numpy as np
import pandas as pd
from scipy import stats


#------------------------------------------------------------------------------
class DiffView:
    def __init__(self, state, dataset1, dataset2, col):
        self.state = state
        self.df1 = self.state.new_gf.df.loc[self.state.df["dataset"] == dataset1]
        self.df2 = self.state.new_gf.df.loc[self.state.df["dataset"] == dataset2]

        self.col = col
        self.dataset1 = dataset1
        self.dataset2 = dataset2

        # Calculate the max_rank.
        self.max_rank1 = len(self.df1["rank"].unique())
        self.max_rank2 = len(self.df2["rank"].unique())
        self.max_rank = max(self.max_rank1, self.max_rank2)

        self.result = self.run()

    def run(self):
        results = []
        nodes = self.state.df["module"].unique()

        for node in nodes:
            results.append(self.calculate_diff(node))

        return results

    def iqr(self, arr):
        """Calculate the IQR for an array of numbers."""
        a = np.asarray(arr)
        self.q1 = stats.scoreatpercentile(a, 25)
        self.q2 = stats.scoreatpercentile(a, 50)
        self.q3 = stats.scoreatpercentile(a, 75)

    def histogram(self, data, nbins=20):
        h, b = np.histogram(data, range=[data.min(), data.max()], bins=nbins)
        return 0.5 * (b[1:] + b[:-1]), h

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

    def insertZeroRuntime(self, arr, rank_arr):
        ret = np.zeros([self.max_rank])
        for idx, rank_idx in enumerate(rank_arr):
            ret[rank_idx] = arr[idx]
        return ret

    def mean(self, df1, selectCol, node, col):
        node_df1 = df1.loc[df1[selectCol] == node]

        data1 = np.asarray(node_df1[col])

        if len(data1) == 0:
            mean1 = 0
        else:
            mean1 = np.mean(data1)
        return mean1

    def mean_difference(self, module):
        callsite_in_module1 = self.df1.loc[self.df1["module"] == module][
            "name"
        ].unique()
        callsite_in_module2 = self.df2.loc[self.df2["module"] == module][
            "name"
        ].unique()

        mean1 = 0
        for callsite in callsite_in_module1:
            mean = self.mean(self.df1, "name", callsite, "time")
            mean1 += mean

        mean2 = 0
        for callsite in callsite_in_module2:
            mean = self.mean(self.df2, "name", callsite, "time")
            mean2 += mean

        return mean2 - mean1

    def calculate_diff(self, module):
        node_df1 = self.df1.loc[self.df1["module"] == module]
        node_df2 = self.df2.loc[self.df2["module"] == module]

        data1 = np.asarray(node_df1[self.col])
        rank1 = np.asarray(node_df1["rank"])
        name1 = np.asarray(node_df1["name"])
        dataset1 = np.array([self.dataset1 for _ in range(data1.shape[0])])
        module1 = np.asarray(node_df1["module"])
        zero_inserted_data1 = self.insertZeroRuntime(data1, rank1)

        data2 = np.asarray(node_df2[self.col])
        name2 = np.asarray(node_df2["name"])
        rank2 = np.asarray(node_df2["rank"])
        zero_inserted_data2 = self.insertZeroRuntime(data2, rank2)
        dataset2 = np.array([self.dataset2 for _ in range(data2.shape[0])])
        module2 = np.asarray(node_df2["module"])

        dataset = np.concatenate([dataset1, dataset2], axis=0)
        mean = np.mean([zero_inserted_data1, zero_inserted_data2], axis=0)
        diff = zero_inserted_data1 - zero_inserted_data2

        if len(data1) == 0:
            mean1 = 0
        else:
            mean1 = np.mean(data1)

        if len(data2) == 0:
            mean2 = 0
        else:
            mean2 = np.mean(data2)

        mean_diff = self.mean_difference(module)

        print("Mean differences", mean_diff)

        dist_list = np.sort(diff).tolist()

        # Calculate appropriate number of bins automatically.
        num_of_bins = 20

        if len(dist_list) != 0:
            hist_grid = self.histogram(np.array(dist_list))
            hist_x_min = hist_grid[0][0]
            hist_x_max = hist_grid[0][-1]
            hist_y_min = float(np.min(hist_grid[1]).astype(np.float64))
            hist_y_max = float(np.max(hist_grid[1]).astype(np.float64))
            x = hist_grid[0].tolist()
            y = hist_grid[1].tolist()
        else:
            hist_x_min = 0
            hist_x_max = 0
            hist_y_min = 0
            hist_y_max = 0
            x = 0
            y = 0

        result = {
            "name": module,
            "mean_diff": mean_diff,
            "bins": num_of_bins,
            "hist": {
                "x": x,
                "y": y,
                "x_min": hist_x_min,
                "x_max": hist_x_max,
                "y_min": hist_y_min,
                "y_max": hist_y_max,
            },
            "data_min": 0,
            "mean": mean.tolist(),
            "diff": diff.tolist(),
        }
        return result
