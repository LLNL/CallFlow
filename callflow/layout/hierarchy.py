# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

"""
CallFlow's Hierarchy of a module computation API.
"""
import networkx as nx

# CallFlow imports
import callflow
from callflow.utils.sanitizer import Sanitizer
from callflow.utils.df import df_as_dict


LOGGER = callflow.get_logger(__name__)


class HierarchyLayout:
    """
    Hierarchy Layout computation
    """

    def __init__(self, sg, node, filter_by="time (inc)", filter_perc=0.0):
        """
        Hierarchy Layout computation

        # TODO: Avoid filtering over here.
        :param supergraph: SuperGraph
        :param node: node name
        :param filter_by: filter by the metric
        :param filter_perc:  filter percentage
        """
        assert isinstance(sg, callflow.SuperGraph)
        assert "module" in sg.dataframe.columns
        assert node in list(sg.modules_list)

        self.node = node
        module_idx = sg.get_idx(node, "module")
        self.sg = sg
        module_df = sg.dataframe.loc[sg.dataframe["module"] == module_idx]
        self.nxg = self.create_nxg_tree_from_paths(
            df=module_df,
            path="component_path",
            filter_by=filter_by,
            filter_perc=filter_perc,
        )

        # TODO: Need to verify it is always a Tree.
        cycles = HierarchyLayout._check_cycles(self.nxg)
        while len(cycles) != 0:
            self.nxg = HierarchyLayout._remove_cycles(self.nxg, cycles)
            cycles = HierarchyLayout._check_cycles(self.nxg)
            LOGGER.debug(f"cycles: {cycles}")

    def create_nxg_tree_from_paths(self, df, path, filter_by, filter_perc):
        """
        Create a networkx graph for the module hierarchy. Filter if filter percentage is greater than 0.

        :param module_df: dataframe for the module
        :param path: path column to consider, e.g., path, group_path, component_path
        :param filter_by: filter by attribute
        :param filter_perc: filter percentage
        :return: NetworkX graph
        """

        nxg = nx.DiGraph()
        cp_dict = df_as_dict(df, 'name', 'component_path')

        for c_name, path in cp_dict.items():
            path_list = list(map(lambda p: self.sg.get_name(p, "callsite"), path))
            path_list = [self.node] + path_list
            source_targets = HierarchyLayout._create_source_targets(path_list)

            for edge in source_targets:
                source = edge["source"]
                target = edge["target"]
                if not nxg.has_edge(source, target):
                    nxg.add_edge(source, target)
        return nxg

    @staticmethod
    def _create_source_targets(path_list):
        """
        Create edges from path list.

        :param path_list: paths expressed as a list.
        :return: edges (array)  edges expressed as source-target pairs.
        """

        edges = []

        for idx in range(len(path_list)):
            if idx == len(path_list) - 1:
                break

            source = path_list[idx]
            target = path_list[idx + 1]

            edges.append({"source": source, "target": target})
        return edges

    @staticmethod
    def as_spanning_trees(G):
        """
        NOTE: Not used currently.
        For a given graph with multiple sub graphs, find the components
        and draw a spanning tree.

        Returns a new Graph with components as spanning trees (i.e. without cycles).
        """
        nxg = nx.Graph()

        subgraphs = nx.connected_component_subgraphs(G, copy=False)

        for g in subgraphs:
            T = nx.minimum_spanning_tree(g)
            nxg.add_edges_from(T.edges())
            nxg.add_nodes_from(T.nodes())

        return nxg

    @staticmethod
    def _check_cycles(G):
        """
        Checks if there are cycles.

        Return:
            The cycles in the graph.
        """
        try:
            cycles = list(nx.find_cycle(G, orientation="ignore"))
        except Exception:
            cycles = []

        return cycles

    @staticmethod
    def _remove_cycles(G, cycles):
        """
        Removes cycles from the networkX Graph.
        TODO: Improve the logic here.
        """
        for cycle in cycles:
            source = cycle[0]
            target = cycle[1]
            LOGGER.debug("Removing edge:", source, target)
            if source == target:
                G.remove_edge(source, target)
                G.remove_node(source)
                G.remove_node

            if cycle[2] == "reverse":
                LOGGER.debug("Removing edge:", source, target)
                G.remove_edge(source, target)
        return G
