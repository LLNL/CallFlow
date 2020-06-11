import pandas as pd
import time
import networkx as nx
from ast import literal_eval as make_list

import callflow

LOGGER = callflow.get_logger(__name__)


class Group(callflow.GraphFrame):
    def __init__(self, gf=None, group_by="name"):
        self.gf = gf
        self.group_by = group_by

        # Data.
        self.callsite_module_map = self.gf.df.set_index("name")["module"].to_dict()
        self.callsite_path_map = self.gf.df.set_index("name")["path"].to_dict()

        # Variables used by grouping operation.
        self.entry_funcs = {}
        self.other_funcs = {}
        # TODO: remove this.
        # self.module_id_map = {}

        self.compute()

    def compute(self):
        group_path = {}
        component_path = {}
        component_level = {}
        entry_func = {}
        show_node = {}
        node_name = {}
        module = {}
        change_name = {}

        # module_idx = {}
        # module_id_map = {}
        # module_count = 0

        LOGGER.debug(
            f"Nodes: {len(self.gf.nxg.nodes())}, Edges: {len(self.gf.nxg.edges())}"
        )

        for idx, edge in enumerate(self.gf.nxg.edges()):
            snode = edge[0]
            tnode = edge[1]

            if "/" in snode:
                snode = snode.split("/")[-1]
            if "/" in tnode:
                tnode = tnode.split("/")[-1]

            spath = self.callsite_path_map[snode]
            tpath = self.callsite_path_map[tnode]

            stage1 = time.perf_counter()
            temp_group_path_results = self.create_group_path(spath)
            group_path[snode] = temp_group_path_results
            stage2 = time.perf_counter()

            stage3 = time.perf_counter()
            component_path[snode] = self.create_component_path(spath, group_path[snode])
            component_level[snode] = len(component_path[snode])
            stage4 = time.perf_counter()

            temp_group_path_results = self.create_group_path(tpath)
            group_path[tnode] = temp_group_path_results

            component_path[tnode] = self.create_component_path(tpath, group_path[tnode])
            component_level[tnode] = len(component_path[tnode])

            if component_level[snode] == 2:
                entry_func[snode] = True
                show_node[snode] = True
            else:
                entry_func[snode] = False
                show_node[snode] = False

            node_name[snode] = self.callsite_module_map[snode] + "=" + snode

            # TODO: remove if not used.
            # if module[tnode] not in module_id_map:
            #     module_count += 1
            #     module_id_map[module[tnode]] = module_count
            #     module_idx[tnode] = module_id_map[module[tnode]]
            # else:
            #     module_idx[tnode] = module_id_map[module[tnode]]

            if component_level[tnode] == 2:
                entry_func[tnode] = True
                show_node[tnode] = True
            else:
                entry_func[tnode] = False
                show_node[tnode] = False

            node_name[tnode] = self.callsite_module_map[snode] + "=" + tnode

        self.update_df("group_path", group_path)
        self.update_df("component_path", component_path)
        self.update_df("show_node", entry_func)
        self.update_df("vis_name", node_name)
        self.update_df("component_level", component_level)
        # self.update_df("mod_index", module_idx)
        self.update_df("entry_function", entry_func)

    def create_group_path(self, path):
        if isinstance(path, str):
            path = make_list(path)
        group_path = []
        prev_module = None
        for idx, callsite in enumerate(path):
            if idx == 0:
                # Assign the first callsite as from_callsite and not push into an array.
                from_callsite = callsite
                # from_module = self.entire_df.loc[self.entire_df['name'] == from_callsite]['module'].unique()[0]
                from_module = self.callsite_module_map[from_callsite]

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

                to_module = self.callsite_module_map[to_callsite]

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

                from_module = self.callsite_module_map[from_callsite]
                to_module = self.callsite_module_map[to_callsite]

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
                    to_module = self.callsite_module_map[to_callsite]

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
            module = self.callsite_module_map[node]
            if component_module == module:
                component_path.append(node_func)

        component_path.insert(0, component_module)
        return tuple(component_path)

    def update_df(self, col_name, mapping):
        self.gf.df[col_name] = self.gf.df["name"].apply(
            lambda node: mapping[node] if node in mapping.keys() else ""
        )
