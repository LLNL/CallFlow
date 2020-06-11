# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

# ------------------------------------------------------------------------------
# Library imports
import os
import json
import copy
import pandas as pd
import networkx as nx
from networkx.readwrite import json_graph
from ast import literal_eval as make_list

# ------------------------------------------------------------------------------
# CallFlow imports
import callflow
from callflow.timer import Timer
from callflow.operations import Process, Group, Filter
from callflow.modules import EnsembleAuxiliary, SingleAuxiliary

LOGGER = callflow.get_logger(__name__)

# ------------------------------------------------------------------------------
# SuperGraph Class
class SuperGraph(object):
    def __init__(self, props={}, tag="", mode="process"):
        self.timer = Timer()

        # Props is the information contained in config object.
        # We duplicate this to add more information to config and not modify it as a side effect.
        self.props = props
        self.dirname = self.props["save_path"]

        # it appears we're using name as "union", "filter", etc.
        # this is not a data set name!
        self.tag = tag

        # Mode is either process or render.
        self.mode = mode

        # Variables used by `create_target_maps`.
        self.target_df = {}
        self.target_modules = {}
        self.target_module_group_df = {}
        self.target_module_name_group_df = {}
        self.target_module_callsite_map = {}
        self.target_module_time_inc_map = {}
        self.target_module_time_exc_map = {}
        self.target_name_time_inc_map = {}
        self.target_name_time_exc_map = {}

        # Create a graphframe based on the mode.
        if mode == "process":
            self.create_gf()
        elif mode == "render":
            data = self.read_gf(read_parameter=self.props["read_parameter"])
            self.create_gf(data=data)
            self.auxiliary_data = self.read_auxiliary_data()

            with self.timer.phase(f"Creating the data maps."):
                self.cct_df = self.gf.df[self.gf.df["name"].isin(self.gf.nxg.nodes())]
                self.create_ensemble_maps()
                for dataset in self.props["dataset_names"]:
                    self.create_target_maps(dataset)

        self.projection_data = {}

    def _getter(self):
        """
        Getter for graphframe. Returns the graphframe.
        """
        return self.gf

    def _setter(self, gf):
        """
        Setter for graphframe. Hooks the graphframe.
        """
        assert isinstance(gf, callflow.GraphFrame)

        self.gf = gf

    def create_gf(self, data=None):
        """
        Creates a graphframe using config and networkX grapg from hatchet graph.
        Each graphframe is tagged by a unique identifier. 
        e.g., here is the runName from config file or JSON.
        """
        if data:
            self.gf = callflow.GraphFrame.from_data(data)
        else:
            gf = callflow.GraphFrame.from_config(self.props, self.tag)
            self.gf = copy.deepcopy(gf)

    def process_gf(self):
        """
        Process graphframe to add properties depending on the format. 
        Current processing is supported for hpctoolkit and caliper. 
        """
        gf = self._getter()
        if self.props["format"][self.tag] == "hpctoolkit":
            process = (
                Process.Builder(gf, self.tag)
                .add_path()
                .create_name_module_map()
                .add_callers_and_callees()
                .add_dataset_name()
                .add_imbalance_perc()
                .add_module_name_hpctoolkit()
                .add_vis_node_name()
                .build()
            )
        elif self.props["format"][self.tag] == "caliper_json":
            process = (
                Process.Builder(gf, self.tag)
                .add_time_columns()
                .add_rank_column()
                .add_callers_and_callees()
                .add_dataset_name()
                .add_imbalance_perc()
                .add_module_name_caliper(self.props["callsite_module_map"])
                .create_name_module_map()
                .add_vis_node_name()
                .add_path()
                .build()
            )

        self._setter(process.gf)

    def group_gf(self, group_by="module"):
        """
        Group the graphframe based on `group_by` parameter. 
        """
        gf = self._getter()
        group = Group(gf, group_by)

        self._setter(group.gf)

    def filter_gf(self, mode="single"):
        """
        Filter the graphframe. 
        """
        gf = self._getter()
        filter_res = Filter(
            gf=gf,
            mode=mode,
            filter_by=self.props["filter_by"],
            filter_perc=self.props["filter_perc"],
        )
        self._setter(filter_res.gf)

    def ensemble_gf(self, supergraphs):

        EnsembleGraph(
            self.props, "ensemble", mode="process", supergraphs=single_supergraphs
        )

    def ensemble_auxiliary(
        self, datasets, MPIBinCount=20, RunBinCount=20, process=True, write=True
    ):
        gf = self._getter()
        EnsembleAuxiliary(
            gf,
            datasets=datasets,
            props=self.props,
            MPIBinCount=MPIBinCount,
            RunBinCount=RunBinCount,
            process=process,
            write=write,
        )

    def single_auxiliary(self, dataset="", binCount=20, process=True):
        gf = self._getter()
        SingleAuxiliary(
            gf,
            dataset=dataset,
            props=self.props,
            MPIBinCount=binCount,
            process=process,
        )

    # ------------------------------------------------------------------------------
    # Utilities.

    def get_top_n_callsites_by_attr(self, count, sort_attr):
        """
        Returns an array of callsites (sorted by `sort_attr`)
        """
        xgroup_df = self.entire_df.groupby(["name"]).mean()
        sort_xgroup_df = xgroup_df.sort_values(by=[sort_attr], ascending=False)
        callsites_df = sort_xgroup_df.nlargest(count, sort_attr)
        return callsites_df.index.values.tolist()

    def read_gf(self, read_parameter=True, read_graph=False):
        """
        # Read a single dataset stored in .callflow directory.
        """
        LOGGER.info("Reading the dataset: {0}".format(self.tag))

        df_file_name = "df.csv"
        df_file_path = os.path.join(self.dirname, self.tag, df_file_name)
        df = pd.read_csv(df_file_path)
        if df.empty:
            raise ValueError(f"{df_file_path} is empty.")

        nxg_file_name = "nxg.json"
        nxg_file_path = os.path.join(self.dirname, self.tag, nxg_file_name)
        with open(nxg_file_path, "r") as nxg_file:
            graph = json.load(nxg_file)
        nxg = json_graph.node_link_graph(graph)
        assert nxg != None

        graph = {}
        if read_graph:
            graph_file_name = "hatchet_tree.txt"
            graph_file_path = os.path.join(self.dirname, self.tag, graph_file_name)
            with open(graph_file_path, "r") as graph_file:
                graph = json.load(graph_file)
            assert isinstance(graph, ht.GraphFrame.Graph)

        parameters = {}
        if read_parameter:
            parameters_filepath = os.path.join(self.dirname, self.tag, "env_params.txt")
            for line in open(parameters_filepath, "r"):
                s = 0
                for num in line.strip().split(","):
                    split_num = num.split("=")
                    parameters[split_num[0]] = split_num[1]

        return {"df": df, "nxg": nxg, "graph": graph, "parameters": parameters}

    def write_gf(self, write_df=True, write_graph=False, write_nxg=True):
        """
        # Write the dataset to .callflow directory.
        """
        # Get the save path.
        dirname = self.props["save_path"]

        gf = self.gf
        # dump the filtered dataframe to csv if write_df is true.
        if write_df:
            df_file_name = "df.csv"
            df_file_path = os.path.join(dirname, self.tag, df_file_name)
            gf.df.to_csv(df_file_path)

        # TODO: Writing fails.
        if write_nxg:
            nxg_file_name = "nxg.json"
            nxg_file_path = os.path.join(dirname, self.tag, nxg_file_name)
            nxg_data = json_graph.node_link_data(self.gf.nxg)
            with open(nxg_file_path, "w") as nxg_file:
                json.dump(nxg_data, nxg_file)

        if write_graph:
            graph_filepath = os.path.join(dirname, self.tag, "hatchet_tree.txt")
            with open(graph_filepath, "a") as hatchet_graphFile:
                hatchet_graphFile.write(self.gf.tree(color=False))

    def write_similarity(self, datasets, states, type):
        """
        # Write the pair-wise graph similarities into .callflow directory.
        """
        ret = {}
        for idx, dataset in enumerate(datasets):
            ret[dataset] = []
            for idx_2, dataset2 in enumerate(datasets):
                union_similarity = Similarity(states[dataset2].g, states[dataset].g)
                ret[dataset].append(union_similarity.result)

        dirname = self.config.callflow_dir
        name = self.config.runName
        # similarity_filepath = dirname + "/" + "similarity.json"
        similarity_filepath = os.path.join(dirname, "similarity.json")
        with open(similarity_filepath, "w") as json_file:
            json.dump(ret, json_file)

    def read_auxiliary_data(self):
        """
        # Read the auxiliary data from all_data.json. 
        """
        all_data_filepath = os.path.join(
            self.props["save_path"], self.tag, "auxiliary_data.json"
        )
        LOGGER.info(f"[Read] {all_data_filepath}")
        with open(all_data_filepath, "r") as filter_graphFile:
            data = json.load(filter_graphFile)
        return data

    # ------------------------------------------------------------------------------
    # NetworkX graph utility functions.
    def create_target_maps(self, dataset):
        # Reduce the entire_df to respective target dfs.
        self.target_df[dataset] = self.gf.df.loc[self.gf.df["dataset"] == dataset]

        # Unique modules in the target run
        self.target_modules[dataset] = self.target_df[dataset]["module"].unique()

        # Group the dataframe in two ways.
        # 1. by module
        # 2. by module and callsite
        self.target_module_group_df[dataset] = self.target_df[dataset].groupby(
            ["module"]
        )
        self.target_module_name_group_df[dataset] = self.target_df[dataset].groupby(
            ["module", "name"]
        )

        # Module map for target run {'module': [Array of callsites]}
        self.target_module_callsite_map[dataset] = (
            self.target_module_group_df[dataset]["name"].unique().to_dict()
        )

        # Inclusive time maps for the module level and callsite level.
        self.target_module_time_inc_map[dataset] = (
            self.target_module_group_df[dataset]["time (inc)"].max().to_dict()
        )
        self.target_name_time_inc_map[dataset] = (
            self.target_module_name_group_df[dataset]["time (inc)"].max().to_dict()
        )

        # Exclusive time maps for the module level and callsite level.
        self.target_module_time_exc_map[dataset] = (
            self.target_module_group_df[dataset]["time"].max().to_dict()
        )
        self.target_name_time_exc_map[dataset] = (
            self.target_module_name_group_df[dataset]["time"].max().to_dict()
        )

    def create_ensemble_maps(self):
        self.modules = self.gf.df["module"].unique()

        self.module_name_group_df = self.gf.df.groupby(["module", "name"])
        self.module_group_df = self.gf.df.groupby(["module"])
        self.name_group_df = self.gf.df.groupby(["name"])

        # Module map for ensemble {'module': [Array of callsites]}
        self.module_callsite_map = self.module_group_df["name"].unique().to_dict()

        # Inclusive time maps for the module level and callsite level.
        self.module_time_inc_map = self.module_group_df["time (inc)"].max().to_dict()
        self.name_time_inc_map = self.module_name_group_df["time (inc)"].max().to_dict()

        # Exclusive time maps for the module level and callsite level.
        self.module_time_exc_map = self.module_group_df["time"].max().to_dict()
        self.name_time_exc_map = self.module_name_group_df["time"].max().to_dict()

    def remove_cycles_in_paths(self, path):
        ret = []
        moduleMapper = {}
        dataMap = {}

        if isinstance(path, float):
            return []
        path = make_list(path)
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

    def print_information(self):
        LOGGER.info("Modules: {0}".format(self.supergraph.gf.df["module"].unique()))
        LOGGER.info("Top 10 Inclusive time: ")
        top = 10
        rank_df = self.supergraph.gf.df.groupby(["name", "nid"]).mean()
        top_inclusive_df = rank_df.nlargest(top, "time (inc)", keep="first")
        for name, row in top_inclusive_df.iterrows():
            LOGGER.info("{0} [{1}]".format(name, row["time (inc)"]))

        LOGGER.info("Top 10 Enclusive time: ")
        top_exclusive_df = rank_df.nlargest(top, "time", keep="first")
        for name, row in top_exclusive_df.iterrows():
            LOGGER.info("{0} [{1}]".format(name, row["time"]))

        for node in self.supergraph.gf.nxg.nodes(data=True):
            LOGGER.info("Node: {0}".format(node))
        for edge in self.supergraph.gf.nxg.edges():
            LOGGER.info("Edge: {0}".format(edge))

        LOGGER.info("Nodes in the tree: {0}".format(len(self.supergraph.gf.nxg.nodes)))
        LOGGER.info("Edges in the tree: {0}".format(len(self.supergraph.gf.nxg.edges)))
        LOGGER.info("Is it a tree? : {0}".format(nx.is_tree(self.supergraph.gf.nxg)))
        LOGGER.info(
            "Flow hierarchy: {0}".format(nx.flow_hierarchy(self.supergraph.gf.nxg))
        )

    # ------------------------------------------------------------------------------
    # Module hierarchy.
    # TODO: we might have to delete the module hierarchy file in modules later.
    # TODO: This might fail.

    @staticmethod
    def _create_source_targets(path):
        module = ""
        edges = []

        for idx, callsite in enumerate(path):
            if idx == len(path) - 1:
                break

            source = sanitizeName(path[idx])
            target = sanitizeName(path[idx + 1])

            edges.append({"source": source, "target": target})
        return edges

    @staticmethod
    def _check_cycles(hierarchy, G):
        try:
            cycles = list(nx.find_cycle(self.hierarchy, orientation="ignore"))
        except:
            cycles = []

        return cycles

    @staticmethod
    def _remove_cycles(hierarchy, G, cycles):
        for cycle in cycles:
            source = cycle[0]
            target = cycle[1]
            print("Removing edge:", source, target)
            if source == target:
                print("here")
                G.remove_edge(source, target)
                G.remove_node(source)
                G.remove_node

            if cycle[2] == "reverse":
                print("Removing edge:", source, target)
                G.remove_edge(source, target)
        return G

    @staticmethod
    def _add_hierarchy_paths(self, hierarchy, df, path_name, filterTopCallsites=False):
        module_df = self.df.loc[self.df["module"] == self.module]
        if filterTopCallsites:
            group_df = module_df.groupby(["name"]).mean()
            f_group_df = group_df.loc[group_df[self.config.filter_by] > 500000]
            callsites = f_group_df.index.values.tolist()
            df = df[df["name"].isin(callsites)]

        paths = df[path_name].unique()
        for idx, path in enumerate(paths):
            if isinstance(path, float):
                return []
            path = make_tuple(path)
            source_targets = self.create_source_targets(path)
            for edge in source_targets:
                source = edge["source"]
                target = edge["target"]
                if not hierarchy.has_edge(source, target):
                    hierarchy.add_edge(source, target)

    def module_hierarchy(self, module=None):
        hierarchy = nx.DiGraph()
        node_paths_df = self.df.loc[self.df["module"] == self.module]

        if "component_path" not in self.df.columns:
            utils.debug("Error: Component path not defined in the df")

        with self.timer.phase("Add paths"):
            self._add_hierarchy_paths(hierarchy, node_paths_df, "component_path")

        cycles = self._check_cycles(hierarchy)
        while len(cycles) != 0:
            self.hierarchy = self._remove_cycles(hierarchy, cycles)
            cycles = self._check_cycles(hierarchy)
            print(f"cycles: {cycles}")

        return hierarchy

    # ------------------------------------------------------------------------------
    # Add paths according to what input is provided.
    # Should be implemented by the child classes.
    def add_paths(self, path):
        pass

    def add_node_attributes(self):
        pass

    def add_edge_attribtues(self):
        pass

    # ------------------------------------------------------------------------------
    # Reveal a callsite's path
    # TODO: not tested. Could break.
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

    def callsite_paths(self, callsites):
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
        paths = self.callsite_paths(reveal_callsites)

        for path in paths:
            component_edges = self.create_source_targets(path["component_path"])
            for idx, edge in enumerate(component_edges):
                module = edge["module"]

                # format module +  '=' + callsite
                source = edge["source"]
                target = edge["target"]

                if not self.supergraph.gf.nxg.has_edge(source, target):
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
                    self.supergraph.gf.nxg.add_node(
                        source, attr_dict={"type": source_node_type}
                    )
                    self.supergraph.gf.nxg.add_node(
                        target, attr_dict={"type": target_node_type}
                    )
                    self.supergraph.gf.nxg.add_edge(
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

    def add_exit_callsite():
        # TODO: This code is missing for some reason.
        pass

    # ------------------------------------------------------------------------------
    # Create a module hierarchy for a chosen module.
    # Not fully tested. Might break.
    def module_entry_functions_map(self, graph):
        entry_functions = {}
        for edge in graph.edges(data=True):
            attr_dict = edge[2]["attr_dict"]
            edge_tuple = (edge[0], edge[1])
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

    def add_entry_callsite(self, reveal_module):
        entry_functions_map = self.module_entry_functions_map(self.supergraph.gf.nxg)
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
                    if self.supergraph.gf.nxg.has_edge(edge["source"], edge["target"]):
                        self.supergraph.gf.nxg.remove_edge(
                            (edge["source"], edge["target"])
                        )
                    self.supergraph.gf.nxg.add_node(
                        reveal_module + "=" + edge["source_callsite"],
                        attr_dict={"type": "component-node"},
                    )
                    self.supergraph.gf.nxg.add_edge(
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
                    if self.supergraph.gf.nxg.has_edge(edge["source"], edge["target"]):
                        self.supergraph.gf.nxg.remove_edge(
                            edge["source"], edge["target"]
                        )
                    self.supergraph.gf.nxg.add_node(
                        reveal_module + "=" + edge["target_callsite"],
                        attr_dict={"type": "component-node"},
                    )
                    self.supergraph.gf.nxg.add_edge(
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

        self.supergraph.gf.nxg.remove_node(reveal_module)
