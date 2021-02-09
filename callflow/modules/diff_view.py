# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import numpy as np

import callflow
from callflow.utils.utils import histogram
from callflow.utils.df import df_count, df_lookup_by_column, df_lookup_and_list
from .histogram import Histogram

LOGGER = callflow.get_logger()


# ------------------------------------------------------------------------------
# Calculate differences from sections of dataframe
# ------------------------------------------------------------------------------
class DiffView:
    def __init__(self, ensemble_graph, dataset1, dataset2, col):
        """

        :param ensemble_graph:
        :param dataset1:
        :param dataset2:
        :param col:
        """
        assert isinstance(ensemble_graph, callflow.EnsembleGraph)
        assert isinstance(dataset1, str) and isinstance(dataset2, str)
        assert isinstance(col, str)

        self.df1 = ensemble_graph.df_lookup_with_column("dataset", dataset1)
        self.df2 = ensemble_graph.df_lookup_with_column("dataset", dataset2)
        self.dataset1 = dataset1
        self.dataset2 = dataset2
        self.col = col

        # Calculate the max_rank.
        self.max_rank = max(df_count(self.df1, "rank"), df_count(self.df2, "rank"))

        modules = ensemble_graph.df_unique("module")
        self.result = [self.compute(_) for _ in modules]

    # --------------------------------------------------------------------------
    @staticmethod
    def _mean_difference(df1, df2, module):
        """

        :param df1:
        :param df2:
        :param module:
        :return:
        """

        def _mean(_df, _selected_col, _node, _col):
            """

            :param _df:
            :param _selected_col:
            :param _node:
            :param _col:
            :return:
            """
            _data = df_lookup_by_column(_df, _selected_col, _node)[_col].to_numpy()
            return _data.mean() if len(_data) > 0 else 0

        callsites_in_mod1 = df_lookup_and_list(df1, "module", module, "name")
        callsites_in_mod2 = df_lookup_and_list(df2, "module", module, "name")
        mean1 = [_mean(df1, "name", _, "time") for _ in callsites_in_mod1]
        mean2 = [_mean(df2, "name", _, "time") for _ in callsites_in_mod2]
        return sum(mean2) - sum(mean1)

    # --------------------------------------------------------------------------
    def compute(self, module):
        """

        :param module:
        :return:
        """

        def _insertZeroRuntime(_arr, _rank_arr):
            """

            :param _arr:
            :param _rank_arr:
            :return:
            """
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
        hist_grid = histogram(diff, bins=num_of_bins)

        result = {
            "name": module,
            "mean1": mean1,
            "mean2": mean2,
            "dataset": list(set(dataset)),
            "mean_diff": mean_diff,
            "bins": num_of_bins,
            "hist": Histogram._format_data(hist_grid),
            "data_min": 0,
            "mean": mean,
            "diff": diff,
        }
        return result


# ------------------------------------------------------------------------------
