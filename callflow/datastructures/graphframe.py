# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

# ------------------------------------------------------------------------------
# Library imports
import os
import pandas as pd
import hatchet as ht
import networkx as nx

# ------------------------------------------------------------------------------
# CallFlow imports
import callflow

LOGGER = callflow.get_logger(__name__)

# ------------------------------------------------------------------------------
# GraphFrame Class
class GraphFrame(ht.GraphFrame):
    def __init__(self, graph=None, dataframe=None, exc_metrics=None, inc_metrics=None):
        """

        """

        # TODO: will we ever want to create a graphframe without data?
        if graph is not None and dataframe is not None:
            super().__init__(graph, dataframe, exc_metrics, inc_metrics)

            # shortcut!
            self.df = self.dataframe

        # save a networkx graph
        if graph:
            self.nxg = self.hatchet_graph_to_nxg(graph)

    # --------------------------------------------------------------------------
    # Hatchet's GraphFrame utilities.

    @staticmethod
    def from_hatchet(gf):
        """
        Promotes a hatchet graph frame to callflow graph frame
        """
        assert isinstance(gf, ht.GraphFrame)
        return GraphFrame(gf.graph, gf.dataframe, gf.exc_metrics, gf.inc_metrics)

    # create a graph frame directly from the config
    @staticmethod
    def from_config(config, name):
        """
        Uses config file to create a graphframe.
        """
        LOGGER.info(f"Creating graphframes: {name}")
        LOGGER.info(f"Data path: {config['data_path']}")

        if config["format"][name] == "hpctoolkit":
            gf = ht.GraphFrame.from_hpctoolkit(config["data_path"])

        elif config["format"][name] == "caliper":
            gf = ht.GraphFrame.from_caliper(config["data_path"])

        elif config["format"][name] == "caliper_json":
            data_path = os.path.join(config["data_path"], config["paths"][name])
            gf = ht.GraphFrame.from_caliper(data_path, query="")

        elif config["format"][name] == "gprof":
            gf = ht.GraphFrame.from_grof_dot(config["data_path"])

        elif config["format"][name] == "literal":
            gf = ht.GraphFrame.from_literal(config["data_path"])

        elif config["format"][name] == "lists":
            gf = ht.GraphFrame.from_lists(config["data_path"])

        return GraphFrame.from_hatchet(gf)

    @staticmethod
    def from_data(data):
        """
        Create GraphFrame from 3 sets of information : df, graph, nxg. 
        """
        # Hatchet requires node and rank to be indexes.
        data["df"] = data["df"].set_index(["node", "rank"])

        # Create a graphframe using Hatchet.
        gf = GraphFrame(dataframe=data["df"], graph=data["graph"])

        # Store the nxg.
        gf.nxg = data["nxg"]

        # remove the set indexes to maintain consistency.
        gf.df = gf.df.reset_index(drop=False)
        return gf

    # --------------------------------------------------------------------------
    # callflow.graph utilities.
    #
    @staticmethod
    def hatchet_graph_to_nxg(hatchet_graph):
        """
        Constructs a networkX graph from hatchet graph. 
        """
        nxg = nx.DiGraph()
        for root in hatchet_graph.roots:
            node_gen = root.traverse()

            root_dict = callflow.utils.node_dict_from_frame(root.frame)
            root_name = root_dict["name"]
            root_paths = root.paths()
            node = root

            try:
                while node:
                    # `getNodeDictFromFrame` converts the hatchet's frame to
                    node_dict = callflow.utils.node_dict_from_frame(node.frame)
                    node_name = node_dict["name"]

                    # Get all node paths from hatchet.
                    node_paths = node.paths()

                    # Loop through all the node paths.
                    for node_path in node_paths:
                        if len(node_path) >= 2:

                            source_node_dict = callflow.utils.node_dict_from_frame(
                                node_path[-2]
                            )
                            target_node_dict = callflow.utils.node_dict_from_frame(
                                node_path[-1]
                            )

                            if source_node_dict["line"] != "NA":
                                source_node_name = (
                                    callflow.utils.sanitize_name(
                                        source_node_dict["name"]
                                    )
                                    + ":"
                                    + str(source_node_dict["line"])
                                )
                            else:
                                source_node_name = callflow.utils.sanitize_name(
                                    source_node_dict["name"]
                                )
                            if target_node_dict["line"] != "NA":
                                target_node_name = (
                                    callflow.utils.sanitize_name(
                                        target_node_dict["name"]
                                    )
                                    + ":"
                                    + str(target_node_dict["line"])
                                )
                            else:
                                target_node_name = callflow.utils.sanitize_name(
                                    target_node_dict["name"]
                                )

                            nxg.add_edge(source_node_name, target_node_name)

                    node = next(node_gen)

            except StopIteration:
                pass
            finally:
                del root

        return nxg

    # --------------------------------------------------------------------------
    # callflow.nxg utilities.

    @staticmethod
    def add_prefix(graph, prefix):
        """
        Rename graph to obtain disjoint node labels
        """
        if prefix is None:
            return graph

        def label(x):
            if is_string_like(x):
                name = prefix + x
            else:
                name = prefix + repr(x)
            return name

        return nx.relabel_nodes(graph, label)

    @staticmethod
    def tailhead(edge):
        return (edge[0], edge[1])

    @staticmethod
    def tailheadDir(edge):
        return (str(edge[0]), str(edge[1]), self.edge_direction[edge])

    @staticmethod
    def leaves_below(nxg, node):
        return set(
            sum(
                (
                    [vv for vv in v if nxg.out_degree(vv) == 0]
                    for k, v in nx.dfs_successors(nxg, node).items()
                ),
                [],
            )
        )

    # --------------------------------------------------------------------------
    # callflow.df utilities
    def lookup(self, node):
        return self.df.loc[
            (self.df["name"] == node.callpath[-1]) & (self.df["nid"] == node.nid)
        ]

    def lookup_with_node(self, node):
        return self.df.loc[self.df["name"] == node.callpath[-1]]

    def lookup_with_name(self, name):
        return self.df.loc[self.df["name"] == name]

    def lookup_with_vis_nodeName(self, name):
        return self.df.loc[self.df["vis_node_name"] == name]

    def update_df(self, col_name, mapping):
        self.df[col_name] = self.df["name"].apply(
            lambda node: mapping[node] if node in mapping.keys() else ""
        )
