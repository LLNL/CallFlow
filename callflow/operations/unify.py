# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------
"""
CallFlow's operation to unify a super graph.
"""
import numpy as np
import pandas as pd
import networkx as nx
from functools import reduce

import callflow
from callflow.utils.utils import create_reindex_map


LOGGER = callflow.get_logger(__name__)


class Unify:
    """
    Unify a super graph.
    """

    def __init__(self, eg, supergraphs):
        """
        Constructor
        :param eg:
        :param supergraphs:
        """
        assert isinstance(eg, callflow.EnsembleGraph)
        assert isinstance(supergraphs, dict)
        for sg in supergraphs:
            isinstance(sg, callflow.SuperGraph)

        self.eg = eg
        self.eg.supergraphs = supergraphs

        # collect all modules and compute a superset
        self.eg_modules_list = reduce(np.union1d, [self._remove_none(list(v.module2idx.keys())) for k, v in supergraphs.items()])
        self.eg_callsites_list = reduce(np.union1d, [self._remove_none(list(v.callsite2idx.keys())) for k, v in supergraphs.items()])

        self.compute()
        self.eg.add_time_proxies()
        self.eg.df_reset_index()

    def _remove_none(self, arr):
        """
        Note: This function is a patch to ensure the np.union1d does not fail. 

        Remove None from the list (arr) and convert it to a np.array.

        :param arr (list): Input array to be cleaned
        :return arr (np.array): Array without None values.
        """
        assert isinstance(arr, list)
        return np.array([i for i in arr if i is not None])

    # --------------------------------------------------------------------------
    def compute(self):
        """

        :return:
        """
        n = len(self.eg.supergraphs)
        LOGGER.info(f"Unifying {n} supergraphs")
        if n == 1:
            LOGGER.warning("Unifying should be used for 2 or more SuperGraphs")

        self.eg.dataframe = pd.DataFrame([])
        self.eg.nxg = nx.DiGraph()

        for name, sg in self.eg.supergraphs.items():
            # ------------------------------------------------------------------
            # unify the dataframe
            # remap the modules in this supergraph to the one in ensemble graph
            sg_modules_list = self._remove_none(list(sg.module2idx.keys()))
            sg_callsites_list = self._remove_none(list(sg.callsite2idx.keys()))
            _mod_map = create_reindex_map(sg_modules_list, self.eg_modules_list)
            _cs_map = create_reindex_map(sg_callsites_list, self.eg_callsites_list)
            
            if 1:  # edit directly in the supergraph
                sg.df_add_column("dataset", apply_value=sg.name)
                sg.df_add_column(
                    "module",
                    update=True,
                    apply_func=lambda _: self.eg_modules_list[_mod_map[_]] if _ is not -1 else -1,
                    apply_on="module",
                )
                sg.df_add_column(
                    "name",
                    update=True,
                    apply_func=lambda _: self.eg_callsites_list[_cs_map[_]] if _ is not -1 else -1,
                    apply_on="name",
                )

                sg.df_add_column(
                    "callers",
                    update=True,
                    apply_func=lambda _: [_cs_map[__] for __ in _],
                    apply_on="callers",
                )

                sg.df_add_column(
                    "callees",
                    update=True,
                    apply_func=lambda _: [_cs_map[__] for __ in _],
                    apply_on="callees",
                )

                sg.df_add_column(
                    "path",
                    update=True,
                    apply_func=lambda _: [_cs_map[__] for __ in _],
                    apply_on="path",
                )

                sg.df_add_column(
                    "group_path",
                    update=True,
                    apply_func=lambda _: [_mod_map[__] for __ in _],
                    apply_on="group_path",
                )

                sg.df_add_column(
                    "component_path",
                    update=True,
                    apply_func=lambda _: [_cs_map[__] for __ in _],
                    apply_on="component_path",
                )

                self.eg.dataframe = pd.concat(
                    [self.eg.dataframe, sg.dataframe], sort=True
                )

            else:  # create a new copy
                _sg = sg.dataframe.assign(dataset=sg.name)
                _sg["module"] = _sg["module"].apply(lambda _: _mod_map[_])
                self.eg.dataframe = pd.concat([self.eg.dataframe, _sg], sort=True)

            # TODO: *later*, avoid creating the concatenated dataframe

            # ------------------------------------------------------------------
            # unify the graph
            if not self.eg.nxg.is_multigraph() == sg.nxg.is_multigraph():
                raise nx.NetworkXError("Both nxg instances be graphs or multigraphs.")

            self.eg.nxg.update(sg.nxg)
            is_same = set(self.eg.nxg) == set(sg.nxg)
            if not is_same:
                LOGGER.debug(
                    f"Difference between (ensemble) and ({sg.name}): "
                    f"{list(set(self.eg.nxg) - set(sg.nxg))}"
                )

            if sg.nxg.is_multigraph():
                new_edges = sg.nxg.edges(keys=True, data=True)
            else:
                new_edges = sg.nxg.edges(data=True)

            # add nodes and edges.
            self.eg.nxg.add_nodes_from(sg.nxg)
            self.eg.nxg.add_edges_from(new_edges)

            # ------------------------------------------------------------------
        # Calculate the index maps for the updated ensemble mapping.
        self.eg.callsite2idx = {cs:idx for idx, cs in enumerate(self.eg_callsites_list)}
        self.eg.module2idx = {m: idx for idx, m in enumerate(self.eg_modules_list)}
        
        self.eg.idx2callsite = {idx:cs for cs, idx in self.eg.callsite2idx.items()}
        self.eg.idx2module = {idx:m for m, idx in self.eg.module2idx.items()}

        self.eg.callsite2idx[None], self.eg.idx2callsite[-1] = -1, None
        self.eg.module2idx[None], self.eg.idx2module[-1] = -1, None
        
        # Calculate the callsite2module mapping for the updated index maps.
        self.eg.callsite2module, self.eg.module2callsite = self.eg.callsite2module_from_indexmaps(self.eg.callsite2idx, self.eg.module2idx)
        
        # Update the dataframe with the updated indexes.
        self.eg.factorize_callsites_and_modules()

# ------------------------------------------------------------------------------
