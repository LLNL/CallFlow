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
from networkX import NetworkX

from actions import groupBy, splitByChildren

class CallFlow:
    def __init__(self, gf):
        self.gf = gf
        self.preprocess = PreProcess.Builder(self.gf).add_path().add_max_incTime().add_avg_incTime().add_imbalance_perc().add_callers_and_callees().add_show_node().add_vis_node_name().update_module_name().build()

        self.graph = self.preprocess.graph
        self.df = self.preprocess.df
        self.map = self.preprocess.map
        
        nx = NetworkX(self.graph, self.df, 'path')                
        self.cfg = json_graph.node_link_data(nx.g)

    def update(self, action, attr):        
        if action == "groupBy":
            groupBy(self.gf, 'module')
            nx = NetworkX(self.graph, self.df, 'group_path')
        elif action == "split-callee":
            splitCallee(self.gf, split_node)
        elif action == "split-caller":
            splitCaller(self.gf, split_node)

        self.cfg = json_graph.node_link_data(nx.g)
                                
        
