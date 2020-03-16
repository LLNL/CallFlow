import pandas as pd
import time
import networkx as nx
from ast import literal_eval as make_list

class Callsite:
    def __init__(self, name, module):
        self.name = name
        self.module = module

class ensembleGroupBy:
    def __init__(self, state_entire, state_filter, group_by):
        self.state_filter = state_filter
        self.state_entire = state_entire
        self.entire_df = self.state_entire.df
        self.filter_df = self.state_filter.df
        self.filter_g = self.state_filter.g

        self.group_by = group_by
        self.eliminate_funcs = []
        self.entry_funcs = {}
        self.module_func_map = {}
        self.other_funcs = {}
        self.module_id_map = {}

        self.drop_eliminate_funcs()

    # Drop all entries user does not want to see.
    def drop_eliminate_funcs(self):
        for idx, func in enumerate(self.eliminate_funcs):
            self.state.df = self.state.df[self.state.df['module'] != func]

    def create_group_path_time(self, path):
        if(isinstance(path, str)):
            path = make_list(path)
        group_path = []
        prev_module = None
        for idx, callsite in enumerate(path):
            if(idx == 0):
                # Assign the first callsite as from_callsite and not push into an array.
                from_callsite = callsite
                from_module = self.entire_df.loc[self.entire_df['name'] == from_callsite]['module'].unique()[0]

                # Store the previous module to check the hierarchy later.
                prev_module = from_module

                # Create the entry function and other functions dict.
                if from_module not in self.entry_funcs:
                    self.entry_funcs[from_module] = []
                if from_module not in self.other_funcs:
                    self.other_funcs[from_module] = []

                # Push into entry function dict since it is the first callsite.
                self.entry_funcs[from_module].append(from_callsite)

                # Append to the group path.
                group_path.append(from_module + '=' + from_callsite)

            elif(idx == len(path) - 1):
                # Final callsite in the path.
                to_callsite = callsite
                if('/' in to_callsite):
                    to_callsite = to_callsite.split('/')[-1]
                to_module = self.entire_df.loc[self.entire_df['name'] == to_callsite]['module'].unique()[0]

                if prev_module != to_module:
                    group_path.append(to_module + '=' + to_callsite)

                if to_module not in self.entry_funcs:
                    self.entry_funcs[to_module] = []
                if to_module not in self.other_funcs:
                    self.other_funcs[to_module] = []

                if to_callsite not in self.other_funcs[to_module]:
                    self.other_funcs[to_module].append(to_callsite)

                if to_callsite not in self.entry_funcs[to_module]:
                    self.entry_funcs[to_module].append(to_callsite)
            else:
                # Assign the from and to callsite.
                from_callsite = path[idx - 1]
                to_callsite = callsite

                # Get their modules.
                from_module = self.entire_df.loc[self.entire_df['name'] == from_callsite]['module'].unique()[0]
                to_module = self.entire_df.loc[self.entire_df['name'] == to_callsite]['module'].unique()[0]

                # Create the entry function and other function dict if not already present.
                if to_module not in self.entry_funcs:
                    self.entry_funcs[to_module] = []
                if to_module not in self.other_funcs:
                    self.other_funcs[to_module] = []

                # if previous module is not same as the current module.
                if to_module != prev_module:
                    # TODO: Come back and check if it is in the path.
                    if to_module in group_path:
                        prev_module = to_module
                    else:
                        group_path.append(to_module + '=' + to_callsite)
                        prev_module = to_module
                        if to_callsite not in self.entry_funcs[to_module]:
                            self.entry_funcs[to_module].append(to_callsite)

                elif to_module == prev_module:
                    to_callsite = callsite
                    to_module = self.entire_df.loc[self.entire_df['name'] == to_callsite]['module'].unique()[0]

                    prev_module = to_module

                    if to_callsite not in self.other_funcs[to_module]:
                        self.other_funcs[to_module].append(to_callsite)

        return group_path

    # Create a group path for the df.column = group_path.
    def create_group_path(self, path):
        group_path = []

        self.prev_module_map = {}
        prev_module = None
        function = path[len(path) - 1]
        change_name = False

        # Create a map having initial funcs being mapped.
        module_df = self.df.groupby([self.group_by])
        for module, df in module_df:
            if module not in self.module_func_map:
                self.module_func_map[module] = []
            if module not in self.entry_funcs:
                self.entry_funcs[module] = []
            if module not in self.other_funcs:
                self.other_funcs[module] = []

        for i, elem in enumerate(path):
            grouping = self.df.loc[self.df['name'] == elem][self.group_by].unique()
            if len(grouping) == 0:
                break

            module = grouping[0]

            # Append the module into the group path.
            if module not in self.eliminate_funcs:
                if prev_module is None:
                    prev_module = module
                    group_path.append(module + '=' + path[i])
                elif module != prev_module:
                    if module in group_path:
                        from_module = group_path[len(group_path) - 1]
                        to_module = module
                        group_path.append(module + '=' + path[i])
                        prev_module = module
                        change_name = True
                    else:
                        group_path.append(module + '=' + path[i])
                        prev_module = module
                        if path[i] not in self.entry_funcs[module]:
                            self.entry_funcs[module].append(path[i])
                else:
                    prev_module = module
                    continue
                    if path[i] not in self.other_funcs[module] and path[i] not in self.entry_funcs[module]:
                        self.other_funcs[module].append(path[i])
        group_path = tuple(group_path)
        return (group_path, change_name)

    def create_component_path(self, path, group_path):
        component_path = []
        component_module = group_path[len(group_path) - 1].split('=')[0]

        for idx, node in enumerate(path):
            node_func = node

            node_func_df = self.entire_df.loc[self.entire_df['name'] == node_func]
            if not node_func_df.empty:
                if component_module == node_func_df['module'].tolist()[0]:
                    component_path.append(node_func)

        component_path.insert(0, component_module)
        return tuple(component_path)

    def find_all_paths(self, df):
        ret = []
        unique_paths = df['path'].unique()
        for idx, path in enumerate(unique_paths):
            ret.append(df.loc[df['path'] == path])
        return (ret)

    def update_df(self, col_name, mapping):
        self.filter_df[col_name] = self.filter_df['name'].apply(lambda node: mapping[node] if node in mapping.keys() else '')

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
        source_nid = {}

        module_id_map = {}
        module_count = 0

        print(f"Nodes: {len(self.filter_g.nodes())}, Edges: {len(self.filter_g.edges())}")

        for idx, edge in enumerate(self.filter_g.edges()):
            snode = edge[0]
            tnode = edge[1]

            print(edge[0], edge[1])

            s_df = self.entire_df.loc[self.entire_df['name'] == edge[0]]
            t_df = self.entire_df.loc[self.entire_df['name'] == edge[1]]

            if(s_df.shape[0] == 0 or t_df.shape[0] == 0):
                continue

            spath = s_df['path'].tolist()[0]
            tpath = t_df['path'].tolist()[0]

            print(f"Source : {snode}, Target : {tnode}")
            print(f"Source path : {spath}")
            print(f"Target path : {tpath}")

            temp_group_path_results = self.create_group_path_time(spath)
            group_path[snode] = temp_group_path_results

            component_path[snode] = self.create_component_path(spath, group_path[snode])
            component_level[snode] = len(component_path[snode])
            module[snode] = s_df['module'].tolist()[0]

            temp_group_path_results = self.create_group_path_time(tpath)
            group_path[tnode] = temp_group_path_results

            component_path[tnode] = self.create_component_path(tpath, group_path[tnode])
            component_level[tnode] = len(component_path[tnode])
            module[tnode] = t_df['module'].tolist()[0]

            if module[snode] not in module_id_map:
                module_count += 1
                module_id_map[module[snode]] = module_count
                module_idx[snode] = module_id_map[module[snode]]
            else:
                module_idx[snode] = module_id_map[module[snode]]

            if component_level[snode] == 2:
                entry_func[snode] = True
                show_node[snode] = True
            else:
                entry_func[snode] = False
                show_node[snode] = False

            node_name[snode] = module[snode]  + '=' + snode

            if module[tnode] not in module_id_map:
                module_count += 1
                module_id_map[module[tnode]] = module_count
                module_idx[tnode] = module_id_map[module[tnode]]
            else:
                module_idx[tnode] = module_id_map[module[tnode]]

            if component_level[tnode] == 2:
                entry_func[tnode] = True
                show_node[tnode] = True
            else:
                entry_func[tnode] = False
                show_node[tnode] = False

            node_name[tnode] = module[tnode]  + '=' + tnode

            print('Node: ', snode)
            print("entry function:", entry_func[snode])
            print("node path: ", spath)
            print("group path: ", group_path[snode])
            print("component path: ", component_path[snode])
            print("component level: ", component_level[snode])
            print("Show node: ", show_node[snode])
            print("name: ", node_name[snode])
            print('Module: ', module[snode])
            print("=================================")
            print('Node: ', tnode)
            print("entry function:", entry_func[tnode])
            print("node path: ", tpath)
            print("group path: ", group_path[tnode])
            print("component path: ", component_path[tnode])
            print("component level: ", component_level[tnode])
            print("Show node: ", show_node[tnode])
            print("name: ", node_name[tnode])
            print('Module: ', module[tnode])
            print('#################################')

        self.update_df('group_path', group_path)
        self.update_df('component_path', component_path)
        self.update_df('show_node', entry_func)
        self.update_df('vis_name', node_name)
        self.update_df('component_level', component_level)
        self.update_df('mod_index', module_idx)
        self.update_df('entry_function', entry_func)

        # for node in self.g.nodes(data=True):
        #     nodeName = node[0]
        #     nodeData = node[1]
        #     if nodeName in show_node:
        #         if show_node[nodeName] == True:
        #             nodeData['show_node'] = True
        #         else:
        #             nodeData['show_node'] = False
        #     else:
        #         nodeData['show_node'] = False

        #     if nodeName in module:
        #         nodeData['module'] = module[nodeName]
        #     else:
        #         nodeData['module'] = 'Unknown (NA)'

        #     if nodeName in group_path:
        #         nodeData['group_path'] = group_path[nodeName]
        #     else:
        #         nodeData['group_path'] = []

        #     if nodeName in component_path:
        #         nodeData['component_path'] = component_path[nodeName]
        #     else:
        #         nodeData['component_path'] = []

        return {
                'df': self.filter_df,
                'g': self.filter_g
        }