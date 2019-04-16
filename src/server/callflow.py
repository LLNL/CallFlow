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
#!/usr/bin/env python3

from hatchet import *
import time
import utils
import pprint
from logger import log
from networkx.drawing.nx_agraph import write_dot
    
from preprocess import PreProcess
from callgraph import CallGraph
from actions.groupBy import groupBy
from actions.split_callee import splitCallee
from actions.split_caller import splitCaller
from actions.split_level import splitLevel
from actions.struct_diff import structDiff
from actions.module_hierarchy import moduleHierarchy
from state import State
from logger import log
import time
import networkx as nx
import pandas as pd
import json
import os

class CallFlow:
    def __init__(self, config, props):
        # Props contains properties set by the client. 
        self.props = props
        # Config contains properties set by the input config file. 
        self.config = config
        
        self.reProcess = False

        # Create states for each dataset.
        # Note: gf would never change from create_gf.
        # Note: fgf would be changed when filter props are changed by client. 
        # Note: df is always updated.
        # Note: graph is always updated.
        # Note: map -> not sure if it can be used.
        self.states = self.default_pipeline()
    
    def dfs(self, graph, limit):
        self.level = 0
        
        def dfs_recurse(root):
            for node in root.children:
                if(self.level < limit):
                    print("Node : ", node)
                    self.level += 1
                    dfs_recurse(node)
        
        for root in graph.roots:
            dfs_recurse(root)
            
    def default_pipeline(self):
        if self.reProcess:
            print("Processing with filter.")
        else:
            print("Reading from the processed files.")
        
        states = {}
        for idx, name in enumerate(self.config.names):   
            states[name] = State()
            # This step takes a bit of time so do it only if required. 
            # It would be required especially when filtering and stuff. 
            if(self.reProcess):
                states[name] = self.create_gf(states[name], name)
                states[name] = self.process(states[name])
                self.write_gf(states, name)
            else:
                states[name] = self.read_gf(name)

            # self.dfs(states[name].graph, 20)
            # print(states[name].df.head())
        return states

    def process(self, state):
        # Filter the graphframe based on inc_time or exc_time. 
        state.entire_df = state.df
        state.entire_graph = state.graph
        state.fgf = self.filter(state) 
        # update df and graph after filtering.
        state.df = state.fgf.dataframe
        state.graph = state.fgf.graph
        state.hashMap = state.node_hash_mapper()

        # Pre-process the dataframe and Graph. 
        preprocess = PreProcess.Builder(state) \
            .add_df_index() \
            .add_n_index() \
            .add_mod_index() \
            .add_callers_and_callees() \
            .add_show_node() \
            .add_vis_node_name() \
            .update_module_name() \
            .clean_lib_monitor() \
            .add_max_incTime() \
            .add_incTime() \
            .add_excTime() \
            .add_avg_incTime() \
            .add_imbalance_perc() \
            .build()

        state.df = preprocess.df
        state.graph = preprocess.graph
        state.map = preprocess.map
        self.dfs(state.graph, 50)


        return state

    def write_gf(self, states, name):
        state = states[name]
        dirname = '/'.join(os.path.dirname(__file__).split('/')[:-2])
        print('writing to file')
        # dump the entire_graph as literal
        # entire_graph_literal = state.entire_graph.to_literal(graph=state.entire_graph, dataframe=state.entire_df)
        # print(entire_graph_literal)
        # entire_graph_filepath = dirname + self.config.paths[name][1:] + '/entire_graph.json'
        # with open(entire_graph_filepath, 'w') as entire_graphFile:
        #     json.dump(entire_graph_literal, entire_graphFile)

        # dump the filtered graph as literal.
        literal = state.graph.to_literal(graph=state.graph, dataframe=state.df)
        graph_filepath = dirname + self.config.paths[name][1:] + '/graph.json'
        with open(graph_filepath, 'w') as graphFile:
            json.dump(literal, graphFile)

        # # dump the entire dataframe to csv. 
        # entire_df_filepath = dirname + self.config.paths[name][1:] + '/entire_df.csv'
        # state.entire_df.to_csv(entire_df_filepath)

        # # dump the filtered dataframe to csv.
        # df_filepath = dirname + self.config.paths[name][1:] + '/df.csv'
        # state.df.to_csv(df_filepath)

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
        dirname = '/'.join(os.path.dirname(__file__).split('/')[:-2])
        df_filepath = dirname + self.config.paths[name][1:] + '/df.csv'
        entire_df_filepath = dirname + self.config.paths[name][1:] + '/entire_df.csv'
        graph_filepath = dirname + self.config.paths[name][1:] + '/graph.json'
        entire_graph_filepath = dirname + self.config.paths[name][1:] + '/entire_graph.json'      
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

        state.map = state.node_hash_mapper()

        # Print the module group by information. 
        # print(state.df.groupby(['module']).agg(['mean','count']))

        # replace df['node'] from str to the Node object.
        state.df = self.replace_str_with_Node(state.df, state.graph)
        state.entire_df = self.replace_str_with_Node(state.entire_df, state.entire_graph)

        # add path to the dataframes. 
        # state.df['path'] = state.df['node'].apply(lambda node: node.callpath)
        # state.entire_df['path'] = state.entire_df['node'].apply(lambda node: node.callpath if node else [])

        
        return state

     # Loops over the config.paths and gets the graphframe from hatchet
    def create_gf(self, state, name):
        state = State()
        log.info("[State] Creating graphframes: {0}".format(name))
        callflow_path = os.path.abspath(os.path.join(__file__, '../../..'))
        data_path = os.path.abspath(os.path.join(callflow_path, self.config.paths[name]))

        gf = GraphFrame()
        if self.config.format[name] == 'hpctoolkit':
            gf.from_hpctoolkit(data_path)
        elif self.config.format[name] == 'caliper':                
            gf.from_caliper(data_path)  

        state.gf = gf
        state.df = gf.dataframe
        state.graph = gf.graph
        
        return state

    def filter(self, state):
        t = time.time()
        if self.props['filterBy'] == "IncTime":
            max_inclusive_time = utils.getMaxIncTime(state.gf)
            filter_gf = state.gf.filter(lambda x: True if(x['time (inc)'] > 0.01*max_inclusive_time) else False)
        elif self.args['filterBy'] == "ExcTime":
            max_exclusive_time = utils.getMaxExcTime(state.gf)
            log.info('[Filter] By Exclusive time = {0})'.format(max_exclusive_time))
            filter_gf = state.gf.filter(lambda x: True if (x['time'] > 0.01*max_exclusive_time) else False)
        else:
            log.warn("Not filtering.... Can take forever. Thou were warned")
            filter_gf = state.gf
        log.info('[Filter] Removed {0} rows. (time={1})'.format(state.gf.dataframe.shape[0] - filter_gf.dataframe.shape[0], time.time() - t))
        log.info("Grafting the graph!")
        t = time.time()
        fgf = filter_gf.squash()
        log.info("[Squash] {1} rows in dataframe (time={0})".format(time.time() - t, filter_gf.dataframe.shape[0]))
        return fgf

    def update(self, action, attr, dataset, dataset2):
        state = self.states[dataset]
        if(dataset2 != None):
            state2 = self.states[dataset2]
        print("[{0}] {1}".format(action, dataset))
        if action == 'default':
            groupBy(state, attr)
            nx = CallGraph(state, 'group_path', True, 'name')      
        elif action == 'filter':
            Filter(state)    
            nx = CallGraph(state, 'group_path', True, 'module')      
        elif action == "group":
            groupBy(state, attr)
            nx = CallGraph(state, 'group_path', True, 'module')
        elif action == 'diff':
            structDiff(state, state2)
            nx = CallGraph(state, 'group_path', True, 'module')
        elif action == 'split-level':
            splitLevel(state, attr)
            nx = CallGraph(state, 'group_path', True)
        elif action == "split-callee":
            splitCallee(state, attr)
            nx = CallGraph(state, 'path', True)
        elif action == "split-caller":
            splitCaller(state, attr)
            nx = CallGraph(state, 'path', True)
        elif action == 'module-hierarchy':
            nx = CallGraph(state, 'path', False, 'name')
            state.entire_g = nx.g
            moduleHierarchy(state, attr)

        state.g = nx.g   

        return state.g 

    def write_df(self):
        for name, state in self.states.items():
            print('Writing {0}'.format(name))
            state.df.to_csv('./test_{0}.csv'.format(name))
            
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
        