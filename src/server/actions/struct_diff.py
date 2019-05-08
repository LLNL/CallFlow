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

import pandas as pd
import time 
from .union_find import UnionFind
from functools import reduce
import math

class structDiff:
    def __init__(self, state1, state2):
        self.state1 = state1
        self.state2 = state2
        self.graph1 = state1.graph
        self.graph2 = state2.graph
        self.df1 = state1.df
        self.df2 = state2.df
        self.gfs = {}
        self.gfs['impi'] = self.state1
        self.gfs['mvapich2'] = self.state2
        self.union_find = UnionFind()
        self.run()

    def findAvgDiff(self, node, attr):
        attr_values = []
        gfs = self.gfs
        for gf_name in gfs.keys():
            df = gfs[gf_name].df
            attr_value = df.loc[df['name'] == node.callpath[-1]][attr].mean()
            attr_values.append(attr_value)

        sum_attr_values = 0
        avg_attr_values = reduce(lambda sum_attr_values, x: (sum_attr_values + x), attr_values)
        
        diff_by_avg = []
        for idx, avg in enumerate(attr_values):
            diff_by_avg.append(avg - avg_attr_values)    
    
        final = []
        for idx, val in enumerate(diff_by_avg):
            if(math.isnan(val)):
                final.append(0.0)
            else:
                final.append(val)

        # print("avg", final)
        return final

    def findMinDiff(self, node, attr):    
        attr_values = []
        gfs = self.gfs
        for gf_name in gfs.keys():
            df = gfs[gf_name].df
            attr_value = df.loc[df['name'] == node.callpath[-1]][attr].mean()
            attr_values.append(attr_value)

        min_ = float('inf')
        for idx, attr_value in enumerate(attr_values):
            min_ = min(min_, attr_value)

        if(min_ == float('inf')):
            min_ = 0.0

        diff_by_min = []
        for idx, attr_value in enumerate(attr_values):
            if(math.isnan(attr_value)):
                diff_by_min.append(0.0)
            else:
                diff_by_min.append(attr_value - min_)
        # print("min:", diff_by_min)
        return diff_by_min 
    
    def dfs(self, df, graph, graph_name):        
        def dfs_recurse(self, root):
            for node in root.children:
                source = root
                target = node
                source_name = source.callpath[-1]
                target_name = target.callpath[-1]
                # print("Node : {0} - {1}".format(source_name, target_name))
                self.union_find.add({
                    "name": source_name + '-' + target_name,
                    "source": source,
                    "target": target,
                    "graphID": [graph_name],
                    # "source_time": df.loc[df['name'] == source_name]['time'].mean(),
                    # "target_time": df.loc[df['name'] == target_name]['time'].mean(),
               })
                dfs_recurse(self, node)
        for root in graph.roots:
            # print("Root: {0}".format(root.callpath[-1]))
            dfs_recurse(self, root)
            
    def run(self):
        self.dfs(self.df1, self.graph1, "impi")
        self.dfs(self.df2, self.graph2, "mvapich2")
        edges = self.union_find.get_elts()

        nodes = []
        nodeMap = []
        for edge in edges:
            source_node = edge["source"]
            target_node = edge["target"]
            source_name = edge["source"].callpath[-1]
            target_name = edge["target"].callpath[-1]
            source = {}
            target = {}
            if(source_name not in nodeMap):
                source["name"] = source_name
                source["diff_time_avg"] = self.findAvgDiff(source_node, 'time')
                source["diff_time_avg (inc)"] = self.findAvgDiff(source_node, 'time (inc)')
                source["diff_time_min"] = self.findMinDiff(source_node, 'time')
                source["diff_time_min (inc)"] = self.findMinDiff(source_node, 'time (inc)')
                source["imbalance_perc"] = self.findAvgDiff(source_node, "imbalance_perc")
                nodes.append(source)
                nodeMap.append(source_name)
        
            if(target_name not in nodeMap):
                target["name"] = target_name
                target["diff_time_avg"] = self.findAvgDiff(target_node, 'time')
                target["diff_time_avg (inc)"] = self.findAvgDiff(target_node, 'time (inc)')
                target["diff_time_min"] = self.findMinDiff(target_node, 'time')
                target["diff_time_min (inc)"] = self.findMinDiff(target_node, 'time (inc)')
                target["imbalance_perc"] = self.findAvgDiff(target_node, "imbalance_perc")
                nodes.append(target)
                nodeMap.append(target_name)
            edge["source"] = edge["source"].callpath[-1]
            edge["target"] = edge["target"].callpath[-1]
    
        self.g = {
            "nodes": nodes,
            "edges": edges
       }