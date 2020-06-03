##############################################################################
# Copyright (c) 2018-2019, Lawrence Livermore National Security, LLC.
# Produced at the Lawrence Livermore National Laboratory.
#
# This file is part of Callflow.
# Created by Suraj Kesavan <kesavan1@llnl.gov>.
# LLNL-CODE-741008. All rights reserved.
#
# For details, see: https://github.com/LLNL/Callflow
# Please also read the LICENSE file for the MIT License notice.
##############################################################################

import pandas as pd
import networkx as nx
from ast import literal_eval as make_tuple
import math
from callflow.timer import Timer
from callflow.utils import sanitizeName


class EnsembleCCT:
    def __init__(self, state, functionsInCCT, config):
        self.timer = Timer()
        self.config = config
        number_of_nodes = len(state.new_gf.df["name"].unique())
        self.functionsInCCT = int(functionsInCCT)

        #self.entire_graph = state.g
        #self.entire_df = state.df
        self.entire_graph = state.new_gf.g
        self.entire_df = state.new_gf.df

        self.runs = self.entire_df["dataset"].unique()
        self.columns = ["time (inc)", "time", "name", "module"]
        # 'imbalance_perc']

        self.sort_attr = "time"
        self.callsites = self.get_top_n_callsites_by(self.functionsInCCT)

        self.fdf = self.entire_df[self.entire_df["name"].isin(self.callsites)]

        self.datasets = self.fdf["dataset"].unique()
        with self.timer.phase(f"Creating the ensemble CCT: {self.datasets}"):
            self.g = nx.DiGraph()
            self.add_paths("path")

        with self.timer.phase(f"Creating the data maps."):
            self.cct_df = self.entire_df[self.entire_df["name"].isin(self.g.nodes())]
            self.create_ensemble_maps(self.cct_df)
            self.create_target_maps(self.cct_df)

        with self.timer.phase(f"Add node and edge attributes."):
            self.add_node_attributes()
            self.add_edge_attributes()

        with self.timer.phase(f"Find cycles"):
            self.g.cycles = self.find_cycle(self.g)

        print(self.timer)

    def get_top_n_callsites_by(self, count):
        xgroup_df = self.entire_df.groupby(["name"]).mean()
        sort_xgroup_df = xgroup_df.sort_values(by=[self.sort_attr], ascending=False)
        callsites_df = sort_xgroup_df.nlargest(self.functionsInCCT, "time (inc)")

        return callsites_df.index.values.tolist()

    def create_target_maps(self, df):
        self.target_df = {}
        self.target_modules = {}
        self.target_module_group_df = {}
        self.target_module_name_group_df = {}
        self.target_module_callsite_map = {}
        self.target_module_time_inc_map = {}
        self.target_module_time_exc_map = {}
        self.target_name_time_inc_map = {}
        self.target_name_time_exc_map = {}

        for run in self.runs:
            # Reduce the entire_df to respective target dfs.
            self.target_df[run] = df.loc[df["dataset"] == run]

            # Unique modules in the target run
            self.target_modules[run] = self.target_df[run]["module"].unique()

            # Group the dataframe in two ways.
            # 1. by module
            # 2. by module and callsite
            self.target_module_group_df[run] = self.target_df[run].groupby(["module"])
            self.target_module_name_group_df[run] = self.target_df[run].groupby(
                ["name"]
            )

            # Module map for target run {'module': [Array of callsites]}
            self.target_module_callsite_map[run] = self.target_module_group_df[run][
                "name"
            ].unique()

            # Inclusive time maps for the module level and callsite level.
            self.target_module_time_inc_map[run] = (
                self.target_module_group_df[run]["time (inc)"].max().to_dict()
            )
            self.target_name_time_inc_map[run] = (
                self.target_module_name_group_df[run]["time (inc)"].max().to_dict()
            )

            # Exclusive time maps for the module level and callsite level.
            self.target_module_time_exc_map[run] = (
                self.target_module_group_df[run]["time"].max().to_dict()
            )
            self.target_name_time_exc_map[run] = (
                self.target_module_name_group_df[run]["time"].max().to_dict()
            )

    def create_ensemble_maps(self, df):
        self.modules = df["module"].unique()

        self.module_name_group_df = df.groupby(["module", "name"])
        self.module_group_df = df.groupby(["module"])

        # Module map for ensemble {'module': [Array of callsites]}
        self.module_callsite_map = df["name"].unique()

        # Inclusive time maps for the module level and callsite level.
        self.module_time_inc_map = self.module_group_df["time (inc)"].max().to_dict()
        self.name_time_inc_map = self.module_name_group_df["time (inc)"].max().to_dict()

        # Exclusive time maps for the module level and callsite level.
        self.module_time_exc_map = self.module_group_df["time"].max().to_dict()
        self.name_time_exc_map = self.module_name_group_df["time"].max().to_dict()

    def ensemble_map(self, df, nodes):
        ret = {}

        # loop through the nodes
        for callsite in self.g.nodes():
            if callsite not in self.config.callsite_module_map:
                module = self.entire_df.loc[self.entire_df["name"] == callsite][
                    "module"
                ].unique()[0]
            else:
                module = self.config.callsite_module_map[callsite]

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
        ret = {}
        for callsite in self.g.nodes():
            if callsite not in self.config.callsite_module_map:
                module = self.entire_df.loc[self.entire_df["name"] == callsite][
                    "module"
                ].unique()[0]
            else:
                module = self.config.callsite_module_map[callsite]

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
        ensemble_mapping = self.ensemble_map(self.entire_df, self.g.nodes())

        for idx, key in enumerate(ensemble_mapping):
            nx.set_node_attributes(self.g, name=key, values=ensemble_mapping[key])

        # dataset_mapping = {}
        # for run in self.runs:
        #     dataset_mapping[run] = self.dataset_map(self.g.nodes(), run)

        #     nx.set_node_attributes(self.g, name=run, values=dataset_mapping[run])

    def add_edge_attributes(self):
        num_of_calls_mapping = self.edge_map(self.g.edges(), "component_path")
        nx.set_edge_attributes(self.g, name="count", values=num_of_calls_mapping)

    def edge_map(self, edges, attr, source=None, orientation=None):
        counter = {}
        if not self.g.is_directed() or orientation in (None, "original"):

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
        for start_node in self.g.nbunch_iter(source):
            if start_node in explored:
                # No loop is possible.
                continue

            edges = []
            # All nodes seen in this iteration of edge_dfs
            seen = {start_node}
            # Nodes in active path.
            active_nodes = {start_node}
            previous_head = None

            for edge in nx.edge_dfs(self.g, start_node, orientation):
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

            source = sanitizeName(path[idx])
            target = sanitizeName(path[idx + 1])

            edges.append(
                {"source": source, "target": target,}
            )
        return edges

    def add_paths(self, path):
        paths = self.fdf[path].tolist()

        for idx, path in enumerate(paths):
            if isinstance(path, float):
                return []
            path = make_tuple(path)
            source_targets = self.create_source_targets(path)
            for edge in source_targets:
                source = edge["source"]
                target = edge["target"]
                if not self.g.has_edge(source, target):
                    self.g.add_edge(source, target)

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
