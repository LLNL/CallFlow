# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------
"""
CallFlow's operation to group call sites by their semantic information.
"""
import numpy as np

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
        LOGGER.info(f'Grouping ({self.sg}) by "{self.group_by}"')
        self.compute()

    @staticmethod
    def _format_node_name(module_idx, name):
        return f"({module_idx}, {name})"

    @staticmethod
    def _format_callsite(module_idx, name):
        return module_idx, name

    # --------------------------------------------------------------------------
    def compute(self):
        """
        In-place Group by operation. Appends the following columns to the SuperGraph.dataframe.

        Columns appended: group_path, component_path, component_level, entry_functions

        e.g.,
           path = [M1.a, M1.b,  M2.c, M2.d,  M3.e, M3.f, M3.g / M4.g]

           For node "g",
               group_path = [M1, M2, M3]
               component_path = [e, f, g]
               component_level = 3 (depth of call site from the module)
               entry_functions =  [M3.e], this is a list since a call site can multiple entry points.
        :return: None
        """
        LOGGER.debug(
            f"Nodes: {len(self.sg.nxg.nodes())}, Edges: {len(self.sg.nxg.edges())}"
        )

        group_path = {}
        component_path = {}

        # construct group and component paths
        def _construct_paths(path, debug=False):

            # LOGGER.warning(f' >>> parsing [{path}]')
            # cs_path = self.sg.callsites[path]
            # print('path callsites =', type(cs_path), len(cs_path), cs_path)

            if debug:
                for _ in path:
                    #_m = self.sg.new_callsite2module[_]
                    _m = self.sg.callsite_module_map[_]
                    print(
                        "\t:",
                        _,
                        "::",
                        self.sg.get_name(_, "callsite"),
                        "--",
                        _m,
                        "::",
                        self.sg.get_name(_m, "module"),
                    )

            # extract the modules in the path
            #mod_path = np.array([self.sg.new_callsite2module[_] for _ in path])
            mod_path = np.array([self.sg.callsite2module[_] for _ in path])

            if debug:
                print("path modules =", type(mod_path), mod_path.shape, mod_path)

            # callsite-to-module map stores a vector and that is a problem
            if debug:
                if any([len(_) > 1 for _ in mod_path]):
                    LOGGER.warning("need to fix this problem")

            # TODO: seeing some empty list here for "loops"
            if debug:
                mod_path = np.array([_[0] if len(_) > 0 else None for _ in mod_path])
                print("path modules:", type(mod_path), mod_path.shape, mod_path)

            # root
            if len(path) == 1:
                return mod_path, path

            # if there is an unknown module (= -1), get rid of that
            if True:
                mod_path = mod_path[np.where(mod_path != -1)[0]]

            # remove all entries where the module is repeated
            mods_diff = [True] + [
                mod_path[i] != mod_path[i - 1] for i in range(1, len(mod_path))
            ]
            mods_diff = np.where(np.array(mods_diff, dtype=bool))[0]

            # the resulting list will be the group path
            gpath = mod_path[mods_diff]

            # from the right, figure out how many times the same module appears
            mods_diff = mod_path != mod_path[-1]

            # last element in the path must be true
            assert not mods_diff[-1]

            # the last module that is different
            mods_diff = np.where(mods_diff)[0]
            last_diff_mod = mods_diff[-1] if len(mods_diff) > 0 else -1

            # the last set of the same modules will form the component path
            cpath = path[last_diff_mod + 1 :]

            # ------------------------------------------------------------------
            if debug:
                snode = path[-1]
                print("--> snode", snode, "::", self.sg.get_name(snode, "callsite"))
                print("--> path")
                for _ in path:
                    _m = self.sg.callsite_module_map[_]
                    print(
                        "\t:",
                        _,
                        "::",
                        self.sg.get_name(_, "callsite"),
                        "--",
                        _m,
                        "::",
                        self.sg.get_name(_m, "module"),
                    )
                print("--> gpath")
                for _ in gpath:
                    print("\t:", _, "::", self.sg.get_name(_, "module"))
                print("--> cpath")
                for _ in cpath:
                    print("\t:", _, "::", self.sg.get_name(_, "callsite"))

            # ------------------------------------------------------------------
            return gpath, cpath

        # ----------------------------------------------------------------------
        for idx, edge in enumerate(self.sg.nxg.edges()):

            snode = self.sg.get_idx(edge[0], "callsite")
            tnode = self.sg.get_idx(edge[1], "callsite")

            assert snode in self.sg.paths
            assert tnode in self.sg.paths

            # should remove this condition. this should always be true?
            # TODO: adding this here ensures that the source and target nodes are present in the map. Might have to reconsider if this needs to be here.
            # TODO: Some of the nodes have no inverse mappings (i.e., inv_callsite and inv_modules) so we filter them out here.
            if (
                snode in self.sg.paths
                and tnode in self.sg.paths
                and snode is not None
                and tnode is not None
            ):
                spath = self.sg.paths[snode]
                tpath = self.sg.paths[tnode]

                group_path[snode], component_path[snode] = _construct_paths(spath)
                # --------------------------------------------------------------
                # no need to reprocess if this has already been added
                if tnode in group_path:
                    continue

                group_path[tnode], component_path[tnode] = _construct_paths(tpath)

        # update the dataframe
        self.sg.df_add_column(
            "group_path", apply_dict=group_path, dict_default="", apply_on="name"
        )
        self.sg.df_add_column(
            "component_path", apply_dict=component_path, dict_default="", apply_on="name"
        )


# ------------------------------------------------------------------------------
