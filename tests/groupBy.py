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

import pandas as pd
import time 

class groupBy:
    def __init__(self, state, group_by):
        self.state = state
        self.graph = state.graph
        self.df = state.df
        self.group_by = group_by
        self.entry_funcs = {}
        self.run()

    def create_group_path(self, path):
        group_path = []
        temp = None
        for i, elem in enumerate(path):
            grouping = self.state.lookup_with_nodeName(elem)[self.group_by].unique()[0]
            if temp == None or grouping != temp:
            # if len(grouping) != 0 and (temp == None or grouping != temp):
                group_path.append(grouping)
                temp = grouping
        return tuple(group_path)

    def find_a_good_node_name(self, node):
        node_name = self.state.lookup_with_node(node)[self.group_by].tolist()[0]
        if(node_name == ''):
            node_name = 'Unknown'
        return node_name

    def create_component_path(self, path, group_path):
        component_path = []
        path = list(path)
        component_module = self.state.lookup_with_nodeName(path[-1])[self.group_by].tolist()[0]
        component_path.append(component_module)
        filter_path = [node for node in path if component_module == self.state.lookup_with_nodeName(node)[self.group_by].tolist()]
       
        for i, elem in enumerate(filter_path):            
             component_path.append(elem)                    
        return tuple(component_path)

    def create_component_level(self, component_path):
        return len(component_path) - 1
            
    def run(self):
        group_path = {}
        component_path = {}
        component_level = {}
        is_entry_func = {}
        node_name = {}       
    
        roots = self.graph.roots
        for root in roots:
            node_gen = root.traverse()       
            rootdf = self.state.lookup_with_node(root)

            group_path[rootdf.node[0]] = self.create_group_path(root.callpath)        
            node_name[rootdf.node[0]] = self.find_a_good_node_name(root)
            is_entry_func[rootdf.node[0]] = True
            self.entry_funcs[rootdf[self.group_by][0]] = [root]
            count = 0
            root = next(node_gen)

            try:
                while root.callpath != None:
                    root = next(node_gen)
                    t = self.state.lookup_with_node(root)
                    # if(len(root.parents) == 0):
                    #     continue
                    s = self.state.lookup_with_node(root.parents[0])

                    # check if there are entries for the source and target
                    # Note: need to work on it more....
                    if t.empty or s.empty:
                        continue
                              
                    snode = s.node.tolist()[0]
                    tnode = t.node.tolist()[0]

                    spath = root.callpath
                    tpath = root.parents[0].callpath

                    tmodule = t[self.group_by].tolist()[0]
                            
                    is_entry_func[tnode] = True
                    node_name[tnode] = self.find_a_good_node_name(root.parents[0])
                    self.entry_funcs[t[self.group_by].tolist()[0]] = [self.state.lookup_with_node(tnode)[self.group_by].tolist()[0]]

                    group_path[tnode] = self.create_group_path(tpath)
                    component_path[tnode] = self.create_component_path(tpath, group_path[tnode])
                    component_level[tnode] = self.create_component_level(component_path[tnode])

                    # print(snode, tnode, len(self.entry_funcs[tmodule]))
                    # print("is entry function:", is_entry_func[tnode])
                    # print("entry functions: ", self.entry_funcs[tmodule])
                    # print("node path: ", tpath)                
                    # print("group path: ", group_path[tnode])
                    # print("component path: ", component_path[tnode])
                
            except StopIteration:
                pass
            finally:
                del root

        self.state.update_df('group_path', group_path)
        self.state.update_df('component_path', component_path)
        self.state.update_df('show_node', is_entry_func)
        self.state.update_df('vis_node_name', node_name)
        self.state.update_df('component_level', component_level)