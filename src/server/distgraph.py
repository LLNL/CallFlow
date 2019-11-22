import networkx as nx
from logger import log
import math, json, utils
from ast import literal_eval as make_tuple

class DistGraph(nx.Graph):
    def __init__(self, state, path):
        super(DistGraph, self).__init__()
        self.state = state
        self.path = path
        self.graph = self.state.graph
        self.df = self.state.df

        self.g = nx.DiGraph()
        self.add_paths(path)

        self.adj_matrix = nx.adjacency_matrix(self.g)
        self.dense_adj_matrix = self.adj_matrix.todense()

    def no_cycle_path(self, path):
        ret = []
        mapper = {}
        for idx, elem in enumerate(path):
            if elem not in mapper:
                mapper[elem] = 1
                ret.append(elem)
            else:
                ret.append(elem + '_' + str(mapper[elem]))
                mapper[elem] += 1

        return tuple(ret)

    def add_paths(self, path):
        for idx, row in self.df.iterrows():
            if row.show_node:
                path_tuple = row[path]
                corrected_path = self.no_cycle_path(path_tuple)
                self.g.add_path(corrected_path)