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

import sys
import networkx as nx
import math
import json
from ast import literal_eval as make_tuple
from callflow.utils import Log, Timer


class SingleSuperGraph(nx.Graph):
    def __init__(
        self,
        states,
        dataset,
        path,
        group_by_attr="module",
        construct_graph=True,
        add_data=True,
        debug=True,
    ):
        super(SingleSuperGraph, self).__init__()
        self.log = Log("supergraph")
        self.state = states[dataset]
        self.dataset = dataset
        self.timer = Timer()

        self.df = self.state.df
        self.graph = self.state.graph

        self.group_by = group_by_attr
        self.g = self.state.g

        self.columns = [
            "time (inc)",
            "group_path",
            "name",
            "time",
            "callers",
            "callees",
            "vis_name",
            "module",
            "show_node",
        ]

        with self.timer.phase("Construct Graph"):
            if construct_graph:
                log.info("Creating the SuperGraph for {0}.".format(self.state.name))
                self.mapper = {}
                self.g = nx.DiGraph()
                self.add_paths(path)
            else:
                print("Using the existing graph from state {0}".format(self.state.name))

        if debug:
            log.warn("Modules: {0}".format(self.df["module"].unique()))
            log.warn("Top 10 Inclusive time: ")
            top = 10
            rank_df = self.df.groupby(["name", "nid"]).mean()
            top_inclusive_df = rank_df.nlargest(top, "time (inc)", keep="first")
            for name, row in top_inclusive_df.iterrows():
                log.info("{0} [{1}]".format(name, row["time (inc)"]))

            log.warn("Top 10 Enclusive time: ")
            top_exclusive_df = rank_df.nlargest(top, "time", keep="first")
            for name, row in top_exclusive_df.iterrows():
                log.info("{0} [{1}]".format(name, row["time"]))

            for node in self.g.nodes(data=True):
                log.info("Node: {0}".format(node))
            for edge in self.g.edges():
                log.info("Edge: {0}".format(edge))

            log.warn("Nodes in the tree: {0}".format(len(self.g.nodes)))
            log.warn("Edges in the tree: {0}".format(len(self.g.edges)))
            log.warn("Is it a tree? : {0}".format(nx.is_tree(self.g)))
            log.warn("Flow hierarchy: {0}".format(nx.flow_hierarchy(self.g)))

        # Variables to control the data properties globally.
        self.callbacks = []
        self.edge_direction = {}

        with self.timer.phase("Add graph attributes"):
            if add_data == True:
                self.add_node_attributes()
                self.add_edge_attributes()
            # else:
            # print("Creating a Graph without node or edge attributes.")

        log.info(self.timer)

    def no_cycle_path(self, path):
        ret = []
        moduleMapper = {}
        for idx, elem in enumerate(path):
            call_site = elem.split("=")[1]
            module = self.df.loc[self.df.name == call_site]["module"].tolist()[0]
            if module not in moduleMapper and elem in self.mapper:
                self.mapper[elem] += 1
                moduleMapper[module] = True
                ret.append(elem)
            elif elem not in self.mapper:
                self.mapper[elem] = 0
            else:
                self.mapper[elem] += 1
        return tuple(ret)

    def add_paths(self, path):
        # path_df = self.df[path].fillna("()")
        # paths = path_df.drop_duplicates().tolist()
        paths = self.df[path].unique()
        for idx, path_str in enumerate(paths):
            if not isinstance(path_str, float):
                path_tuple = make_tuple(path_str)
                if len(path_tuple) >= 2:
                    source_module = path_tuple[-2].split("=")[0]
                    target_module = path_tuple[-1].split("=")[0]
                    print(source_module, target_module)

                    source_name = path_tuple[-2].split("=")[1]
                    target_name = path_tuple[-1].split("=")[1]
                    self.g.add_edge(
                        source_module,
                        target_module,
                        attr_dict={
                            "source_callsite": source_name,
                            "target_callsite": target_name,
                        },
                    )

    def add_callback_paths(self):
        for from_module, to_modules in self.callbacks.items():
            for idx, to_module in enumerate(to_modules):
                self.g.add_edge(from_module, to_module, type="callback")

    def add_node_attributes(self):
        dataset_mapping = {}
        dataset_mapping[self.dataset] = self.dataset_map(self.g.nodes(), self.dataset)
        nx.set_node_attributes(
            self.g, name=self.dataset, values=dataset_mapping[self.dataset]
        )

    def add_edge_attributes(self):
        capacity_mapping = self.calculate_flows(self.g)
        nx.set_edge_attributes(self.g, name="weight", values=capacity_mapping)
        exc_capacity_mapping = self.calculate_exc_weight(self.g)
        nx.set_edge_attributes(self.g, name="exc_weight", values=exc_capacity_mapping)

    def calculate_exc_weight(self, graph):
        ret = {}
        additional_flow = {}
        for edge in graph.edges(data=True):
            source_module = edge[0]
            target_module = edge[1]
            source_name = edge[2]["attr_dict"]["source_callsite"]
            target_name = edge[2]["attr_dict"]["target_callsite"]

            source_exc = self.df.loc[(self.df["name"] == source_name)]["time"].max()
            target_exc = self.df.loc[(self.df["name"] == target_name)]["time"].max()

            if source_exc == target_exc:
                ret[(edge[0], edge[1])] = source_exc
            else:
                ret[(edge[0], edge[1])] = target_exc

        return ret

    # Calculate the sankey flows from source node to target node.
    def calculate_flows(self, graph):
        ret = {}
        additional_flow = {}
        for edge in graph.edges(data=True):
            source_module = edge[0]
            target_module = edge[1]
            source_name = edge[2]["attr_dict"]["source_callsite"]
            target_name = edge[2]["attr_dict"]["target_callsite"]

            source_inc = self.df.loc[(self.df["name"] == source_name)][
                "time (inc)"
            ].max()
            target_inc = self.df.loc[(self.df["name"] == target_name)][
                "time (inc)"
            ].max()

            ret[(edge[0], edge[1])] = target_inc

        return ret

    def tailhead(self, edge):
        return (edge[0], edge[1])

    def tailheadDir(self, edge):
        return (str(edge[0]), str(edge[1]), self.edge_direction[edge])

    def leaves_below(self, graph, node):
        return set(
            sum(
                (
                    [vv for vv in v if graph.out_degree(vv) == 0]
                    for k, v in nx.dfs_successors(graph, node).items()
                ),
                [],
            )
        )

    def dataset_map(self, nodes, dataset):
        ret = {}
        for node in self.g.nodes():
            if "=" in node:
                node_name = node.split("=")[1]
            else:
                node_name = node

            if node not in ret:
                ret[node] = {}

            node_df = self.df.loc[
                (self.df["module"] == node_name) & (self.df["dataset"] == dataset)
            ]

            for column in self.columns:
                column_data = node_df[column]

                if (
                    column == "time (inc)"
                    or column == "time"
                    or column == "component_level"
                ):
                    if len(column_data.value_counts()) > 0:
                        ret[node][column] = column_data.max()
                    else:
                        ret[node][column] = -1

                elif column == "callers" or column == "callees":
                    if len(column_data.value_counts()) > 0:
                        ret[node][column] = make_tuple(column_data.tolist()[0])
                    else:
                        sys.path.append("/home/vidi/Work/llnl/CallFlow/src/server")

                elif column == "component_path" or column == "group_path":

                    if len(column_data.value_counts() > 0):
                        ret[node][column] = list(make_tuple(column_data.tolist()[0]))
                    else:
                        ret[node][column] = []
        return ret
