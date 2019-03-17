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
from networkx.readwrite import json_graph
from networkx.drawing.nx_agraph import write_dot
    
from preprocess import PreProcess
from callgraph import CallGraph
from actions.groupBy import groupBy
from actions.split_callee import splitCallee
from actions.split_caller import splitCaller
from state import State
from logger import log
import time
import networkx as nx

class CallFlow:
    def __init__(self, config, props):
        # Props contains properties set by the client. 
        self.props = props
        # Config contains properties set by the input config file. 
        self.config = config
        
        # Create states for each dataset.
        # Note: gf would never change from create_gf.
        # Note: fgf would be changed when filter props are changed by client. 
        # Note: df is always updated.
        # Note: graph is always updated.
        # Note: map -> not sure if it can be used.
        self.states = self.default_pipeline()

    def default_pipeline(self):
        states = {}
        for idx, name in enumerate(self.config.names):        
            states[name] = State(self.config, name)
            states[name].fgf = self.filter(states[name]) 

             # Pre-process the dataframe and Graph. 
            preprocess = PreProcess.Builder(states[name]) \
                .add_df_index() \
                .add_n_index() \
                .add_mod_index() \
                .add_path() \
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

            states[name].df = preprocess.df
            states[name].graph = preprocess.graph
            states[name].map = preprocess.map
        return states

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
        fgf = filter_gf.graft()
        log.info("[Graft] {1} rows left (time={0})".format(time.time() - t, filter_gf.dataframe.shape[0]))
        return fgf

    def update(self, action, attr):        
        if action == 'default':
            nx = CallGraph(self.state, 'path', True)      
        elif action == 'filter':
            Filter(self.state)          
        elif action == "groupBy":
            groupBy(self.state, attr)
            nx = CallGraph(self.state, 'group_path', True)
        elif action == "split-callee":
            splitCallee(self.state, attr)
            nx = CallGraph(self.state, 'path', True)
        elif action == "split-caller":
            splitCaller(self.state, attr)
            nx = CallGraph(self.state, 'path', True)
        elif action == "dot-format":
            nx = CallGraph(self.state, 'path', False)
            netx.write_dot(nx.get_graph(), '/Users/jarus/ucd/Research/Visualisation/projects/CallFlow/src/server')
        elif action == "graphml-format":
            nx = CallGraph(self.state, 'path', False)
            name = attr + '.graphml'
            netx.write_graphml(nx.get_graph(), '/home/vidi/Suraj/llnl/CallFlow/src/server/' + name)
        elif action == 'json-format':
            nx = CallGraph(self.state, 'path', false)
            name = attr + '.json'
            utils.graphmltojson('/home/vidi/Suraj/llnl/CallFlow/src/server/' + name, '/home/vidi/Suraj/llnl/CallFlow/src/server/' + name + '.json')
        
        self.state.g = nx.g
        # elif action == "default-dot":
        #     nx = CallGraph(self.state, 'path')
        #     self.cfg = write_dot(nx, "graph.dot")
        #     return nx.get_graph()

        self.json_graph = json_graph.node_link_data(nx.g)
        return nx.get_graph()
    
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
        