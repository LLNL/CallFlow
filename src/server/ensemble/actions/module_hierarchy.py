import pandas as pd
import time
import networkx as nx
import utils
from utils.logger import log
from ast import literal_eval as make_tuple
import math
from networkx.readwrite import json_graph
from utils.timer import Timer

class ModuleHierarchy:
    def __init__(self, state, module):
        self.graph = state.graph
        self.df = state.df

        self.module = module

        # Create the Super node's hierarchy.
        self.hierarchy = nx.DiGraph()
        self.timer = Timer()

        self.result = self.run()

    def run_graph(self):
        self.hierarchy = nx.bfs_tree(self.graph, self.modFunc, depth_limit=10)

    def add_paths(self, df, path_name):
        for idx, path in enumerate(df[path_name].unique()):
            if isinstance(path, str) and path != 'nan':
                path = make_tuple(path)
                self.hierarchy.add_path(path)

    def as_spanning_trees(G):
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

    # instead of nid, get by module. nid seems very vulnerable rn.
    def run(self):
        node_df = self.df.loc[self.df["module"] == self.module]
        node_paths = node_df

        if "component_path" not in self.df.columns:
            utils.debug("Error: Component path not defined in the df")

        with self.timer.phase("Add paths"):
            self.add_paths(node_paths, "component_path")

        return self.hierarchy