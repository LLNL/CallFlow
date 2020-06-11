# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

# ------------------------------------------------------------------------------
# Library imports
import math
import pandas as pd
import networkx as nx
from ast import literal_eval as make_tuple

# ------------------------------------------------------------------------------
# CallFlow imports
import callflow
from callflow.timer import Timer
from callflow import SuperGraph

# ------------------------------------------------------------------------------
# CCT Rendering class.
class CCT(SuperGraph):
    def __init__(self, supergraphs={}, tag="", props={}, callsite_count=50):
        # Call the SuperGraph class init.
        super(CCT, self).__init__(props=props, tag=tag, mode="render")

        # set the current graph being rendered.
        self.supergraph = supergraphs[tag]

        # Number of runs in the state.
        self.runs = self.supergraph.gf.df["dataset"].unique()
        self.columns = ["time (inc)", "time", "name", "module"]

        # callsite count is bounded by the user's input.
        if callsite_count == None:
            self.callsite_count = len(self.supergraph.gf.df["name"].unique())
        else:
            self.callsite_count = int(callsite_count)

        # Put the top callsites into a list.
        self.callsites = self.get_top_n_callsites_by_attr(
            df=self.supergraph.gf.df,
            callsite_count=self.callsite_count,
            sort_attr="time (inc)",
        )

        # Filter out the callsites not in the list.
        self.supergraph.gf.df = self.supergraph.gf.df[
            self.supergraph.gf.df["name"].isin(self.callsites)
        ]
        self.datasets = self.supergraph.gf.df["dataset"].unique()

        with self.timer.phase(f"Creating the ensemble CCT: {self.datasets}"):
            self.supergraph.gf.nxg = nx.DiGraph()

            # Add paths by "column" = path.
            self.add_paths("path")

        # Add node and edge attributes.
        with self.timer.phase(f"Add node and edge attributes."):
            self.add_node_attributes()
            self.add_edge_attributes()

        # Find cycles in the CCT.
        with self.timer.phase(f"Find cycles"):
            self.supergraph.gf.nxg.cycles = self.find_cycle(self.supergraph.gf.nxg)

        print(self.timer)

    def get_top_n_callsites_by_attr(
        self, df=pd.DataFrame([]), callsite_count=50, sort_attr="time (inc)"
    ):
        """
        Fetches the top n callsites based on attribute (time/time (inc)).
        """
        xgroup_df = self.supergraph.gf.df.groupby(["name"]).mean()
        sort_xgroup_df = xgroup_df.sort_values(by=[sort_attr], ascending=False)
        callsites_df = sort_xgroup_df.nlargest(callsite_count, sort_attr)
        return callsites_df.index.values.tolist()

    def ensemble_map(self, df, nodes):
        ret = {}
        """
        Construct the ensemble map
        """
        for callsite in self.supergraph.gf.nxg.nodes():
            if callsite not in self.props["callsite_module_map"]:
                module = self.supergraph.gf.df.loc[
                    self.supergraph.gf.df["name"] == callsite
                ]["module"].unique()[0]
            else:
                module = self.props["callsite_module_map"][callsite]

            for column in self.columns:
                if column not in ret:
                    ret[column] = {}
                if column == "time (inc)":
                    ret[column][callsite] = self.name_time_inc_map[(module, callsite)]
                elif column == "time":
                    ret[column][callsite] = self.name_time_exc_map[(module, callsite)]
                elif column == "name":
                    ret[column][callsite] = callsite
                elif column == "module":
                    ret[column][callsite] = module

        return ret

    def dataset_map(self, nodes, run):
        """
        Construct maps for each dataset. 
        """
        ret = {}
        for callsite in self.supergraph.gf.nxg.nodes():
            if callsite not in self.props["callsite_module_map"]:
                module = self.supergraph.gf.df.loc[
                    self.supergraph.gf.df["name"] == callsite
                ]["module"].unique()[0]
            else:
                module = self.props["callsite_module_map"][callsite]

            if callsite in self.target_module_callsite_map[run].keys():
                if callsite not in ret:
                    ret[callsite] = {}

                for column in self.columns:
                    if column == "time (inc)":
                        ret[callsite][column] = self.target_module_time_inc_map[run][
                            module
                        ]

                    elif column == "time":
                        ret[callsite][column] = self.target_module_time_exc_map[run][
                            module
                        ]

                    elif column == "module":
                        ret[callsite][column] = module

                    elif column == "name":
                        ret[callsite][column] = callsite

        return ret

    def add_node_attributes(self):
        ensemble_mapping = self.ensemble_map(
            self.supergraph.gf.df, self.supergraph.gf.nxg.nodes()
        )

        for idx, key in enumerate(ensemble_mapping):
            nx.set_node_attributes(
                self.supergraph.gf.nxg, name=key, values=ensemble_mapping[key]
            )

        dataset_mapping = {}
        for run in self.runs:
            dataset_mapping[run] = self.dataset_map(self.supergraph.gf.nxg.nodes(), run)
            nx.set_node_attributes(
                self.supergraph.gf.nxg, name=run, values=dataset_mapping[run]
            )

    def add_edge_attributes(self):
        num_of_calls_mapping = self.edge_map(
            self.supergraph.gf.nxg.edges(), "component_path"
        )
        nx.set_edge_attributes(
            self.supergraph.gf.nxg, name="count", values=num_of_calls_mapping
        )

    def edge_map(self, edges, attr, source=None, orientation=None):
        counter = {}
        if not self.supergraph.gf.nxg.is_directed() or orientation in (
            None,
            "original",
        ):

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

        ret = {}
        explored = []
        for start_node in self.supergraph.gf.nxg.nbunch_iter(source):
            if start_node in explored:
                # No loop is possible.
                continue

            edges = []
            # All nodes seen in this iteration of edge_dfs
            seen = {start_node}
            # Nodes in active path.
            active_nodes = {start_node}
            previous_head = None

            for edge in nx.edge_dfs(self.supergraph.gf.nxg, start_node, orientation):
                tail, head = tailhead(edge)
                if edge not in counter:
                    counter[edge] = 0
                if tail == head:
                    counter[edge] += 1
                else:
                    counter[edge] = 1

        return counter

    def create_source_targets(self, path):
        module = ""
        edges = []

        for idx, callsite in enumerate(path):
            if idx == len(path) - 1:
                break

            source = callflow.utils.sanitize_name(path[idx])
            target = callflow.utils.sanitize_name(path[idx + 1])

            edges.append(
                {"source": source, "target": target,}
            )
        return edges

    def add_paths(self, path):
        paths = self.supergraph.gf.df[path].tolist()

        for idx, path in enumerate(paths):
            if isinstance(path, float):
                return []
            path = make_tuple(path)
            source_targets = self.create_source_targets(path)
            for edge in source_targets:
                source = edge["source"]
                target = edge["target"]
                if not self.supergraph.gf.nxg.has_edge(source, target):
                    self.supergraph.gf.nxg.add_edge(source, target)

    def find_cycle(self, G, source=None, orientation=None):
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

        explored = set()
        cycle = []
        count = 0
        final_node = None
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
                tail, head = tailhead(edge)
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
                            popped_head = tailhead(popped_edge)[1]
                            active_nodes.remove(popped_head)

                        if edges:
                            last_head = tailhead(edges[-1])[1]
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
            tail, head = tailhead(edge)
            if tail == final_node:
                break
        return cycle[i:]
