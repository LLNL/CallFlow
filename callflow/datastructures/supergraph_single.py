# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

# ------------------------------------------------------------------------------
# Library imports
import sys
import networkx as nx
import math
import json
from ast import literal_eval as make_tuple

# ------------------------------------------------------------------------------
# CallFlow imports
import callflow
from callflow.timer import Timer
from callflow import SuperGraph

LOGGER = callflow.get_logger(__name__)

# ------------------------------------------------------------------------------
# Single Super Graph class.
class SingleSuperGraph(SuperGraph):
    def __init__(
        self,
        supergraphs,
        tag,
        dataset,
        path,
        group_by_attr="module",
        construct_graph=True,
        add_data=True,
    ):
        super(SingleSuperGraph, self).__init__(props=props, tag=tag, mode="render")

        self.ensemble_supergraph = self.supergraphs[tag]
        self.group_df = self.ensemble_supergraph.gf.df

        self.path = path
        self.group_by = group_by_attr

        # Columns to consider.
        self.columns = [
            "time (inc)",
            "module",
            "name",
            "time",
            "type",
            "module",
            "actual_time",
        ]

        with self.timer.phase("Construct Graph"):
            if construct_graph:
                LOGGER.info("Creating the SuperGraph for {0}.".format(self.state.name))
                self.mapper = {}
                self.g = nx.DiGraph()
                self.add_paths(path)
                self.add_callback_paths()
            else:
                print("Using the existing graph from state {0}".format(self.state.name))

        # Remove.
        self.callbacks = []
        self.edge_direction = {}

        with self.timer.phase("Add graph attributes"):
            if add_data == True:
                self.add_node_attributes()
                self.add_edge_attributes()
            else:
                LOGGER.info("Creating a Graph without node or edge attributes.")

        LOGGER.debug(self.timer)

    def add_paths(self, path):
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

    # TODO: remove this if not needed.
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
