# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

from ast import literal_eval as make_list

import callflow
from callflow.utils.sanitizer import Sanitizer

LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
# Group a SuperGraph
# ------------------------------------------------------------------------------
class Group:

    VALID_MODES = ["name", "module"]

    def __init__(self, sg, group_by="module"):
        """
        Constructor to the class

        :param sg (callflow.SuperGraph): SuperGraph to group by column
        :param group_by (str): Group by column, Default = "module"
        """
        assert isinstance(sg, callflow.SuperGraph)
        assert isinstance(group_by, str)
        assert group_by in Group.VALID_MODES

        self.sg = sg
        self.group_by = group_by

        # ----------------------------------------------------------------------
        self.callsite_module_map = {}
        self.callsite_path_map = {}
        self.entry_funcs = {}
        self.other_funcs = {}

        LOGGER.info(f'Grouping ({self.sg}) by \"{self.group_by}\"')
        self.compute()
        
    def _format_node_name(self, module, name):
        return self.sg.module_fct_map[module] + '=' + name

    # --------------------------------------------------------------------------
    def compute(self):
        """In-place Group by operation. Appends the following columns to the SuperGraph.dataframe.

        Columns appended: group_path, component_path, component_level, entry_functions

        e.g.,
           path = [M1.a, M1.b,  M2.c, M2.d,  M3.e, M3.f, M3.g]

           For node "g",
               group_path = [M1, M2, M3]
               component_path = [M3, M3.e, M3.f, M3.g]
               component_level = 3 (depth of call site from the module)
               entry_functions =  [M3.e], this is a list since a call site can multiple entry points.
        :return: None
        """
        self.callsite_module_map = self.sg.df_get_column("module", "name").to_dict()
        self.callsite_path_map = self.sg.df_get_column("path", "name").to_dict()

        group_path = {}
        component_path = {}
        component_level = {}
        entry_func = {}
        show_node = {}
        node_name = {}

        LOGGER.debug(
            f"Nodes: {len(self.sg.nxg.nodes())}, Edges: {len(self.sg.nxg.edges())}"
        )

        for idx, edge in enumerate(self.sg.nxg.edges()):
            snode = edge[0]
            tnode = edge[1]

            spath = self.callsite_path_map[snode]
            tpath = self.callsite_path_map[tnode]

            temp_group_path_results = self._construct_group_path(spath)
            group_path[snode] = temp_group_path_results

            component_path[snode] = self._construct_component_path(spath, group_path[snode])
            component_level[snode] = len(component_path[snode])

            temp_group_path_results = self._construct_group_path(tpath)
            group_path[tnode] = temp_group_path_results

            component_path[tnode] = self._construct_component_path(tpath, group_path[tnode])
            component_level[tnode] = len(component_path[tnode])

            if component_level[snode] == 2:
                entry_func[snode] = True
                show_node[snode] = True
            else:
                entry_func[snode] = False
                show_node[snode] = False

            node_name[snode] = self._format_node_name(self.callsite_module_map[snode], snode)

            if component_level[tnode] == 2:
                entry_func[tnode] = True
                show_node[tnode] = True
            else:
                entry_func[tnode] = False
                show_node[tnode] = False

            node_name[tnode] = self._format_node_name(self.callsite_module_map[snode], tnode)

        # update the graph
        self.sg.df_update_mapping("group_path", group_path)
        self.sg.df_update_mapping("component_path", component_path)
        self.sg.df_update_mapping("component_level", component_level)
        self.sg.df_update_mapping("entry_function", entry_func)
        # TODO: Remove the below columns
        self.sg.df_update_mapping("show_node", entry_func)
        self.sg.df_update_mapping("vis_name", node_name)

    def _construct_group_path(self, path):
        """Construct the group_path from the `path` by appending the module name. See `compute` method for example.

        :param path: call path from the root node.
        :return group_path (list): grouped call path from the root module.
        """
        if isinstance(path, str):
            path = make_list(path)
        group_path = []
        prev_module = None
        for idx, callsite in enumerate(path):
            if idx == 0:
                # Assign the first callsite as from_callsite and not push into an array.
                from_callsite = callsite
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
                group_path.append(self._format_node_name(from_module, from_callsite))

            elif idx == len(path) - 1:
                # Final call site in the path.
                to_callsite = Sanitizer.from_htframe(callsite)

                to_module = self.callsite_module_map[to_callsite]

                if prev_module != to_module:
                    group_path.append(self._format_node_name(to_module, to_callsite))

                if to_module not in self.entry_funcs:
                    self.entry_funcs[to_module] = []
                if to_module not in self.other_funcs:
                    self.other_funcs[to_module] = []

                if to_callsite not in self.other_funcs[to_module]:
                    self.other_funcs[to_module].append(to_callsite)

                if to_callsite not in self.entry_funcs[to_module]:
                    self.entry_funcs[to_module].append(to_callsite)
            else:
                # Assign the from and to call site.
                # from_callsite = path[idx - 1]
                to_callsite = Sanitizer.from_htframe(callsite)

                # from_module = self.callsite_module_map[from_callsite]
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
                        group_path.append(self._format_node_name(to_module, to_callsite))
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

    def _construct_component_path(self, path, group_path):
        """Construct the component path for a given path and group_path.

        :param path: path to the call site
        :param group_path: group_path for a call site
        :return: component_path for a call site
        """
        component_path = []
        component_module = group_path[len(group_path) - 1].split("=")[0]

        for idx, node in enumerate(path):
            module = self.callsite_module_map[node]
            if component_module == module:
                component_path.append(node)

        component_path.insert(0, component_module)
        return tuple(component_path)
# ------------------------------------------------------------------------------
