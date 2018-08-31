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
from state import State

class groupBy:
    def __init__(self, state, attr):
        self.graph = state.graph
        self.df = state.df
        self.attr = attr
        self.groups_tracked = {}
        
        self.first_detect_dfs(state)

    
    def create_new_path(self, path, state):
        group_path = ['<program root>']
        temp = None
        for i, elem in enumerate(path):
            module = state.lookup_with_vis_nodeName(elem).module[0]
            if temp == None or module != temp:
                group_path.append(module)
                temp = module
        return tuple(group_path)

    def find_a_good_node_name(self, node, attr, state):
        node_name = state.lookup_by_column(node.df_index, attr)[0]
        if len(node_name) != 0:
            if node_name in self.groups_tracked:
                return 'Module already assigned'
            else:
                return node_name
        else:
            return ''

    def first_detect_dfs(self, state):
        group_path_map = {}
        show_node_map = {}
        node_name_map = {}       

        root = self.graph.roots[0]
        node_gen = self.graph.roots[0].traverse()       
    
        rootdf = state.lookup(root.df_index)
        group_path_map[rootdf.node[0]] = tuple(['<program root>'])
        node_name_map[rootdf.node[0]] = '<program root>'
        show_node_map[rootdf.node[0]] = True
    
        try:
            while root.callpath != None:
                root = next(node_gen)
                target = state.lookup_with_node(root)
                source = state.lookup_with_node(root.parent)

                # check if there are entries for the source and target
                # Note: need to work on it more....
                if target.empty or source.empty:
                    continue

                group_path_map[target.node[0]] = self.create_new_path(source.path[0], state)
                
                if target.module.isin(self.groups_tracked)[0]:
                    show_node_map[target.node[0]] = False
                    node_name_map[target.node[0]] = ''
                else:
                    show_node_map[target.node[0]] = True
                    node_name_map[target.node[0]] = self.find_a_good_node_name(target.node[0], self.attr, state)
                    self.groups_tracked[target[self.attr][0]] = True
        except StopIteration:
            pass
        finally:
            del root

        state.update_df('group_path', group_path_map)
        state.update_df('show_node', show_node_map)
        state.update_df('vis_node_name', node_name_map)
        
def splitCaller(df, node):
    show_node_map = {}
    children_of_node = df[df['node'] == node].children
    for nod in children_of_node:
        show_node_map[node] = True

    utils.update_df(df, 'show_node', show_node_map)

def splitCallee(df, node):
    ret = {}
    return retx

def bfs(self, gf):
    visited, queue = set(), gf.graph.roots[0]
    while queue:
        node = queue.pop(0)
        if node not in visited:
            visited.add(vertex)
#                queue.extend()

        
