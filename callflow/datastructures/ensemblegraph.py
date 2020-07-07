# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# -------------------------------------------------------------------------------
# Library imports
import networkx as nx
import pandas as pd

# -------------------------------------------------------------------------------
# CallFlow imports
import callflow

LOGGER = callflow.get_logger(__name__)
from callflow import SuperGraph

# ------------------------------------------------------------------------------
class EnsembleGraph(SuperGraph):
    """
    Ensemble SuperGraph Class to handle the processing of ensemble of call graphs.

    Note: I am thinking this might also not really be a class that extends SuperGraph.
    """

    # --------------------------------------------------------------------------
    def __init__(self, props={}, tag="", mode="process", supergraphs={}):
        """
        Arguments:
            supergraphs (dict): dictionary of supergraphs keyed by their tag.
        """
        self.supergraphs = supergraphs

        super().__init__(props, tag, mode)

    # --------------------------------------------------------------------------
    def create_gf(self):
        """
        Create a new callflow.graphframe containing the information of the ensemble.
        If mode is process, union operation is performed on the df and graph.
        If mode is render, corresponding files from .callflow/ensemble are read.

        Note: Code for render is same as in SuperGraph class. Might have to find a way to avoid repetition.
        """
        if self.mode == "process":

            self.gf = callflow.GraphFrame()
            self.gf.df = self.union_df()
            """
            TODO: Need to write a module to convert a NetowrkX graph to a Hatchet graph.
            Currently, there is no way to convert networkX to hatchet graph yet. So we are setting this to None.
            """
            self.gf.graph = None
            self.gf.nxg = self.union_nxg()

        elif self.mode == "render":
            self._create_for_render()

    # --------------------------------------------------------------------------
    def union_df(self):
        """
        Union the dataframes.
        Return:
            (pd.DataFrame) DataFrame for union of the dataframes.
        """
        df = pd.DataFrame([])

        for idx, tag in enumerate(self.supergraphs):
            df = pd.concat([df, self.supergraphs[tag].gf.df], sort=True)

        return df

    def union_nxg(self):
        """
        Union the netwprkX graph.

        Return:
            (nx.DiGraph) NetworkX graph for union of graphs.
        """
        nxg = nx.DiGraph()
        for idx, tag in enumerate(self.supergraphs):
            LOGGER.debug("-=========================-")
            LOGGER.debug(tag)
            EnsembleGraph._union_nxg_recurse(nxg, self.supergraphs[tag].gf.nxg)

        return nxg

    # Return the union of graphs G and H.
    @staticmethod
    def _union_nxg_recurse(nxg_1, nxg_2):
        """
        Pairwise Iterative concatenation of nodes from nxg_2 to nxg_1.

        """
        if not nxg_1.is_multigraph() == nxg_2.is_multigraph():
            raise nx.NetworkXError("G and H must both be graphs or multigraphs.")

        nxg_1.update(nxg_2)

        is_same = set(nxg_1) == set(nxg_2)
        LOGGER.debug(f"Nodes in Graph 1 and Graph 2 are same? : {is_same}")
        if set(nxg_1) != set(nxg_2):
            LOGGER.debug(f"Difference is { list(set(nxg_1) - set(nxg_2))}")
            LOGGER.debug(f"Nodes in Graph 1: {set(nxg_1)}")
            LOGGER.debug(f"Nodes in Graph 2: {set(nxg_2)}")
        LOGGER.debug("-=========================-")

        if nxg_2.is_multigraph():
            new_edges = nxg_2.edges(keys=True, data=True)
        else:
            new_edges = nxg_2.edges(data=True)

        # add nodes and edges.
        nxg_1.add_nodes_from(nxg_2)
        nxg_1.add_edges_from(new_edges)

        return nxg_1

    # --------------------------------------------------------------------------
    # TODO:
    def edge_weight(self, nxg):
        pass

    # TODO
    def add_edge_attributes(self):
        edge_weight_mapping = self.edge_weight()
        nx.set_edge_attributes(
            self.union, name="number_of_runs", values=number_of_runs_mapping
        )

    # TODO
    def add_node_attributes(self, nxg, node, dataset_name):
        """
        """
        for idx, (key, val) in enumerate(H.nodes.items()):
            if dataset_name not in self.nxg.nodes[node]:
                self.nxg.nodes[node] = self.vector[node]

    # --------------------------------------------------------------------------
