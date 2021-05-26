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
from callflow.utils.df import df_get_column


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

        # Put the top callsites into a list.
        callsites = sg.df_unique("name")
        # callsite_count = len(callsite_count)
        # callsites = sg.df_get_top_by_attr(callsite_count, self.time_inc)

        # Filter out the callsites not in the list. (in a LOCAL copy)
        # _fdf = sg.df_filter_by_name(callsites)

        # paths = [df_get_column(sg.dataframe, "path")[0] for callsite in callsites]

        self.nxg = sg.nxg
        # self.aux_data = sg.aux_data

        # Add node and edge attributes.
        self._add_node_attributes()
        self._add_edge_attributes()

        # # Find cycles in the nxg.
        # with self.timer.phase("Find cycles"):
        #     self.nxg.cycles = NodeLinkLayout._detect_cycle(self.nxg)

    # --------------------------------------------------------------------------
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

                if column == "time (inc)":
                    datamap[column][callsite] = self.aux_data["data_cs"][callsite]["time (inc)"]["mean"]
                elif column == "time":
                    datamap[column][callsite] = self.aux_data["data_cs"][callsite]["time"]["mean"]
                elif column == "name":
                    datamap[column][callsite] = callsite
                elif column == "module":
                    datamap[column][callsite] = self.aux_data["c2m"][callsite]

        # ----------------------------------------------------------------------
        for idx, key in enumerate(datamap):
            nx.set_node_attributes(self.nxg, name=key, values=datamap[key])

        # ----------------------------------------------------------------------
        # compute map across data
        # for run in self.runs:
        #     if isinstance(self.sg, callflow.SuperGraph):
        #         target_df = self.sg.dataframe
        #     else:
        #         target_df = self.sg.dataframe.loc[self.sg.dataframe["dataset"] == run]

        #     if not target_df["module"].equals(target_df["name"]):
        #         target_group_df = target_df.groupby(["module"])
        #         target_name_group_df = target_df.groupby(["module", "name"])
        #     else:
        #         target_group_df = target_df
        #         target_name_group_df = target_df.groupby("name")

        #     target_module_callsite_map = target_group_df["name"].unique().to_dict()
        #     target_name_time_inc_map = (
        #         target_name_group_df[self.time_inc].mean().to_dict()
        #     )
        #     target_name_time_exc_map = target_name_group_df[self.time_exc].mean().to_dict()

        #     datamap = {}
        #     for callsite in self.nxg.nodes():

        #         if callsite not in target_module_callsite_map.keys():
        #             continue

        #         module = self.sg.get_module_idx(callsite)

        #         if callsite not in datamap:
        #             datamap[callsite] = {}

        #         for column in NodeLinkLayout._COLUMNS:

        #             if column not in datamap:
        #                 datamap[column] = {}

        #             if column == self.time_inc:
        #                 datamap[callsite][column] = target_name_time_inc_map[module]
        #             elif column == self.time_exc:
        #                 datamap[callsite][column] = target_name_time_exc_map[module]
        #             elif column == "module":
        #                 datamap[callsite][column] = module
        #             elif column == "name":
        #                 datamap[callsite][column] = callsite

        #     nx.set_node_attributes(self.nxg, name=run, values=datamap)

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
        from ast import literal_eval as make_tuple

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
