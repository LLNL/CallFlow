# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------
"""
CallFlow's operation to unify a super graph.
"""
import pandas as pd
import networkx as nx

import callflow

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
        for k, v in supergraphs.items():
            assert isinstance(k, str) and isinstance(v, callflow.SuperGraph)

        self.eg = eg
        self.eg.supergraphs = supergraphs

        self.compute()

        # TODO: we should fix this assumption
        LOGGER.warning("Assuming that all module maps are the same!")
        k0 = list(supergraphs.keys())[0]
        self.eg.modules = supergraphs[k0].modules

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

            # unify the dataframe
            self.eg.dataframe = pd.concat([self.eg.dataframe, sg.dataframe], sort=True)

            # unify the graph
            if not self.eg.nxg.is_multigraph() == sg.nxg.is_multigraph():
                raise nx.NetworkXError("Both nxg instances be graphs or multigraphs.")

            self.eg.nxg.update(sg.nxg)
            is_same = set(self.eg.nxg) == set(sg.nxg)
            if not is_same:
                LOGGER.debug(
                    f"Difference between (ensemble) and ({name}): "
                    f"{list(set(self.eg.nxg) - set(sg.nxg))}"
                )

            if sg.nxg.is_multigraph():
                new_edges = sg.nxg.edges(keys=True, data=True)
            else:
                new_edges = sg.nxg.edges(data=True)

            # add nodes and edges.
            self.eg.nxg.add_nodes_from(sg.nxg)
            self.eg.nxg.add_edges_from(new_edges)


# ------------------------------------------------------------------------------
