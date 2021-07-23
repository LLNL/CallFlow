# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

"""
CallFlow operation to calculate 2-dimensional projections based on run's parameter information.
"""

import pandas as pd
import numpy as np
from sklearn import preprocessing
from sklearn.manifold import TSNE, MDS
from sklearn.cluster import KMeans

from callflow.algorithms import KMedoids
from callflow.datastructures.metrics import TIME_COLUMNS


class ParameterProjection:
    """
    Calculate Parameter projections using common projection techniques like MDS, t-SNE.
    """

    def __init__(self, sg, selected_runs=None, n_cluster=3):
        """
        Constructor for the

        :param sg:
        :param selected_runs:
        :param n_cluster:
        """
        assert len(selected_runs) > 0
        assert isinstance(n_cluster, int)

        self.projection = "MDS"
        self.clustering = "k_means"
        self.n_cluster = int(n_cluster)
        self.proxy_columns = sg.proxy_columns
        self.time_columns = [self.proxy_columns.get(_, _) for _ in TIME_COLUMNS]

        if len(selected_runs) >= self.n_cluster:
            self.result = self.compute(sg, selected_runs)
        else:
            self.result = pd.DataFrame({})

    def add_df_params(self, sg, dataset):
        """
        Add information from the df about the dataset.
        :param dataset: dataset tag
        :return: dict comprising of "max_inclusive_time", "max_exclusive_time", and "rank_count".
        """
        # TODO: Research what more properties can be appended to the dataframe.
        ret = {}
        ret["max_inclusive_time"] = sg.dataframe.loc[
            sg.dataframe["dataset"] == dataset
        ][self.time_columns[0]].mean()
        ret["max_exclusive_time"] = sg.dataframe.loc[
            sg.dataframe["dataset"] == dataset
        ][self.time_columns[1]].mean()
        ret["rank_count"] = len(
            sg.dataframe.loc[sg.dataframe["dataset"] == dataset]["rank"].unique()
        )
        return ret

    def compute(self, sg, selected_runs):
        """
        Compute the 2D projection of the the provided data after processing.

        :return: (Dict) {
            "dataset:
            "
        }
        """
        rows = []
        for dataset in selected_runs:
            df_params = self.add_df_params(sg, dataset)
            rows.append(df_params)

        df = pd.DataFrame(rows)

        # TODO: Remove all string columns from the dataframe.
        if "dataset" in df.columns:
            df = df.drop(columns=["dataset"])
        x = df.values  # returns a numpy array

        # Scale the values to value between 0 to 1
        min_max_scaler = preprocessing.MinMaxScaler()
        x_scaled = min_max_scaler.fit_transform(x)
        df = pd.DataFrame(x_scaled)
        X = np.vstack([df.values])
        # X = np.vstack([df.values.tolist()])

        random_number = 20150101
        if self.projection == "MDS":
            proj = MDS(random_state=random_number).fit_transform(X)

        elif self.projection == "TSNE":
            proj = TSNE(random_state=random_number).fit_transform(X)

        ret = pd.DataFrame(proj, columns=list("xy"))
        ret["dataset"] = selected_runs

        if self.clustering == "k_medoids":
            self.clusters = KMedoids(n_cluster=self.n_cluster)
            ret["label"] = self.clusters.fit(X)
        elif self.clustering == "k_means":
            self.clusters = KMeans(
                n_clusters=self.n_cluster, random_state=random_number
            )
            ret["label"] = self.clusters.fit(X).labels_

        return ret
