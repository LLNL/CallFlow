# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------
# Library imports
import networkx as nx

# ------------------------------------------------------------------------------
# CallFlow imports
import callflow

LOGGER = callflow.get_logger(__name__)


class HierarchyLayout:
    def __init__(self, supergraph, module, filter_by="time (inc)", filter_perc=0.0):
        assert isinstance(supergraph, callflow.SuperGraph)
        assert "module" in supergraph.gf.df.columns
        assert module in supergraph.gf.df["module"].unique().tolist()

        module_df = supergraph.gf.df.loc[supergraph.gf.df["module"] == module]
        self.nxg = HierarchyLayout.create_nxg_tree_from_paths(
            module_df=module_df,
            path="component_path",
            filter_by=filter_by,
            filter_perc=filter_perc,
        )

        # TODO: Need to verify it is always a Tree.
        cycles = self.check_cycles(self.nxg)
        while len(cycles) != 0:
            self.nxg = self.remove_cycles(self.nxg, cycles)
            cycles = self.check_cycles(self.hierarchy)
            LOGGER.debug(f"cycles: {cycles}")

    @staticmethod
    def create_nxg_tree_from_paths(module_df, path, filter_by, filter_perc):
        """Create a networkx graph for the module hierarchy. Filter if filter percentage is greater than 0."""

        from ast import literal_eval as make_tuple

        if filter_perc > 0.0:
            group_df = module_df.groupby(["name"]).mean()
            f_group_df = group_df.loc[
                group_df[filter_by] > filter_perc * group_df[filter_by].max()
            ]
            callsites = f_group_df.index.values.tolist()
            module_df = module_df[module_df["name"].isin(callsites)]

        nxg = nx.DiGraph()
        paths = module_df[path].unique()

        for idx, path in enumerate(paths):
            path = make_tuple(path)
            source_targets = HierarchyLayout._create_source_targets(path)

            for edge in source_targets:
                source = edge["source"]
                target = edge["target"]
                if not nxg.has_edge(source, target):
                    nxg.add_edge(source, target)
        return nxg

    @staticmethod
    def _create_source_targets(path_list):
        """ Create edges from path list.
        Params:
            path (list) - paths expressed as a list.
        Return: edges (array) - edges expressed as source-target pairs.
        """

        edges = []

        for idx in range(len(path_list)):
            if idx == len(path_list) - 1:
                break

            source = callflow.utils.sanitize_name(path_list[idx])
            target = callflow.utils.sanitize_name(path_list[idx + 1])

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
    def check_cycles(G):
        """
        Checks if there are cycles.

        Return:
            The cycles in the graph.
        """
        try:
            cycles = list(nx.find_cycle(G, orientation="ignore"))
        except:
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
