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

class groupBy:
    def __init__(self, state, attr):
        self.graph = state.graph
        self.df = state.df
        self.attr = attr
        self.entry_funcs = {}
        self.run(state)

    
    def create_group_path(self, path, state):
        group_path = []
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
            if node_name in self.entry_funcs:
                return 'Module already assigned'
            else:
                return node_name
        else:
            return ''


    def create_component_path(self, path, group_path, state):
        component_path = []
        node_module = state.lookup_with_vis_nodeName(path[-1]).module[0]
        for i, elem in enumerate(path[::-1]):            
            module = state.lookup_with_vis_nodeName(elem).module[0]
            if elem not in self.entry_funcs[module]:
                module_final = module
                component_path.append(elem)

        print component_path[::-1], node_module
            
    def run(self, state):
        group_path = {}
        component_path = {}
        show_node = {}
        node_name = {}       
        entry_function = {}
        
        root = self.graph.roots[0]
        node_gen = self.graph.roots[0].traverse()       
    
        rootdf = state.lookup(root.df_index)
        group_path[rootdf.node[0]] = tuple(['libmonitor.so.0.0.0'])
        node_name[rootdf.node[0]] = '<program root>'
        show_node[rootdf.node[0]] = True
        self.entry_funcs['libmonitor.so.0.0.0'] = ['<program root>']
        count = 0
        try:
            while root.callpath != None:
                root = next(node_gen)
                t = state.lookup_with_node(root)
                s = state.lookup_with_node(root.parent)

                # check if there are entries for the source and target
                # Note: need to work on it more....
                if t.empty or s.empty:
                    continue

                snode = s.node[0]
                tnode = t.node[0]

                spath = s.path[0]
                tpath = t.path[0]
                
                count += 1
                if count > 30:
                    break
                
                if t.module.isin(self.entry_funcs)[0]:
                    show_node[tnode] = False
                    node_name[tnode] = ''
                    if show_node[snode]:
                        self.entry_funcs[t[self.attr][0]].append(state.lookup_with_node(tnode)['name'][0])
                else:
                    show_node[tnode] = True
                    node_name[tnode] = self.find_a_good_node_name(tnode, self.attr, state)
                    self.entry_funcs[t[self.attr][0]] = [state.lookup_with_node(tnode)['name'][0]]

                group_path[tnode] = self.create_group_path(tpath, state)
                component_path[tnode] = self.create_component_path(tpath, group_path[tnode], state)

        except StopIteration:
            pass
        finally:
            del root

        state.update_df('group_path', group_path)
        state.update_df('component_path', component_path)
        state.update_df('show_node', show_node)
        state.update_df('vis_node_name', node_name)
        
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

        
