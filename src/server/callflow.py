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

from preprocess import PreProcess
from callgraph import CallGraph
from actions.groupBy import groupBy
from actions.split_callee import splitCallee
from actions.split_caller import splitCaller
from state import State

# need to make this observable on gf. When the gf changes the whole thing reflects
class CallFlow:
    def __init__(self, gf):
        self.state = State(gf)        
        self.preprocess = PreProcess.Builder(self.state).add_df_index().add_path().add_incTime().add_excTime().add_callers_and_callees().add_show_node().add_vis_node_name().update_module_name().build()

        #.add_max_incTime().add_avg_incTime().add_imbalance_perc()

        self.state.graph = self.preprocess.graph
        self.state.df = self.preprocess.df
        self.state.map = self.preprocess.map


        # Need to make it an observable. When the root changes the application
        # updates to the call graph from that node as the root. 
        self.state.root = None

    def update(self, action, attr):        
        if action == 'default':
            nx = CallGraph(self.state, 'path')                
        elif action == "groupBy":
            groupBy(self.state, attr)
            nx = CallGraph(self.state, 'group_path')
        elif action == "split-callee":
            splitCallee(self.state, attr)
            nx = CallGraph(self.state, 'path')
        elif action == "split-caller":
            splitCaller(self.state, attr)
            nx = CallGraph(self.state, 'path')

        self.cfg = json_graph.node_link_data(nx.g)

        return nx.get_graph()
        
