# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import numpy as np
import pandas as pd

from .histogram import Histogram
from callflow.utils.utils import histogram, kde, freedman_diaconis_bins
from callflow.utils.df import df_count, df_unique, df_lookup_by_column

import callflow
LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class Gradients:
    """
    Gradients Class computes the ensemble gradients for the a given dictionary
    of dataframes.

    df_dict :  Dictinary of dataframes keyed by the dataset_name. For e.g., { "dataset_name": df }.
    callsiteOrModule : callsiteOrModule (can be a moddule) of a given call graph
    binCount : Number of bins to distribute the runtime information. 
    """

    KEYS_AND_ATTRS = {'Inclusive': 'time (inc)',
                      'Exclusive': 'time'}

    def __init__(self, df, callsiteOrModule: str, bins=20):

        assert isinstance(df, pd.DataFrame)
        assert isinstance(callsiteOrModule, str)
        assert isinstance(bins, int)
        assert bins > 0

        # gradient should be computed only for ensemble dataframe
        # i.e., multiple values in dataframe column
        datasets = df_unique(df, 'dataset')
        assert len(datasets) > 1

        self.df_dict = {"ensemble": df}
        self.callsiteOrModule = callsiteOrModule
        self.binCount = bins

        #self.max_ranks = df_count(df, "rank")
        self.rank_dict = {_name: df_count(_df, "rank") for _name, _df in self.df_dict.items()}
        self.max_ranks = max(self.rank_dict.values())

        self.result = self.compute(columnName="name")

    # ------------------------------------------------------------------------------
    @staticmethod
    def convert_dictmean_to_list(dictionary):
        mean = []
        dataset = {}
        for state in dictionary:
            d = list(dictionary[state].values())
            mean.append(np.mean(np.array(d)))
            dataset[state] = np.mean(np.array(d))
        return [mean, dataset]

    # --------------------------------------------------------------------------
    @staticmethod
    def map_datasets_to_bins(bins, dataset_dict={}):

        # TODO: previously, this logic applied to bin edges
        # but, now, we aer working on bin_centers
        binw = bins[1] - bins[0]
        bin_edges = np.append(bins - 0.5*binw, bins[-1] + 0.5*binw)

        # Map the datasets to their histogram indexes.
        dataset_position_dict = {}
        for dataset in dataset_dict:
            mean = dataset_dict[dataset]
            for idx, x in np.ndenumerate(bin_edges):
                if x > float(mean):
                    dataset_position_dict[dataset] = idx[0] - 1
                    break
                if idx[0] == len(bin_edges) - 1:
                    dataset_position_dict[dataset] = len(bin_edges) - 2

        return dataset_position_dict

    # --------------------------------------------------------------------------
    # Compute method.
    def compute(self, columnName="name"):

        dists = {}
        for k, a in Gradients.KEYS_AND_ATTRS.items():
            dists[k] = {}

        # Get the runtimes for all the runs.
        for idx, dataset in enumerate(self.df_dict):

            node_df = df_lookup_by_column(self.df_dict[dataset], columnName, self.callsiteOrModule)
            for k, a in Gradients.KEYS_AND_ATTRS.items():
                if node_df.empty:
                    dists[k][dataset] = dict((rank, 0) for rank in range(0, self.max_ranks))
                else:
                    dists[k][dataset] = dict(zip(node_df["rank"], node_df[a]))
                    #dists[k][dataset] = dict(zip(node_df["rank"].tolist(), node_df[a].tolist()))

        # Calculate appropriate number of bins automatically.
        # num_of_bins = min(self.freedman_diaconis_bins(np.array(dist_list)),
        num_of_bins = self.binCount

        # convert the dictionary of values to list of values.
        results = {}
        for k,a in Gradients.KEYS_AND_ATTRS.items():

            dists_list, datasets_list = Gradients.convert_dictmean_to_list(dists[k])
            #dists_list = np.array(dists_list)

            # TODO: this is likely wrong!
            #print(type(dists[k]))
            #print(list(dists[k].keys()))
            #print(type(dists[k]['ensemble']))
            #print(list(dists[k]['ensemble'].keys()))
            dists_list = np.array(list(dists[k]['ensemble'].values()))

            hist_grid = histogram(dists_list, bins=num_of_bins)
            kde_grid = kde(dists_list, gridsize=num_of_bins)

            dataset_pos = Gradients.map_datasets_to_bins(hist_grid[1], datasets_list)

            results[k] = {
                "bins": num_of_bins,
                "dataset": {"mean": dists_list, "position": dataset_pos},
                "kde": Histogram._format_data(kde_grid),
                "hist": Histogram._format_data(hist_grid)
            }

        return results

# ------------------------------------------------------------------------------
