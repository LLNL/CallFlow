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
from callflow.utils.df import df_as_dict

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
        grp_column,
        sg,
        esg=None,
        nbins=20,
        reveal_callsites=[],
        split_entry_module="",
        split_callee_module="",
    ):
        """
        Construct the Sankey layout.

        :param grp_column: grouped column to consider, e.g., path, group_path, component_path
        :param sg: SuperGraph
        :param esg:
        :param reveal_callsites: array of callsites to reveal
        :param split_entry_module: array of entry modules to split
        :param split_callee_module: array of callees to split
        """
        assert isinstance(sg, (callflow.SuperGraph, callflow.EnsembleGraph))
        if esg is not None:
            assert isinstance(esg, (callflow.SuperGraph, callflow.EnsembleGraph))
        assert isinstance(grp_column, str)
        assert grp_column in ["path", "group_path", "component_path"]

        LOGGER.info(f"Creating the Single SankeyLayout for {sg.name}.")

        # Set the current graph being rendered.
        self.reveal_callsites = reveal_callsites
        self.split_entry_module = split_entry_module
        self.split_callee_module = split_callee_module
        self.nbins = nbins

        if esg:
            self.sg = esg
            self.runs = self.sg.get_datasets()
        else:
            self.sg = sg

        self.time_exc = self.sg.df_get_proxy("time")
        self.time_inc = self.sg.df_get_proxy("time (inc)")

        self.df = self.sg.dataframe

        self.gp_dict = df_as_dict(self.df, "name", grp_column)
        self.cp_dict = df_as_dict(self.df, "name", "component_path")

        self.nxg = self._create_nxg_from_paths()

        if len(self.reveal_callsites) > 0:
            self.add_reveal_paths(self.reveal_callsites)

        if len(self.split_entry_module) > 0:
            self.add_entry_callsite_paths(self.split_entry_module)

        if len(self.split_callee_module) > 0:
            SankeyLayout.add_exit_callees_paths(self.split_callee_module)

        self.nxg = self.dfs_remove_back_edges(self.nxg)

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
                    # target_df = self.secondary_primary_group_df.get_group(
                    # (module, target_callsite)
                    # )
                    target_node_type = "component-node"

                    # source_weight = source_df[self.time_inc].max()
                    # target_weight = target_df[self.time_inc].mean()

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

    # --------------------------------------------------------------------------
    # Construct the networkX Graph from call paths.
    def _create_nxg_from_paths(self):
        """
        Construct a networkx graph from paths.
        Note: Current logic constructs two graphs (one for cct, and one for supergraph)
        and later uses them to construct a module level supergraph.
        """
        nxg = nx.DiGraph()

        unique_paths = {}

        for callsite in self.sg.nxg.nodes():
            cs_idx = self.sg.get_idx(callsite, "callsite")

            if cs_idx not in self.gp_dict:
                continue

            path = self.gp_dict[cs_idx]
            cp_path = self.cp_dict[cs_idx]

            if tuple(path) not in unique_paths.keys():
                unique_paths[tuple(path)] = []

            # TODO: need to generalize this here.
            if len(cp_path) == 1:
                unique_paths[tuple(path)].append(cp_path[0])

        flow_mapping = {}
        # TODO: Convert the unique paths to a graph. (by breaking the cycles)
        for path in unique_paths.keys():
            if len(path) > 2:
                path = self._break_cycles_in_paths(cs_idx, path)
            
                for depth in range(0, len(path) - 1):
                    src = path[depth]
                    tgt = path[depth + 1]

                    src_name = self.sg.get_name(src.get("id"), src.get("type"))
                    tgt_name = self.sg.get_name(tgt.get("id"), tgt.get("type"))

                    if not nxg.has_node(src_name):
                        src_dict = self.sg_node_construct(src)
                        nxg.add_node(src_name, attr_dict=src_dict)

                    if not nxg.has_node(tgt):
                        tgt_dict = self.sg_node_construct(tgt)
                        nxg.add_node(tgt_name, attr_dict=tgt_dict)

                    has_callback_edge = nxg.has_edge(src_name, tgt_name)

                    if has_callback_edge:
                        edge_type = "callback"
                    else:
                        edge_type = "caller"

                    super_edge = (src_name, tgt_name)
                                        
                    if super_edge not in flow_mapping:
                        flow_mapping[super_edge] = {
                            "edge_type": edge_type,
                            "weight": 0,
                        }
                    
                    flow_mapping[super_edge]["weight"] += self.sg.get_runtime(tgt, self.time_inc)

                    if not nxg.has_edge(src_name, tgt_name) and flow_mapping[super_edge]["weight"] > 0:
                        nxg.add_edge(src_name, tgt_name, attr_dict=flow_mapping[super_edge])

        return nxg

    def sg_node_construct(self, node):
        name = self.sg.get_name(node.get("id"), node.get("type"))

        ret = {
            "name": name,
            "type": node.get("type"),
            "level": node.get("level"),
            # "cp_path": self.cp_dict[self.sg.get_id(node)],
            "time (inc)": self.sg.get_runtime(node, self.time_inc),
            "time": self.sg.get_runtime(node, self.time_exc),
            "hists": self.sg.get_histograms(node, nbins=20),
            "entry_functions": self.sg.get_entry_functions(node),
            "idx": node.get("id"),
        }
        
        if self.sg.name == "ensemble":
            ret["gradients"] = self.sg.get_gradients(node, self.nbins)
        
        return ret

    def _break_cycles_in_paths(self, cs_idx, path):
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
            if elem not in data_mapper:
                module_mapper[elem] = idx
                data_mapper[elem] = [
                    {
                        "id": elem.item(), # will be a module_idx
                        "level": idx,
                        "type": "module",
                    }
                ]
            else:
                flag = [p["level"] == idx for p in data_mapper[elem]]
                if np.any(np.array(flag)):
                    module_mapper[elem] += 1
                    data_mapper[elem].append(
                        {
                            "id": cs_idx,
                            "level": idx,
                            "type": "callsite",
                        }
                    )
                else:
                    data_mapper[elem].append(
                        {
                            "id": cs_idx,
                            "level": idx,
                            "type": "callsite",
                        }
                    )
            ret.append(data_mapper[elem][-1])
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

    
    def dfs_visit_recursively(self, g, node, nodes_color, edges_to_be_removed):

        nodes_color[node] = 1
        nodes_order = list(g.successors(node))
        nodes_order = np.random.permutation(nodes_order)
        for child in nodes_order:
            if nodes_color[child] == 0:
                    self.dfs_visit_recursively(g, child, nodes_color, edges_to_be_removed)
            elif nodes_color[child] == 1:
                edges_to_be_removed.append((node,child))

        nodes_color[node] = 2

    def dfs_remove_back_edges(self, g, nodetype = int):
        '''
        0: white, not visited 
        1: grey, being visited
        2: black, already visited
        '''

        nodes_color = {}
        edges_to_be_removed = []
        for node in g.nodes():
            nodes_color[node] = 0

        nodes_order = list(g.nodes())
        nodes_order = np.random.permutation(nodes_order)
        num_dfs = 0
        for node in nodes_order:

            if nodes_color[node] == 0:
                num_dfs += 1
                self.dfs_visit_recursively(g, node, nodes_color, edges_to_be_removed)

        print("number of nodes to start dfs: %d" % num_dfs)
        print(f"number of back edges: {edges_to_be_removed}")

        for edge in edges_to_be_removed:
            g.remove_edge(edge[0], edge[1])
        
        return g

