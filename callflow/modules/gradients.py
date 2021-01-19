# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import numpy as np
from .histogram import Histogram
from callflow.utils.utils import histogram, kde, freedman_diaconis_bins
from callflow.utils.utils import df_count, df_lookup_by_column


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

    def __init__(self, df_dict, callsiteOrModule: str, binCount=20):
        # TOD: why passing a df_dict? why not the supergraph/ensemble graph
        assert isinstance(callsiteOrModule, str)
        assert isinstance(df_dict, dict)

        self.callsiteOrModule = callsiteOrModule
        self.df_dict = df_dict
        self.binCount = binCount

        self.rank_dict = {dataset: df_count(df_dict[dataset], "rank") for dataset in df_dict}
        self.max_ranks = max(self.rank_dict.values())
        self.result = self.compute(columnName="name")

    # ------------------------------------------------------------------------------
    '''
    # Rank based calculations
    @staticmethod
    def _get_rank_dict(df_dict):
        """
        Find max_rank information.
        """
        max_ranks = 0
        rank_dict = {dataset : len(df_dict[dataset]["rank"].unique()) for dataset in df_dict}
        max_ranks = max(rank_dict.values())
        return rank_dict, max_ranks

    @staticmethod
    def _pack_by_rank(df, metric, max_ranks):
        ret = {}
        if df.empty:
            ret = dict((rank, 0) for rank in range(0, max_ranks))
        else:
            ranks = df["rank"].tolist()
            metric_vals = df[metric].tolist()
            ret = dict(zip(ranks, metric_vals))
        return ret

    @staticmethod
    def get_runtime_data(df, column_name, max_ranks):
        time_df = df[column_name]
        time_list = time_df.tolist()

        if len(time_list) == 0:
            time_list = [0] * max_ranks

        ret = Gradients._pack_by_rank(df, column_name, max_ranks)
        return ret

    # ------------------------------------------------------------------------------
    # Histogram utilities
    @staticmethod
    def iqr(arr):
        """Calculate the IQR for an array of numbers."""
        _ = np.asarray(arr)
        q1 = stats.scoreatpercentile(_, 25)
        q2 = stats.scoreatpercentile(_, 50)
        q3 = stats.scoreatpercentile(_, 75)
        q4 = stats.scoreatpercentile(_, 100)
        return [q1, q2, q3, q4]

    @staticmethod
    def freedman_diaconis_bins(arr):
        """
        Calculate number of hist bins using Freedman-Diaconis rule.
        From https://stats.stackexchange.com/questions/798/
        """
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
    '''
    @staticmethod
    def convert_dictmean_to_list(dictionary):
        mean = []
        dataset = {}
        for state in dictionary:
            d = list(dictionary[state].values())
            mean.append(np.mean(np.array(d)))
            dataset[state] = np.mean(np.array(d))
        return [mean, dataset]

    '''
    # ------------------------------------------------------------------------------
    # KDE and Histogram calculations
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
    def histogram(data, dataset_dict={}, data_min=np.nan, data_max=np.nan, binCount=20):
        if np.isnan(data_min) or np.isnan(data_max):
            data_min = data.min()
            data_max = data.max()

        h, b = np.histogram(data, range=[data_min, data_max], bins=binCount)

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

    # ------------------------------------------------------------------------------
    # Data Fromatting
    @staticmethod
    def _format_data(grid):
        return {
            "x": grid[0].tolist(),
            "y": grid[1].tolist(),
            "x_min": grid[0][0],
            "x_max": grid[0][-1],
            "y_min": np.min(grid[1]).astype(np.float64),
            "y_max": np.max(grid[1]).astype(np.float64),
        }

    # ------------------------------------------------------------------------------
    # Compute method.
    def compute(self, columnName="name"):
        dist_inc = {}
        dist_exc = {}
        num_of_bins = {}
        hist_inc_grid = {}
        hist_exc_grid = {}

        # Get the runtimes for all the runs.
        for idx, dataset in enumerate(self.df_dict):
            node_df = self.df_dict[dataset].loc[self.df_dict[dataset][columnName] == self.callsiteOrModule]
            dist_inc[dataset] = Gradients.get_runtime_data(node_df, "time (inc)", self.max_ranks)
            dist_exc[dataset] = Gradients.get_runtime_data(node_df, "time", self.max_ranks)

        # convert the dictionary of values to list of values.
        [dist_inc_list, dataset_inc_list] = Gradients.convert_dictmean_to_list(dist_inc)
        [dist_exc_list, dataset_exc_list] = Gradients.convert_dictmean_to_list(dist_exc)
        
        # Calculate appropriate number of bins automatically.
        # num_of_bins = min(self.freedman_diaconis_bins(np.array(dist_list)),
        # 50)
        num_of_bins = self.binCount

        hist_inc_grid = Gradients.histogram(np.array(dist_inc_list), dataset_inc_list, binCount=self.binCount)
        hist_exc_grid = Gradients.histogram(np.array(dist_exc_list), dataset_exc_list, binCount=self.binCount)
        
        # Calculate the KDE grid (x, y)
        kde_inc_grid = Gradients.kde(np.array(dist_inc_list), gridsize=num_of_bins)
        kde_exc_grid = Gradients.kde(np.array(dist_exc_list), gridsize=num_of_bins)

        results = {
            "Inclusive": {
                "bins": num_of_bins,
                "dataset": {"mean": dataset_inc_list, "position": hist_inc_grid[2]},
                "kde": Gradients._format_data(kde_inc_grid),
                "hist": Gradients._format_data(hist_inc_grid)
            },
            "Exclusive": {
                "bins": num_of_bins,
                "dataset": {"mean": dataset_exc_list, "position": hist_exc_grid[2]},
                "kde": Gradients._format_data(kde_exc_grid),
                "hist": Gradients._format_data(hist_exc_grid),
            },
        }

        return results
    '''

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
                    dists[k][dataset] = dict(zip(node_df["rank"].tolist(), node_df[a].tolist()))

        # Calculate appropriate number of bins automatically.
        # num_of_bins = min(self.freedman_diaconis_bins(np.array(dist_list)),
        num_of_bins = self.binCount

        # convert the dictionary of values to list of values.
        results = {}
        for k,a in Gradients.KEYS_AND_ATTRS.items():

            dists_list, datasets_list = Gradients.convert_dictmean_to_list(dists[k])
            dists_list = np.array(dists_list)

            hist_grid = histogram(dists_list, bins=num_of_bins)
            kde_grid = kde(dists_list, gridsize=num_of_bins)

            dataset_pos = Gradients.map_datasets_to_bins(hist_grid[1], datasets_list)
            results[k] = {
                "bins": num_of_bins,
                "dataset": {"mean": dists_list.tolist(), "position": dataset_pos},
                "kde": Histogram._format_data(kde_grid),
                "hist": Histogram._format_data(hist_grid)
            }

        return results


# ------------------------------------------------------------------------------
