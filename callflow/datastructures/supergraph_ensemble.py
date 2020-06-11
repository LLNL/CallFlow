# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

# ------------------------------------------------------------------------------
# Library imports
import networkx as nx
import numpy as np
import pandas as pd
import math, json
from ast import literal_eval as make_list

# ------------------------------------------------------------------------------
# CallFlow imports
import callflow

LOGGER = callflow.get_logger(__name__)
from callflow import SuperGraph

# ------------------------------------------------------------------------------
# Ensemble Super Graph class.
class EnsembleSuperGraph(SuperGraph):
    def __init__(
        self,
        supergraphs={},
        tag="",
        path="path",
        group_by_attr="module",
        props={},
        construct_graph=True,
        add_data=False,
        reveal_callsites=[],
        split_entry_module="",
        split_callee_module="",
    ):
        # Call the SuperGraph class init.
        super(EnsembleSuperGraph, self).__init__(props=props, tag=tag, mode="render")

        # Stores all the SuperGraphs using a Map.
        self.supergraphs = supergraphs

        self.path = path
        self.group_by = group_by_attr

        # Need to remove.
        self.ensemble_supergraph = self.supergraphs["ensemble"]
        self.group_df = self.ensemble_supergraph.gf.df

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

        self.runs = self.group_df["dataset"].unique()

        self.reveal_callsites = reveal_callsites
        self.split_entry_module = split_entry_module
        self.split_callee_module = split_callee_module

        with self.timer.phase("Construct Graph"):
            if construct_graph:
                LOGGER.info(
                    "Creating a SuperGraph for {0}.".format(self.supergraphs.keys())
                )

                self.cct = nx.DiGraph()
                self.agg_nxg = nx.DiGraph()
                self.add_paths(path)
                self.add_reveal_paths(self.reveal_callsites)
                if self.split_entry_module != "":
                    self.add_entry_callsite_paths(self.split_entry_module)
                if self.split_callee_module != "":
                    self.add_exit_callees_paths()
            else:
                LOGGER.debug(f"Using the existing graph from state {self.state.name}")

        with self.timer.phase("Add graph attributes"):
            self.add_node_attributes()
            self.add_edge_attributes()
        print(self.timer)

    def add_paths(self, path):
        paths_df = self.group_df.groupby(["name", "group_path"])

        for (callsite, path_str), path_df in paths_df:
            path_list = self.remove_cycles_in_paths(path_str)
            for callsite_idx, callsite in enumerate(path_list):
                if callsite_idx != len(path_list) - 1:
                    source = path_list[callsite_idx]
                    target = path_list[callsite_idx + 1]

                    source_module = source["module"]
                    target_module = target["module"]

                    source_callsite = source["callsite"]
                    target_callsite = target["callsite"]

                    source_df = self.module_name_group_df.get_group(
                        (source_module, source_callsite)
                    )
                    target_df = self.module_name_group_df.get_group(
                        (target_module, target_callsite)
                    )

                    has_caller_edge = self.agg_nxg.has_edge(
                        source_module, target_module
                    )
                    has_callback_edge = self.agg_nxg.has_edge(
                        target_module, source_module
                    )
                    has_cct_edge = self.cct.has_edge(source_callsite, target_callsite)

                    source_weight = source_df["time (inc)"].max()
                    target_weight = target_df["time (inc)"].max()

                    source_dataset = source_df["dataset"].unique().tolist()
                    target_dataset = target_df["dataset"].unique().tolist()

                    if has_callback_edge:
                        edge_type = "callback"
                        weight = 0
                    else:
                        edge_type = "caller"

                    if source_callsite == "119:MPI_Finalize":
                        source_module = "osu_bcast"

                    edge_dict = {
                        "source_callsite": source_callsite,
                        "target_callsite": target_callsite,
                        "edge_type": edge_type,
                        "weight": target_weight,
                        "source_dataset": source_dataset,
                        "target_dataset": target_dataset,
                    }

                    node_dict = {"type": "super-node"}

                    # If the module-module edge does not exist.
                    if (
                        not has_caller_edge
                        and not has_cct_edge
                        and not has_callback_edge
                    ):
                        print(
                            f"Add {edge_type} edge for : {source_module}--{target_module}"
                        )
                        self.agg_nxg.add_node(source_module, attr_dict=node_dict)
                        self.agg_nxg.add_node(target_module, attr_dict=node_dict)
                        self.agg_nxg.add_edge(
                            source_module, target_module, attr_dict=[edge_dict]
                        )

                    elif not has_cct_edge and not has_callback_edge:
                        # print(f"Edge already exists for : {source_module}--{target_module}")
                        edge_data = self.agg_nxg.get_edge_data(
                            *(source_module, target_module)
                        )
                        self.agg_nxg[source_module][target_module]["attr_dict"].append(
                            edge_dict
                        )
                        # print(agg_nxg[source_module][target_module])

                    if not has_cct_edge:
                        self.cct.add_edge(
                            source_callsite,
                            target_callsite,
                            attr_dict={"weight": target_weight},
                        )

    def add_edge_attributes(self):
        # runs_mapping = self.run_counts(self.agg_nxg)
        # nx.set_edge_attributes(self.agg_nxg, name="number_of_runs", values=runs_mapping)

        edge_type_mapping = self.edge_type(self.agg_nxg)
        nx.set_edge_attributes(self.agg_nxg, name="edge_type", values=edge_type_mapping)

        flow_mapping = self.flows(self.agg_nxg)
        nx.set_edge_attributes(self.agg_nxg, name="weight", values=flow_mapping)

        entry_functions_mapping = self.entry_functions(self.agg_nxg)
        nx.set_edge_attributes(
            self.agg_nxg, name="entry_callsites", values=entry_functions_mapping
        )

        exit_functions_mapping = self.exit_functions(self.agg_nxg)
        nx.set_edge_attributes(
            self.agg_nxg, name="exit_callsites", values=exit_functions_mapping
        )

    def run_counts(self, graph):
        ret = {}
        for edge in graph.edges(data=True):
            ret[(edge[0], edge[1])] = len(edge[2]["attr_dict"])
        return ret

    def edge_type(self, graph):
        ret = {}
        for edge in graph.edges(data=True):
            ret[(edge[0], edge[1])] = edge[2]["attr_dict"][0]["edge_type"]
        return ret

    def flows(self, graph):
        self.weight_map = {}
        for edge in self.agg_nxg.edges(data=True):
            if (edge[0], edge[1]) not in self.weight_map:
                self.weight_map[(edge[0], edge[1])] = 0

            attr_dict = edge[2]["attr_dict"]
            for d in attr_dict:
                self.weight_map[(edge[0], edge[1])] += d["weight"]

        ret = {}
        for edge in graph.edges(data=True):
            edge_tuple = (edge[0], edge[1])
            if edge_tuple not in self.weight_map:
                # Check if it s a reveal edge
                attr_dict = edge[2]["attr_dict"]
                if attr_dict["edge_type"] == "reveal_edge":
                    self.weight_map[edge_tuple] = attr_dict["weight"]
                    ret[edge_tuple] = self.weight_map[edge_tuple]
                else:
                    ret[edge_tuple] = 0
            else:
                ret[edge_tuple] = self.weight_map[edge_tuple]

        return ret

    # Not used.
    def target_flows(self, graph):
        self.weight_map = {}
        for edge in self.agg_nxg.edges(data=True):
            if (edge[0], edge[1]) not in self.weight_map:
                self.weight_map[(edge[0], edge[1])] = 0

            attr_dict = edge[2]["attr_dict"]
            for d in attr_dict:
                self.weight_map[(edge[0], edge[1])] += d["weight"]

        ret = {}
        for edge in graph.edges(data=True):
            edge_tuple = (edge[0], edge[1])
            if edge_tuple not in self.weight_map:
                # Check if it s a reveal edge
                attr_dict = edge[2]["attr_dict"]
                if attr_dict["edge_type"] == "reveal_edge":
                    self.weight_map[edge_tuple] = attr_dict["weight"]
                    ret[edge_tuple] = self.weight_map[edge_tuple]
                else:
                    ret[edge_tuple] = 0
            else:
                ret[edge_tuple] = self.weight_map[edge_tuple]

        return ret

    def max_exits(self, graph):
        self.max_exit = {}
        for module in self.is_exit:
            for exit_callsite in self.is_exit[module]:
                if (module, exit_callsite[1]) not in self.max_exit:
                    self.max_exit[(module, exit_callsite[1])] = 0
                self.max_exit[(module, exit_callsite[1])] = max(
                    self.max_exit[(module, exit_callsite[1])], exit_callsite[2]
                )

    def entry_functions(self, graph):
        entry_functions = {}
        for edge in graph.edges(data=True):
            attr_dict = edge[2]["attr_dict"]
            edge_tuple = (edge[0], edge[1])
            for edge_attr in attr_dict:
                if edge_tuple not in entry_functions:
                    entry_functions[edge_tuple] = []
                entry_functions[edge_tuple].append(edge_attr["target_callsite"])
        return entry_functions

    def exit_functions(self, graph):
        exit_functions = {}
        for edge in graph.edges(data=True):
            attr_dict = edge[2]["attr_dict"]
            edge_tuple = (edge[0], edge[1])
            for edge_attr in attr_dict:
                if edge_tuple not in exit_functions:
                    exit_functions[edge_tuple] = []
                exit_functions[edge_tuple].append(edge_attr["source_callsite"])
        return exit_functions

    def add_node_attributes(self):
        ensemble_mapping = self.ensemble_map(self.agg_nxg.nodes())

        for idx, key in enumerate(ensemble_mapping):
            nx.set_node_attributes(self.agg_nxg, name=key, values=ensemble_mapping[key])

        dataset_mapping = {}
        for run in self.runs:
            dataset_mapping[run] = self.dataset_map(self.agg_nxg.nodes(), run)

            nx.set_node_attributes(self.agg_nxg, name=run, values=dataset_mapping[run])

    def callsite_time(self, group_df, module, callsite):
        callsite_df = group_df.get_group((module, callsite))
        max_inc_time = callsite_df["time (inc)"].max()
        max_exc_time = callsite_df["time"].max()

        return {"Inclusive": max_inc_time, "Exclusive": max_exc_time}

    # is expensive....
    def module_time(self, group_df=pd.DataFrame([]), module_callsite_map={}, module=""):
        exc_time_sum = 0
        inc_time_max = 0
        for callsite in module_callsite_map[module]:
            callsite_df = group_df.get_group((module, callsite))
            max_inc_time = callsite_df["time (inc)"].max()
            inc_time_max = max(inc_time_max, max_inc_time)
            max_exc_time = callsite_df["time"].max()
            exc_time_sum += max_exc_time
        return {"Inclusive": inc_time_max, "Exclusive": exc_time_sum}

    def ensemble_map(self, nodes):
        ret = {}

        # loop through the nodes
        for node in self.agg_nxg.nodes(data=True):
            node_name = node[0]
            node_dict = node[1]["attr_dict"]

            if node_dict["type"] == "component-node":
                module = node_name.split("=")[0]
                callsite = node_name.split("=")[1]
                actual_time = self.callsite_time(
                    group_df=self.module_name_group_df,
                    module=module,
                    callsite=callsite,
                )
                time_inc = self.name_time_inc_map[(module, callsite)]
                time_exc = self.name_time_exc_map[(module, callsite)]

            elif node_dict["type"] == "super-node":
                module = node_name
                callsite = self.module_callsite_map[module].tolist()
                actual_time = self.module_time(
                    group_df=self.module_name_group_df,
                    module_callsite_map=self.module_callsite_map,
                    module=module,
                )
                time_inc = self.module_time_inc_map[module]
                time_exc = self.module_time_exc_map[module]

            for column in self.columns:
                if column not in ret:
                    ret[column] = {}

                if column == "time (inc)":
                    ret[column][node_name] = time_inc

                elif column == "time":
                    ret[column][node_name] = time_exc

                elif column == "actual_time":
                    ret[column][node_name] = actual_time

                elif column == "module":
                    ret[column][node_name] = module

                elif column == "name":
                    ret[column][node_name] = callsite

                elif column == "type":
                    ret[column][node_name] = node_dict["type"]

        return ret

    def dataset_map(self, nodes, run):
        ret = {}
        for node in self.agg_nxg.nodes(data=True):
            node_name = node[0]
            node_dict = node[1]["attr_dict"]
            if node_name in self.target_module_callsite_map[run].keys():
                if node_dict["type"] == "component-node":
                    module = node_name.split("=")[0]
                    callsite = node_name.split("=")[1]
                    actual_time = self.callsite_time(
                        group_df=self.target_module_group_df,
                        module=module,
                        callsite=callsite,
                    )
                    time_inc = self.target_name_time_inc_map[run][(module, callsite)]
                    time_exc = self.target_name_time_exc_map[run][(module, callsite)]

                elif node_dict["type"] == "super-node":
                    module = node_name
                    callsite = self.target_module_callsite_map[run][module].tolist()
                    actual_time = self.module_time(
                        group_df=self.target_module_name_group_df[run],
                        module_callsite_map=self.target_module_callsite_map[run],
                        module=module,
                    )
                    time_inc = self.target_module_time_inc_map[run][module]
                    time_exc = self.target_module_time_exc_map[run][module]

                if node_name not in ret:
                    ret[node_name] = {}

                for column in self.columns:
                    if column == "time (inc)":
                        ret[node_name][column] = time_inc

                    elif column == "time":
                        ret[node_name][column] = time_exc

                    elif column == "module":
                        ret[node_name][column] = module

                    elif column == "actual_time":
                        ret[node_name][column] = actual_time

                    elif column == "name":
                        ret[node_name][column] = callsite

                    elif column == "type":
                        ret[node_name][column] = node_dict["type"]

        return ret
