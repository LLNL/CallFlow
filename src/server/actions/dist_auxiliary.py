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
import json
import networkx as nx
from ast import literal_eval as make_tuple
import numpy as np

class Auxiliary:
    def __init__(self, state, module='all', sortBy='time (inc)', datasets='all'):
        self.graph = state.g
        self.df = state.df
        self.sortBy = sortBy
        self.target_df = {}
        self.datasets = datasets
        # self.df['id'] = self.df['name'].apply(self.addID)

        if module != 'all':
            # Processing for the module format to get the module name
            if '=' in module:
                self.function = module.split('=')[1]
                self.module = module.split('=')[0]
            elif '/' in module:
                self.function = module.split('/')[1]
                self.module = module.split('/')[0]
            self.module_df = self.df.loc[self.df['module'] == self.module]
        else:
            self.module_df = self.df

        ret_df = pd.DataFrame([])
        for dataset in datasets:
            dataset_df = self.module_df.loc[self.module_df['dataset'] == dataset]
            self.target_df[dataset] = dataset_df

        self.module_df = self.module_df

        self.result = self.run()

    def addID(self, name):
        name = ''.join([i for i in name if not i.isdigit()])
        name = name.replace(':', '')
        if(":" in name and '[' not in name):
            # name = name.split(':')[len(name.split(':')) - 1]
            name = name
        elif('[' in name and ':' not in name):
            name = name.split('[')[0]
        elif('[' in name and ':' in name):
            name = name.split('[')[0]
            name = name.split(':')[len(name.split(':')) - 1]
        else:
            name = name

        name = name.replace(' ', '-')
        name = name.replace('<', '')
        name = name.replace('>', '')
        return name

    def histogram(self, data, nbins=5):
        h, b = np.histogram(data, range=[0, data.max()], bins=nbins)
        return 0.5*(b[1:]+b[:-1]), h

    def json_object(self, group_df, node_name):
        hist_inc_grid = self.histogram(np.array(group_df['time (inc)'].tolist()))
        hist_x_min_inc = hist_inc_grid[0][0]
        hist_x_max_inc = hist_inc_grid[0][-1]
        hist_y_min_inc = np.min(hist_inc_grid[1]).astype(np.float64)
        hist_y_max_inc = np.max(hist_inc_grid[1]).astype(np.float64)

        hist_exc_grid = self.histogram(np.array(group_df['time'].tolist()))
        hist_x_min_exc = hist_exc_grid[0][0]
        hist_x_max_exc = hist_exc_grid[0][-1]
        hist_y_min_exc = np.min(hist_exc_grid[1]).astype(np.float64)
        hist_y_max_exc = np.max(hist_exc_grid[1]).astype(np.float64)

        return {
                "name": node_name,
                "time (inc)": group_df['time (inc)'].tolist(),
                "time": group_df['time'].tolist(),
                "rank": group_df['rank'].tolist(),
                "id": 'node-' + str(group_df['nid'].tolist()[0]),
                "mean_time (inc)": group_df['time (inc)'].mean(),
                "mean_time": group_df['time'].mean(),
                "max_time (inc)": group_df['time (inc)'].max(),
                "max_time": group_df['time'].max(),
                "dataset": group_df['dataset'].tolist(),
                "module": group_df['module'].tolist()[0],
                "hist_time (inc)": {
                    "x": hist_inc_grid[0].tolist(),
                    "y": hist_inc_grid[1].tolist(),
                    "x_min": hist_x_min_inc,
                    "x_max": hist_x_max_inc,
                    "y_min": hist_y_min_inc,
                    "y_max": hist_y_max_inc,
                },
                "hist_time": {
                    "x": hist_exc_grid[0].tolist(),
                    "y": hist_exc_grid[1].tolist(),
                    "x_min": hist_x_min_exc,
                    "x_max": hist_x_max_exc,
                    "y_min": hist_y_min_exc,
                    "y_max": hist_y_max_exc,
                }
            }

    def run(self):
        ret = {}
        name_grouped = self.module_df.groupby(['name'])

        ensemble = []
        for name, group_df in name_grouped:
            name_df = self.module_df.loc[self.module_df['name'] == name ]
            ensemble.append(self.json_object(name_df, name))

        ensemble_result = pd.DataFrame(ensemble).sort_values(by='mean_time (inc)', ascending=False)
        ret['ensemble'] = ensemble_result.to_json(orient="split")

        for dataset in self.datasets:
            target = []
            for name, group_df in name_grouped:
                name_df = self.target_df[dataset].loc[self.target_df[dataset]['name'] == name ]
                if( not name_df.empty):
                    target.append(self.json_object(name_df, name))

            target_result = pd.DataFrame(target).sort_values(by='mean_time (inc)', ascending=False)
            ret[dataset] = target_result.to_json(orient="split")

        return ret