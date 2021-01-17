# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import numpy as np
import callflow as cf
from .histogram import Histogram

LOGGER = cf.get_logger()


# TODO: should go to some util
def df_lookup_by_column(df, column, value):
    return df.loc[df[column] == value]


def df_unique(df, column):
    return df[column].unique()


def df_count(df, column):
    return len(df_unique(df, column))


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class DiffView:

    def __init__(self, ensemble_graph, dataset1, dataset2, col):

        assert isinstance(ensemble_graph, cf.EnsembleGraph)
        assert isinstance(dataset1, str) and isinstance(dataset2, str)
        assert isinstance(col, str)

        self.df1 = ensemble_graph.df_lookup_with_column("dataset", dataset1)
        self.df2 = ensemble_graph.df_lookup_with_column("dataset", dataset2)
        self.dataset1 = dataset1
        self.dataset2 = dataset2
        self.col = col

        # Calculate the max_rank.
        self.max_rank = max(df_count(self.df1,"rank"),df_count(self.df2,"rank"))

        modules = ensemble_graph.df_unique("module")
        self.result = [self.compute(_) for _ in modules]


    '''
    def iqr(self, arr):
        """Calculate the IQR for an array of numbers."""
        _ = np.asarray(arr)
        self.q1 = stats.scoreatpercentile(_, 25)
        self.q2 = stats.scoreatpercentile(_, 50)
        self.q3 = stats.scoreatpercentile(_, 75)
    
    def histogram(self, data, nbins=20):
        h, b = np.histogram(data, range=[data.min(), data.max()], bins=nbins)
        return 0.5 * (b[1:] + b[:-1]), h

    def freedman_diaconis_bins(self, arr):
        """Calculate number of hist bins using Freedman-Diaconis rule."""
        # From https://stats.stackexchange.com/questions/798/
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
    '''

    # --------------------------------------------------------------------------
    @staticmethod
    def _mean_difference(df1, df2, module):

        def _mean(_df, _selected_col, _node, _col):
            _data = df_lookup_by_column(_df, _selected_col, _node)[_col].to_numpy()
            return _data.mean() if len(_data) > 0 else 0

        callsites_in_mod1 = df_unique(df_lookup_by_column(df1, "module", module), "name")
        callsites_in_mod2 = df_unique(df_lookup_by_column(df2, "module", module), "name")
        mean1 = [_mean(df1, "name", _, "time") for _ in callsites_in_mod1]
        mean2 = [_mean(df2, "name", _, "time") for _ in callsites_in_mod2]
        return sum(mean2) - sum(mean1)

    # --------------------------------------------------------------------------
    def compute(self, module):

        def _insertZeroRuntime(_arr, _rank_arr):
            ret = np.zeros([self.max_rank])
            for idx, rank_idx in enumerate(_rank_arr):
                ret[rank_idx] = _arr[idx]
            return ret

        node_df1 = df_lookup_by_column(self.df1, "module", module)
        node_df2 = df_lookup_by_column(self.df2, "module", module)

        data1 = node_df1[self.col].to_numpy()
        rank1 = node_df1["rank"].to_numpy()
        dataset1 = np.array([self.dataset1 for _ in range(data1.shape[0])])
        zero_inserted_data1 = _insertZeroRuntime(data1, rank1)

        data2 = node_df2[self.col].to_numpy()
        rank2 = node_df2["rank"].to_numpy()
        zero_inserted_data2 = _insertZeroRuntime(data2, rank2)
        dataset2 = np.array([self.dataset2 for _ in range(data2.shape[0])])
        # TODO: Suraj, the order is opposite for ds1 and ds2?

        dataset = np.concatenate([dataset1, dataset2], axis=0)
        mean = np.mean([zero_inserted_data1, zero_inserted_data2], axis=0)
        diff = zero_inserted_data1 - zero_inserted_data2

        mean1 = np.mean(data1) if len(data1) > 0 else 0
        mean2 = np.mean(data2) if len(data2) > 0 else 0

        mean_diff = DiffView._mean_difference(module)
        LOGGER.debug(f"Mean differences {mean_diff}")

        # now, need to compute the histogram
        num_of_bins = 20
        hist_grid = Histogram.compute(diff, bins=num_of_bins)
        '''
        #dist_list = np.sort(diff)
        if len(dist_list) != 0:
            hist_grid = self.histogram(dist_list)
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
        '''
        result = {
            "name": module,
            "mean1": mean1,
            "mean2": mean2,
            "dataset": list(set(dataset)),
            "mean_diff": mean_diff,
            "bins": num_of_bins,
            "hist": Histogram._format_data(hist_grid),
            '''
             {
                "x": x,
                "y": y,
                "x_min": hist_x_min,
                "x_max": hist_x_max,
                "y_min": hist_y_min,
                "y_max": hist_y_max,
            },
            '''
            "data_min": 0,
            "mean": mean.tolist(),
            "diff": diff.tolist(),
        }
        return result
# ------------------------------------------------------------------------------
