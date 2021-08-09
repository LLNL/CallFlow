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
from callflow.utils.df import df_as_dict

LOGGER = callflow.get_logger(__name__)


class HierarchyLayout:
    """
    Hierarchy Layout computation
    """

    def __init__(self, esg, dataset, node, nbins):
        """
        Hierarchy Layout computation

        :param supergraph: SuperGraph
        :param node: node name
        """
        assert isinstance(esg, callflow.SuperGraph)
        assert "module" in esg.dataframe.columns

        self.node = node
        module_idx = esg.get_idx(node, "module")

        self.esg = esg
        module_df = esg.dataframe.loc[esg.dataframe["module"] == module_idx]

        self.time_exc = self.esg.df_get_proxy("time")
        self.time_inc = self.esg.df_get_proxy("time (inc)")

        self.nxg = self.create_nxg_tree_from_paths(
            df=module_df, path="component_path", nbins=nbins
        )

        # TODO: Need to verify it is always a Tree.
        cycles = HierarchyLayout._check_cycles(self.nxg)
        while len(cycles) != 0:
            self.nxg = HierarchyLayout._remove_cycles(self.nxg, cycles)
            cycles = HierarchyLayout._check_cycles(self.nxg)
            LOGGER.debug(f"cycles: {cycles}")

    def create_nxg_tree_from_paths(self, df, path, nbins):
        """
        Create a networkx graph for the module hierarchy.

        :param module_df: dataframe for the module
        :param path: path column to consider, e.g., path, group_path, component_path
        :return: NetworkX graph
        """

        nxg = nx.DiGraph()
        cp_dict = df_as_dict(df, "name", "component_path")

        for c_name, path in cp_dict.items():
            path_list = list(map(lambda p: self.esg.get_name(p, "callsite"), path))
            path_list = [self.node] + path_list

            for idx in range(len(path_list)):
                if idx == len(path_list) - 1:
                    break

                source = path_list[idx]
                target = path_list[idx + 1]

                if not nxg.has_node(source):
                    if idx == 0:
                        ntype = "module"
                    else:
                        ntype = "callsite"
                    nid = self.esg.get_idx(source, ntype)

                    nxg.add_node(
                        source,
                        attr_dict=self.esg_node_construct(nid, ntype, source, nbins),
                    )

                # TODO: This could lead to issues. We cannot assume all nodes
                # that are below a module, a callsite.
                # We need to make it type independent. We need a better way to
                # judge what type a particular callsite is.
                if not nxg.has_node(target):
                    ntype = "callsite"
                    nid = self.esg.get_idx(target, ntype)
                    nxg.add_node(
                        target,
                        attr_dict=self.esg_node_construct(nid, ntype, target, nbins),
                    )

                if not nxg.has_edge(source, target):
                    nxg.add_edge(source, target)
        return nxg

    def esg_node_construct(self, nid, ntype, name, nbins):
        node = {
            "id": nid,
            "type": ntype,
        }
        return {
            "id": nid,
            "type": ntype,
            "name": name,
            "grad": self.esg.get_gradients(node, nbins),
            self.time_inc: self.esg.get_runtime(node, self.time_inc),
            self.time_exc: self.esg.get_runtime(node, self.time_exc),
        }

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
