import pandas as pd
import time
import networkx as nx
from ast import literal_eval as make_list

class Callsite:
    def __init__(self, name, module):
        self.name = name
        self.module = module


class groupBy:
    def __init__(self, state, group_by):
        self.state = state
        self.g = state.g
        self.df = self.state.df
        self.group_by = group_by
        self.eliminate_funcs = []
        self.entry_funcs = {}
        self.module_func_map = {}
        self.other_funcs = {}
        self.module_id_map = {}

        self.drop_eliminate_funcs()
        self.name_module_map = self.df.set_index('name')['module'].to_dict()
        self.name_path_map = self.df.set_index('name')['path'].to_dict()

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
            if ('/' in node):
                node = node.split('/')[-1]
            module = self.name_module_map[node]
            if component_module == module:
                component_path.append(node)

        component_path.insert(0, component_module)
        return tuple(component_path)

    def find_all_paths(self, df):
        ret = []
        unique_paths = df['path'].unique()
        for idx, path in enumerate(unique_paths):
            ret.append(df.loc[df['path'] == path])
        return (ret)

    def update_df(self, col_name, mapping):
        self.df[col_name] = self.df['name'].apply(lambda node: mapping[node] if node in mapping.keys() else '')

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

        edge_count = 0
        print(f"Total number of edges: {len(self.g.edges())}")
        for edge in self.g.edges():
            edge_count += 1
            snode = edge[0]
            tnode = edge[1]

            print(snode, tnode, edge_count)

            spath = self.name_path_map[snode]
            tpath = self.name_path_map[tnode]

            temp_group_path_results = self.create_group_path(spath)
            group_path[snode] = temp_group_path_results[0]
            change_name[snode] = temp_group_path_results[1]

            component_path[snode] = self.create_component_path(spath, group_path[snode])
            component_level[snode] = len(component_path[snode])
            module[snode] = self.name_module_map[snode]

            temp_group_path_results = self.create_group_path(tpath)
            group_path[tnode] = temp_group_path_results[0]
            change_name[tnode] = temp_group_path_results[1]

            component_path[tnode] = self.create_component_path(tpath, group_path[tnode])
            component_level[tnode] = len(component_path[tnode])
            module[tnode] = self.name_module_map[tnode]

            # if module[snode] not in module_id_map:
            #     module_count += 1
            #     module_id_map[module[snode]] = module_count
            #     module_idx[snode] = module_id_map[module[snode]]
            # else:
            #     module_idx[snode] = module_id_map[module[snode]]

            if component_level[snode] == 2:
                entry_func[snode] = True
                show_node[snode] = True
            else:
                entry_func[snode] = False
                show_node[snode] = False

            node_name[snode] = self.name_module_map[snode]  + '=' + snode

            # print('Node: ', snode)
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

        self.update_df('group_path', group_path)
        self.update_df('component_path', component_path)
        self.update_df('show_node', entry_func)
        self.update_df('vis_name', node_name)
        self.update_df('component_level', component_level)
        self.update_df('change_name', change_name)
        self.update_df('mod_index', module_idx)
        self.update_df('entry_function', entry_func)

        show_nodes = self.df.loc[self.df['show_node'] == True]['vis_name'].unique()
        print("Number of nodes shown in group graph: {0}".format(show_nodes))