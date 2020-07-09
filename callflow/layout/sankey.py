# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------
# Library imports
import math
import pandas as pd
import networkx as nx
import numpy as np

# ------------------------------------------------------------------------------
# CallFlow imports
import callflow
from callflow.timer import Timer
from callflow import SuperGraph

LOGGER = callflow.get_logger(__name__)

# ------------------------------------------------------------------------------
# Single Super Graph class.
class SankeyLayout:

    _COLUMNS = ["actual_time", "time (inc)", "module", "name", "time", "type", "module"]

    def __init__(self, supergraph, path="path"):
        assert isinstance(supergraph, SuperGraph)
        assert isinstance(path, str)
        assert path in ["path", "group_path", "component_path"]

        # Set the current graph being rendered.
        self.supergraph = supergraph
        self.path = path

        self.timer = Timer()

        self.runs = self.supergraph.gf.df["dataset"].unique()

        LOGGER.info(
            "Creating the Single SankeyLayout for {0}.".format(self.supergraph.tag)
        )

        with self.timer.phase("Construct Graph"):
            self.nxg = SankeyLayout._create_nxg_from_paths(
                self.supergraph.gf.df, self.path
            )

        with self.timer.phase("Add graph attributes"):
            self._add_node_attributes()
            self._add_edge_attributes()

        LOGGER.debug(self.timer)

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
                        edge_data = nxg.get_edge_data(
                            *(source["module"], target["module"])
                        )
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
        target_modules = target_df["module"].unique()

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
                    actual_time = SankeyLayout.callsite_time(
                        group_df=target_module_group_df,
                        module=module,
                        callsite=callsite,
                    )
                    time_inc = target_name_time_inc_map[(module, callsite)]
                    time_exc = target_name_time_exc_map[(module, callsite)]

                elif node_dict["type"] == "super-node":
                    module = node_name
                    callsite = target_module_callsite_map[module].tolist()
                    actual_time = SankeyLayout.module_time(
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
                        ret[node_name][column] = actual_time

                    elif column == "name":
                        ret[node_name][column] = callsite

                    elif column == "type":
                        ret[node_name][column] = node_dict["type"]

        return ret

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
