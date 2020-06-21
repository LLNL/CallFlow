# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

# ------------------------------------------------------------------------------
# Library imports
import math
import pandas as pd
import networkx as nx

# ------------------------------------------------------------------------------
# CallFlow imports
import callflow
from callflow.timer import Timer
from callflow import SuperGraph

# ------------------------------------------------------------------------------
# CCT Rendering class.
class NodeLinkLayout:

    _COLUMNS = ["time (inc)", "time", "name", "module"]

    def __init__(self, supergraph, callsite_count=50):

        assert isinstance(supergraph, SuperGraph)
        assert isinstance(callsite_count, int)
        assert callsite_count > 0

        # set the current graph being rendered.
        self.supergraph = supergraph

        self.timer = Timer()

        # Number of runs in the state.
        self.runs = self.supergraph.gf.df["dataset"].unique()

        # Put the top callsites into a list.
        callsites = self.supergraph.gf.get_top_by_attr(callsite_count, "time (inc)")

        # Filter out the callsites not in the list. (in a LOCAL copy)
        df = self.supergraph.gf.filter_by_name(callsites)

        with self.timer.phase(f"Creating CCT for ({self.runs})"):
            self.nxg = NodeLinkLayout._create_nxg_from_paths(df["path"].tolist())

        # Add node and edge attributes.
        with self.timer.phase("Add graph attributes"):
            self._add_node_attributes()
            self._add_edge_attributes()

        # Find cycles in the nxg.
        with self.timer.phase(f"Find cycles"):
            self.nxg.cycles = NodeLinkLayout._find_cycle(self.nxg)

    # --------------------------------------------------------------------------
    def _add_node_attributes(self):

        module_name_group_df = self.supergraph.gf.df.groupby(["module", "name"])
        name_time_inc_map = module_name_group_df["time (inc)"].max().to_dict()
        name_time_exc_map = module_name_group_df["time"].max().to_dict()

        # compute data map
        datamap = {}
        for callsite in self.nxg.nodes():

            module = self.supergraph.get_module_name(callsite)

            for column in NodeLinkLayout._COLUMNS:
                if column not in datamap:
                    datamap[column] = {}

                if column == "time (inc)":
                    datamap[column][callsite] = name_time_inc_map[(module, callsite)]
                elif column == "time":
                    datamap[column][callsite] = name_time_exc_map[(module, callsite)]
                elif column == "name":
                    datamap[column][callsite] = callsite
                elif column == "module":
                    datamap[column][callsite] = module

        # ----------------------------------------------------------------------
        for idx, key in enumerate(datamap):
            nx.set_node_attributes(self.nxg, name=key, values=datamap[key])

        # ----------------------------------------------------------------------
        # compute map across data
        for run in self.runs:
            target_df = self.supergraph.gf.df.loc[self.supergraph.gf.df["dataset"] == run]
            target_module_group_df = target_df.groupby(["module"])
            target_module_name_group_df = target_df.groupby(["module", "name"])
            target_module_callsite_map = target_module_group_df["name"].unique().to_dict()
            target_name_time_inc_map = target_module_name_group_df["time (inc)"].max().to_dict()
            target_name_time_exc_map = target_module_name_group_df["time"].max().to_dict()

            datamap = {}
            for callsite in self.nxg.nodes():

                if callsite not in target_module_callsite_map.keys():
                    continue

                module = self.supergraph.get_module_name(callsite)

                if callsite not in datamap:
                    datamap[callsite] = {}

                for column in NodeLinkLayout._COLUMNS:

                    if column not in datamap:
                        datamap[column] = {}

                    if column == "time (inc)":
                        datamap[callsite][column] = target_name_time_inc_map[module]
                    elif column == "time":
                        datamap[callsite][column] = target_module_time_exc_map[module]
                    elif column == "module":
                        datamap[callsite][column] = module
                    elif column == "name":
                        datamap[callsite][column] = callsite

            # ------------------------------------------------------------------
            nx.set_node_attributes(self.nxg, name=run, values=datamap)

    # --------------------------------------------------------------------------
    def _add_edge_attributes(self):

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
    def _find_cycle(G, source=None, orientation=None):
        """
        if not G.is_directed() or orientation in (None, "original"):

            def tailhead(edge):
                return edge[:2]

        elif orientation == "reverse":

            def tailhead(edge):
                return edge[1], edge[0]

        elif orientation == "ignore":

            def tailhead(edge):
                if edge[-1] == "reverse":
                    return edge[1], edge[0]
                return edge[:2]
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

        assert isinstance(paths, list)
        from ast import literal_eval as make_tuple

        nxg = nx.DiGraph()

        # go over all path
        for i, path in enumerate(paths):

            # go over the callsites in this path
            callsites = make_tuple(path)
            plen = len(callsites)

            for j in range(plen - 1):
                source = callflow.utils.sanitize_name(callsites[j])
                target = callflow.utils.sanitize_name(callsites[j + 1])

                if not nxg.has_edge(source, target):
                    nxg.add_edge(source, target)

        return nxg

    @staticmethod
    def _tailhead(edge, is_directed, orientation=None):

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
