# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import networkx as nx
import pandas as pd

from callflow import get_logger
from .supergraph import SuperGraph
LOGGER = get_logger(__name__)


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class EnsembleGraph(SuperGraph):
    """
    Ensemble SuperGraph Class to handle the processing of ensemble of call graphs.
    """

    # --------------------------------------------------------------------------
    def __init__(self, name, config):

        super().__init__(name, config)
        assert name == 'ensemble'
        self.supergraphs = {}

    def unify(self, supergraphs):

        n = len(supergraphs)
        self.supergraphs = supergraphs
        LOGGER.info(f'Creating EnsembleGraph {self.name} for {n} SuperGraphs')
        if n == 1:
            LOGGER.warning('Creating an ensemble requires 2 or more SuperGraphs')

        self.dataframe = self.unify_df()
        self.nxg = self.unify_nxg()
        self.graph = None

        self.exc_metrics = []
        self.inc_metrics = []

        self.df_add_time_proxies()
        self.df_reset_index()

    # --------------------------------------------------------------------------
    def unify_df(self):
        """
        Unify the dataframes.
        Return:
            (pd.DataFrame) DataFrame for union of the dataframes.
        """
        LOGGER.info(f'Unifying {len(self.supergraphs)} dataframes')
        df = pd.DataFrame([])
        for idx, tag in enumerate(self.supergraphs):
            df = pd.concat([df, self.supergraphs[tag].dataframe], sort=True)
        return df

    def unify_nxg(self):
        """
        Unify the netwprkX graph.
        Return:
            (nx.DiGraph) NetworkX graph for union of graphs.
        """
        LOGGER.info(f'Unifying {len(self.supergraphs)} graphs')
        nxg = nx.DiGraph()
        for idx, name in enumerate(self.supergraphs):
            EnsembleGraph._unify_nxg_recurse(nxg, self.supergraphs[name].nxg, name)
        return nxg

    @staticmethod
    def _unify_nxg_recurse(nxg, nxg_2_merge, name_2_merge):

        if not nxg.is_multigraph() == nxg_2_merge.is_multigraph():
            raise nx.NetworkXError("Both nxg instances be graphs or multigraphs.")

        nxg.update(nxg_2_merge)

        is_same = set(nxg) == set(nxg_2_merge)
        if not is_same:
            LOGGER.debug(f"Difference between (ensemble) and ({name_2_merge}): "
                         f"{list(set(nxg) - set(nxg_2_merge))}")
            # LOGGER.debug(f"Nodes in Graph 1: {set(nxg_1)}")
            # LOGGER.debug(f"Nodes in Graph 2: {set(nxg_2)}")

        if nxg_2_merge.is_multigraph():
            new_edges = nxg_2_merge.edges(keys=True, data=True)
        else:
            new_edges = nxg_2_merge.edges(data=True)

        # add nodes and edges.
        nxg.add_nodes_from(nxg_2_merge)
        nxg.add_edges_from(new_edges)
        return nxg

    # --------------------------------------------------------------------------
    # TODO:
    def edge_weight(self, nxg):
        pass

    # TODO
    def add_edge_attributes(self):
        pass

    # TODO
    def add_node_attributes(self, nxg, node, dataset_name):
        pass

    # --------------------------------------------------------------------------
