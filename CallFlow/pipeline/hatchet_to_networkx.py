import networkx as nx
import math
import json

from ..utils.logger import log
from ..utils.hatchet import getNodeDictFromFrame
from ..utils.df import sanitizeName
from ast import literal_eval as make_tuple


class HatchetToNetworkX(nx.Graph):
    # Attributes:
    # 1. State => Pass the state which needs to be handled.
    # 2. path => '', 'path', 'group_path' or 'component_path'
    # 3. construct_graph -> To decide if we should construct graph from path
    # 4. add_data => To
    def __init__(
        self,
        state,
        graph_type="entire",
        path_column_name="path",
        construct_graph=True,
        add_data=True,
    ):
        super(HatchetToNetworkX, self).__init__()

        self.path_column_name = path_column_name
        self.state = state

        if graph_type == "entire":
            self.df = state.entire_df
            self.graph = state.entire_graph
        else:
            self.df = state.df
            self.graph = state.graph
        if construct_graph:
            print("Creating a Graph for {0}.".format(self.state.name))
            self.g = nx.DiGraph()
            self.add_paths_from_graph()
        else:
            print("Using the existing graph from state {0}".format(state.name))
            self.g = state.g

        self.adj_matrix = nx.adjacency_matrix(self.g)
        self.dense_adj_matrix = self.adj_matrix.todense()

        # TODO: Store the adjacency matrix also somewhere.

        if add_data:
            self.add_node_attributes()
            self.add_edge_attributes()
        else:
            pass

            # TODO: Need to raise exception when the state.g is incorrect.
        # self.raiseExceptionIfNetworkXGraphIsIncorrect()

    def no_cycle_path(self, path):
        ret = []
        mapper = {}
        for idx, elem in enumerate(path):
            if elem not in mapper:
                mapper[elem] = 1
                ret.append(elem)
            else:
                ret.append(elem + "_" + str(mapper[elem]))
                mapper[elem] += 1

        return tuple(ret)

    # This is really slow for large dataframes.
    def add_paths_from_df(self):
        for idx, row in self.df.iterrows():
            if row.show_node:
                if isinstance(row[self.path_column_name], list):
                    path_tuple = row[self.path_column_name]
                else:
                    path_tuple = make_tuple(row[self.path_column_name])
                corrected_path = self.no_cycle_path(path_tuple)
                self.g.add_path(corrected_path)

    def add_paths_from_graph(self):
        graph = self.graph

        for root in graph.roots:
            node_gen = root.traverse()

            root_dict = getNodeDictFromFrame(root.frame)
            root_name = root_dict["name"]
            root_paths = root.paths()
            node = root

            try:
                while node:
                    node_dict = getNodeDictFromFrame(node.frame)
                    node_name = node_dict["name"]

                    # Get all node paths from hatchet.
                    node_paths = node.paths()

                    #
                    for node_path in node_paths:
                        if len(node_path) >= 2:

                            source_node_dict = getNodeDictFromFrame(node_path[-2])
                            target_node_dict = getNodeDictFromFrame(node_path[-1])

                            if source_node_dict["line"] != "NA":
                                source_node_name = (
                                    sanitizeName(source_node_dict["name"])
                                    + ":"
                                    + str(source_node_dict["line"])
                                )
                            else:
                                source_node_name = sanitizeName(
                                    source_node_dict["name"]
                                )
                            if target_node_dict["line"] != "NA":
                                target_node_name = (
                                    sanitizeName(target_node_dict["name"])
                                    + ":"
                                    + str(target_node_dict["line"])
                                )
                            else:
                                target_node_name = sanitizeName(
                                    target_node_dict["name"]
                                )
                            self.g.add_edge(source_node_name, target_node_name)
                    node = next(node_gen)

            except StopIteration:
                pass
            finally:
                del root

    def add_node_attributes(self):
        pass

    def add_edge_attributes(self):
        pass

    def raiseExceptionIfNetworkXGraphIsIncorrect(self):
        print(len(self.graph), len(self.g.nodes))
