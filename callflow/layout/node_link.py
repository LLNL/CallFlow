# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

"""
CallFlow's layout API.
"""
import networkx as nx

# CallFlow imports
import callflow
from callflow.utils.timer import Timer
from callflow.utils.sanitizer import Sanitizer


class NodeLinkLayout:
    """
    Node link layout computation
    """

    _COLUMNS = ["time (inc)", "time", "name", "module"]

    def __init__(self, sg, selected_runs=None):
        """
        Constructor for node link layout.
        :param sg: SuperGraph
        :param selected_runs: Array of SuperGraphs to consider
        """
        assert isinstance(sg, (callflow.SuperGraph, callflow.EnsembleGraph))

        # set the current graph being rendered.
        self.sg = sg

        self.timer = Timer()

        self.time_exc = self.sg.df_get_proxy("time")
        self.time_inc = self.sg.df_get_proxy("time (inc)")

        # Do not filter if the selected_runs is a single run.
        if not isinstance(sg, callflow.SuperGraph):
            sg.nxg_filter_by_datasets(selected_runs)

        self.runs = selected_runs
        self.nxg = sg.nxg

        # Add node and edge attributes.
        self._add_node_attributes()
        self._add_edge_attributes()

        # print(self.nxg.nodes(data=True))

        # # Find cycles in the nxg.
        # with self.timer.phase("Find cycles"):
        #     self.nxg.cycles = NodeLinkLayout._detect_cycle(self.nxg)

    # --------------------------------------------------------------------------
    @staticmethod
    def _mean(df, metric):
        import math

        time = df[metric].mean()
        if math.isnan(time):
            time = 0
        return time


    def _add_node_attributes(self):  # noqa: C901
        """
        Add node attributes to the nxg.
        :return: None
        """
        # compute data map
        datamap = {}
        for callsite in self.nxg.nodes():
            for column in NodeLinkLayout._COLUMNS:
                if column not in datamap:
                    datamap[column] = {}

                callsite_idx = self.sg.get_idx(callsite, "callsite")
                _df = self.sg.df_lookup_with_column("name", callsite_idx)

                if column == "time (inc)":
                    datamap[column][callsite] = NodeLinkLayout._mean(_df, self.time_inc)
                elif column == "time":
                    datamap[column][callsite] = NodeLinkLayout._mean(_df, self.time_exc)
                elif column == "name":
                    datamap[column][callsite] = callsite
                elif column == "module":
                    datamap[column][callsite] = self.sg.get_module(callsite_idx)

        # ----------------------------------------------------------------------
        for idx, key in enumerate(datamap):
            nx.set_node_attributes(self.nxg, name=key, values=datamap[key])

    # --------------------------------------------------------------------------
    def _add_edge_attributes(self):
        """
        Add edge attributes to nxg.
        :return: None
        """
        source = None
        orientation = None
        is_directed = self.nxg.is_directed()

        edge_counter = {}

        for start_node in self.nxg.nbunch_iter(source):
            for edge in nx.edge_dfs(self.nxg, start_node, orientation):

                tail, head = NodeLinkLayout._tailhead(edge, is_directed, orientation)

                if edge not in edge_counter:
                    edge_counter[edge] = 0

                if tail == head:
                    edge_counter[edge] += 1
                else:
                    edge_counter[edge] = 1

        # ----------------------------------------------------------------------
        nx.set_edge_attributes(self.nxg, name="count", values=edge_counter)

    # --------------------------------------------------------------------------
    # Reports the number of cycles in the callpaths.
    @staticmethod
    def _detect_cycle(G, source=None, orientation=None):
        """
        Detect cycles in the CCT.

        :param G: nxg Graph
        :param source: source node to start searching
        :param orientation: orientation of edges to consider
        :return: Array of cycles [(source, target), ...]
        """
        explored = set()
        cycle = []
        count = 0
        final_node = None
        is_directed = G.is_directed()
        for start_node in G.nbunch_iter(source):
            if start_node in explored:
                # No loop is possible.
                continue

            edges = []
            # All nodes seen in this iteration of edge_dfs
            seen = {start_node}
            # Nodes in active path.
            active_nodes = {start_node}
            previous_head = None

            for edge in nx.edge_dfs(G, start_node, orientation):
                # Determine if this edge is a continuation of the active path.
                tail, head = NodeLinkLayout._tailhead(edge, is_directed, orientation)
                if head in explored:
                    # Then we've already explored it. No loop is possible.
                    continue
                if previous_head is not None and tail != previous_head:
                    # This edge results from backtracking.
                    # Pop until we get a node whose head equals the current tail.
                    # So for example, we might have:
                    #  (0, 1), (1, 2), (2, 3), (1, 4)
                    # which must become:
                    #  (0, 1), (1, 4)
                    while True:
                        try:
                            popped_edge = edges.pop()
                        except IndexError:
                            edges = []
                            active_nodes = {tail}
                            break
                        else:
                            popped_head = NodeLinkLayout._tailhead(
                                popped_edge, is_directed, orientation
                            )[1]
                            active_nodes.remove(popped_head)

                        if edges:
                            # how can you pass a single element into tailhead?
                            last_head = NodeLinkLayout._tailhead(
                                edges[-1], is_directed, orientation
                            )[1]
                            if tail == last_head:
                                break
                edges.append(edge)

                if head in active_nodes:
                    # We have a loop!
                    cycle.extend(edges)
                    final_node = head
                    break
                else:
                    seen.add(head)
                    active_nodes.add(head)
                    previous_head = head

            if cycle:
                count += 1
                break
            else:
                explored.update(seen)

        else:
            assert len(cycle) == 0
            # raise nx.exception.NetworkXNoCycle('No cycle found.')

        # We now have a list of edges which ends on a cycle.
        # So we need to remove from the beginning edges that are not relevant.
        i = 0
        for i, edge in enumerate(cycle):
            tail, head = NodeLinkLayout._tailhead(edge, is_directed, orientation)
            if tail == final_node:
                break
        return cycle[i:]

    # --------------------------------------------------------------------------
    @staticmethod
    def _create_nxg_from_paths(paths):
        """

        :param paths:
        :return:
        """
        assert isinstance(paths, list)

        nxg = nx.DiGraph()

        # go over all path
        for i, path in enumerate(paths):

            # go over the callsites in this path
            plen = len(path)

            for j in range(plen - 1):
                source = Sanitizer.sanitize(path[j])
                target = Sanitizer.sanitize(path[j + 1])

                if not nxg.has_edge(source, target):
                    nxg.add_edge(source, target)

        return nxg

    @staticmethod
    def _tailhead(edge, is_directed, orientation=None):
        """

        :param edge:
        :param is_directed:
        :param orientation:
        :return:
        """
        # Probably belongs on graphframe?
        # definitaly also used in supergraph
        assert isinstance(edge, tuple)
        assert len(edge) == 2
        assert isinstance(is_directed, bool)
        # assert isinstance(orientation, (NoneType,str))

        if not is_directed or orientation in [None, "original"]:
            return edge[0], edge[1]
        elif orientation == "reverse":
            return edge[1], edge[0]
        elif orientation == "ignore" and edge[-1] == "reverse":
            return edge[1], edge[0]
        return edge[0], edge[1]

    # --------------------------------------------------------------------------
