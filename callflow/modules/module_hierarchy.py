import math
import time

import pandas as pd
import networkx as nx
from networkx.readwrite import json_graph

from ast import literal_eval as make_tuple

import callflow

LOGGER = callflow.get_logger(__name__)
from callflow.timer import Timer


class ModuleHierarchy:
    def __init__(self, supergraph, module):
        self.df = supergraph.gf.df
        self.module = module

        # Create the Super node's hierarchy.
        self.hierarchy = nx.DiGraph()
        self.timer = Timer()

        self.result = self.run()

    def create_source_targets(self, path):
        module = ""
        edges = []

        for idx, callsite in enumerate(path):
            if idx == len(path) - 1:
                break

            source = callflow.utils.sanitize_name(path[idx])
            target = callflow.utils.sanitize_name(path[idx + 1])

            edges.append({"source": source, "target": target})
        return edges

    def add_paths(self, df, path_name, filterTopCallsites=False):
        module_df = self.df.loc[self.df["module"] == self.module]
        if filterTopCallsites:
            group_df = module_df.groupby(["name"]).mean()
            f_group_df = group_df.loc[group_df[self.config.filter_by] > 500000]
            callsites = f_group_df.index.values.tolist()
            df = df[df["name"].isin(callsites)]

        paths = df[path_name].unique()
        for idx, path in enumerate(paths):
            if isinstance(path, float):
                return []
            path = make_tuple(path)
            source_targets = self.create_source_targets(path)
            for edge in source_targets:
                source = edge["source"]
                target = edge["target"]
                if not self.hierarchy.has_edge(source, target):
                    self.hierarchy.add_edge(source, target)

    def as_spanning_trees(self, G):
        """
        For a given graph with multiple sub graphs, find the components
        and draw a spanning tree.

        Returns a new Graph with components as spanning trees (i.e. without cycles).
        """
        ret = nx.Graph()
        graphs = nx.connected_component_subgraphs(G, copy=False)

        for g in graphs:
            T = nx.minimum_spanning_tree(g)
            ret.add_edges_from(T.edges())
            ret.add_nodes_from(T.nodes())

        return ret

    def check_cycles(self, G):
        try:
            cycles = list(nx.find_cycle(self.hierarchy, orientation="ignore"))
        except:
            cycles = []

        return cycles

    def remove_cycles(self, G, cycles):
        for cycle in cycles:
            source = cycle[0]
            target = cycle[1]
            print("Removing edge:", source, target)
            if source == target:
                print("here")
                G.remove_edge(source, target)
                G.remove_node(source)
                G.remove_node

            if cycle[2] == "reverse":
                print("Removing edge:", source, target)
                G.remove_edge(source, target)
        return G

    # instead of nid, get by module. nid seems very vulnerable rn.
    def run(self):
        node_paths_df = self.df.loc[self.df["module"] == self.module]

        if "component_path" not in self.df.columns:
            utils.debug("Error: Component path not defined in the df")

        with self.timer.phase("Add paths"):
            self.add_paths(node_paths_df, "component_path")

        cycles = self.check_cycles(self.hierarchy)
        while len(cycles) != 0:
            self.hierarchy = self.remove_cycles(self.hierarchy, cycles)
            cycles = self.check_cycles(self.hierarchy)
            print(f"cycles: {cycles}")

        print(len(self.hierarchy.nodes()), len(self.hierarchy.edges()))
        for edge in self.hierarchy.edges():
            print(edge)
        return self.hierarchy
