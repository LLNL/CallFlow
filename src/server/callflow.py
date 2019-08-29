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
from timer import Timer

from networkx.drawing.nx_agraph import write_dot
from networkx.readwrite import json_graph

from preprocess import PreProcess
from callgraph import CallGraph
from diffgraph import DiffGraph

from actions.create import Create
from actions.groupBy import groupBy
from actions.mini_histogram import MiniHistogram
from actions.histogram import Histogram
from actions.scatterplot import Scatterplot
from actions.split_callee import splitCallee
from actions.split_caller import splitCaller
from actions.split_rank import splitRank
from actions.split_level import splitLevel
from actions.struct_diff import structDiff
from actions.cct import CCT
from actions.module_hierarchy import moduleHierarchy
from actions.filter import Filter
from actions.bland_altman import BlandAltman
from actions.function_list import FunctionList
from actions.union_graph import UnionGraph

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
        self.processEntire = config.entire
        self.processFilter = config.filter

        # Create states for each dataset.
        # Note: gf would never change from create_gf.
        # Note: fgf would be changed when filter props are changed by client. 
        # Note: df is always updated.
        # Note: graph is always updated.
        # Note: map -> not sure if it can be used.
        self.timer = Timer()
        self.states = self.pipeline(self.config.names)

    def pipeline(self, datasets, filterBy="Inclusive", filterPerc="10"):
        if self.reProcess:
            utils.debug("Processing with filter.")
        else:
            utils.debug("Reading from the processed files.")
        
        states = {}
        for idx, dataset_name in enumerate(datasets):   
            states[dataset_name] = State()
            if(self.reProcess and self.processEntire):
                states[dataset_name] = self.create(dataset_name)
                states[dataset_name] = self.process(states[dataset_name], 'entire')
                self.write_gf(states[dataset_name], dataset_name, 'entire')
                states[dataset_name] = self.filter(states[dataset_name], filterBy, filterPerc) 
                self.write_gf(states[dataset_name], dataset_name, 'filter')
            elif(self.reProcess and self.processFilter):
                states[dataset_name] = self.read_entire_gf(dataset_name)
                states[dataset_name] = self.filter(states[dataset_name], filterBy, filterPerc) 
                self.write_gf(states[dataset_name], dataset_name, 'filter')
            elif(self.reUpdate):
                states[dataset_name] = self.create(dataset_name)
                states[dataset_name] = self.process(states[dataset_name], 'filter')
                states[dataset_name] = self.filter(states[dataset_name], filterBy, filterPerc)
            else:
                states[dataset_name] = self.read_gf(dataset_name)
                
        return states

    def setConfig(self):
        self.config.max_incTime = {}
        self.config.max_excTime = {}
        self.config.min_incTime = {}
        self.config.min_excTime = {}
        self.config.numbOfRanks = {}
        for idx, state in enumerate(self.states):
            self.config.max_incTime[state] = utils.getMaxIncTime(self.states[state])
            self.config.max_excTime[state] = utils.getMaxExcTime(self.states[state])
            self.config.min_incTime[state] = utils.getMinIncTime(self.states[state])
            self.config.min_excTime[state] = utils.getMinExcTime(self.states[state])
            self.config.numbOfRanks[state] = utils.getNumbOfRanks(self.states[state])

    def create(self, name):
        state = State()
        create = Create(self.config, name)

        state.entire_gf = create.gf
        state.entire_df = create.df
        state.entire_graph = create.graph
        
        # print("After Creating.")
        # print(state.df.groupby(['module']).mean())
        return state

    def process(self, state, gf_type):        
        # Pre-process the dataframe and Graph. 
        preprocess = PreProcess.Builder(state, gf_type) \
            .add_n_index() \
            .add_mod_index() \
            .add_callers_and_callees() \
            .add_show_node() \
            .add_vis_node_name() \
            .update_module_name() \
            .add_path() \
            .build()

        state.gf = preprocess.gf
        state.df = preprocess.df
        state.graph = preprocess.graph

        return state

    def filter(self, state, filterBy, filterPerc):
        filter_obj = Filter(state, filterBy, filterPerc)

        state.gf = filter_obj.gf
        state.df = filter_obj.df
        state.graph = filter_obj.graph

        return state

    def write_gf(self, state, state_name, format_of_df, write_graph=True):
        dirname = self.config.callflow_dir
        utils.debug('writing file for {0} format'.format(format_of_df))

        if write_graph:
            # dump the entire_graph as literal
            graph_literal = state.graph.to_literal(graph=state.graph, dataframe=state.df)
            graph_filepath = dirname + '/' + state_name + '/' + format_of_df + '_graph.json'
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

    def read_entire_gf(self, name):
        log.info('[Process] Reading the entire dataframe and graph')
        state = State()
        dirname = self.config.callflow_dir
        entire_df_filepath = dirname + '/' + name + '/entire_df.csv'
        entire_graph_filepath = dirname + '/' + name + '/entire_graph.json'   

        with open(entire_graph_filepath, 'r') as entire_graphFile:
            entire_data = json.load(entire_graphFile)
            
        state.entire_gf = GraphFrame()
        state.entire_gf.from_literal(entire_data)

        state.entire_df = pd.read_csv(entire_df_filepath)
        state.entire_graph = state.entire_gf.graph

        # replace df['node'] from str to the Node object.
        state.entire_df = self.replace_str_with_Node(state.entire_df, state.entire_graph)

        return state

    def read_gf(self, name):
        state = State()
        dirname = self.config.callflow_dir
        df_filepath = dirname + '/' + name + '/filter_df.csv'
        entire_df_filepath = dirname + '/' + name + '/entire_df.csv'
        graph_filepath = dirname + '/' + name + '/filter_graph.json'
        entire_graph_filepath = dirname + '/' + name + '/entire_graph.json'   

        with self.timer.phase('data frame'):
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

        # state.map = utils.node_hash_mapper(state.entire_df)

        # Print the module group by information. 
        # print(state.df.groupby(['module']).agg(['mean','count']))

        # replace df['node'] from str to the Node object.
        state.df = self.replace_str_with_Node(state.df, state.graph)
        state.entire_df = self.replace_str_with_Node(state.entire_df, state.entire_graph)

        return state

    def read_group_gf(self, name):
        state = State()
        dirname = self.config.callflow_dir
        group_df_file_path = dirname + '/' + name + '/group_df.csv'
        group_graph_file_path = dirname + '/' + name + '/filter_graph.json'

        with self.timer.phase('Read group dataframe'):
            with open(group_graph_file_path, 'r') as groupGraphFile:
                data = json.load(groupGraphFile)

        state.group_gf = GraphFrame()
        state.group_gf.from_literal(data)

        state.group_graph = state.group_gf.graph
        state.group_df = pd.read_csv(group_df_file_path)
        state.group_df = self.replace_str_with_Node(state.group_df, state.group_graph)

        return state

    def update(self, action):
        utils.debug('Update', action)
        action_name = action["name"]

        if action_name == 'init':
            self.setConfig()
            return self.config

        if 'groupBy' in action:
            utils.debug('Grouping by: ', action['groupBy'])
        else:
            action['groupBy'] = 'name'

        dataset1 = action['dataset1']
        state1 = self.states[dataset1]

        print("The selected Dataset is ", dataset1)

        # Compare against the different operations
        if action_name == 'default':
            groupBy(state1, action["groupBy"])
            nx = CallGraph(state1, 'group_path', True, action["groupBy"])
        
        elif action_name == 'reset':
            datasets = [dataset1]
            self.reProcess = True
            self.states = self.pipeline(datasets, action["filterBy"], action["filterPerc"])
            self.reProcess  = False
            self.states = self.pipeline(datasets)
            return {}

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
            state1.g = nx.g
            return nx.g
        
        elif action_name == 'split-level':
            splitLevel(state1, action["groupBy"])
            nx = CallGraph(state1, 'group_path', True)
            return nx.g
        
        elif action_name == "split-callee":
            splitCallee(state1, action["groupBy"])
            nx = CallGraph(state1, 'path', True)
            return nx.g
        
        elif action_name == "split-caller":
            splitCaller(state1, action["groupBy"])
            nx = CallGraph(state1, 'path', True)
            return nx.g
        
        elif action_name == 'hierarchy':
            mH = moduleHierarchy(self.states[dataset1], action["module"])
            return mH.result 

        elif action_name == 'histogram':
            histogram = Histogram(state1, action["module"])
            return histogram.result

        elif action_name == "mini-histogram":
            minihistogram = MiniHistogram(state1)
            return minihistogram.result

        elif action_name == "cct":
            nx = CCT(state1, action['functionInCCT'])
            return nx.g

        elif action_name == 'split-rank':
            ret = splitRank(state1, action['ids'])
            return ret

        elif action_name == 'function':
            functionlist = FunctionList(state1, action['module'])
            return functionlist.result

    def update_diff(self, action):
        utils.debug('Update Diff', action)
        action_name = action["name"]
        datasets = action['datasets']

        if action_name == 'init':
            self.setConfig()

            if(action['groupBy'] == 'module'):
                path_type = 'group_path'
            elif(action['groupBy'] == 'name'):
                path_type = 'path'

            for idx, dataset in enumerate(datasets):
                group_state = self.read_group_gf(dataset)
                graph = DiffGraph(group_state, path_type, True, action['groupBy'])
                self.states[dataset].g = graph.g
            return self.config

        elif action_name == "group":
            u_graph = UnionGraph()
            for idx, dataset in enumerate(datasets):
                u_graph.unionize(self.states[dataset].g, dataset)
            return u_graph.R

        elif action_name == 'scatterplot':
            if(action['plot'] == 'bland-altman'):
                state1 = self.states[action['dataset1']]
                state2 = self.states[action['dataset2']]
                col = action['col']
                catcol = action['catcol']
                dataset1 = action['dataset1']
                dataset2 = action['dataset2']
                ret = BlandAltman(state1, state2, col, catcol, dataset1, dataset2).results
            return ret

        elif action_name == 'Gromov-wasserstein':
            ret = {}       
            return ret  

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
        