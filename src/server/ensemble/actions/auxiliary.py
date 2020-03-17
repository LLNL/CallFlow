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
    def __init__(self, states, binCount="20", datasets=[], config={}, process=True):
        self.df = states['ensemble_entire'].df
        self.binCount = binCount
        self.config = config
        self.states = states

        self.dataset_states = get_dataset_states(states)
        print(self.states)
        self.process = process
        self.datasets = datasets

        self.target_df = {}
        for dataset in datasets:
            self.target_df[dataset] = self.df.loc[self.df['dataset'] == dataset]

        self.timer = Timer()
        self.result = self.run()
        print(self.timer)

    def get_dataset_states(self):
        for idx, state in enumerate(self.states):
            print(state)

    def histogram(self, data):
        h, b = np.histogram(data, range=[0, data.max()], bins=int(self.binCount))
        return 0.5*(b[1:]+b[:-1]), h

    def get_module_callsite_map(self):
        ret = {}
        ret['ensemble'] = {}
        modules = self.df['module'].unique().tolist()
        for module in modules:
            callsites = self.df.loc[self.df['module'] == module]['name'].unique().tolist()
            ret['ensemble'][module] = callsites

        for dataset in self.datasets:
            ret[dataset] = {}
            for module in modules:
                callsites = self.target_df[dataset].loc[self.target_df[dataset]['module'] == module]['name'].unique().tolist()
                ret[dataset][module] = callsites
        return ret

    def get_callsite_module_map(self):
        ret = {}
        callsites = self.df['name'].unique().tolist()
        for callsite in callsites:
            module = self.df.loc[self.df['name'] == callsite]['module'].unique().tolist()
            ret[callsite] = module

        for dataset in self.datasets:
            ret[dataset] = {}
            for callsite in callsites:
                module = self.target_df[dataset].loc[self.target_df[dataset]['name'] == callsite]['name'].unique().tolist()
                ret[dataset][callsite] = module
        return ret

    def pack_json_module(self, group_df, node_name, gradients, all_rank_histogram_inclusive, all_rank_histogram_exclusive):
        with self.timer.phase("Pack data"):
            result = {
                "name": node_name,
                # "time (inc)": group_df['time (inc)'].tolist(),
                # "time": group_df['time'].tolist(),
                # "rank": group_df['rank'].tolist(),
                # "names": group_df['name'].tolist(),
                "id": 'node-' + str(group_df['nid'].tolist()[0]),
                # "sorted_time (inc)": group_df['time (inc)'].sort_values().tolist(),
                # "sorted_time": group_df['time'].sort_values().tolist(),
                "mean_time (inc)": group_df['time (inc)'].mean(),
                "mean_time": group_df['time'].mean(),
                "max_time (inc)": group_df['time (inc)'].max(),
                "max_time": group_df['time'].max(),
                "min_time (inc)": group_df['time (inc)'].min(),
                "min_time": group_df['time'].min(),
                "variance_time": np.var(np.array(group_df['time'])),
                "variance_time (inc)": np.var(np.array(group_df['time (inc)'])),
                # "imbalance_perc_inclusive": group_df['imbalance_perc_inclusive'].tolist()[0],
                # "imbalance_perc_exclusive": group_df['imbalance_perc_exclusive'].tolist()[0],
                # # "std_deviation_inclusive": group_df['std_deviation_inclusive'].tolist()[0],
                # # "std_deviation_exclusive": group_df['std_deviation_exclusive'].tolist()[0],
                # "skewness_inclusive": group_df['skewness_inclusive'].tolist()[0],
                # "skewness_exclusive": group_df['skewness_exclusive'].tolist()[0],
                # "kurtosis_inclusive": group_df['kurtosis_inclusive'].tolist()[0],
                # "kurtosis_exclusive": group_df['kurtosis_exclusive'].tolist()[0],
                "dataset": group_df['dataset'].tolist()[0],
                "module": group_df['module'].tolist()[0],
                "gradients": gradients,
                "all_ranks_inclusive": all_rank_histogram_inclusive,
                "all_ranks_exclusive": all_rank_histogram_exclusive
            }
        return result

    def pack_json_old(self, group_df, node_name, data_type):
        df = self.df.loc[self.df['name'] == node_name ]
        with self.timer.phase("Calculate Histograms"):
            time_inc_ensemble_arr = np.array(df['time (inc)'].tolist())
            time_exc_ensemble_arr = np.array(df['time'].tolist())

            time_inc_target_arr = np.array(group_df['time (inc)'].tolist())
            time_exc_target_arr = np.array(group_df['time'].tolist())

            histogram_inc_array = np.concatenate((time_inc_target_arr, time_inc_ensemble_arr), axis=0)
            histogram_exc_array = np.concatenate((time_exc_target_arr, time_exc_ensemble_arr), axis=0)

            hist_inc_grid = self.histogram(time_inc_target_arr)
            hist_exc_grid = self.histogram(time_exc_target_arr)

        with self.timer.phase("Calculate Gradients"):
            if(data_type == 'callsite'):
                gradients = KDE_gradients(self.states, binCount=self.binCount).run(columnName='name', callsiteOrModule=node_name)

            elif(data_type == 'module'):
                gradients = KDE_gradients(self.states, binCount=self.binCount).run(columnName='module', callsiteOrModule=node_name)

        with self.timer.phase("Pack data"):
            result = {
                "name": node_name,
                # "time (inc)": group_df['time (inc)'].tolist(),
                # "time": group_df['time'].tolist(),
                # "rank": group_df['rank'].tolist(),
                # "names": group_df['name'].tolist(),
                "id": 'node-' + str(group_df['nid'].tolist()[0]),
                # "sorted_time (inc)": group_df['time (inc)'].sort_values().tolist(),
                # "sorted_time": group_df['time'].sort_values().tolist(),
                "mean_time (inc)": group_df['time (inc)'].mean(),
                "mean_time": group_df['time'].mean(),
                "max_time (inc)": group_df['time (inc)'].max(),
                "max_time": group_df['time'].max(),
                "min_time (inc)": group_df['time (inc)'].min(),
                "min_time": group_df['time'].min(),
                "variance_time": np.var(np.array(group_df['time'])),
                "variance_time (inc)": np.var(np.array(group_df['time (inc)'])),
                # "imbalance_perc_inclusive": group_df['imbalance_perc_inclusive'].tolist()[0],
                # "imbalance_perc_exclusive": group_df['imbalance_perc_exclusive'].tolist()[0],
                # # "std_deviation_inclusive": group_df['std_deviation_inclusive'].tolist()[0],
                # # "std_deviation_exclusive": group_df['std_deviation_exclusive'].tolist()[0],
                # "skewness_inclusive": group_df['skewness_inclusive'].tolist()[0],
                # "skewness_exclusive": group_df['skewness_exclusive'].tolist()[0],
                # "kurtosis_inclusive": group_df['kurtosis_inclusive'].tolist()[0],
                # "kurtosis_exclusive": group_df['kurtosis_exclusive'].tolist()[0],
                "dataset": group_df['dataset'].tolist()[0],
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

    # def calculate_callsite_data(df, node_name):
    #     df = self.df.loc[self.df['name'] == node_name ]
    #     with self.timer.phase("Calculate Histograms"):
    #         time_inc_ensemble_arr = np.array(df['time (inc)'].tolist())
    #         time_exc_ensemble_arr = np.array(df['time'].tolist())

    #         time_inc_target_arr = np.array(group_df['time (inc)'].tolist())
    #         time_exc_target_arr = np.array(group_df['time'].tolist())

    #         histogram_inc_array = np.concatenate((time_inc_target_arr, time_inc_ensemble_arr), axis=0)
    #         histogram_exc_array = np.concatenate((time_exc_target_arr, time_exc_ensemble_arr), axis=0)

    #         hist_inc_grid = self.histogram(time_inc_target_arr)
    #         hist_exc_grid = self.histogram(time_exc_target_arr)

    #     with self.timer.phase("Calculate Gradients"):
    #         gradients = KDE_gradients(self.states, binCount=self.binCount).run(columnName='name', callsiteOrModule=node_name)


    def histogram_format(self, histogram_grid):
        return {
            "x": histogram_grid[0].tolist(),
            "y": histogram_grid[1].tolist(),
            "x_min": histogram_grid[0][0],
            "x_max": histogram_grid[0][-1],
            "y_min": np.min(histogram_grid[1]).astype(np.float64),
            "y_max": np.max(histogram_grid[1]).astype(np.float64),
        }

    def all_ranks(self, df, target_df, attr):
        ret = {}

        time_ensemble_arr = np.array(df[attr].tolist())
        time_target_arr = np.array(target_df[attr].tolist())

        combined_array = np.concatenate((time_target_arr, time_ensemble_arr), axis=0)
            
        histogram_ensemble_grid = self.histogram(time_target_arr)
        histogram_target_grid = self.histogram(time_target_arr)

        ret['ensemble'] = self.histogram_format(histogram_ensemble_grid)
        ret['target'] = self.histogram_format(histogram_target_grid)

        return ret

    def average_all_ranks(self, df, target_df, attr):
        ret = {}

        time_ensemble_arr = np.array(df[attr].tolist())
        time_target_arr = np.array(target_df[attr].tolist())

    def calculate_module_data(self, df, module_name):
        ret = {}
        df = self.df.loc[self.df['module'] == module_name ]
        with self.timer.phase("For all MPI ranks"):
            ret['histogram_all_ranks (inc)'] = self.all_ranks()
            

        with self.timer.phase("Calculate Gradients"):
            gradients = KDE_gradients(self.states, binCount=self.binCount).run(columnName='module', callsiteOrModule=module_name)

    # # Callsite grouped information
    # def callsite_data(self):
    #     data_type = 'callsite'
    #     ret = {}
    #     ## Ensemble data.
    #     # Group callsite by the name
    #     name_grouped = self.df.groupby(['name'])

    #     # Create the data dict.
    #     ensemble = {}
    #     for name, group_df in name_grouped:
    #         name_df = self.df.loc[self.df['name'] == name ]
    #         ensemble[name] = self.pack_json_callsite(name_df, name, data_type)

    #     ret['ensemble'] = ensemble

    #     ## Target data.
    #     # Loop through datasets and group the callsite by name.
    #     for dataset in self.datasets:
    #         target = {}
    #         for name, group_df in name_grouped:
    #             name_df = self.target_df[dataset].loc[self.target_df[dataset]['name'] == name ]

    #             # Create the dict.
    #             if(not name_df.empty):
    #                 target[name] = self.pack_json_callsite(name_df, name, data_type)
    #         ret[dataset] = target

    #     return ret

    def module_data(self):
        data_type = 'module'
        ret = {}
        # Module grouped information
        modules = self.df['module'].unique()
        ensemble = {}
        for module in modules:
            module_df = self.df[self.df['module'] == module]
            ensemble[module] = self.pack_json_old(module_df, module, data_type)

        ret['ensemble'] = ensemble
        
        gradients = KDE_gradients(self.states, binCount=self.binCount).run(columnName='module', callsiteOrModule=module)

        for dataset in self.datasets:
            target = {}
            module_ensemble_df = self.df[self.df['module'] == module]
            for module in modules:
                module_target_df = self.target_df[dataset].loc[self.target_df[dataset]['module'] == module]

                if( not module_target_df.empty):
                    all_rank_histogram_inclusive = self.all_ranks(module_ensemble_df, module_target_df, 'time (inc)')
                    all_rank_histogram_exclusive = self.all_ranks(module_ensemble_df, module_target_df, 'time')
                    target[module] = self.pack_json_module(module_target_df, module, gradients, all_rank_histogram_inclusive, all_rank_histogram_exclusive)

            ret[dataset] = target

        return ret

    def run(self):
        ret = {}
        path = self.config.processed_path + f'/{self.config.runName}' + f'/all_data.json'

        self.process = True
        if os.path.exists(path) and not self.process:
            print(f"[Callsite info] Reading the data from file {path}")
            with open(path, 'r') as f:
                ret = json.load(f)
        else:
            print("Processing the data again.")
            # with self.timer.phase("Pack Callsite data"):
            # ret['callsite'] = self.callsite_data()
            # with self.timer.phase("Pack Module data"):
            ret['module'] = self.module_data()
            with self.timer.phase("Module callsite map data"):
                ret['moduleCallsiteMap'] = self.get_module_callsite_map()
            # with self.timer.phase("Callsite module map data"):
            #     ret['callsiteModuleMap'] = self.get_callsite_module_map()
            with self.timer.phase("Writing data"):
                with open(path, 'w') as f:
                    json.dump(ret, f)

        print(type(ret))
        return ret
