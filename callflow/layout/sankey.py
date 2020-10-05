# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

import pandas as pd
import networkx as nx
import numpy as np
from ast import literal_eval as make_list

# CallFlow imports
try:
    import callflow
    from callflow.timer import Timer
    from callflow import SuperGraph

    LOGGER = callflow.get_logger(__name__)
except Exception:
    raise Exception("Module callflow not found not found.")


class SankeyLayout:
    """
    Sankey layout
    """

    _COLUMNS = [
        "actual_time",
        "time (inc)",
        "module",
        "name",
        "time",
        "type",
        "module",
        "entry_function",
    ]

    _PRIMARY_GROUPBY_COLUMN = "name"
    _SECONDARY_GROUPBY_COLUMN = "module"

    def __init__(
        self,
        supergraph,
        path="path",
        reveal_callsites=[],
        split_entry_module="",
        split_callee_module="",
    ):
        assert isinstance(supergraph, SuperGraph)
        assert isinstance(path, str)
        assert path in ["path", "group_path", "component_path"]

        # Set the current graph being rendered.
        self.supergraph = supergraph
        self.path = path

        self.timer = Timer()

        self.runs = self.supergraph.gf.df["dataset"].unique()

        self.reveal_callsites = reveal_callsites
        self.split_entry_module = split_entry_module
        self.split_callee_module = split_callee_module

        LOGGER.info(
            "Creating the Single SankeyLayout for {0}.".format(self.supergraph.tag)
        )

        self.primary_group_df = self.supergraph.gf.df.groupby(
            [SankeyLayout._PRIMARY_GROUPBY_COLUMN]
        )
        self.secondary_group_df = self.supergraph.gf.df.groupby(
            [SankeyLayout._SECONDARY_GROUPBY_COLUMN]
        )
        self.secondary_primary_group_df = self.supergraph.gf.df.groupby(
            [
                SankeyLayout._SECONDARY_GROUPBY_COLUMN,
                SankeyLayout._PRIMARY_GROUPBY_COLUMN,
            ]
        )

        with self.timer.phase("Construct Graph"):
            self.nxg = SankeyLayout._create_nxg_from_paths(
                self.supergraph.gf.df, self.path
            )
            self.add_reveal_paths(self.reveal_callsites)
            if self.split_entry_module != "":
                self.add_entry_callsite_paths(self.split_entry_module)
            if self.split_callee_module != "":
                self.add_exit_callees_paths()

        with self.timer.phase("Add graph attributes"):
            self._add_node_attributes()
            self._add_edge_attributes()

        LOGGER.debug(self.timer)

    # --------------------------------------------------------------------------
    # Split by reveal callsite.
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
            df = self.primary_group_df.get_group(callsite)
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

                if not self.nxg.has_edge(source, target):
                    if idx == 0:
                        source_callsite = source
                        # source_df = self.secondary_group_df.get_group((module))
                        source_node_type = "super-node"
                    else:
                        source_callsite = source.split("=")[1]
                        # source_df = self.secondary_primary_group_df.get_group(
                        #     (module, source_callsite)
                        # )
                        source_node_type = "component-node"

                    target_callsite = target.split("=")[1]
                    target_df = self.secondary_primary_group_df.get_group(
                        (module, target_callsite)
                    )
                    target_node_type = "component-node"

                    # source_weight = source_df["time (inc)"].max()
                    target_weight = target_df["time (inc)"].max()

                    print(f"Adding edge: {source_callsite}, {target_callsite}")
                    self.nxg.add_node(source, attr_dict={"type": source_node_type})
                    self.nxg.add_node(target, attr_dict={"type": target_node_type})
                    self.nxg.add_edge(
                        source,
                        target,
                        attr_dict=[
                            {
                                "source_callsite": source_callsite,
                                "target_callsite": target_callsite,
                                "weight": target_weight,
                                "edge_type": "reveal_edge",
                            }
                        ],
                    )

    # --------------------------------------------------------------------------
    # Add callsites based on split by entry function interactions.
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

            if source == reveal_module:
                ret.append(edge)
        return ret

    def same_target_edges(self, component_edges, reveal_module):
        ret = []
        for idx, edge in enumerate(component_edges):
            target = edge["target"]

            if target == reveal_module:
                ret.append(edge)
        return ret

    def add_entry_callsite_paths(self, reveal_module):
        entry_functions_map = self.module_entry_functions_map(self.nxg)
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
                    if self.nxg.has_edge(edge["source"], edge["target"]):
                        self.nxg.remove_edge((edge["source"], edge["target"]))
                    self.nxg.add_node(
                        reveal_module + "=" + edge["source_callsite"],
                        attr_dict={"type": "component-node"},
                    )
                    self.nxg.add_edge(
                        (reveal_module + "=" + edge["source_callsite"], edge["target"]),
                        attr_dict=[
                            {
                                "source_callsite": edge["source_callsite"],
                                "target_callsite": edge["target_callsite"],
                                "weight": self.module_name_group_df.get_group(
                                    (reveal_module, edge["source_callsite"])
                                )["time (inc)"].max(),
                                "edge_type": "reveal_edge",
                            }
                        ],
                    )

            if len(target_edges_to_remove) != 0:
                for edge in target_edges_to_remove:
                    if self.nxg.has_edge(edge["source"], edge["target"]):
                        self.nxg.remove_edge(edge["source"], edge["target"])
                    self.nxg.add_node(
                        reveal_module + "=" + edge["target_callsite"],
                        attr_dict={"type": "component-node"},
                    )
                    self.nxg.add_edge(
                        edge["source"],
                        reveal_module + "=" + edge["target_callsite"],
                        attr_dict=[
                            {
                                "source_callsite": edge["source_callsite"],
                                "target_callsite": edge["target_callsite"],
                                "weight": self.secondary_primary_group_df.get_group(
                                    (edge["target"], edge["target_callsite"])
                                )["time (inc)"].max(),
                                "edge_type": "reveal_edge",
                            }
                        ],
                    )

        self.nxg.remove_node(reveal_module)

    # --------------------------------------------------------------------------
    # Node attribute methods.
    def _add_node_attributes(self):
        """
        Adds node attributes from the dataframe using the _COLUMNS.
        """
        ensemble_mapping = SankeyLayout._ensemble_map(
            df=self.supergraph.gf.df, nxg=self.nxg, columns=SankeyLayout._COLUMNS
        )
        for idx, key in enumerate(ensemble_mapping):
            nx.set_node_attributes(self.nxg, name=key, values=ensemble_mapping[key])

        dataset_mapping = {}
        for run in self.runs:
            dataset_mapping[run] = SankeyLayout._dataset_map(
                df=self.supergraph.gf.df,
                nxg=self.nxg,
                tag=run,
                columns=SankeyLayout._COLUMNS,
            )
            nx.set_node_attributes(
                self.nxg, name=self.supergraph.tag, values=dataset_mapping[run]
            )

    # --------------------------------------------------------------------------
    # Edge attribute methods.
    def _add_edge_attributes(self):
        edge_type_mapping = SankeyLayout.edge_type(self.nxg)
        nx.set_edge_attributes(self.nxg, name="edge_type", values=edge_type_mapping)

        inclusive_flow = SankeyLayout.edge_weight(self.nxg)
        nx.set_edge_attributes(self.nxg, name="weight", values=inclusive_flow)

        entry_functions_mapping = SankeyLayout.entry_functions(self.nxg)
        nx.set_edge_attributes(
            self.nxg, name="entry_callsites", values=entry_functions_mapping
        )

        exit_functions_mapping = SankeyLayout.exit_functions(self.nxg)
        nx.set_edge_attributes(
            self.nxg, name="exit_callsites", values=exit_functions_mapping
        )

    # --------------------------------------------------------------------------
    @staticmethod
    def module_time(group_df, module_callsite_map, module):
        """
        For node attributes: Calculates the time spent inside the module overall
        """
        exc_time_sum = 0
        inc_time_max = 0
        for callsite in module_callsite_map[module]:
            callsite_df = group_df.get_group((module, callsite))
            max_inc_time = callsite_df["time (inc)"].max()
            inc_time_max = max(inc_time_max, max_inc_time)
            max_exc_time = callsite_df["time"].max()
            exc_time_sum += max_exc_time
        return {"Inclusive": inc_time_max, "Exclusive": exc_time_sum}

    @staticmethod
    def callsite_time(group_df, module, callsite):
        """
        For node attribute: Calculates the time spent by each callsite.
        """
        callsite_df = group_df.get_group((module, callsite))
        max_inc_time = callsite_df["time (inc)"].max()
        max_exc_time = callsite_df["time"].max()

        return {"Inclusive": max_inc_time, "Exclusive": max_exc_time}

    # --------------------------------------------------------------------------
    # Construct the networkX Graph from call paths.
    @staticmethod
    def _create_nxg_from_paths(df, path):
        """
        Construct a networkx graph from paths.
        Note: Current logic constructs two graphs (one for cct, and one for supergraph) and later uses them to construct a module level supergraph.
        """
        assert isinstance(df, pd.DataFrame)
        assert path in df.columns
        assert "name" in df.columns
        assert "module" in df.columns

        # Get the grouped dataframes.
        paths_df = df.groupby(["name", path])
        module_name_group_df = df.groupby(["module", "name"])

        # Empty networkx graphs.
        nxg = nx.DiGraph()
        cct = nx.DiGraph()

        for (callsite, path), path_df in paths_df:
            # Break cycles, if any.
            path_list = SankeyLayout._break_cycles_in_paths(path)

            # loop through the path lists for each callsite.
            for callsite_idx, callsite in enumerate(path_list):
                if callsite_idx != len(path_list) - 1:
                    source = path_list[callsite_idx]
                    target = path_list[callsite_idx + 1]

                    source_df = module_name_group_df.get_group(
                        (source["module"], source["callsite"])
                    )
                    target_df = module_name_group_df.get_group(
                        (target["module"], target["callsite"])
                    )

                    has_caller_edge = nxg.has_edge(source["module"], target["module"])
                    has_callback_edge = nxg.has_edge(target["module"], source["module"])
                    has_cct_edge = cct.has_edge(source["callsite"], target["callsite"])

                    if has_callback_edge:
                        edge_type = "callback"
                    else:
                        edge_type = "caller"

                    edge_dict = {
                        "source_callsite": source["callsite"],
                        "target_callsite": target["callsite"],
                        "edge_type": edge_type,
                        "weight": target_df["time (inc)"].max(),
                        "source_dataset": source_df["dataset"].unique().tolist(),
                        "target_dataset": target_df["dataset"].unique().tolist(),
                    }

                    node_dict = {"type": "super-node"}

                    # If the module-module edge does not exist.
                    if (
                        not has_caller_edge
                        and not has_cct_edge
                        and not has_callback_edge
                    ):
                        LOGGER.info(
                            f"Add {edge_type} edge for : {source['module']}--{target['module']}"
                        )
                        nxg.add_node(source["module"], attr_dict=node_dict)
                        nxg.add_node(target["module"], attr_dict=node_dict)
                        nxg.add_edge(
                            source["module"], target["module"], attr_dict=[edge_dict]
                        )

                    # Edge exists for source["module"] -> target["module"]
                    elif not has_cct_edge and not has_callback_edge:
                        # edge_data = nxg.get_edge_data(
                        #     *(source["module"], target["module"])
                        # )
                        nxg[source["module"]][target["module"]]["attr_dict"].append(
                            edge_dict
                        )

                    # If edge is not in CCT. Add it.
                    if not has_cct_edge:
                        cct.add_edge(
                            source["callsite"],
                            target["callsite"],
                            attr_dict={"weight": target_df["time (inc)"].max()},
                        )

        return nxg

    @staticmethod
    def _break_cycles_in_paths(path):
        """
        Breaks cycles if present in the callpath.

        Parameter:
            path: path array
        """
        from ast import literal_eval as make_list

        ret = []
        moduleMapper = {}
        dataMap = {}

        # TODO: see if we can remove this.
        if isinstance(path, float):
            return []

        path_list = make_list(path)

        for idx, elem in enumerate(path_list):
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

    @staticmethod
    def _ensemble_map(df, nxg, columns=[]):
        """
        Creates maps for all columns for the ensemble data.
        Note: For single supergraph, ensemble_map would be the same as dataset_map[single_run.tag].
        TODO: There is code repetition among ensemble_maps and dataset_maps. Need to simplify.
        """
        assert isinstance(df, pd.DataFrame)
        assert isinstance(nxg, nx.DiGraph)
        ret = {}

        module_group_df = df.groupby(["module"])
        module_name_group_df = df.groupby(["module", "name"])

        module_callsite_map = module_group_df["name"].unique().to_dict()

        module_time_inc_map = module_group_df["time (inc)"].max().to_dict()
        module_time_exc_map = module_group_df["time"].max().to_dict()

        name_time_inc_map = module_name_group_df["time (inc)"].max().to_dict()
        name_time_exc_map = module_name_group_df["time"].max().to_dict()

        # loop through the nodes
        for node in nxg.nodes(data=True):
            node_name = node[0]
            node_dict = node[1]["attr_dict"]

            if node_dict["type"] == "component-node":
                module = node_name.split("=")[0]
                callsite = node_name.split("=")[1]
                actual_time = SankeyLayout.callsite_time(
                    group_df=module_name_group_df, module=module, callsite=callsite
                )
                time_inc = name_time_inc_map[(module, callsite)]
                time_exc = name_time_exc_map[(module, callsite)]

            elif node_dict["type"] == "super-node":
                module = node_name
                callsite = module_callsite_map[module].tolist()
                actual_time = SankeyLayout.module_time(
                    group_df=module_name_group_df,
                    module_callsite_map=module_callsite_map,
                    module=module,
                )

                time_inc = module_time_inc_map[module]
                time_exc = module_time_exc_map[module]

            for column in columns:
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

    @staticmethod
    def _dataset_map(df, nxg, columns=[], tag=""):
        """
        Creates maps for all node attributes (i.e., columns in df) for each dataset.
        """
        assert isinstance(df, pd.DataFrame)
        assert isinstance(nxg, nx.DiGraph)

        ret = {}

        # Reduce the entire_df to respective target dfs.
        target_df = df.loc[df["dataset"] == tag]

        # Unique modules in the target run
        # target_modules = target_df["module"].unique()

        # Group the dataframe in two ways.
        # 1. by module
        # 2. by module and callsite
        target_module_group_df = target_df.groupby(["module"])
        target_module_name_group_df = target_df.groupby(["module", "name"])

        # Module map for target run {'module': [Array of callsites]}
        target_module_callsite_map = target_module_group_df["name"].unique().to_dict()

        # Inclusive time maps for the module level and callsite level.
        target_module_time_inc_map = (
            target_module_group_df["time (inc)"].max().to_dict()
        )
        target_name_time_inc_map = (
            target_module_name_group_df["time (inc)"].max().to_dict()
        )

        # Exclusive time maps for the module level and callsite level.
        target_module_time_exc_map = target_module_group_df["time"].max().to_dict()
        target_name_time_exc_map = target_module_name_group_df["time"].max().to_dict()

        for node in nxg.nodes(data=True):
            node_name = node[0]
            node_dict = node[1]["attr_dict"]
            if node_name in target_module_callsite_map.keys():
                if node_dict["type"] == "component-node":
                    module = node_name.split("=")[0]
                    callsite = node_name.split("=")[1]
                    agg_time = SankeyLayout.callsite_time(
                        group_df=target_module_group_df,
                        module=module,
                        callsite=callsite,
                    )
                    time_inc = target_name_time_inc_map[(module, callsite)]
                    time_exc = target_name_time_exc_map[(module, callsite)]

                elif node_dict["type"] == "super-node":
                    module = node_name
                    callsite = target_module_callsite_map[module].tolist()
                    agg_time = SankeyLayout.module_time(
                        group_df=target_module_name_group_df,
                        module_callsite_map=target_module_callsite_map,
                        module=module,
                    )

                    time_inc = target_module_time_inc_map[module]
                    time_exc = target_module_time_exc_map[module]

                if node_name not in ret:
                    ret[node_name] = {}

                for column in columns:
                    if column == "time (inc)":
                        ret[node_name][column] = time_inc

                    elif column == "time":
                        ret[node_name][column] = time_exc

                    elif column == "module":
                        ret[node_name][column] = module

                    elif column == "actual_time":
                        ret[node_name][column] = agg_time

                    elif column == "name":
                        ret[node_name][column] = callsite

                    elif column == "type":
                        ret[node_name][column] = node_dict["type"]

                    elif column == "entry_function":
                        print(
                            SankeyLayout.get_entry_functions(
                                target_module_group_df, node_name
                            )
                        )
                        ret[node_name][column] = SankeyLayout.get_entry_functions(
                            target_module_group_df, node_name
                        )

        return ret

    @staticmethod
    def get_entry_functions(df, module):
        """
        Get the entry function of a module from the dataframe.
        """
        module_df = df.get_group(module)
        entry_func_df = module_df.loc[module_df["entry_function"]]
        return entry_func_df["callees"].unique().tolist()[0]

    # --------------------------------------------------------------------------
    @staticmethod
    def edge_type(nxg):
        """
        For edge attribute: Appends the edge type ("caller", or "callback")
        """
        ret = {}
        for edge in nxg.edges(data=True):
            ret[(edge[0], edge[1])] = edge[2]["attr_dict"][0]["edge_type"]
        return ret

    @staticmethod
    def edge_weight(nxg):
        """
        For edge attribute: Calculates the sankey flow between nodes.
        """
        flow_mapping = {}
        for edge in nxg.edges(data=True):
            if (edge[0], edge[1]) not in flow_mapping:
                flow_mapping[(edge[0], edge[1])] = 0

            attr_dict = edge[2]["attr_dict"]
            for d in attr_dict:
                flow_mapping[(edge[0], edge[1])] += d["weight"]

        ret = {}
        for edge in nxg.edges(data=True):
            edge_tuple = (edge[0], edge[1])
            if edge_tuple not in flow_mapping:
                # Check if it s a reveal edge
                attr_dict = edge[2]["attr_dict"]
                if attr_dict["edge_type"] == "reveal_edge":
                    flow_mapping[edge_tuple] = attr_dict["weight"]
                    ret[edge_tuple] = flow_mapping[edge_tuple]
                else:
                    ret[edge_tuple] = 0
            else:
                ret[edge_tuple] = flow_mapping[edge_tuple]

        return ret

    @staticmethod
    def entry_functions(nxg):
        """
        For edge attribute: Adds the entry functions for the module.
        """
        entry_functions = {}
        for edge in nxg.edges(data=True):
            attr_dict = edge[2]["attr_dict"]
            edge_tuple = (edge[0], edge[1])
            for edge_attr in attr_dict:
                if edge_tuple not in entry_functions:
                    entry_functions[edge_tuple] = []
                entry_functions[edge_tuple].append(edge_attr["target_callsite"])
        return entry_functions

    @staticmethod
    def exit_functions(nxg):
        """
        For edge attribute: Adds the exit functions from the module.
        """
        exit_functions = {}
        for edge in nxg.edges(data=True):
            attr_dict = edge[2]["attr_dict"]
            edge_tuple = (edge[0], edge[1])
            for edge_attr in attr_dict:
                if edge_tuple not in exit_functions:
                    exit_functions[edge_tuple] = []
                exit_functions[edge_tuple].append(edge_attr["source_callsite"])
        return exit_functions
