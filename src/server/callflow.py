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

from actions import groupBy

class CallFlow():
    def __init__(self, gf):
        self.gf = gf
        self.graph = gf.graph
        self.df = gf.dataframe       
        self.df = PreProcess(self.df).df
        nx = NetworkX(gf, 'path')
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
#        pprint.pprint(res)
        return res
        
    def getCFG(self):
        return self.cfg
