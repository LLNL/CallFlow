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

class groupBy:
    def __init__(self, state, attr):
        self.graph = state.graph
        self.df = state.df
        self.attr = attr
        self.entry_funcs = {}
        t = time.time()
        self.run(state)
        print(time.time() - t)

    def create_group_path(self, path, state):
        group_path = []
        temp = None
        for i, elem in enumerate(path):
            grouping = state.lookup_with_vis_nodeName(elem)[self.attr].tolist()[0]
            if temp == None or grouping != temp:
                group_path.append(grouping)
                temp = grouping
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
        path = list(path)
        component_module = state.lookup_with_vis_nodeName(path[-1]).module.tolist()[0]
        component_path.append(component_module)

        filter_path = [node for node in path if component_module == state.lookup_with_vis_nodeName(node).module.tolist()[0]]
       
        for i, elem in enumerate(filter_path):            
             component_path.append(elem)                    
        return tuple(component_path)

    def create_component_level(self, component_path):
        return len(component_path) - 1
            
    def run(self, state):
        group_path = {}
        component_path = {}
        component_level = {}
        is_entry_func = {}
        node_name = {}       
        entry_function = {}
        
        root = self.graph.roots[0]
        node_gen = self.graph.roots[0].traverse()       
    
        rootdf = state.lookup_with_node(root)
        group_path[rootdf.node[0]] = self.create_group_path(rootdf.path[0], state)        
        node_name[rootdf.node[0]] = self.find_a_good_node_name(root, self.attr, state)
        is_entry_func[rootdf.node[0]] = True
        self.entry_funcs[rootdf.module[0]] = [root]
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
                              
                snode = s.node.tolist()[0]
                tnode = t.node.tolist()[0]

                spath = s.path.tolist()[0]
                tpath = t.path.tolist()[0]

                tmodule = t.module.tolist()[0]
                                
                if tmodule in self.entry_funcs:
                    is_entry_func[tnode] = False
                    node_name[tnode] = ''
                    if snode in is_entry_func:
                        self.entry_funcs[t[self.attr].tolist()[0]].append(state.lookup_with_node(tnode)['name'].tolist()[0])
                else:
                    is_entry_func[tnode] = True
                    node_name[tnode] = self.find_a_good_node_name(tnode, self.attr, state)
                    self.entry_funcs[t[self.attr].tolist()[0]] = [state.lookup_with_node(tnode)['name'].tolist()[0]]

                group_path[tnode] = self.create_group_path(tpath, state)
                component_path[tnode] = self.create_component_path(tpath, group_path[tnode], state)
                component_level[tnode] = self.create_component_level(component_path[tnode])

                print("is entry function:", is_entry_func[tnode])
                print("entry functions: ", self.entry_funcs[tmodule])
                print("node path: ", tpath)                
                print("group path: ", group_path[tnode])
                print("component path: ", component_path[tnode])
                
        except StopIteration:
            pass
        finally:
            del root

        state.update_df('group_path', group_path)
        state.update_df('component_path', component_path)
        state.update_df('show_node', is_entry_func)
        state.update_df('vis_node_name', node_name)
        state.update_df('component_level', component_level)
