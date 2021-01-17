# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

import json
import pandas as pd
import numpy as np
from sklearn import preprocessing
from sklearn.manifold import TSNE, MDS
from sklearn.cluster import KMeans
from callflow.algorithms import KMedoids


class ParameterProjection:
    """
    Parameter projection view
    """

    def __init__(self, ensemble_graph, n_cluster=3):

        self.df = ensemble_graph.gf.df
        self.datasets = self.df["dataset"].unique().tolist()
        self.projection = "MDS"
        self.clustering = "k_means"
        self.n_cluster = int(n_cluster)
        if len(self.datasets) >= self.n_cluster:
            self.result = self.run()
        else:
            self.result = pd.DataFrame({})

    def add_df_params(self, dataset):
        # TODO: Research what more properties can be appended to the dataframe.
        ret = {}
        ret["max_inclusive_time"] = self.df.loc[self.df["dataset"] == dataset][
            "time (inc)"
        ].max()
        ret["max_exclusive_time"] = self.df.loc[self.df["dataset"] == dataset][
            "time"
        ].max()
        ret["rank_count"] = len(
            self.df.loc[self.df["dataset"] == dataset]["rank"].unique()
        )
        return ret

    def run(self):
        rows = []
        for idx, dataset in enumerate(self.datasets):
            df_params = self.add_df_params(dataset)
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
        X = np.vstack([df.values.tolist()])

        random_number = 20150101
        if self.projection == "MDS":
            proj = MDS(random_state=random_number).fit_transform(X)

        elif self.projection == "TSNE":
            proj = TSNE(random_state=random_number).fit_transform(X)

        ret = pd.DataFrame(proj, columns=list("xy"))
        ret["dataset"] = self.datasets

        if self.clustering == "k_medoids":
            self.clusters = KMedoids(n_cluster=self.n_cluster)
            ret["label"] = self.clusters.fit(X)
        elif self.clustering == "k_means":
            self.clusters = KMeans(
                n_clusters=self.n_cluster, random_state=random_number
            )
            ret["label"] = self.clusters.fit(X).labels_

        return ret
