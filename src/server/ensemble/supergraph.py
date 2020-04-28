import networkx as nx
from utils.logger import log
import math, json, utils
from ast import literal_eval as make_tuple
import numpy as np
from utils.timer import Timer
from ast import literal_eval as make_list
import pandas as pd


class SuperGraph(nx.Graph):
    # Attributes:
    # 1. State => Pass the state which needs to be handled.
    # 2. path => '', 'path', 'group_path' or 'component_path'
    # 3. construct_graph -> To decide if we should construct graph from path
    # 4. add_data => To
    def __init__(
        self,
        states,
        path,
        group_by_attr="module",
        construct_graph=True,
        add_data=False,
        reveal_callsites=[],
        split_entry_module="",
        split_callee_module="",
    ):
        super(SuperGraph, self).__init__()
        self.states = states
        self.timer = Timer()

        # Store the ensemble graph (Since it is already processed.)
        self.state_entire = self.states["ensemble_entire"]
        self.state_filter = self.states["ensemble_filter"]
        self.state_group = self.states["ensemble_group"]
        self.ensemble_g = self.state_group.g
        self.node_list = np.array(list(self.ensemble_g.nodes()))

        # Path type to group by
        # TODO: Generalize to any group the user provides.
        self.path = path
        self.group_by = group_by_attr

        self.entire_df = self.state_entire.df
        self.group_df = self.state_group.df
        # Columns to consider.
        # TODO: Generalize it either all columns or let user specify the value using config.json
        self.columns = [
            "time (inc)",
            "module",
            "name",
            "time",
            "type",
            "module",
            "actual_time",
        ]

        # Store all the names of runs in self.runs.
        # TODO: Change name in the df from 'dataset' to 'run'
        self.runs = self.entire_df["dataset"].unique()

        with self.timer.phase("Creating data maps"):
            self.create_ensemble_maps()
            self.create_target_maps()

        self.reveal_callsites = reveal_callsites
        self.split_entry_module = split_entry_module
        self.split_callee_module = split_callee_module

        with self.timer.phase("Construct Graph"):
            if construct_graph:
                print("Creating a Graph for {0}.".format(self.state_group.name))
                self.cct = nx.DiGraph()
                self.agg_g = nx.DiGraph()
                self.add_paths(path)
                self.add_reveal_paths(self.reveal_callsites)
                if self.split_entry_module != "":
                    self.add_entry_callsite_paths(self.split_entry_module)
                if self.split_callee_module != "":
                    self.add_exit_callees_paths()
            else:
                print("Using the existing graph from state {0}".format(self.state.name))

        add_data = True
        with self.timer.phase("Add graph attributes"):
            if add_data == True:
                self.add_node_attributes()
                self.add_edge_attributes()
            else:
                print("Creating a Graph without node or edge attributes.")
        print(self.timer)

    def create_target_maps(self):
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
            self.target_df[run] = self.entire_df.loc[self.entire_df["dataset"] == run]

            # Unique modules in the target run
            self.target_modules[run] = self.target_df[run]["module"].unique()

            # Group the dataframe in two ways.
            # 1. by module
            # 2. by module and callsite
            self.target_module_group_df[run] = self.target_df[run].groupby(["module"])
            self.target_module_name_group_df[run] = self.target_df[run].groupby(
                ["module", "name"]
            )

            # Module map for target run {'module': [Array of callsites]}
            self.target_module_callsite_map[run] = (
                self.target_module_group_df[run]["name"].unique().to_dict()
            )

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

    def create_ensemble_maps(self):
        self.modules = self.entire_df["module"].unique()

        self.module_name_group_df = self.entire_df.groupby(["module", "name"])
        self.module_group_df = self.entire_df.groupby(["module"])
        self.name_group_df = self.entire_df.groupby(["name"])

        # Module map for ensemble {'module': [Array of callsites]}
        self.module_callsite_map = self.module_group_df["name"].unique().to_dict()

        # Inclusive time maps for the module level and callsite level.
        self.module_time_inc_map = self.module_group_df["time (inc)"].max().to_dict()
        self.name_time_inc_map = self.module_name_group_df["time (inc)"].max().to_dict()

        # Exclusive time maps for the module level and callsite level.
        self.module_time_exc_map = self.module_group_df["time"].max().to_dict()
        self.name_time_exc_map = self.module_name_group_df["time"].max().to_dict()

    def construct_cycle_free_paths(self, path):
        ret = []
        moduleMapper = {}
        dataMap = {}

        if isinstance(path, float):
            return []
        path = make_tuple(path)
        for idx, elem in enumerate(path):
            callsite = elem.split("=")[1]
            module = elem.split("=")[0]
            if module not in dataMap:
                moduleMapper[module] = 0
                dataMap[module] = [
                    {"callsite": callsite, "module": module, "level": idx}
                ]
            else:
                flag = [p["level"] == idx for p in dataMap[module]]
                if np.any(np.array(flag)):
                    moduleMapper[module] += 1
                    dataMap[module].append(
                        {
                            "callsite": callsite,
                            "module": module + "=" + callsite,
                            "level": idx,
                        }
                    )
                else:
                    dataMap[module].append(
                        {"callsite": callsite, "module": module, "level": idx}
                    )
            ret.append(dataMap[module][-1])

        return ret

    def create_source_targets(self, component_path):
        module = ""
        edges = []
        for idx, callsite in enumerate(component_path):
            if idx == 0:
                module = component_path[0]
                edges.append(
                    {
                        "module": module,
                        "source": module,
                        "target": module + "=" + component_path[idx + 1],
                    }
                )
                pass
            elif idx == len(component_path) - 1:
                pass
            else:
                edges.append(
                    {
                        "module": module,
                        "source": module + "=" + component_path[idx],
                        "target": module + "=" + component_path[idx + 1],
                    }
                )

        return edges

    def callsitePathInformation(self, callsites):
        paths = []
        for callsite in callsites:
            df = self.name_group_df.get_group(callsite)
            paths.append(
                {
                    "group_path": make_list(df["group_path"].unique()[0]),
                    "path": make_list(df["path"].unique()[0]),
                    "component_path": make_list(df["component_path"].unique()[0]),
                }
            )
        return paths

    def add_reveal_paths(self, reveal_callsites):
        paths = self.callsitePathInformation(reveal_callsites)

        for path in paths:
            component_edges = self.create_source_targets(path["component_path"])
            for idx, edge in enumerate(component_edges):
                module = edge["module"]

                # format module +  '=' + callsite
                source = edge["source"]
                target = edge["target"]

                if not self.agg_g.has_edge(source, target):
                    if idx == 0:
                        source_callsite = source
                        source_df = self.module_group_df.get_group((module))
                        source_node_type = "super-node"
                    else:
                        source_callsite = source.split("=")[1]
                        source_df = self.module_name_group_df.get_group(
                            (module, source_callsite)
                        )
                        source_node_type = "component-node"

                    target_callsite = target.split("=")[1]
                    target_df = self.module_name_group_df.get_group(
                        (module, target_callsite)
                    )
                    target_node_type = "component-node"

                    source_weight = source_df["time (inc)"].max()
                    target_weight = target_df["time (inc)"].max()

                    edge_type = "normal"

                    print(f"Adding edge: {source_callsite}, {target_callsite}")
                    self.agg_g.add_node(source, attr_dict={"type": source_node_type})
                    self.agg_g.add_node(target, attr_dict={"type": target_node_type})
                    self.agg_g.add_edge(
                        source,
                        target,
                        attr_dict=[
                            {
                                "source_callsite": source_callsite,
                                "target_callsite": target_callsite,
                                "edge_type": edge_type,
                                "weight": target_weight,
                                "edge_type": "reveal_edge",
                            }
                        ],
                    )

    ######################### Entry function interaction ################################

    def module_entry_functions_map(self, graph):
        entry_functions = {}
        for edge in graph.edges(data=True):
            attr_dict = edge[2]["attr_dict"]
            edge_tuple = (edge[0], edge[1])
            print(edge_tuple)
            for edge_attr in attr_dict:
                if edge_tuple[1] not in entry_functions:
                    entry_functions[edge_tuple[1]] = []
                entry_functions[edge_tuple[1]].append(edge_attr["target_callsite"])
        return entry_functions

    def create_source_targets_from_group_path(self, path):
        module = ""
        edges = []
        for idx, callsite in enumerate(path):
            if idx == len(path) - 1:
                break
            source = path[idx].split("=")
            target = path[idx + 1].split("=")
            edges.append(
                {
                    "source": source[0],
                    "target": target[0],
                    "source_callsite": source[1],
                    "target_callsite": target[1],
                }
            )
        return edges

    def same_source_edges(self, component_edges, reveal_module):
        ret = []
        for idx, edge in enumerate(component_edges):
            source = edge["source"]
            target = edge["target"]

            if source == reveal_module:
                ret.append(edge)
        return ret

    def same_target_edges(self, component_edges, reveal_module):
        ret = []
        for idx, edge in enumerate(component_edges):
            source = edge["source"]
            target = edge["target"]

            if target == reveal_module:
                ret.append(edge)
        return ret

    def add_entry_callsite_paths(self, reveal_module):
        entry_functions_map = self.module_entry_functions_map(self.agg_g)
        reveal_callsites = entry_functions_map[reveal_module]
        paths = self.callsitePathInformation(reveal_callsites)

        for path in paths:
            component_edges = self.create_source_targets_from_group_path(
                path["group_path"]
            )
            source_edges_to_remove = self.same_source_edges(
                component_edges, reveal_module
            )
            target_edges_to_remove = self.same_target_edges(
                component_edges, reveal_module
            )

            if len(source_edges_to_remove) != 0:
                for edge in source_edges_to_remove:
                    if self.agg_g.has_edge(edge["source"], edge["target"]):
                        self.agg_g.remove_edge((edge["source"], edge["target"]))
                    self.agg_g.add_node(
                        reveal_module + "=" + edge["source_callsite"],
                        attr_dict={"type": "component-node"},
                    )
                    self.agg_g.add_edge(
                        (reveal_module + "=" + edge["source_callsite"], edge["target"]),
                        attr_dict=[
                            {
                                "source_callsite": edge["source_callsite"],
                                "target_callsite": edge["target_callsite"],
                                "edge_type": "normal",
                                "weight": self.module_name_group_df.get_group(
                                    (reveal_module, edge["source_callsite"])
                                )["time (inc)"].max(),
                                "edge_type": "reveal_edge",
                            }
                        ],
                    )

            if len(target_edges_to_remove) != 0:
                for edge in target_edges_to_remove:
                    if self.agg_g.has_edge(edge["source"], edge["target"]):
                        self.agg_g.remove_edge(edge["source"], edge["target"])
                    self.agg_g.add_node(
                        reveal_module + "=" + edge["target_callsite"],
                        attr_dict={"type": "component-node"},
                    )
                    self.agg_g.add_edge(
                        edge["source"],
                        reveal_module + "=" + edge["target_callsite"],
                        attr_dict=[
                            {
                                "source_callsite": edge["source_callsite"],
                                "target_callsite": edge["target_callsite"],
                                "edge_type": "normal",
                                "weight": self.module_name_group_df.get_group(
                                    (edge["target"], edge["target_callsite"])
                                )["time (inc)"].max(),
                                "edge_type": "reveal_edge",
                            }
                        ],
                    )

        self.agg_g.remove_node(reveal_module)

    def add_paths(self, path):
        paths_df = self.group_df.groupby(["name", "group_path"])

        for (callsite, path_str), path_df in paths_df:
            path_list = self.construct_cycle_free_paths(path_str)
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

                    has_caller_edge = self.agg_g.has_edge(source_module, target_module)
                    has_callback_edge = self.agg_g.has_edge(
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
                        self.agg_g.add_node(source_module, attr_dict=node_dict)
                        self.agg_g.add_node(target_module, attr_dict=node_dict)
                        self.agg_g.add_edge(
                            source_module, target_module, attr_dict=[edge_dict]
                        )

                    elif not has_cct_edge and not has_callback_edge:
                        # print(f"Edge already exists for : {source_module}--{target_module}")
                        edge_data = self.agg_g.get_edge_data(
                            *(source_module, target_module)
                        )
                        self.agg_g[source_module][target_module]["attr_dict"].append(
                            edge_dict
                        )
                        # print(agg_g[source_module][target_module])

                    if not has_cct_edge:
                        self.cct.add_edge(
                            source_callsite,
                            target_callsite,
                            attr_dict={"weight": target_weight},
                        )

    def add_edge_attributes(self):
        # runs_mapping = self.run_counts(self.agg_g)
        # nx.set_edge_attributes(self.agg_g, name="number_of_runs", values=runs_mapping)
        edge_type_mapping = self.edge_type(self.agg_g)
        nx.set_edge_attributes(self.agg_g, name="edge_type", values=edge_type_mapping)
        flow_mapping = self.flows(self.agg_g)
        nx.set_edge_attributes(self.agg_g, name="weight", values=flow_mapping)
        # target_flow_mapping = self.target_flows(self.agg_g)
        # nx.set_edge_attributes(self.agg_g, name="target_weight", values=target_flow_mapping)
        entry_functions_mapping = self.entry_functions(self.agg_g)
        nx.set_edge_attributes(
            self.agg_g, name="entry_callsites", values=entry_functions_mapping
        )
        exit_functions_mapping = self.exit_functions(self.agg_g)
        nx.set_edge_attributes(
            self.agg_g, name="exit_callsites", values=exit_functions_mapping
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
        for edge in self.agg_g.edges(data=True):
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
                print(attr_dict)
                if attr_dict["edge_type"] == "reveal_edge":
                    self.weight_map[edge_tuple] = attr_dict["weight"]
                    ret[edge_tuple] = self.weight_map[edge_tuple]
                else:
                    ret[edge_tuple] = 0
            else:
                ret[edge_tuple] = self.weight_map[edge_tuple]

        return ret

    def target_flows(self, graph):
        self.weight_map = {}
        for edge in self.agg_g.edges(data=True):
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
                print(attr_dict)
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
        ensemble_mapping = self.ensemble_map(self.agg_g.nodes())

        for idx, key in enumerate(ensemble_mapping):
            nx.set_node_attributes(self.agg_g, name=key, values=ensemble_mapping[key])

        dataset_mapping = {}
        for run in self.runs:
            dataset_mapping[run] = self.dataset_map(self.agg_g.nodes(), run)

            nx.set_node_attributes(self.agg_g, name=run, values=dataset_mapping[run])

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
        for node in self.agg_g.nodes(data=True):
            node_name = node[0]
            node_dict = node[1]["attr_dict"]
            print(node_name, node_dict)

            if node_dict["type"] == "component-node":
                print(node_name, node_dict)
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
        for node in self.agg_g.nodes(data=True):
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
