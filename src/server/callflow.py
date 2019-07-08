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

from hatchet import *
import time
import utils
from logger import log

from networkx.drawing.nx_agraph import write_dot
from networkx.readwrite import json_graph

from preprocess import PreProcess
from callgraph import CallGraph
from actions.create import Create
from actions.groupBy import groupBy
from actions.split_callee import splitCallee
from actions.split_caller import splitCaller
from actions.split_level import splitLevel
from actions.struct_diff import structDiff
from actions.cct import CCT
from actions.module_hierarchy import moduleHierarchy
from actions.filter import Filter
from state import State
from logger import log

import time
import networkx as nx
import pandas as pd
import json
import os


class CallFlow:
    def __init__(self, config):
        # Config contains properties set by the input config file. 
        self.config = config
        self.reUpdate = False
        self.reProcess = config.preprocess

        # Create states for each dataset.
        # Note: gf would never change from create_gf.
        # Note: fgf would be changed when filter props are changed by client. 
        # Note: df is always updated.
        # Note: graph is always updated.
        # Note: map -> not sure if it can be used.
        self.states = self.pipeline(self.config.names)

        self.config.max_incTime = 0
        self.config.min_incTime = 0
        self.config.max_excTime = 0
        self.config.min_excTime = 0
        for idx, state in enumerate(self.states):
            self.config.max_incTime = utils.getMaxIncTime(self.states[state].gf)
            self.config.max_excTime = utils.getMaxExcTime(self.states[state].gf)
            self.config.min_incTime = utils.getMinIncTime(self.states[state].gf)
            self.config.min_excTime = utils.getMinExcTime(self.states[state].gf)

    def pipeline(self, datasets, filterBy="Inclusive", filterPerc="10"):
        if self.reProcess:
            utils.debug("Processing with filter.")
        else:
            utils.debug("Reading from the processed files.")
        
        states = {}
        for idx, dataset_name in enumerate(datasets):   
            states[dataset_name] = State()
            # This step takes a bit of time so do it only if required. 
            # It would be required especially when filtering and stuff. 
            if(self.reProcess):
                states[dataset_name] = self.create(dataset_name)
                states[dataset_name] = self.process(states[dataset_name])
                self.write_gf(states[dataset_name], dataset_name, 'entire')
                states[dataset_name] = self.filter(states[dataset_name], filterBy, filterPerc) 
                self.write_gf(states[dataset_name], dataset_name, 'filter')
            elif(self.reUpdate):
                states[dataset_name] = self.create(dataset_name)
                states[dataset_name] = self.process(states[dataset_name])
                states[dataset_name] = self.filter(states[dataset_name], filterBy, filterPerc)
            else:
                states[dataset_name] = self.read_gf(dataset_name)
                
        return states

    def create(self, name):
        state = State()
        create = Create(self.config, name)

        state.gf = create.gf
        state.df = create.df
        state.node_hash_map = create.node_hash_map    
        state.graph = create.graph       
        
        print("After Creating.")
        print(state.df.groupby(['module']).mean())
        return state

    def process(self, state):        
        # Pre-process the dataframe and Graph. 
        preprocess = PreProcess.Builder(state) \
            .add_n_index() \
            .add_mod_index() \
            .add_callers_and_callees() \
            .add_show_node() \
            .add_vis_node_name() \
            .update_module_name() \
            .add_max_incTime() \
            .add_incTime() \
            .add_excTime() \
            .add_avg_incTime() \
            .add_imbalance_perc() \
            .add_path() \
            .build()

        state.gf = preprocess.gf
        state.df = preprocess.df
        state.graph = preprocess.graph
        state.node_hash_map = preprocess.node_hash_map

        return state

    def filter(self, state, filterBy, filterPerc):
        filter_obj = Filter(state, filterBy, filterPerc)

        state.gf = filter_obj.gf
        state.df = filter_obj.df
        state.graph = filter_obj.graph
        state.node_hash_map = filter_obj.node_hash_map

        return state

    def write_gf(self, state, state_name, format_of_df, write_graph=True):
        dirname = self.config.callflow_dir
        utils.debug('writing file for format. \n', format_of_df)

        if write_graph:
            # dump the entire_graph as literal
            graph_literal = state.graph.to_literal(graph=state.graph, dataframe=state.df)
            graph_filepath = dirname + '/' +     state_name + '/' + format_of_df + '_graph.json'
            utils.debug('File path: {0}'.format(graph_filepath))
            with open(graph_filepath, 'w') as graphFile:
                json.dump(graph_literal, graphFile)

        # dump the filtered dataframe to csv.
        df_filepath = dirname + '/' + state_name + '/' + format_of_df + '_df.csv'
        state.df.to_csv(df_filepath)

    def replace_str_with_Node(self, df, graph):
        mapper = {}

        def dfs_recurse(root):
            for node in root.children: 
                mapper[node.callpath[-1]] = Node(node.nid, node.callpath, None)
                dfs_recurse(node)
        for root in graph.roots:
            mapper[root.callpath[-1]] = Node(root.nid, root.callpath, None)
            dfs_recurse(root)
        df['node'] = df['node'].apply(lambda node: mapper[node] if node in mapper else '')
        return df

    def read_gf(self, name):
        state = State()
        dirname = self.config.callflow_dir
        df_filepath = dirname + '/' + name +  '/filter_df.csv'
        entire_df_filepath = dirname + '/' + name + '/entire_df.csv'
        graph_filepath = dirname + '/' + name + '/filter_graph.json'
        entire_graph_filepath = dirname + '/' + name + '/entire_graph.json'   

        with open(graph_filepath, 'r') as graphFile:
            data = json.load(graphFile)

        state.gf = GraphFrame()
        state.gf.from_literal(data)

        with open(entire_graph_filepath, 'r') as entire_graphFile:
            entire_data = json.load(entire_graphFile)
            
        state.entire_gf = GraphFrame()
        state.entire_gf.from_literal(entire_data)

        state.df = pd.read_csv(df_filepath)
        state.entire_df = pd.read_csv(entire_df_filepath)

        state.graph = state.gf.graph
        state.entire_graph = state.entire_gf.graph

        state.map = utils.node_hash_mapper(state.entire_df)

        # Print the module group by information. 
        # print(state.df.groupby(['module']).agg(['mean','count']))

        # replace df['node'] from str to the Node object.
        state.df = self.replace_str_with_Node(state.df, state.graph)
        state.entire_df = self.replace_str_with_Node(state.entire_df, state.entire_graph)

        return state

    def histogram(self, state, mod_index):            
        ret = []
        df = state.df
        entire_df = state.entire_df
        func_in_module = df[df.mod_index == mod_index]['name'].unique().tolist()
        
        for idx, func in enumerate(func_in_module):
            ret.append({
                "name": func,
                "time (inc)": entire_df.loc[entire_df['name'] == func]['time (inc)'].tolist(),
                "time": entire_df.loc[entire_df['name'] == func]['time'].tolist(),
                "rank": entire_df.loc[entire_df['name'] == func]['rank'].tolist(),
            })
        ret_df = pd.DataFrame(ret)
        return ret_df.to_json(orient="columns")

    def miniHistograms(self, state):
        ret = {}
        ret_df = {}
        df = state.df
        entire_df = state.entire_df
        modules_in_df = df['_module'].unique()

        for module in modules_in_df:
            func_in_module = df[df._module == module]['name'].unique().tolist()
            for idx, func in enumerate(func_in_module):
                func_df = entire_df.loc[entire_df['name'] == func]
                if module not in ret:
                    ret[module] = []
                ret[module].append({
                    "name": func,
                    "time (inc)": func_df['time (inc)'].tolist(),
                    "mean_time (inc)": func_df['time (inc)'].mean(),
                    "time": func_df['time'].tolist(),
                    "mean_time": func_df['time'].mean(),
                    "rank": func_df['rank'].tolist(),
                })
            ret_df[module] = pd.DataFrame(ret[module])
            ret[module] = ret_df[module].to_json(orient="columns")
        return json.dumps(ret)

    def tooltip(self, state, mod_index):
        ret = []
        df = state.df
        entire_df = state.entire_df
        func_in_module = df[df.mod_index == mod_index]['name'].unique().tolist()
        
        for idx, func in enumerate(func_in_module):
            ret.append({
                "name": func,
                "time (inc)": entire_df.loc[entire_df['name'] == func]['time (inc)'].tolist(),
                "time": entire_df.loc[entire_df['name'] == func]['time'].tolist(),
                "rank": entire_df.loc[entire_df['name'] == func]['rank'].tolist(),
            })
        ret_df = pd.DataFrame(ret)
        return ret_df.to_json(orient="columns")

    def update(self, action):
        utils.debug('Update', action)

        dataset1 = action['dataset1']
        state1 = self.states[dataset1]

        # Some checks. 
        if("dataset2" in action):
            dataset2 = action['dataset2']
            state2 = self.states[dataset2]
        action_name = action["name"]

        if 'groupBy' in action:
            utils.debug('Grouping by: ', action['groupBy'])
        else:
            action['groupBy'] = 'name'

        # Compare against the different operations
        if action_name == 'default':
            groupBy(state1, action["groupBy"])
            nx = CallGraph(state1, 'group_path', True, action["groupBy"])
        
        elif action_name == 'filter':
            datasets = [dataset1]
            if ("dataset2" in action):
                datasets = [dataset1, dataset2]
            self.reUpdate = True
            self.states = self.pipeline(datasets, action["filterBy"], action["filterPerc"]) 
            groupBy(self.states[dataset1], action["groupBy"])
            nx = CallGraph(self.states[dataset1], 'group_path', True, action["groupBy"])
            self.reUpdate = False
        
        elif action_name == "group":
            group = groupBy(state1, action["groupBy"])
            self.states[dataset1].gdf = group.df
            self.states[dataset1].graph = group.graph 
            write_graph = False
            self.write_gf(state1, dataset1, "group", write_graph)
            if(action['groupBy'] == 'module'):
                path_type = 'group_path'
            elif(action['groupBy'] == 'name'):
                path_type = 'path'
            nx = CallGraph(state1, path_type, True, action["groupBy"])

        elif action_name == 'diff':
            union_state = structDiff(state1, state2)
            nx = union_state
            # nx = CallGraph(union_state, 'group_path', True, 'module')
        
        elif action_name == 'split-level':
            splitLevel(state1, action["groupBy"])
            nx = CallGraph(state1, 'group_path', True)
        
        elif action_name == "split-callee":
            splitCallee(state1, action["groupBy"])
            nx = CallGraph(state1, 'path', True)
        
        elif action_name == "split-caller":
            splitCaller(state1, action["groupBy"])
            nx = CallGraph(state1, 'path', True)
        
        elif action_name == 'hierarchy':
            mH = moduleHierarchy(self.states[dataset1], action["module"])
            # hierarchy = mH.hierarchy
            # return json_graph.node_link_data(hierarchy)
            return mH.result 

        elif action_name == 'histogram':
            ret = self.histogram(state1, action["mod_index"])
            return ret

        elif action_name == "mini-histogram":
            ret = self.miniHistograms(state1)
            return ret

        elif action_name == "cct":
            nx = CCT(state1)
            return nx.g
           
        state1.g = nx.g

        return state1.g 

    def displayStats(self, name):
        log.warn('==========================')
        log.info("Number of datasets : {0}".format(len(self.config[name].paths.keys())))
        log.info('Stats: Dataset ({0}) '.format(name))
        log.warn('==========================')
        max_inclusive_time = utils.getMaxIncTime(gf)
        max_exclusive_time = utils.getMaxExcTime(gf)
        avg_inclusive_time = utils.getAvgIncTime(gf)
        avg_exclusive_time = utils.getAvgExcTime(gf)
        num_of_nodes = utils.getNumOfNodes(gf)
        log.info("[] Rows in dataframe: {0}".format(self.states[name].df.shape[0]))
        log.info('Max Inclusive time = {0} '.format(max_inclusive_time))
        log.info('Max Exclusive time = {0} '.format(max_exclusive_time))
        log.info('Avg Inclusive time = {0} '.format(avg_inclusive_time))
        log.info('Avg Exclusive time = {0} '.format(avg_exclusive_time))
        log.info('Number of nodes in CCT = {0}'.format(num_of_nodes))
        