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

        return state

    def write_gf(self, states, name):
        state = states[name]
        dirname = '/'.join(os.path.dirname(__file__).split('/')[:-2])
        literal = state.graph.to_literal(graph=state.graph, dataframe=state.df)
        graph_filepath = dirname + self.config.paths[name][1:] + '/graph.json'
        with open(graph_filepath, 'w') as graphFile:
            json.dump(literal, graphFile)

        df_filepath = dirname + self.config.paths[name][1:] + '/df.csv'
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
        df['node'] = df['node'].apply(lambda node: mapper[node])
        return df

    def read_gf(self, name):
        state = State()
        dirname = '/'.join(os.path.dirname(__file__).split('/')[:-2])
        graph_filepath = dirname + self.config.paths[name][1:] + '/graph.json'
        df_filepath = dirname + self.config.paths[name][1:] + '/df.csv'
        with open(graph_filepath, 'r') as graphFile:
            data = json.load(graphFile)

        state.gf = GraphFrame()
        state.gf.from_literal(data)
        state.df = pd.read_csv(df_filepath)
        state.graph = state.gf.graph
        state.map = state.node_hash_mapper()

        # replace df['node'] from str to the Node object.
        state.df = self.replace_str_with_Node(state.df, state.graph)
        
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

    def update(self, action, attr):    
        name = 'kripke-impi'
        print(self.states.keys())
        state = self.states[name]
        print("[{0}] {1}".format(action, name))
        if action == 'default':
            nx = CallGraph(state, 'path', True)      
        elif action == 'filter':
            Filter(state)    
            nx = CallGraph(state, 'group_path', True)      
        elif action == "group":
            groupBy(state, attr)
            nx = CallGraph(state, 'group_path', True)
        elif action == 'split-level':
            splitLevel(state, attr)
            nx = CallGraph(state, 'group_path', True)
        elif action == "split-callee":
            splitCallee(state, attr)
            nx = CallGraph(state, 'path', True)
        elif action == "split-caller":
            splitCaller(state, attr)
            nx = CallGraph(state, 'path', True)
        elif action == "dot-format":
            nx = CallGraph(state, 'path', False)
            nx.write_dot(nx.get_graph(), '/Users/jarus/ucd/Research/Visualisation/projects/CallFlow/src/server')
        elif action == "graphml-format":
            nx = CallGraph(state, 'path', False)
            name = attr + '.graphml'
            nx.write_graphml(nx.get_graph(), '/home/vidi/Suraj/llnl/CallFlow/src/server/' + name)
        elif action == 'json-format':
            nx = CallGraph(state, 'path', false)
            name = attr + '.json'
            utils.graphmltojson('/home/vidi/Suraj/llnl/CallFlow/src/server/' + name, '/home/vidi/Suraj/llnl/CallFlow/src/server/' + name + '.json')
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
        