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
        self.eg.modules_list = reduce(
            np.union1d, [v.modules_list for k, v in supergraphs.items()]
        )
        self.eg.callsites_list = reduce(np.union1d, [v.callsites_list for k, v in supergraphs.items()])

        self.compute()
        self.eg.add_time_proxies()
        self.eg.df_reset_index()

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
            _mod_map = create_reindex_map(sg.modules_list, self.eg.modules_list)
            _cs_map = create_reindex_map(sg.callsites_list, self.eg.callsites_list)

            if 1:  # edit directly in the supergraph
                sg.df_add_column("dataset", apply_value=sg.name)
                sg.df_add_column(
                    "module",
                    update=True,
                    apply_func=lambda _: self.eg.modules_list[_mod_map[_]],
                    apply_on="module",
                )
                sg.df_add_column(
                    "name",
                    update=True,
                    apply_func=lambda _: self.eg.callsites_list[_cs_map[_]],
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

        self.eg.callsite2idx = {cs:idx for idx, cs in enumerate(self.eg.callsites_list)}
        self.eg.module2idx = {m: idx for idx, m in enumerate(self.eg.modules_list)}
        
        self.eg.idx2callsite = {idx:cs for cs, idx in self.eg.callsite2idx.items()}
        self.eg.idx2module = {idx:m for m, idx in self.eg.module2idx.items()}
        
        _cs_idx = lambda _: self.eg.callsite2idx.get(_) # noqa E731
        _m_idx = lambda _: self.eg.module2idx.get(_)  # noqa E731

        callsite2module_list = self.eg.dataframe.groupby('name')['module'].apply(lambda x: x.unique().tolist()).to_dict()

        # Calculate the callsite2module mapping.
        self.eg.callsite2module = { cs_idx: -1 for cs_idx in self.eg.idx2callsite.keys() }
        # Make sure each callsite maps to a single module and create
        # callsite2module mapping, if not raise an exception.
        for c, mlist in callsite2module_list.items():
            assert len(set(mlist)) == 1, \
                f'Found multiple modules ({mlist}) for callsite ({c})'
            self.eg.callsite2module[_cs_idx(c)] = _m_idx(mlist[0])

        # Calculate module2callsite mapping from the callsite2module mapping.
        self.eg.module2callsite = { midx: [] for midx in self.eg.idx2module.keys() }
        for cs_idx in self.eg.callsite2module.keys():
            m_idx = self.eg.callsite2module[cs_idx]
            self.eg.module2callsite[m_idx].append(cs_idx)


        self.eg.module2callsite = {_m_idx(m): [] for m in self.eg.modules_list}


        self.eg.factorize_callsites_and_modules()


# ------------------------------------------------------------------------------
