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
import utils

class groupBy:
    def __init__(self, state, group_by):
        self.state = state
        self.df = self.state.df
        self.group_by = group_by
#         self.eliminate_funcs = ['libmonitor.so.0.0.0']
        self.eliminate_funcs = []
        self.entry_funcs = {}
        self.drop_eliminate_funcs()
        self.run()
        self.df = self.state.df
        self.graph = self.state.graph
        
    # Drop all entries user does not want to see. 
    def drop_eliminate_funcs(self):
        for idx, func in enumerate(self.eliminate_funcs):
            self.state.df = self.state.df[self.state.df['module'] != func]

    # Create a group path for the df.column = group_path.
    def create_group_path(self, path):
#         print('path: {0}'.format(path))
        group_path = []
        temp = None
        for i, elem in enumerate(path):
            grouping = self.state.lookup_with_name(elem)[self.group_by].unique()
            if len(grouping) != 0:
                if grouping[0] not in self.eliminate_funcs:
                    if temp == None or grouping[0] != temp:
                        group_path.append(grouping[0])
                        temp = grouping[0]
        group_path = tuple(group_path)
#         print('group_path: {0}'.format(group_path))
        return group_path

    # Find a name for nodes with no name. 
    def find_a_good_node_name(self, node):
        node_name = self.state.lookup_with_name(node.callpath[-1])[self.group_by].tolist()[0]
        if(node_name == ''):
            node_name = 'Unknown name(N/A)'
        return node_name

    def create_component_path(self, path, group_path):
        component_path = []
        path = list(path)
        component_module = self.state.lookup_with_name(path[-1])[self.group_by].tolist()[0]
        component_path.append(component_module)
        filter_path = [node for node in path if component_module == \
                       self.state.lookup_with_name(node)[self.group_by].tolist()[0]]
        for i, elem in enumerate(filter_path):            
             component_path.append(elem)                    
        return tuple(component_path)

    def create_component_level(self, component_path):
        return len(component_path) - 1
            
    def run(self):
        group_path = {}
        component_path = {}
        component_level = {}
        entry_func = {}
        show_node = {}
        node_name = {}       
    
        roots = self.state.graph.roots
        if len(roots) > 1:
            print('It is a multi-rooted tree with {0} roots'.format(len(roots)))
        
        for root in roots:
            node_gen = root.traverse()       
            rootdf = self.state.lookup_with_name(root.callpath[-1])
            
            if rootdf.empty:
                utils.debug('Not accounting the function: {0}'.format(root))
            # Check if the dataframe exists for the root node. 
            # It might be a function that is eliminated. 
            else: 
                utils.debug('Function: {0}'.format(root))
                group_path[rootdf.node[0]] = self.create_group_path(root.callpath)        
                node_name[rootdf.node[0]] = self.find_a_good_node_name(root)
                entry_func[rootdf.node[0]] = True
                show_node[rootdf.node[0]] = True
                count = 0
            root = next(node_gen)

            try:
                while root.callpath != None:
                    root = next(node_gen)
                    t = self.state.lookup_with_name(root.callpath[-1])
                    parents = root.parents 
                    
                    for idx, parent in enumerate(parents):
                        s = self.state.lookup_with_name(parent.callpath[-1])
                    
                        if s.empty:
                            print("Not considering the Source function {0} [{1}]".format(parent, s['module']))
                        elif t.empty:
                            print("Not considering the Target function {0} [{1}]".format(root, t['path']))
                        elif not s.empty and not t.empty:
                            snode = s.node.tolist()[0]
                            tnode = t.node.tolist()[0]

                            spath = root.callpath
                            tpath = parent.callpath

                            tmodule = t[self.group_by].tolist()[0]
                                                        
                            node_name[tnode] = self.find_a_good_node_name(parent)
                            group_path[tnode] = self.create_group_path(tpath)
                            component_path[tnode] = self.create_component_path(tpath, group_path[tnode])
                            component_level[tnode] = len(component_path[tnode]) - 1
                            
                            if component_level[tnode] == 2:
                                entry_func[tnode] = True
                            else:
                                entry_func[tnode] = False
                                
                            if component_level[tnode] == 1:
                                show_node[tnode] = True
                            else:
                                show_node[tnode] = False
                            
                    # print("is entry function:", entry_func[tnode])
                    # print("node path: ", tpath)                
                    # print("group path: ", group_path[tnode])
                    # print("component path: ", component_path[tnode])
                    # print("component level: ", component_level[tnode])
                    # print("Show node: ", show_node[tnode])
                
            except StopIteration:
                pass
            finally:
                del root

        self.state.update_df('group_path', group_path)
        self.state.update_df('component_path', component_path)
        self.state.update_df('show_node', entry_func)
        self.state.update_df('vis_node_name', node_name)
        self.state.update_df('component_level', component_level)