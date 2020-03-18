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
import time
import os

class Auxiliary:
    def __init__(self, states, binCount="20", datasets=[], config={}, process=True):
        self.df = states['ensemble_entire'].df
        self.binCount = binCount
        self.config = config
        self.states = states
        self.dataset_states = self.get_dataset_states()

        self.process = process
        self.datasets = datasets
        self.props = ['rank', 'name', 'dataset']


        self.target_df = {}
        for dataset in datasets:
            self.target_df[dataset] = self.df.loc[self.df['dataset'] == dataset]

        self.timer = Timer()
        self.result = self.run()

        print(self.timer)

    def get_dataset_states(self):
        ret = {}
        for idx, state in enumerate(self.states):
            if(state.split('_')[0] != 'ensemble'):
                ret[state] = self.states[state]
        return ret

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

    def pack_json(self, df=pd.DataFrame(), name='', all_ranks_hist={}, gradients={'Inclusive': {}, 'Exclusive': {}}, prop_hists={'Inclusive': {}, 'Exclusive': {}}):
        result = {
            "name": name,
            "id": 'node-' + str(df['nid'].tolist()[0]),
            "dataset": df['dataset'].tolist()[0],
            "module": df['module'].tolist()[0],
            # "rank": df['rank'].tolist(),
            "sorted_time": df['time (inc)'].sort_values().tolist(),
            "sorted_time": df['time'].sort_values().tolist(),
            "Inclusive": {
                # "time": df['time (inc)'].tolist(),
                # "sorted_time": df['time (inc)'].sort_values().tolist(),
                "mean_time": df['time (inc)'].mean(),
                "max_time": df['time (inc)'].max(),
                "min_time": df['time (inc)'].min(),
                "variance_time": np.var(np.array(df['time (inc)'])),
                # "imbalance_perc": df['imbalance_perc_inclusive'].tolist()[0],
                # # "std_deviation": df['std_deviation_inclusive'].tolist()[0],
                # "kurtosis": df['kurtosis_inclusive'].tolist()[0],
                # "skewness": df['skewness_inclusive'].tolist()[0],
                "all_rank_histogram": all_ranks_hist['Inclusive'],
                "gradients": gradients['Inclusive'],
                "prop_histograms": prop_hists['Inclusive']
            },
            "Exclusive": {
                # "time": df['time'].tolist(),
                # "names": df['name'].tolist(),
                # "sorted_time": df['time'].sort_values().tolist(),
                "mean_time": df['time'].mean(),            
                "max_time": df['time'].max(),
                "min_time": df['time'].min(),
                "variance_time": np.var(np.array(df['time'])),
                # "imbalance_perc": df['imbalance_perc_exclusive'].tolist()[0],
                # # "std_deviation": df['std_deviation_exclusive'].tolist()[0],
                # "skewness": df['skewness_exclusive'].tolist()[0],
                # "kurtosis": df['kurtosis_exclusive'].tolist()[0],
                "all_rank_histogram": all_ranks_hist['Exclusive'],
                "gradients": gradients['Exclusive'],
                "prop_histograms": prop_hists['Exclusive']
            }
        }
        return result

    def histogram_format(self, histogram_grid):
        return {
            "x": histogram_grid[0].tolist(),
            "y": histogram_grid[1].tolist(),
            "x_min": histogram_grid[0][0],
            "x_max": histogram_grid[0][-1],
            "y_min": np.min(histogram_grid[1]).astype(np.float64),
            "y_max": np.max(histogram_grid[1]).astype(np.float64),
        }

    def all_ranks(self, df, attr):
        ret = {}
        time_arr = np.array(df[attr].tolist())            
        histogram_grid = self.histogram(time_arr)
        ret = self.histogram_format(histogram_grid)
        return ret

    # Prop can be dataset, rank, name
    def histogram_by_property(self, ensemble_df, target_df, prop):
        ret = {}
        ensemble_prop_grouped = ensemble_df.groupby([prop])[['time', 'time (inc)']].mean()
        target_prop_grouped = target_df.groupby([prop])[['time', 'time (inc)']].mean()

        time_ensemble_inclusive_arr = ensemble_prop_grouped['time (inc)']
        time_ensemble_exclusive_arr = ensemble_prop_grouped['time']

        time_target_inclusive_arr = target_prop_grouped['time (inc)']
        time_target_exclusive_arr = target_prop_grouped['time'] 

        histogram_ensemble_inclusive_grid = self.histogram(np.array(time_ensemble_inclusive_arr))
        histogram_ensemble_exclusive_grid = self.histogram(np.array(time_ensemble_exclusive_arr))
        histogram_target_inclusive_grid = self.histogram(np.array(time_target_inclusive_arr))
        histogram_target_exclusive_grid = self.histogram(np.array(time_target_exclusive_arr))

        ret['Inclusive'] = {
            'ensemble': self.histogram_format(histogram_ensemble_inclusive_grid),
            'target': self.histogram_format(histogram_target_inclusive_grid)
        }
        ret['Exclusive'] = {
            'ensemble': self.histogram_format(histogram_ensemble_exclusive_grid),
            'target': self.histogram_format(histogram_target_exclusive_grid)
        }
        return ret

    # Callsite grouped information
    def callsite_data(self):
        ret = {}
        filtered_df = self.df.loc[self.df['time'] > 0.01*self.config.filter_perc*self.df['time'].max() ]

        print(len(self.df['name'].unique()), len(filtered_df['name'].unique()))
        # Ensemble data.
        # Group callsite by the name
        name_grouped = filtered_df.groupby(['name'])

        # Create the data dict.
        all_ranks_hist = {}
        ensemble = {}
        for callsite, callsite_df in name_grouped:
            all_ranks_hist['Inclusive'] = self.all_ranks(callsite_df, 'time (inc)')
            all_ranks_hist['Exclusive'] = self.all_ranks(callsite_df, 'time')

            gradients = KDE_gradients(self.dataset_states, binCount=self.binCount).run(columnName='name', callsiteOrModule=callsite)

            ensemble[callsite] = self.pack_json(callsite_df, callsite, gradients=gradients, all_ranks_hist=all_ranks_hist)

        ret['ensemble'] = ensemble

        all_ranks_hist = {}
        ## Target data.
        # Loop through datasets and group the callsite by name.
        for dataset in self.datasets:
            name_grouped = self.target_df[dataset].groupby(['name'])
            target = {}
            for callsite, callsite_df in name_grouped:
                # Create the dict.

                all_ranks_hist['Inclusive'] = self.all_ranks(self.target_df[dataset].loc[self.target_df[dataset]['name'] == callsite], 'time (inc)')
                all_ranks_hist['Exclusive'] = self.all_ranks(self.target_df[dataset].loc[self.target_df[dataset]['name'] == callsite], 'time')

                callsite_ensemble_df = self.df[self.df['name'] == callsite]
                # callsite_target_df = self.target_df[dataset].loc[self.target_df[dataset]['name'] == callsite]
                callsite_target_df = callsite_df

                if(not callsite_df.empty):
                    hists = {}
                    hists['Inclusive'] = {}
                    hists['Exclusive'] = {}
                    for prop in self.props:
                        prop_histograms = self.histogram_by_property(callsite_ensemble_df, callsite_target_df, prop)
                        hists['Inclusive'][prop] = prop_histograms['Inclusive']
                        hists['Exclusive'][prop] = prop_histograms['Exclusive']
                    target[callsite] = self.pack_json(df=callsite_target_df, name=callsite, all_ranks_hist=all_ranks_hist, prop_hists=hists)
            ret[dataset] = target

        return ret

    def module_data(self):
        ret = {}
        # Module grouped information
        modules = self.df['module'].unique()
        ensemble = {}
        for module in modules:
            all_ranks_hist = {}
            module_df = self.df[self.df['module'] == module]

            # Calculate all MPI ranks
            all_ranks_hist['Inclusive'] = self.all_ranks(module_df, 'time (inc)')
            all_ranks_hist['Exclusive'] = self.all_ranks(module_df, 'time')

            # Calculate gradients
            gradients = KDE_gradients(self.dataset_states, binCount=self.binCount).run(columnName='module', callsiteOrModule=module)

            ensemble[module] = self.pack_json(df=module_df, name=module, all_ranks_hist=all_ranks_hist, gradients=gradients)

        ret['ensemble'] = ensemble
        
        for dataset in self.datasets:
            target = {}
            for module in modules:
                # Calculate all MPI ranks
                all_ranks_hist['Inclusive'] = self.all_ranks(self.target_df[dataset], 'time (inc)')
                all_ranks_hist['Exclusive'] = self.all_ranks(self.target_df[dataset], 'time')

                gradients = KDE_gradients(self.dataset_states, binCount=self.binCount).run(columnName='module', callsiteOrModule=module)

                module_ensemble_df = self.df[self.df['module'] == module]
                module_target_df = self.target_df[dataset].loc[self.target_df[dataset]['module'] == module]

                hists = {}
                hists['Inclusive'] = {}
                hists['Exclusive'] = {}
                if( not module_target_df.empty):
                    for prop in self.props:
                        prop_histograms =  self.histogram_by_property(module_ensemble_df, module_target_df, prop)
                        hists['Inclusive'][prop] = prop_histograms['Inclusive']
                        hists['Exclusive'][prop] = prop_histograms['Exclusive']
                    target[module] = self.pack_json(df=module_target_df, name=module, all_ranks_hist=all_ranks_hist, gradients=gradients, prop_hists=hists)

            ret[dataset] = target

        return ret

    def run(self):
        ret = {}
        path = self.config.processed_path + f'/{self.config.runName}' + f'/all_data.json'

        # self.process = True
        if os.path.exists(path) and not self.process:
            print(f"[Callsite info] Reading the data from file {path}")
            with open(path, 'r') as f:
                ret = json.load(f)
        else:
            print("Processing the data again.")
            with self.timer.phase("Collect Callsite data"):
                ret['callsite'] = self.callsite_data()
            with self.timer.phase("Collect Module data"):
                ret['module'] = self.module_data()
            with self.timer.phase("Module callsite map data"):
                ret['moduleCallsiteMap'] = self.get_module_callsite_map()
            # with self.timer.phase("Callsite module map data"):
            #     ret['callsiteModuleMap'] = self.get_callsite_module_map()
            with self.timer.phase("Writing data"):
                with open(path, 'w') as f:
                    json.dump(ret, f)

        return ret