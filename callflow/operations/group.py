# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------
"""
CallFlow's operation to group call sites by their semantic information.
"""
from ast import literal_eval as make_list

import callflow

LOGGER = callflow.get_logger(__name__)


class Group:
    """
    Group a SuperGraph
    """

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

        self.callsite_module_map = self.sg.df_get_column("module", "name").to_dict()
        self.callsite_path_map = self.sg.df_get_column("path", "name").to_dict()

        LOGGER.info(f'Grouping ({self.sg}) by "{self.group_by}"')
        self.compute()

    def _format_callsite(self, module_idx, name):
        return (module_idx, name)

    # --------------------------------------------------------------------------
    def compute(self):
        """
        In-place Group by operation. Appends the following columns to the SuperGraph.dataframe.

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

        group_path = {}
        component_path = {}

        for idx, edge in enumerate(self.sg.nxg.edges()):
            snode = edge[0]
            tnode = edge[1]

            if snode in self.callsite_path_map and tnode in self.callsite_path_map:
                spath = self.callsite_path_map[snode]
                tpath = self.callsite_path_map[tnode]

                # Mappers for the source node, snode.
                group_path[snode] = self._construct_group_path(spath)
                component_path[snode] = self._construct_component_path(
                    spath, group_path[snode]
                )

                # Mappers for the target node, tnode.
                group_path[tnode] = self._construct_group_path(tpath)
                component_path[tnode] = self._construct_component_path(
                    tpath, group_path[tnode]
                )
            else:
                group_path[snode] = []
                component_path[snode] = []

                group_path[tnode] = []
                component_path[tnode] = []
                
        # update the graph
        self.sg.df_update_mapping("group_path", group_path)
        self.sg.df_update_mapping("component_path", component_path)

    def _construct_group_path(self, path):  # noqa: C901
        """
        Construct the group_path from the `path` by appending the module name. See `compute` method for example.

        :param path: call path from the root node.
        :return group_path (list): grouped call path from the root module.
        """
        if isinstance(path, str):
            path = make_list(path)
            
        group_path = []
        prev_module = None
        for idx, callsite in enumerate(path):
            if idx == 0: # root node 
                # Assign the first callsite as from_callsite and not push into an array.
                from_callsite = callsite
                from_module = self.callsite_module_map[from_callsite]

                # Append to the group path.
                group_path.append(self._format_callsite(from_module, from_callsite))
                
                # Store the previous module to check the hierarchy later.
                prev_module = from_module

            elif idx == len(path) - 1: # Final call site in the path.
                to_callsite = callsite
                to_module = self.callsite_module_map[to_callsite]

                if prev_module != to_module:
                    group_path.append(self._format_callsite(to_module, to_callsite))

            else:
                to_module = self.callsite_module_map[callsite]

                # if previous module is not same as the current module, we append.
                if to_module != prev_module:
                    group_path.append(self._format_callsite(to_module, callsite))
    
                elif to_module == prev_module:
                    pass

                prev_module = to_module

        return tuple(group_path)

    def _construct_component_path(self, path, group_path):
        """
        Construct the component path for a given path and group_path.

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
