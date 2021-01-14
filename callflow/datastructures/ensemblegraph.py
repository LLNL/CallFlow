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
    def __init__(self, name, mode, config, supergraphs = {}):
        """
        Arguments:
            supergraphs (dict): dictionary of supergraphs keyed by their name.
        """
        assert isinstance(name, str) and isinstance(mode, str)
        assert name == 'ensemble' and mode in ["process", "render"]
        assert isinstance(config, dict)
        assert isinstance(supergraphs, dict)

        n = len(supergraphs)
        assert (mode == "process") == (n > 0)

        self.supergraphs = supergraphs
        if mode == "process":
            LOGGER.info(f'Creating EnsembleGraph for {n} SuperGraphs')
            if n == 1:
                LOGGER.warning('Creating an ensemble requires 2 or more SuperGraphs')

            df = self.unify_df()
            nxg = self.unify_nxg()
        else:
            df, nxg = None, None

        super().__init__(name, mode=mode, config=config, dataframe=df, nxg=nxg)
        # ----------------------------------------------------------------------

    # --------------------------------------------------------------------------
    '''
    def create_gf(self):
        """
        Create a new callflow.graphframe containing the information of the ensemble.
        If mode is process, union operation is performed on the df and graph.
        If mode is render, corresponding files from .callflow/ensemble are read.

        Note: Code for render is same as in SuperGraph class. Might have to find a way to avoid repetition.
        """
        if self.mode == "process":
            self.dataframe = self.union_df()
            # self.gf = callflow.GraphFrame(dataframe=self.union_df())
            # self.gf.dataframe = self.union_df()

            '' '
            self.gf = callflow.GraphFrame()
            self.gf.dataframe = self.union_df()
            '' '
            """
            TODO: Need to write a module to convert a NetowrkX graph to a Hatchet graph.
            Currently, there is no way to convert networkX to hatchet graph yet. So we are setting this to None.
            """
            self.graph = None
            self.nxg = self.union_nxg()
            self.df_add_time_proxies()

        elif self.mode == "render":
            self.read_supergraph()
    '''
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
