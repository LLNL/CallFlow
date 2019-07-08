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
import utils

class groupBy:
    def __init__(self, state, group_by):
        self.state = state
        self.df = self.state.df
        self.group_by = group_by
#         self.eliminate_funcs = ['libmonitor.so.0.0.0']
        self.eliminate_funcs = []
        self.entry_funcs = {}
        self.module_func_map = {}
        self.module_id_map = {}

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
        group_path = []
        temp = None
        function = path[-1]        
        module_idx = 0
        change_name = False
        
        for i, elem in enumerate(path):
            grouping = self.state.lookup_with_name(elem)[self.group_by].unique()
            if len(grouping) == 0:
                break
            
            module = grouping[0]
            
            # Add the function to the module map.
            if module not in self.module_func_map:
                self.module_func_map[module] = []
            self.module_func_map[module].append(function)
            
            # Append the module into the group path. 
            if module not in self.eliminate_funcs:
                if temp == None or module != temp:
                    # Append "_" + module_idx if the module exists in the group_path. 
                    if module in group_path:
                        module_idx += 1
                        print(module)
                        module = module + '_' + str(module_idx)
                        change_name = True

                    group_path.append(module)
                    temp = module
        
        group_path = tuple(group_path)
        return (group_path, change_name)

    def create_component_path(self, path, group_path):
        component_path = []
        path = list(path)
        # component_module = self.state.lookup_with_name(path[-1])[self.group_by].tolist()[0]
        component_module = group_path[-1]
        component_path = [node for node in path if component_module == \
                       self.state.lookup_with_name(node)[self.group_by].tolist()[0]]
        
        if len(component_path) == 0:
            component_path.append(path[-1])
        component_path.insert(0, component_module)
        return tuple(component_path)
            
    def run(self):
        group_path = {}
        component_path = {}
        component_level = {}
        entry_func = {}
        show_node = {}
        node_name = {}    
        module = {}   
        change_name = {}
        module_idx = {}

        module_id_map = {}
        module_count = 0
    
        roots = self.state.graph.roots
        if len(roots) > 1:
                ('It is a multi-rooted tree with {0} roots'.format(len(roots)))
        
        for root in roots:
            node_gen = root.traverse()       
            rootdf = self.state.lookup_with_name(root.callpath[-1])
            
            if rootdf.empty:
                utils.debug('Not accounting the function: {0}'.format(root))
            # Check if the dataframe exists for the root node. 
            # It might be a function that is eliminated. 
            else: 
                temp_group_path_results = self.create_group_path(root.callpath)
                group_path[rootdf.node[0]] = temp_group_path_results[0]
                change_name[rootdf.node[0]] = temp_group_path_results[1]

                component_path[rootdf.node[0]] = self.create_component_path(root.callpath, group_path[rootdf.node[0]])
                component_level[rootdf.node[0]] = len(component_path[rootdf.node[0]])
                node_name[rootdf.node[0]] =  self.state.lookup_with_node(root)['module'][0]
                entry_func[rootdf.node[0]] = True
                show_node[rootdf.node[0]] = True
                module[rootdf.node[0]] = group_path[rootdf.node[0]][-1]
                module_idx[rootdf.node[0]] = module_count

                print("entry function:", entry_func[rootdf.node[0]])
                print('Change name:', change_name[rootdf.node[0]])
                print("node path: ", root.callpath)                
                print("group path: ", group_path[rootdf.node[0]])
                print("component path: ", component_path[rootdf.node[0]])
                print("component level: ", component_level[rootdf.node[0]])
                print("Show node: ", show_node[rootdf.node[0]])
                print("name: ", node_name[rootdf.node[0]])
                print('Module: ', module[rootdf.node[0]])
                print("=================================")

            root = next(node_gen)

            try:
                while root.callpath != None:
                    root = next(node_gen)
                    s = self.state.lookup_with_name(root.callpath[-1])
                    parents = root.parents 
                    
                    for idx, parent in enumerate(parents):
                        t = self.state.lookup_with_name(parent.callpath[-1])
                    
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

                            temp_group_path_results = self.create_group_path(spath)               
                            group_path[snode] = temp_group_path_results[0]
                            change_name[snode] = temp_group_path_results[1]
                            
                            component_path[snode] = self.create_component_path(spath, group_path[snode])
                            component_level[snode] = len(component_path[snode])
                            module[snode] = component_path[snode][0]
                            
                            if module[snode] not in module_id_map:
                                module_count += 1 
                                module_id_map[module[snode]] = module_count
                                module_idx[snode] = module_id_map[module[snode]]
                            else:
                                module_idx[snode] = module_id_map[module[snode]]

                            if component_level[snode] == 2:
                                entry_func[snode] = True
                                node_name[snode] = component_path[snode][0]
                                show_node[snode] = True
                            else:
                                entry_func[snode] = False
                                node_name[snode] = "Unknown(NA)"
                                show_node[snode] = False
                            
                    # print('Node', snode)        
                    # print("entry function:", entry_func[snode])
                    # print('Change name:', change_name[snode])
                    # print("node path: ", spath)                
                    # print("group path: ", group_path[snode])
                    # print("component path: ", component_path[snode])
                    # print("component level: ", component_level[snode])
                    # print("Show node: ", show_node[snode])
                    # print("name: ", node_name[snode])
                    # print('Module: ', module[snode])
                    # print("=================================")
                
            except StopIteration:
                pass
            finally:
                del root

        self.state.update_df('group_path', group_path)
        self.state.update_df('component_path', component_path)
        self.state.update_df('show_node', entry_func)
        self.state.update_df('vis_node_name', node_name)
        self.state.update_df('component_level', component_level)
        self.state.update_df('_'+self.group_by, module)
        self.state.update_df('change_name', change_name)
        self.state.update_df('mod_index', module_idx)

        print(self.state.df['_'+self.group_by])
