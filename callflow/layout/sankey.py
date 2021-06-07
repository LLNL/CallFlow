# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

"""
CallFlow's layout - Sankey.
"""
import networkx as nx
import numpy as np
from ast import literal_eval as make_list
from callflow.utils.df import df_group_by, df_as_dict

# CallFlow imports
import callflow

LOGGER = callflow.get_logger(__name__)


class SankeyLayout:
    """
    Appends all information to networkX graph to satisfy the user request.
    """

    _PRIMARY_GROUPBY_COLUMN = "name"
    _SECONDARY_GROUPBY_COLUMN = "module"

    def __init__(
        self,
        sg,
        path_column,
        selected_runs=None,
        reveal_callsites=[],
        split_entry_module="",
        split_callee_module="",
    ):
        """
        Construct the Sankey layout.

        :param sg: SuperGraph
        :param path: path column to consider, e.g., path, group_path, component_path
        :param selected_runs: array of selected SuperGraph names.
        :param reveal_callsites: array of callsites to reveal
        :param split_entry_module: array of entry modules to split
        :param split_callee_module: array of callees to split
        """
        assert isinstance(sg, (callflow.SuperGraph, callflow.EnsembleGraph))
        assert isinstance(path_column, str)
        assert path_column in ["path", "group_path", "component_path"]

        LOGGER.info(f"Creating the Single SankeyLayout for {sg.name}.")

        # Set the current graph being rendered.
        self.path_column = path_column
        self.sg = sg

        self.time_exc = self.sg.df_get_proxy("time")
        self.time_inc = self.sg.df_get_proxy("time (inc)")

        self._COLUMNS = [
            "module",
            "name",
            "type",
            "module",
            "entry_function",
            "time",
            "time (inc)"
        ]

        if len(selected_runs) > 1:
            self.runs = sg.nxg_filter_by_datasets(selected_runs) # Filter based on the sub set asked by the client
        else:
            self.runs = selected_runs # Do not filter

        self.cp_dict = df_as_dict(self.sg.dataframe, 'name', 'component_path')


        self.reveal_callsites = reveal_callsites
        self.split_entry_module = split_entry_module
        self.split_callee_module = split_callee_module

        self.primary_group_df = df_group_by(
            self.sg.dataframe, [SankeyLayout._PRIMARY_GROUPBY_COLUMN]
        )
        self.secondary_group_df = df_group_by(
            self.sg.dataframe, [SankeyLayout._SECONDARY_GROUPBY_COLUMN]
        )
        self.secondary_primary_group_df = df_group_by(
            self.sg.dataframe,
            [
                SankeyLayout._SECONDARY_GROUPBY_COLUMN,
                SankeyLayout._PRIMARY_GROUPBY_COLUMN,
            ],
        )

        self.nxg = self._create_nxg_from_paths()
        
        if len(self.reveal_callsites) > 0:
            self.add_reveal_paths(self.reveal_callsites)

        if len(self.split_entry_module) > 0:
            self.add_entry_callsite_paths(self.split_entry_module)

        if len(self.split_callee_module) > 0:
            SankeyLayout.add_exit_callees_paths(self.split_callee_module)

        # self._add_node_attributes()
        # self._add_edge_attributes()

    @staticmethod
    def create_source_targets(component_path):
        """
        Split by reveal callsite.

        :param component_path: path tuple
        :return: edges array with attributes.
        """
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

    def callsite_path_information(self, callsites):
        """
        Get callsite path information

        :param callsites:
        :return:
        """
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
        """
        Add paths to the reveal callsites array.

        :param reveal_callsites: Array of call sites to reveal
        :return: None
        """
        paths = self.callsite_path_information(reveal_callsites)

        for path in paths:
            component_edges = SankeyLayout.create_source_targets(path["component_path"])
            for idx, edge in enumerate(component_edges):
                module = edge["module"]

                # format module +  '=' + callsite
                source = edge["source"]
                target = edge["target"]

                if not self.nxg.has_edge(source, target):
                    if idx == 0:
                        source_callsite = source
                        source_node_type = "super-node"
                    else:
                        source_callsite = source.split("=")[1]
                        source_node_type = "component-node"

                    target_callsite = target.split("=")[1]
                    target_df = self.secondary_primary_group_df.get_group(
                        (module, target_callsite)
                    )
                    target_node_type = "component-node"

                    # source_weight = source_df[self.time_inc].max()
                    target_weight = target_df[self.time_inc].mean()

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
                                "weight": 0,
                                "edge_type": "reveal_edge",
                            }
                        ],
                    )

    # --------------------------------------------------------------------------
    # Add callsites based on split by entry function interactions.
    @staticmethod
    def module_entry_functions_map(graph):
        """

        :param graph:
        :return:
        """
        entry_functions = {}
        for edge in graph.edges(data=True):
            attr_dict = edge[2]["attr_dict"]
            edge_tuple = (edge[0], edge[1])
            for edge_attr in attr_dict:
                if edge_tuple[1] not in entry_functions:
                    entry_functions[edge_tuple[1]] = []
                entry_functions[edge_tuple[1]].append(edge_attr["target_callsite"])
        return entry_functions

    @staticmethod
    def create_source_targets_from_group_path(path):
        """

        :param path:
        :return:
        """
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

    @staticmethod
    def same_source_edges(component_edges, reveal_module):
        """

        :param component_edges:
        :param reveal_module:
        :return:
        """
        ret = []
        for idx, edge in enumerate(component_edges):
            source = edge["source"]

            if source == reveal_module:
                ret.append(edge)
        return ret

    @staticmethod
    def same_target_edges(component_edges, reveal_module):
        """

        :param component_edges:
        :param reveal_module:
        :return:
        """
        ret = []
        for idx, edge in enumerate(component_edges):
            target = edge["target"]

            if target == reveal_module:
                ret.append(edge)
        return ret

    def add_entry_callsite_paths(self, entry_function):
        """

        :param entry_function:
        :return:
        """
        entry_functions_map = self.module_entry_functions_map(self.nxg)
        reveal_callsites = entry_functions_map[entry_function]
        paths = self.callsitePathInformation(reveal_callsites)

        for path in paths:
            component_edges = SankeyLayout.create_source_targets_from_group_path(
                path["group_path"]
            )
            source_edges_to_remove = SankeyLayout.same_source_edges(
                component_edges, entry_function
            )
            target_edges_to_remove = SankeyLayout.same_target_edges(
                component_edges, entry_function
            )

            if len(source_edges_to_remove) != 0:
                for edge in source_edges_to_remove:
                    if self.nxg.has_edge(edge["source"], edge["target"]):
                        self.nxg.remove_edge((edge["source"], edge["target"]))
                    self.nxg.add_node(
                        entry_function + "=" + edge["source_callsite"],
                        attr_dict={"type": "component-node"},
                    )
                    self.nxg.add_edge(
                        (
                            entry_function + "=" + edge["source_callsite"],
                            edge["target"],
                        ),
                        attr_dict=[
                            {
                                "source_callsite": edge["source_callsite"],
                                "target_callsite": edge["target_callsite"],
                                "weight": self.module_name_group_df.get_group(
                                    (entry_function, edge["source_callsite"])
                                )[self.time_inc].max(),
                                "edge_type": "reveal_edge",
                            }
                        ],
                    )

            if len(target_edges_to_remove) != 0:
                for edge in target_edges_to_remove:
                    if self.nxg.has_edge(edge["source"], edge["target"]):
                        self.nxg.remove_edge(edge["source"], edge["target"])
                    self.nxg.add_node(
                        entry_function + "=" + edge["target_callsite"],
                        attr_dict={"type": "component-node"},
                    )
                    self.nxg.add_edge(
                        edge["source"],
                        entry_function + "=" + edge["target_callsite"],
                        attr_dict=[
                            {
                                "source_callsite": edge["source_callsite"],
                                "target_callsite": edge["target_callsite"],
                                "weight": self.secondary_primary_group_df.get_group(
                                    (edge["target"], edge["target_callsite"])
                                )[self.time_inc].max(),
                                "edge_type": "reveal_edge",
                            }
                        ],
                    )

        self.nxg.remove_node(entry_function)

    # TODO: This function was missing in implementation.
    def add_exit_callee_paths(self, callee):
        """

        :param callee:
        :return:
        """
        pass

    # --------------------------------------------------------------------------
    # Node attribute methods.
    def _add_node_attributes(self):
        """
        Adds node attributes from the dataframe using the _COLUMNS.

        :return:
        """
        # ensemble_mapping = self._ensemble_map(
        #     sg=self.sg, nxg=self.nxg, columns=self._COLUMNS
        # )
        # for idx, key in enumerate(ensemble_mapping):
        #     nx.set_node_attributes(self.nxg, name=key, values=ensemble_mapping[key])

        dataset_mapping = {}
        for run in self.runs:
            dataset_mapping[run] = self._dataset_map(
                sg=self.sg,
                nxg=self.nxg,
                tag=run,
                columns=self._COLUMNS,
            )
            nx.set_node_attributes(
                self.nxg, name=self.sg.name, values=dataset_mapping[run]
            )

    # --------------------------------------------------------------------------
    # Edge attribute methods.
    def _add_edge_attributes(self):
        """

        :return:
        """
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
    def module_time(self, group_df, module_callsite_map, module):
        """
        For node attributes: Calculates the time spent inside the module overall

        :param group_df:
        :param module_callsite_map:
        :param module:
        :return:
        """
        exc_time_sum = 0
        inc_time_max = 0
        if module in module_callsite_map:
            for callsite in module_callsite_map[module]:
                callsite_df = group_df.get_group((module, callsite))
                max_inc_time = callsite_df[self.time_inc].mean()
                inc_time_max = max(inc_time_max, max_inc_time)
                max_exc_time = callsite_df[self.time_exc].max()
                exc_time_sum += max_exc_time
            return {"Inclusive": inc_time_max, "Exclusive": exc_time_sum}

    def callsite_time(self, group_df, module, callsite):
        """
        For node attribute: Calculates the time spent by each callsite.

        :param group_df:
        :param module:
        :param callsite:
        :return:
        """
        callsite_df = group_df.get_group((module, callsite))
        max_inc_time = callsite_df[self.time_inc].mean()
        max_exc_time = callsite_df[self.time_exc].mean()

        return {"Inclusive": max_inc_time, "Exclusive": max_exc_time}

    # --------------------------------------------------------------------------
    # Construct the networkX Graph from call paths.
    def _create_nxg_from_paths(self):
        """
        Construct a networkx graph from paths.
        Note: Current logic constructs two graphs (one for cct, and one for supergraph)
        and later uses them to construct a module level supergraph.
        """
        gp_dict = df_as_dict(self.sg.dataframe, 'name', self.path_column)

        nxg = nx.DiGraph()

        for c_name, path in gp_dict.items():
            if isinstance(path, str):
                continue
            
            if path.shape[0] > 2:
                for depth in range(0, len(path) - 1):
                    src = int(path[depth])
                    tgt = int(path[depth + 1])

                    src_name, src_dict = self.node_construct(c_name, src, "module")
                    tgt_name, tgt_dict = self.node_construct(c_name, tgt, 'module') 



                    if not nxg.has_node(src_name):
                        nxg.add_node(src_name, attr_dict=src_dict)
                    if not nxg.has_node(tgt):
                        nxg.add_node(tgt_name, attr_dict=tgt_dict)

                    has_callback_edge = nxg.has_edge(src_name, tgt_name)

                    if has_callback_edge:
                        edge_type = "callback"
                    else:
                        edge_type = "caller"

                    edge_dict = {
                        "edge_type": edge_type,
                        "weight": self.sg.get_runtime(tgt, "module", "time (inc)", lambda _: _),
                    }  

                    if not nxg.has_edge(src_name, tgt_name) and edge_dict["weight"] > 0:
                        nxg.add_edge(src_name, tgt_name, attr_dict=edge_dict)

        return nxg

    def node_construct(self, callsite_name, node_id, node_type):
        name = self.sg.get_name(node_id, node_type)
        return name, {
            "type": node_type,
            "level": len(self.cp_dict[callsite_name]),
            "cp_path": self.cp_dict[callsite_name],
        }

    @staticmethod
    def _break_cycles_in_paths(path):
        """
        Breaks cycles in the call graph, if present.

        Parameter:
            path: path array
        """
        ret = []
        module_mapper = {}
        data_mapper = {}

        path_list = list(path)

        for idx, elem in enumerate(path_list):
            module = elem.split("=")[0]
            callsite = elem.split("=")[1]

            if module not in data_mapper:
                module_mapper[module] = idx
                data_mapper[module] = [
                    {
                        "callsite": callsite,
                        "module": module,
                        "level": idx,
                        "type": "super-node",
                    }
                ]
            else:
                flag = [p["level"] == idx for p in data_mapper[module]]
                if np.any(np.array(flag)):
                    module_mapper[module] += 1
                    data_mapper[module].append(
                        {
                            "callsite": callsite,
                            "module": module + "=" + callsite,
                            "level": idx,
                            "type": "component-node",
                        }
                    )
                else:
                    data_mapper[module].append(
                        {
                            "callsite": callsite,
                            "module": module,
                            "level": idx,
                            "type": "component-node",
                        }
                    )
            ret.append(data_mapper[module][-1])
        return ret

    def _ensemble_map(self, sg, nxg, columns):
        """
        Creates maps for all columns for the ensemble data.
        Note: For single supergraph, ensemble_map would be the same as dataset_map[single_run.tag].
        TODO: There is code repetition among ensemble_maps and dataset_maps. Need to simplify.
        """
        df = sg.dataframe
        ret = {}

        module_group_df = df.groupby(["module"])
        module_name_group_df = df.groupby(["module", "name"])

        module_callsite_map = module_group_df["name"].unique().to_dict()

        module_time_inc_map = module_group_df[self.time_inc].max().to_dict()
        module_time_exc_map = module_group_df[self.time_exc].max().to_dict()

        name_time_inc_map = module_name_group_df[self.time_inc].max().to_dict()
        name_time_exc_map = module_name_group_df[self.time_exc].max().to_dict()

        # loop through the nodes
        for node in nxg.nodes(data=True):
            node_name, node_dict = SankeyLayout.nx_deconstruct_node(node)
            if node_dict["type"] == "component-node":
                module = sg.get_idx(node_name.split("=")[0], "module")
                callsite = node_dict["callsite"]
                # actual_time = SankeyLayout.callsite_time(
                #     group_df=module_name_group_df, module=module, callsite=callsite
                # )
                # time_inc = name_time_inc_map[(module, callsite)]
                # time_exc = name_time_exc_map[(module, callsite)]

            elif node_dict["type"] == "super-node":
                module_idx = node_name
                # TODO: Add the entry function as the callsite.
                callsite = ""
                module = sg.get_name(module_idx, "module")
                actual_time = self.module_time(
                    group_df=module_name_group_df,
                    module_callsite_map=module_callsite_map,
                    module=module,
                )

                if module in module_time_inc_map and module in module_time_exc_map:
                    time_inc = module_time_inc_map[module]
                    time_exc = module_time_exc_map[module]

            for column in columns:
                if column not in ret:
                    ret[column] = {}

                if column == "time (inc)":
                    ret[column][node_name] = time_inc

                elif column == "time":
                    ret[column][node_name] = time_exc

                elif column == "module":
                    ret[column][node_name] = module

                elif column == "name":
                    ret[column][node_name] = callsite

                elif column == "type":
                    ret[column][node_name] = node_dict["type"]

                elif column == "entry_function":
                    module_idx = sg.get_idx(node_name, "module")
                    ret[column][node_name] = SankeyLayout.get_entry_functions(
                        module_group_df, module_idx
                    )

        return ret

    def _dataset_map(self, sg, nxg, columns, tag=""):
        """
        Creates maps for all node attributes (i.e., columns in df) for each dataset.
        """
        ret = {}

        for node in nxg.nodes(data=True):
            node_name, node_dict = SankeyLayout.nx_deconstruct_node(node)

            print(node_name, node_dict)

            if node_name not in ret:
                ret[node_name] = {}

            # for column in columns:
            #     if column == "time (inc)":
            #         ret[node_name][column] = time_inc

            #     elif column == "time":
            #         ret[node_name][column] = time_exc

            #     elif column == "module":
            #         ret[node_name][column] = module

            #     elif column == "name":
            #         ret[node_name][column] = callsite

            #     elif column == "type":
            #         ret[node_name][column] = node_dict["type"]

            #     elif column == "entry_function":
            #         module_idx = sg.get_idx(node_name, "module")
            #         ret[node_name][column] = SankeyLayout.get_entry_functions(
            #             target_module_group_df, module_idx
            #         )

        return ret

    @staticmethod
    def get_entry_functions(df, module):
        """
        Get the entry function of a module from the dataframe.
        """
        if module in df.groups:
            module_df = df.get_group(module)
            entry_func_df = module_df.loc[module_df["entry_function"]]
            return entry_func_df["callees"].unique()

    # --------------------------------------------------------------------------
    @staticmethod
    def edge_type(nxg):
        """
        For edge attribute: Appends the edge type ("caller", or "callback")
        """
        ret = {}
        for edge in nxg.edges(data=True):
            edge_tuple, edge_dict = SankeyLayout.nx_deconstruct_edge(edge)
            ret[edge_tuple] = edge_dict["edge_type"]
        return ret

    @staticmethod
    def edge_weight(nxg):
        """
        For edge attribute: Calculates the sankey flow between nodes.
        """
        flow_mapping = {}
        for edge in nxg.edges(data=True):
            # edge here is (source, target) tuple.
            edge_tuple, edge_dict = SankeyLayout.nx_deconstruct_edge(edge)

            if edge_tuple not in flow_mapping:
                flow_mapping[edge_tuple] = 0

            flow_mapping[edge_tuple] += edge_dict["weight"]
        return flow_mapping

    @staticmethod
    def entry_functions(nxg):
        """
        For edge attribute: Adds the entry functions for the module.
        """
        entry_functions = {}
        for edge in nxg.edges(data=True):
            edge_tuple, edge_dict = SankeyLayout.nx_deconstruct_edge(edge)
            if edge_tuple not in entry_functions:
                entry_functions[edge_tuple] = []
            entry_functions[edge_tuple].append(edge_dict["target_callsite"])
        return entry_functions

    @staticmethod
    def exit_functions(nxg):
        """
        For edge attribute: Adds the exit functions from the module.
        """
        exit_functions = {}
        for edge in nxg.edges(data=True):
            edge_tuple, edge_dict = SankeyLayout.nx_deconstruct_edge(edge)
            if edge_tuple not in exit_functions:
                exit_functions[edge_tuple] = []
            exit_functions[edge_tuple].append(edge_dict["source_callsite"])
        return exit_functions

    # TODO: Find a better place for this to reside.
    @staticmethod
    def nx_deconstruct_node(node):
        """

        :param node:
        :return:
        """
        attr_dict = node[1]["attr_dict"]
        return node[0], attr_dict

    @staticmethod
    def nx_deconstruct_edge(edge):
        """

        :param edge:
        :return:
        """
        return (edge[0], edge[1]), edge[2]["attr_dict"]

    @staticmethod
    def nx_construct_node_dict(is_module_in_dataframe, node):
        """

        :param is_module_in_dataframe:
        :param node:
        :return:
        """
        # If "module" column exists in a dataframe, it can have super-nodes
        if "=" in node:
            if node.split("=")[0] != node.split("=")[1]:
                return {"type": "super-node"}
            else:
                return {"type": "component-node"}
        else:
            return {"type": "component-node"}