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
        #self.g = state.g
        #self.df = self.state.df
        self.g = self.state.new_gf.nxg
        self.df = self.state.new_gf.df
        self.group_by = group_by
        self.eliminate_funcs = []
        self.entry_funcs = {}
        self.module_func_map = {}
        self.other_funcs = {}
        self.module_id_map = {}

        self.drop_eliminate_funcs()
        self.name_module_map = self.df.set_index("name")["module"].to_dict()
        self.name_path_map = self.df.set_index("name")["path"].to_dict()

        self.run()
        self.df = self.state.new_gf.df
        self.graph = self.state.new_gf.graph
        #self.df = self.state.df
        #self.graph = self.state.graph

    # Drop all entries user does not want to see.
    def drop_eliminate_funcs(self):
        for idx, func in enumerate(self.eliminate_funcs):
            #self.state.df = self.state.df[self.state.df["module"] != func]
            self.state.new_gf.df = self.state.new_gf.df[self.state.new_gf.df["module"] != func]

    def create_group_path(self, path):
        if isinstance(path, str):
            path = make_list(path)

        group_path = []
        prev_module = None
        for idx, callsite in enumerate(path):
            if idx == 0:
                # Assign the first callsite as from_callsite and not push into an array.
                from_callsite = callsite

                from_module = self.name_module_map[from_callsite]

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
                group_path.append(from_module + "=" + from_callsite)

            elif idx == len(path) - 1:
                # Final callsite in the path.
                to_callsite = callsite
                if "/" in to_callsite:
                    to_callsite = to_callsite.split("/")[-1]
                # to_module = self.entire_df.loc[self.entire_df['name'] == to_callsite]['module'].unique()[0]
                to_module = self.name_module_map[to_callsite]

                if prev_module != to_module:
                    group_path.append(to_module + "=" + to_callsite)

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
                # from_module = self.entire_df.loc[self.entire_df['name'] == from_callsite]['module'].unique()[0]
                # to_module = self.entire_df.loc[self.entire_df['name'] == to_callsite]['module'].unique()[0]

                from_module = self.name_module_map[from_callsite]
                to_module = self.name_module_map[to_callsite]

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
                        group_path.append(to_module + "=" + to_callsite)
                        prev_module = to_module
                        if to_callsite not in self.entry_funcs[to_module]:
                            self.entry_funcs[to_module].append(to_callsite)

                elif to_module == prev_module:
                    to_callsite = callsite
                    # to_module = self.entire_df.loc[self.entire_df['name'] == to_callsite]['module'].unique()[0]
                    to_module = self.name_module_map[to_callsite]

                    prev_module = to_module

                    if to_callsite not in self.other_funcs[to_module]:
                        self.other_funcs[to_module].append(to_callsite)

        return group_path

    def create_component_path(self, path, group_path):
        component_path = []
        component_module = group_path[len(group_path) - 1].split("=")[0]

        for idx, node in enumerate(path):
            node_func = node
            if "/" in node:
                node = node.split("/")[-1]
            module = self.name_module_map[node]
            if component_module == module:
                component_path.append(node_func)

        component_path.insert(0, component_module)
        return tuple(component_path)

    def update_df(self, col_name, mapping):
        self.df[col_name] = self.df["name"].apply(
            lambda node: mapping[node] if node in mapping.keys() else ""
        )

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

        for edge in self.g.edges():
            edge_count += 1
            snode = edge[0]
            tnode = edge[1]

            spath = self.name_path_map[snode]
            tpath = self.name_path_map[tnode]

            temp_group_path_results = self.create_group_path(spath)
            group_path[snode] = temp_group_path_results

            component_path[snode] = self.create_component_path(spath, group_path[snode])
            component_level[snode] = len(component_path[snode])
            module[snode] = self.name_module_map[snode]

            temp_group_path_results = self.create_group_path(tpath)
            group_path[tnode] = temp_group_path_results

            component_path[tnode] = self.create_component_path(tpath, group_path[tnode])
            component_level[tnode] = len(component_path[tnode])
            module[tnode] = self.name_module_map[tnode]

            if component_level[snode] == 2:
                entry_func[snode] = True
                show_node[snode] = True
            else:
                entry_func[snode] = False
                show_node[snode] = False

            node_name[snode] = self.name_module_map[snode] + "=" + snode

        self.update_df("group_path", group_path)
        self.update_df("component_path", component_path)
        self.update_df("show_node", entry_func)
        self.update_df("vis_name", node_name)
        self.update_df("component_level", component_level)
        self.update_df("change_name", change_name)
        self.update_df("mod_index", module_idx)
        self.update_df("entry_function", entry_func)
