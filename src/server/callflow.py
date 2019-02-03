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
import networkx as netx

# need to make this observable on gf. When the gf changes the whole thing reflects
class CallFlow:
    def __init__(self, gf):
        self.state = State(gf)        
        self.preprocess = PreProcess.Builder(self.state).add_df_index().add_path().add_callers_and_callees().add_show_node().add_vis_node_name().update_module_name().clean_lib_monitor().add_max_incTime().build()
        #.add_incTime().add_excTime()
        #.add_avg_incTime().add_imbalance_perc().build()


        self.state.graph = self.preprocess.graph
        self.state.df = self.preprocess.df
        self.state.map = self.preprocess.map

        print("Done preprocessing.")

        # Need to make it an observable. When the root changes the application
        # updates to the call graph from that node as the root. 
        self.state.root = None

    def update(self, action, attr):        
        print("update action")
        if action == 'default':
            nx = CallGraph(self.state, 'path', True)                
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
            nx = CallGrap(self.state, 'path', false)
            name = attr + '.json'
            utils.graphmltojson('/home/vidi/Suraj/llnl/CallFlow/src/server/' + name, '/home/vidi/Suraj/llnl/CallFlow/src/server/' + name + '.json')
            
        # elif action == "default-dot":
        #     nx = CallGraph(self.state, 'path')
        #     self.cfg = write_dot(nx, "graph.dot")
        #     return nx.get_graph()

        self.cfg = json_graph.node_link_data(nx.g)

        return nx.get_graph()
        
