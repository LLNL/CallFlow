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

        """
        preprocess is the processed graphframe which contains the
        modified graphframe
        """
        self.preprocess = PreProcess.Builder(self.gf).add_path().add_max_incTime().add_avg_incTime().add_imbalance_perc().add_callers_and_callees().add_show_node().add_vis_node_name().update_module_name().build()

        self.graph = self.preprocess.graph
        self.df = self.preprocess.df
        self.map = self.preprocess.map
        
        nx = NetworkX(self.graph, self.df, 'path')

        groupBy(self.gf, 'module')

        nx = NetworkX(self.graph, self.df, 'group_path')        
        node_gen = self.graph.roots[0].traverse()
        
        split_node = next(node_gen)
        split_node = next(node_gen)
        
#        splitByChildren(self.df, split_node)
#        nx = NetworkX(gf, 'group_path')
        
        self.cfg = self.convert_graph(nx.g)

    def update(self, action):        
        return self.cfg
                
    def bfs(self, gf):
        visited, queue = set(), gf.graph.roots[0]
        while queue:
            node = queue.pop(0)
            if node not in visited:
                visited.add(vertex)
#                queue.extend()
    
    def convert_graph(self, graph):
        res = json_graph.node_link_data(graph)
        return res
        
    def getCFG(self):
        return self.cfg
