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
        self.eliminate_funcs = []
        self.entry_funcs = {}
        self.module_func_map = {}
        self.other_funcs = {}
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
        self.prev_module_map = {}
        prev_module = None
        function = path[-1]        
        change_name = False

        # Create a map having initial funcs being mapped.
        module_df = self.df.groupby(['module'])
        for module, df in module_df:
            if module not in self.module_func_map:
                self.module_func_map[module] = []
            if module not in self.entry_funcs:
                self.entry_funcs[module] = []
            if module not in self.other_funcs:
                self.other_funcs[module] = []
        
        for i, elem in enumerate(path):
            grouping = self.state.lookup_with_name(elem)[self.group_by].unique()
            if len(grouping) == 0:
                break
            
            module = grouping[0]
                        
            # Append the module into the group path. 
            if module not in self.eliminate_funcs:
                if prev_module is None:
                    prev_module = module
                    group_path.append(module)
                elif module != prev_module:
                    if module in group_path:
                        from_module = group_path[len(group_path) - 1]
                        to_module = module
                        group_path.append(module + '//' + path[i])
                        prev_module = module
                        self.module_func_map[module].append(module + '//' + path[i])
                        change_name = True
                    else:
                        group_path.append(module)
                        prev_module = module
                        if path[i] not in self.entry_funcs[module]:
                            self.entry_funcs[module].append(path[i])
                else:
                    prev_module = module
                    continue
                    if path[i] not in self.other_funcs[module] and path[i] not in self.entry_funcs[module]:
                        self.other_funcs[module].append(path[i])
        
        group_path = tuple(group_path)
        # print(group_path)
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

    def find_all_paths(self, df):
        ret = []
        unique_paths = df['path'].unique()
        for idx, path in enumerate(unique_paths):
            ret.append(df.loc[df['path'] == path])
        return (ret)
            
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
            rootdf = self.state.lookup(root)
            
            if rootdf.empty:
                utils.debug('Not accounting the function: {0}'.format(root))
            # Check if the dataframe exists for the root node. 
            # It might be a function that is eliminated. 
            else: 
                temp_group_path_results = self.create_group_path(root.callpath)
                group_path[rootdf.node[0].nid] = temp_group_path_results[0]
                change_name[rootdf.node[0].nid] = temp_group_path_results[1]

                component_path[rootdf.node[0].nid] = self.create_component_path(root.callpath, group_path[rootdf.node[0].nid])
                component_level[rootdf.node[0].nid] = len(component_path[rootdf.node[0].nid])
                node_name[rootdf.node[0].nid] = self.state.lookup(root)['module'][0]
                entry_func[rootdf.node[0].nid] = True
                show_node[rootdf.node[0].nid] = True
                module[rootdf.node[0].nid] = group_path[rootdf.node[0].nid][-1]
                module_idx[rootdf.node[0].nid] = module_count

                # print("entry function:", entry_func[rootdf.node[0]])
                # print('Change name:', change_name[rootdf.node[0]])
                # print("node path: ", root.callpath)                
                # print("group path: ", group_path[rootdf.node[0]])
                # print("component path: ", component_path[rootdf.node[0]])
                # print("component level: ", component_level[rootdf.node[0]])
                # print("Show node: ", show_node[rootdf.node[0]])
                # print("name: ", node_name[rootdf.node[0]])
                # print('Module: ', module[rootdf.node[0]])
                # print("=================================")

            root = next(node_gen)

            try:
                while root.callpath != None:
                    root = next(node_gen)
                    s = self.state.lookup(root)
                    parents = root.parents 
                    
                    for idx, parent in enumerate(parents):
                        t = self.state.lookup(parent)
                        t_all = self.find_all_paths(t)

                        for idx, t in enumerate(t_all):
                            if s.empty:
                                print("Not considering the Source function {0} [{1}]".format(parent, s['module']))
                            elif t.empty:
                                print("Not considering the Target function {0} [{1}]".format(root, t['path']))
                            elif not s.empty and not t.empty:
                                snode = s.node.tolist()[0]
                                tnode = t.node.tolist()[0]

                                spath = root.callpath
                                tpath = parent.callpath

                                snid = root.nid
                                tnid = parent.nid

                                tmodule = t[self.group_by].tolist()[0]

                                temp_group_path_results = self.create_group_path(spath)               
                                group_path[snid] = temp_group_path_results[0]
                                change_name[snid] = temp_group_path_results[1]
                            
                                component_path[snid] = self.create_component_path(spath, group_path[snid])
                                component_level[snid] = len(component_path[snid])
                                module[snid] = component_path[snid][0]
                            
                                if module[snid] not in module_id_map:
                                    module_count += 1 
                                    module_id_map[module[snid]] = module_count
                                    module_idx[snid] = module_id_map[module[snid]]
                                else:
                                    module_idx[snid] = module_id_map[module[snid]]

                                if component_level[snid] == 2:
                                    entry_func[snid] = True
                                    node_name[snid] = component_path[snid][0]
                                    show_node[snid] = True
                                else:
                                    entry_func[snid] = False
                                    node_name[snid] = "Unknown(NA)"
                                    show_node[snid] = False
                            
                        # print('Node', snode)        
                        # print("entry function:", entry_func[snid])
                        # print('Change name:', change_name[snid])
                        # print("node path: ", spath)                
                        # print("group path: ", group_path[snid])
                        # print("component path: ", component_path[snid])
                        # print("component level: ", component_level[snid])
                        # print("Show node: ", show_node[snid])
                        # print("name: ", node_name[snid])
                        # print('Module: ', module[snid])
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

        self.state.entry_funcs = self.entry_funcs
        self.state.other_funcs = self.other_funcs