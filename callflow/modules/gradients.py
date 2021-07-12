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

# TODO: Avoid the performance error in the future pass.
import warnings

warnings.simplefilter(action="ignore", category=pd.errors.PerformanceWarning)

import callflow
from callflow.utils.utils import histogram
from callflow.utils.df import df_count, df_unique, df_lookup_by_column
from callflow.datastructures.metrics import TIME_COLUMNS
from callflow.modules.histogram import Histogram

LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
class Gradients:
    """
    Computes the ensemble gradients for the a given dictionary of dataframes.
    """

    def __init__(
        self, df, nid: int, ntype: str = "callsite", bins: int = 20, proxy_columns={}
    ):
        """
        Constructor function for the class

        :param df: Dictinary of dataframes keyed by the dataset_name. For e.g., { "dataset_name": df }.
        :param node_id: Node id from the supergraph
        :param node_type: Node type from the supergraph
        :param bins: Number of bins to distribute the runtime information.
        :param proxy_columns: Proxy columns
        """
        assert isinstance(df, pd.DataFrame)
        assert ntype in ["callsite", "module"]
        assert isinstance(bins, int)
        assert isinstance(proxy_columns, dict)
        assert bins > 0

        # # gradient should be computed only for ensemble dataframe
        # # i.e., multiple values in dataframe column
        self.datasets = list(df.index.levels[0])
        assert len(self.datasets) >= 1

        self.bins = bins
        self.nid = nid
        self.df = df

        self.proxy_columns = proxy_columns
        self.time_columns = [self.proxy_columns.get(_, _) for _ in TIME_COLUMNS]

        self.max_ranks = max(df_unique(df, "rank"))
        self.result = self.compute()

    @staticmethod
    def convert_dictmean_to_list(dictionary):
        """
        Convert a dictionary by taking its mean and converting to a list.

        :param dictionary: (dict) Input dictionary
        :return: (list) mean of all values in the dictionary
        """
        return [np.mean(np.array(list(dictionary[_].values()))) for _ in dictionary]

    @staticmethod
    def convert_dictmean_to_dict(dictionary):
        """
        Convert a dictionary by taking its mean and converting to a list.

        :param dictionary: (dict) Input dictionary
        :return: (dict) Dictionary of mean values indexed by the keys in the
        input dictionary.
        """
        return {_: np.mean(np.array(list(dictionary[_].values()))) for _ in dictionary}

    # --------------------------------------------------------------------------
    @staticmethod
    def map_datasets_to_bins(bins, dataset_dict={}):
        """
        Map dataset information to the corresponding bins.

        :param bins: (int) Bin size
        :param dataset_dict: Dataset dictionary
        :return: Mapping of the datases to the corresponding bins.
        """
        # TODO: previously, this logic applied to bin edges
        # but, now, we are working on bin_centers
        binw = bins[1] - bins[0]
        bin_edges = np.append(bins - 0.5 * binw, bins[-1] + 0.5 * binw)

        # Map the datasets to their histogram indexes.
        dataset_position_dict = {}
        for dataset in dataset_dict:
            mean = dataset_dict[dataset]
            for idx, x in np.ndenumerate(bin_edges):
                if x > float(mean):
                    if idx[0] != 0:
                        pos = idx[0] - 1
                    else:
                        pos = idx[0]
                    dataset_position_dict[dataset] = pos
                    break
                if idx[0] == len(bin_edges) - 1:
                    dataset_position_dict[dataset] = len(bin_edges) - 2

        return dataset_position_dict

    # --------------------------------------------------------------------------
    def compute(self):
        """
        Compute the required results.

        :return: (JSON) data
        """
        dists = {tk: {} for tk, tv in zip(TIME_COLUMNS, self.time_columns)}

        # Get the runtimes for all the runs.
        for idx, dataset in enumerate(self.datasets):
            node_df = self.df.xs((dataset, self.nid))
            for tk, tv in zip(TIME_COLUMNS, self.time_columns):
                if node_df.empty:
                    dists[tk][dataset] = dict(
                        (rank, 0) for rank in range(0, self.max_ranks)
                    )
                else:
                    dists[tk][dataset] = dict(zip(node_df["rank"], node_df[tv]))

        # Calculate appropriate number of bins automatically.
        # num_of_bins = min(self.freedman_diaconis_bins(np.array(dist_list)),
        num_of_bins = self.bins

        # convert the dictionary of values to list of values.
        results = {}
        for tk, tv in zip(TIME_COLUMNS, self.time_columns):

            dists_list = np.array(Gradients.convert_dictmean_to_list(dists[tk]))
            datasets_dict = Gradients.convert_dictmean_to_dict(dists[tk])
            dists_dict = Gradients.convert_dictmean_to_dict(dists[tk])
            hist_grid = histogram(dists_list, bins=num_of_bins)
            # kde_grid = kde(dists_list, gridsize=num_of_bins)

            dataset_pos = Gradients.map_datasets_to_bins(hist_grid[0], datasets_dict)

            results[tk] = {
                "bins": num_of_bins,
                "dataset": {"mean": dists_dict, "position": dataset_pos},
                # "kde": Histogram._format_data(kde_grid),
                "hist": Histogram._format_data(hist_grid),
            }

        return results


# ------------------------------------------------------------------------------
