##############################################################################
# Copyright (c) 2018-2019, Lawrence Livermore National Security, LLC.
# Produced at the Lawrence Livermore National Laboratory.
#
# This file is part of Callflow.
# Created by Suraj Kesavan <kesavan1@llnl.gov>.
# LLNL-CODE-741008. All rights reserved.
#
# For details, see: https://github.com/LLNL/Callflow
# Please also read the LICENSE file for the MIT License notice.
##############################################################################
import pandas as pd
import numpy as np
import matplotlib.cm as cm
from scipy import stats
import math


class Compare:
    def __init__(self, states, dataset1, dataset2, col):
        self.states = states
        self.state1 = self.states[dataset1]
        self.state2 = self.states[dataset2]
        self.state_ensemble = self.states["ensemble"]
        self.graph1 = self.state1.graph
        self.df1 = self.state1.df
        self.graph2 = self.state2.graph
        self.df2 = self.state2.df
        self.df_ensemble = self.state_ensemble.df
        self.col = col
        self.dataset1 = dataset1
        self.dataset2 = dataset2
        print(self.dataset1, self.dataset2)

        # Calculate the max_rank.
        self.max_rank1 = len(self.df1["rank"].unique())
        self.max_rank2 = len(self.df2["rank"].unique())
        self.max_rank = max(self.max_rank1, self.max_rank2)

        self.result = self.run()

    def run(self):
        results = []

        nodes = (
            self.df_ensemble.loc[self.df_ensemble["show_node"] == True]["name"]
            .unique()
            .tolist()
        )

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

    def calculate_diff(self, node):
        node_df1 = self.df1.loc[self.df1["name"] == node]
        node_df2 = self.df2.loc[self.df2["name"] == node]

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
        print(len(data1), len(data2))
        dataset2 = np.array([self.dataset2 for _ in range(data2.shape[0])])
        module2 = np.asarray(node_df2["module"])

        name = name2
        module = module2
        dataset = np.concatenate([dataset1, dataset2], axis=0)
        mean = np.mean([zero_inserted_data1, zero_inserted_data2], axis=0)
        diff = zero_inserted_data1 - zero_inserted_data2
        mean_diff = np.mean(data2) - np.mean(data1)
        print(node, mean_diff)

        # calculate mean runtime.
        # np_mean_dist = np.array(tuple(self.clean_dict(diff).values()))

        # np_max_dist = np.array(tuple(self.clean_dict(max_dist).values()))

        #     # convert the dictionary of values to list of values.
        #     dist_list = self.convert_dictmean_to_list(dist)

        dist_list = np.sort(diff).tolist()

        # Calculate appropriate number of bins automatically.
        num_of_bins = 10
        # num_of_bins = min(
        #     self.freedman_diaconis_bins(np.array(dist_list)), 50
        # )

        # Calculate the KDE grid (x, y)
        # kde_grid = self.kde(np.array(dist_list), 10)
        # kde_x_min = np.min(kde_grid[0])
        # kde_x_max = np.max(kde_grid[0])
        # kde_y_min = np.min(kde_grid[1])
        # kde_y_max = np.max(kde_grid[1])

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

        print(
            "hist ranges = {} {} {} {}\n".format(
                hist_x_min, hist_x_max, hist_y_min, hist_y_max
            )
        )

        result = {
            "name": node,
            # "dist": diff,
            "mean_diff": mean_diff,
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

