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
from .gradients import KDE_gradients
from utils.logger import log
from utils.timer import Timer
import os

class Auxiliary:
    def __init__(self, states, module='all', sortBy='time (inc)', binCount="20", datasets='all', config={}):
        self.graph = states['ensemble'].g
        self.df = states['ensemble'].df
        self.sortBy = sortBy
        self.target_df = {}
        self.binCount = binCount
        self.datasets = datasets
        self.config = config
        self.states = states

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

        self.timer = Timer()

        with self.timer.phase("Auxiliary information"):
            self.result = self.run()
        print(self.timer)

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

    def histogram(self, data):
        h, b = np.histogram(data, range=[0, data.max()], bins=int(self.binCount))
        return 0.5*(b[1:]+b[:-1]), h

    def pack_json(self, group_df, node_name, data_type):
        hist_inc_grid = self.histogram(np.array(group_df['time (inc)'].tolist()))
        hist_exc_grid = self.histogram(np.array(group_df['time'].tolist()))

        if(data_type == 'callsite'):
            gradients = KDE_gradients(self.states, binCount=self.binCount).run(columnName='name', callsiteOrModule=node_name)

        elif(data_type == 'module'):
            gradients = KDE_gradients(self.states, binCount=self.binCount).run(columnName='module', callsiteOrModule=node_name)

        result = {
                "name": node_name,
                "time (inc)": group_df['time (inc)'].tolist(),
                "time": group_df['time'].tolist(),
                "sorted_time (inc)": group_df['time (inc)'].sort_values().tolist(),
                "sorted_time": group_df['time'].sort_values().tolist(),
                "rank": group_df['rank'].tolist(),
                "id": 'node-' + str(group_df['nid'].tolist()[0]),
                "mean_time (inc)": group_df['time (inc)'].mean(),
                "mean_time": group_df['time'].mean(),
                "max_time (inc)": group_df['time (inc)'].max(),
                "max_time": group_df['time'].max(),
                "min_time (inc)": group_df['time (inc)'].min(),
                "min_time": group_df['time'].min(),
                "dataset": group_df['dataset'].tolist(),
                "module": group_df['module'].tolist()[0],
                "hist_time (inc)": {
                    "x": hist_inc_grid[0].tolist(),
                    "y": hist_inc_grid[1].tolist(),
                    "x_min": hist_inc_grid[0][0],
                    "x_max": hist_inc_grid[0][-1],
                    "y_min": np.min(hist_inc_grid[1]).astype(np.float64),
                    "y_max": np.max(hist_inc_grid[1]).astype(np.float64),
                },
                "hist_time": {
                    "x": hist_exc_grid[0].tolist(),
                    "y": hist_exc_grid[1].tolist(),
                    "x_min": hist_exc_grid[0][0],
                    "x_max": hist_exc_grid[0][-1],
                    "y_min": np.min(hist_exc_grid[1]).astype(np.float64),
                    "y_max": np.max(hist_exc_grid[1]).astype(np.float64),
                },
                "gradients": gradients
            }
        return result

    # # Callsite grouped information
    def callsite_data(self):
        data_type = 'callsite'
        ret = {}
        ## Ensemble data.
        # Group callsite by the name
        name_grouped = self.module_df.groupby(['name'])

        # Create the data dict.
        ensemble = {}
        for name, group_df in name_grouped:
            name_df = self.module_df.loc[self.module_df['name'] == name ]
            ensemble[name] = self.pack_json(name_df, name, data_type)

        ret['ensemble'] = ensemble

        ## Target data.
        # Loop through datasets and group the callsite by name.
        for dataset in self.datasets:
            target = {}
            for name, group_df in name_grouped:
                name_df = self.target_df[dataset].loc[self.target_df[dataset]['name'] == name ]

                # Create the dict.
                if(not name_df.empty):
                    target[name] = self.pack_json(name_df, name, data_type)
            ret[dataset] = target

        return ret

    def module_data(self):
        data_type = 'module'
        ret = {}
        # Module grouped information
        modules = self.df['module'].unique()
        ensemble = {}
        for module in modules:
            module_df = self.df[self.df['module'] == module]
            ensemble[module] = self.pack_json(module_df, module, data_type)

        ret['ensemble'] = ensemble

        for dataset in self.datasets:
            target = {}
            for module in modules:
                module_target_df =  self.target_df[dataset].loc[self.target_df[dataset]['module'] == module]

                if( not module_target_df.empty):
                    target[module] = self.pack_json(module_target_df, module, data_type)

            ret[dataset] = target

        return ret

    def run(self):
        ret = {}
        process = True
        path = self.config.processed_path + f'/{self.config.runName}' + f'/all_data.json'

        if os.path.exists(path) or process != True:
            with open(path, 'r') as f:
                ret = json.load(f)
        else:
            ret['callsite'] = self.callsite_data()
            ret['module'] = self.module_data()
            with open(path, 'w') as f:
                json.dump(ret, f)
        return ret
