# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

"""
CallFlow's operation to calculate ensemble gradients per-callsite or per-module.
"""
import numpy as np
import pandas as pd

import callflow
from callflow.utils.utils import histogram
from callflow.utils.df import df_count, df_unique, df_lookup_by_column
from callflow.datastructures.metrics import TIME_COLUMNS
from .histogram import Histogram

LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
class Gradients:
    """
    Computes the ensemble gradients for the a given dictionary of dataframes.
    """

    def __init__(self, df, callsiteOrModule: str, grp_type: str="name", bins: int = 20, proxy_columns={}):
        """
        Constructor function
        :param df: Dictinary of dataframes keyed by the dataset_name. For e.g., { "dataset_name": df }.
        :param callsiteOrModule: callsiteOrModule (can be a moddule) of a given call graph
        :param bins: Number of bins to distribute the runtime information.
        """
        assert isinstance(df, pd.DataFrame)
        assert isinstance(callsiteOrModule, str) or isinstance(callsiteOrModule, int)
        assert isinstance(bins, int)
        assert isinstance(proxy_columns, dict)
        assert bins > 0

        # # gradient should be computed only for ensemble dataframe
        # # i.e., multiple values in dataframe column
        datasets = df_unique(df, "dataset")
        assert len(datasets) > 1

        self.bins = bins
        self.callsiteOrModule = callsiteOrModule

        self.proxy_columns = proxy_columns
        self.time_columns = [self.proxy_columns.get(_, _) for _ in TIME_COLUMNS]

        # TODO: this looks like a lot of wasted copy
        self.df_dict = {_d: df_lookup_by_column(df, "dataset", _d)
                        for _d in datasets}

        self.rank_dict = {_d: df_count(_df, "rank")
                          for _d, _df in self.df_dict.items()}
        self.max_ranks = max(self.rank_dict.values())

        self.result = self.compute(grp_type)

    @staticmethod
    def convert_dictmean_to_list(dictionary):
        """

        :return:
        """
        return [np.mean(np.array(list(dictionary[_].values()))) for _ in dictionary]

    @staticmethod
    def convert_dictmean_to_dict(dictionary):
        """

        :param dictionary:
        :return:
        """
        return {_: np.mean(np.array(list(dictionary[_].values()))) for _ in dictionary}

    # --------------------------------------------------------------------------
    @staticmethod
    def map_datasets_to_bins(bins, dataset_dict={}):
        """

        :param bins:
        :param dataset_dict:
        :return:
        """
        # TODO: previously, this logic applied to bin edges
        # but, now, we aer working on bin_centers
        binw = bins[1] - bins[0]
        bin_edges = np.append(bins - 0.5 * binw, bins[-1] + 0.5 * binw)

        # Map the datasets to their histogram indexes.
        dataset_position_dict = {}
        for dataset in dataset_dict:
            mean = dataset_dict[dataset]
            for idx, x in np.ndenumerate(bin_edges):
                if x > float(mean):
                    dataset_position_dict[dataset] = idx[0]
                    break
                if idx[0] == len(bin_edges) - 1:
                    dataset_position_dict[dataset] = len(bin_edges) - 2

        return dataset_position_dict

    # --------------------------------------------------------------------------
    def compute(self, columnName="name"):
        """

        :param columnName:
        :return:
        """
        dists = {tk: {} for tk,tv in zip(TIME_COLUMNS, self.time_columns)}

        # Get the runtimes for all the runs.
        for idx, dataset in enumerate(self.df_dict):
            node_df = df_lookup_by_column(self.df_dict[dataset], columnName,
                                          self.callsiteOrModule)

            for tk, tv in zip(TIME_COLUMNS, self.time_columns):
                if node_df.empty:
                    dists[tk][dataset] = dict((rank, 0) for rank in range(0, self.max_ranks))
                else:
                    dists[tk][dataset] = dict(zip(node_df["rank"], node_df[tv]))

        # Calculate appropriate number of bins automatically.
        # num_of_bins = min(self.freedman_diaconis_bins(np.array(dist_list)),
        num_of_bins = self.bins

        # convert the dictionary of values to list of values.
        results = {}
        for tk, tv in zip(TIME_COLUMNS, self.time_columns):

            dists_list = np.array(Gradients.convert_dictmean_to_list(dists[tk]))
            datasets_list = Gradients.convert_dictmean_to_dict(dists[tk])

            hist_grid = histogram(dists_list, bins=num_of_bins)
            # kde_grid = kde(dists_list, gridsize=num_of_bins)

            dataset_pos = Gradients.map_datasets_to_bins(hist_grid[0], datasets_list)

            results[tk] = {
                "bins": num_of_bins,
                "dataset": {"mean": dists_list, "position": dataset_pos},
                # "kde": Histogram._format_data(kde_grid),
                "hist": Histogram._format_data(hist_grid),
            }

        return results

# ------------------------------------------------------------------------------
