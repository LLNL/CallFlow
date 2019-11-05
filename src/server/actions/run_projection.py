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
from collections import defaultdict
import numpy as np
import sklearn
from sklearn.manifold import TSNE, MDS
from sklearn.datasets import load_digits
from sklearn.preprocessing import scale
from .similarity import Similarity
from sklearn import preprocessing
from sklearn.cluster import KMeans
from actions.algorithm.k_medoids import KMedoids
from actions.algorithm.prog_kmeans import ProgKMeans

class RunProjection:
    def __init__(self, states, similarities):
        self.similarities = similarities
        self.states = states
        self.projection = 'MDS'
        # self.clustering = 'k_medoids'
        self.clustering = 'k_means'
        self.n_cluster = 3
        self.result = self.run()

    def add_df_params(self, state):
        ret = {}
        ret['max_inclusive_time'] = state.df['time (inc)'].max()
        ret['max_exclusive_time'] = state.df['time'].max()
        ret['rank_count'] = len(state.df['rank'].unique())
        ret['similarity'] = Similarity(state.group_graph, self.states['union_graph'].graph).result
        return ret    
    
    def run(self):
        for idx, state in enumerate(self.states):
            if(state != 'union_graph'):
                df_params = self.add_df_params(self.states[state])
                # self.states[state].projection_data.update(df_params)

        row_list = []
        for idx, state in enumerate(self.states):
            if(state != 'union_graph'):
                row_list.append(self.states[state].projection_data)

        df = pd.DataFrame(row_list)

        # TODO: Remove all string columns from the dataframe.
        if 'dataset' in df.columns:
            print('Removing {0} column from the dataframe'.format('dataset'))
            df = df.drop(columns = ['dataset'])
        x = df.values #returns a numpy array
       
        # Scale the values to value between 0 to 1
        min_max_scaler = preprocessing.MinMaxScaler()
        x_scaled = min_max_scaler.fit_transform(x)
        df = pd.DataFrame(x_scaled)
        X = np.vstack([df.values.tolist()])
        
        random_number = 20150101
        if self.projection == 'MDS':
            proj = MDS(random_state=random_number).fit_transform(X)
    
        elif self.projection == 'TSNE':
            proj = TSNE(random_state=random_number).fit_transform(X)
    
        datasets = [key for key in self.states.keys() if key != 'union_graph']
        ret = pd.DataFrame(proj, columns=list('xy'))
        ret['dataset'] = datasets

        if self.clustering == 'prog_k_means':
            self.clusters = ProgKMeans(n_clusters=self.n_cluster)
            self.clusters.progressive_fit(X, latency_limit_in_msec=100)
            ret['label'] = self.clusters.predict(X).tolist()

        elif self.clustering == 'k_medoids':
            self.clusters = KMedoids(n_cluster=self.n_cluster)
            ret['label'] = self.clusters.fit(X)
        elif self.clustering == 'k_means':
            self.clusters = KMeans(n_clusters=self.n_cluster, random_state=random_number)
            ret['label'] = self.clusters.fit(X).labels_
        
        print(ret)
        return ret
