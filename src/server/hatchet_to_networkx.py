import networkx as nx
from logger import log
import math, json, utils
from ast import literal_eval as make_tuple

class HatchetToNetworkX(nx.Graph):
    # Attributes:
    # 1. State => Pass the state which needs to be handled.
    # 2. path => '', 'path', 'group_path' or 'component_path'
    # 3. construct_graph -> To decide if we should construct graph from path
    # 4. add_data => To 
    def __init__(self, state, path, construct_graph=True, add_data=True):
        super(HatchetToNetworkX, self).__init__()
        self.state = state
        self.path = path
        self.df = self.state.df

        if construct_graph:
            print('Creating a Graph for {0}.'.format(self.state.name))
            self.g = nx.DiGraph()
            self.add_paths(path)
        else:
            print('Using the existing graph from state {0}'.format(state.name))
            self.g = state.g

        self.adj_matrix = nx.adjacency_matrix(self.g)
        self.dense_adj_matrix = self.adj_matrix.todense()

        self.callbacks = []
        self.edge_direction = {}

        if add_data == True:
            self.add_node_attributes()
            self.add_edge_attributes()
        else:
            print('Creating a Graph without node or edge attributes.')
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
                if isinstance(row[path], list):
                    path_tuple = row[path]
                else:
                    path_tuple = make_tuple(row[path])
                corrected_path = self.no_cycle_path(path_tuple)
                self.g.add_path(corrected_path)