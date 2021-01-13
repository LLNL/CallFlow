# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import os
import json
import pandas as pd
import hatchet as ht
import networkx as nx
from ast import literal_eval as make_list


from callflow import get_logger
#from .graphframe import GraphFrame
#from callflow.timer import Timer
#from callflow.algorithms import DeltaConSimilarity
from callflow.operations import Process, Group, Filter
#from callflow.modules import EnsembleAuxiliary, SingleAuxiliary
LOGGER = get_logger(__name__)


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class SuperGraph(ht.GraphFrame):
    """
    SuperGraph class to handle processing of a an input Dataset.
    """
    # --------------------------------------------------------------------------
    _FORMATS = ["hpctoolkit", "caliper", "caliper_json", "gprof", "literal", "lists"]

    _FILENAMES = {"ht": "hatchet_tree.txt",
                  "df": "df.csv",
                  "nxg": "nxg.json",
                  "params": "env_params.txt",
                  "aux": "auxiliary_data.json"}

    _METRIC_PROXIES = {"time (inc)": ["inclusive#time.duration"],
                       "time": ["sum#time.duration", "sum#sum#time.duration"]}

    # --------------------------------------------------------------------------
    def __init__(self, name, mode, config, dataframe=None, nxg=None):

        assert isinstance(name, str) and isinstance(mode, str)
        assert mode in ["process", "render"]
        assert isinstance(config, dict)
        assert (dataframe is None) == (nxg is None)       # need both or neither

        self.name = name                # dataset name
        self.parameters = {}
        self.auxiliary_data = {}
        self.proxy_columns = {}
        self.config = config
        self.dir_path = os.path.join(self.config["save_path"], self.name)
        # self.timer = Timer()

        # ----------------------------------------------------------------------
        LOGGER.info(f'###################### Creating SuperGraph ({self.name})')

        # render mode simply reads the data
        if mode == "render":
            assert (dataframe is None) and (nxg is None)
            self.read(self.dir_path)

        # copy over the dataframe and nxg (used for creating ensemble)
        elif dataframe is not None and nxg is not None:
            self.graph = None
            self.dataframe = dataframe
            self.nxg = nxg
            self.exc_metrics = []
            self.inc_metrics = []

        # otherwise, need to create from config
        elif mode == "process":
            gf = SuperGraph.from_config(self.name, self.config)
            assert isinstance(gf, ht.GraphFrame)
            assert gf.graph is not None
            super().__init__(gf.graph, gf.dataframe, gf.exc_metrics, gf.inc_metrics)
            self.nxg = self.hatchet_graph_to_nxg(self.graph)

        self.df_add_time_proxies()

        # Hatchet requires node and rank to be indexes.
        # remove the set indexes to maintain consistency.
        # self.dataframe = self.dataframe.set_index(['node', 'rank'])
        # self.dataframe = self.dataframe.reset_index(drop=False)
        self.df_reset_index()
        # ----------------------------------------------------------------------

    def __str__(self):
        return "str"

    def __repr__(self):
        return "repr"

    # --------------------------------------------------------------------------
    # read/write functionality
    # --------------------------------------------------------------------------
    @staticmethod
    def write_df(path, df):
        df.to_csv(os.path.join(path, SuperGraph._FILENAMES["df"]))

    @staticmethod
    def write_nxg(path, nxg):
        nxg_json = nx.readwrite.json_graph.node_link_data(nxg)
        fname = os.path.join(os.path.join(path, SuperGraph._FILENAMES["nxg"]))
        with open(fname, "w") as fptr:
            json.dump(nxg_json, fptr, indent=2)

    @staticmethod
    def write_graph(path, graph_str):
        fname = os.path.join(os.path.join(path, SuperGraph._FILENAMES["ht"]))
        with open(fname, "w") as fptr:
            fptr.write(graph_str)

    @staticmethod
    def read_df(path):
        fname = os.path.join(path, SuperGraph._FILENAMES["df"])
        df = pd.read_csv(fname)
        if df is None or df.empty:
            raise ValueError(f"Did not find a valid dataframe in ({fname}).")
        return df

    @staticmethod
    def read_nxg(path):
        fname = os.path.join(path, SuperGraph._FILENAMES["nxg"])
        with open(fname, "r") as nxg_file:
            graph = json.load(nxg_file)
            nxg = nx.readwrite.json_graph.node_link_graph(graph)
        if nxg is None:
            raise ValueError(f"Did not find a valid nxg in ({fname}).")
        return nxg

    @staticmethod
    def read_graph(path):
        fname = os.path.join(path, SuperGraph._FILENAMES["ht"])
        with open(fname, "r") as graph_file:
            graph = json.load(graph_file)
        if not isinstance(graph, ht.GraphFrame.Graph):
            raise ValueError(f"Did not find a valid graph in ({fname}).")
        return graph

    @staticmethod
    def read_params(path):
        data = {}
        try:
            fname = os.path.join(path, SuperGraph._FILENAMES["params"])
            LOGGER.info(f"[Read] {fname}")
            for line in open(fname, "r"):
                for num in line.strip().split(","):
                    split_num = num.split("=")
                    data[split_num[0]] = split_num[1]

        except Exception as e:
            LOGGER.critical(f"Failed to read parameter file: {e}")

        return data

    @staticmethod
    def read_aux(path):
        data = {}
        try:
            fname = os.path.join(path, SuperGraph._FILENAMES["aux"])
            LOGGER.info(f"[Read] {fname}")
            with open(fname, "r") as fptr:
                data = json.load(fptr)
        except Exception as e:
            LOGGER.critical(f"Failed to read aux file: {e}")

        return data

    # --------------------------------------------------------------------------
    def write(self, path=None, write_df=True, write_graph=False, write_nxg=True):
        """
        Write the SuperGraph (refer _FILENAMES for file name mapping).
        """
        if not write_df and not write_graph and not write_nxg:
            return

        if path is None:
            path = self.dir_path

        LOGGER.info(f"Writing SuperGraph to ({path})")
        if write_df:
            SuperGraph.write_df(path, self.dataframe)

        if write_graph:
            SuperGraph.write_graph(path, super().tree(color=False))

        if write_nxg:
            SuperGraph.write_nxg(path, self.nxg)

    def read(self, path, read_graph=False):
        """
        Read the SuperGraph (refer _FILENAMES for file name mapping).
        """
        if path is None:
            path = self.dir_path

        LOGGER.info(f"Reading SuperGraph from ({path})")

        self.dataframe = None
        self.nxg = None
        self.graph = None

        if True:
            self.dataframe = SuperGraph.read_df(path)

        if True:
            self.nxg = SuperGraph.read_nxg(path)

        if read_graph:
            self.graph = SuperGraph.read_graph(path)

        if self.config["read_parameter"]:
            self.parameters = SuperGraph.read_params(path)

        if True:
            self.auxiliary_data = SuperGraph.read_aux(path)

    # -------------------------------------------------------------------------
    # create a graph frame directly from the config
    @staticmethod
    def from_config(name, config):
        """
        Uses config file to create a graphframe.
        """
        profile_format = config["parameter_props"]["profile_format"][name]
        data_path = config["parameter_props"]["data_path"][name]
        data_path = os.path.join(config["data_path"], data_path)

        LOGGER.info(f"Creating SuperGraph ({name}) from ({data_path}) using ({profile_format}) format")

        if profile_format not in SuperGraph._FORMATS:
            raise ValueError(f"Invalid profile format: {profile_format}")

        gf = None
        if profile_format == "hpctoolkit":
            gf = ht.GraphFrame.from_hpctoolkit(data_path)

        elif profile_format == "caliper":
            grouping_attribute = "function"
            default_metric = "sum(sum#time.duration), inclusive_sum(sum#time.duration)"
            query = "select function,%s group by %s format json-split" % (
                default_metric,
                grouping_attribute,
            )
            gf = ht.GraphFrame.from_caliper(data_path, query=query)

        elif profile_format == "caliper_json":
            gf = ht.GraphFrame.from_caliper_json(data_path)

        elif profile_format == "gprof":
            gf = ht.GraphFrame.from_gprof_dot(data_path)

        elif profile_format == "literal":
            gf = ht.GraphFrame.from_literal(data_path)

        elif profile_format == "lists":
            gf = ht.GraphFrame.from_lists(data_path)

        assert gf is not None
        return gf

    # --------------------------------------------------------------------------
    # SuperGraph.dataframe api
    # --------------------------------------------------------------------------
    def df_reset_index(self):
        self.dataframe.reset_index(drop=False, inplace=True)

    def df_columns(self):
        return self.dataframe.columns

    def df_get_proxy(self, column):
        return self.proxy_columns.get(column, column)

    def df_add_time_proxies(self):
        for key, proxies in SuperGraph._METRIC_PROXIES.items():
            if key in self.dataframe.columns:
                continue
            for _ in proxies:
                if _ in self.dataframe.columns:
                    self.proxy_columns[key] = _
                    break
            assert key in self.proxy_columns.keys()

        if len(self.proxy_columns) > 0:
            LOGGER.debug(f'created column proxies: {self.proxy_columns}')

    def df_get_column(self, column, index="name"):
        column = self.df_get_proxy(column)
        return self.dataframe.set_index(index)[column]

    def df_add_column(self, column_name, value=None, apply_func=None, apply_on="name"):

        assert (value is None) != (apply_func is None)
        if column_name in self.dataframe.columns:
            return

        if value is not None:
            assert isinstance(value, (int, float, str))
            LOGGER.debug(f'appending column \"{column_name}\" = \"{value}\"')
            self.dataframe[column_name] = value

        if apply_func is not None:
            assert callable(apply_func) and isinstance(apply_on, str)
            LOGGER.debug(f'appending column \"{column_name}\" = {apply_func}')
            self.dataframe[column_name] = self.dataframe[apply_on].apply(apply_func)

    def df_update_mapping(self, col_name, mapping, apply_on="name"):
        self.dataframe[col_name] = self.dataframe[apply_on].apply(
            lambda _: mapping[_] if _ in mapping.keys() else "")

    def df_count(self, column):
        column = self.df_get_proxy(column)
        return len(self.dataframe[column].unique())

    def df_minmax(self, column):
        column = self.df_get_proxy(column)
        return self.dataframe[column].min(), self.dataframe[column].max()

    def df_filter_by_value(self, column, value):
        assert isinstance(value, (int, float))
        column = self.df_get_proxy(column)
        df = self.dataframe.loc[self.dataframe[column] > value]
        return df[df["name"].isin(df["name"].unique())]

    def df_filter_by_name(self, names):
        assert isinstance(names, list)
        return self.dataframe[self.dataframe["name"].isin(names)]

    def df_lookup_with_column(self, column, value):
        column = self.df_get_proxy(column)
        return self.dataframe.loc[self.dataframe[column] == value]

    # HB removed the use of this function
    #def lookup_with_name(self, name):
    #    return self.df_lookup_with_column("name", name)

    # HB didnt find any use of this function
    #def lookup_with_node_name(self, node):
    #    return self.df_lookup_with_column("name", node.callpath[-1])

    # HB didnt find any use of this function
    #def lookup_with_vis_node_name(self, name):
    #    return self.df_lookup_with_column("vis_node_name", name)

    # HB didnt find any use of this function
    #def lookup(self, node):
    #    return self.dataframe.loc[
    #        (self.dataframe["name"] == node.callpath[-1]) & (self.dataframe["nid"] == node.nid)
    #        ]

    def df_get_top_by_attr(self, count, sort_attr):
        assert isinstance(count, int) and isinstance(sort_attr, str)
        assert count > 0

        df = self.dataframe.groupby(["name"]).mean()
        df = df.sort_values(by=[sort_attr], ascending=False)
        df = df.nlargest(count, sort_attr)
        return df.index.values.tolist()

    # --------------------------------------------------------------------------
    # callflow.graph utilities.
    # --------------------------------------------------------------------------
    @staticmethod
    def hatchet_graph_to_nxg(ht_graph):
        """
        Constructs a networkX graph from hatchet graph.
        """
        assert isinstance(ht_graph, ht.graph.Graph)

        from callflow.utils import sanitize_name, node_dict_from_frame

        def _get_node_name(nd):
            nm = sanitize_name(nd["name"])
            if nd.get("line") != "NA" and nd.get("line") is not None:
                nm += ":" + str(nd.get("line"))
            return nm

        # `node_dict_from_frame` converts the hatchet's frame to a dictionary
        nxg = nx.DiGraph()
        for root in ht_graph.roots:
            node_gen = root.traverse()

            # root_dict = node_dict_from_frame(root.frame)
            # root_name = root_dict["name"]
            # root_paths = root.paths()
            node = root

            try:
                while node:

                    # node_dict = node_dict_from_frame(node.frame)
                    # node_name = node_dict["name"]

                    # Get all node paths from hatchet.
                    node_paths = node.paths()

                    # Loop through all the node paths.
                    for node_path in node_paths:
                        if len(node_path) >= 2:
                            src_node = node_dict_from_frame(node_path[-2])
                            trg_node = node_dict_from_frame(node_path[-1])

                            src_name = _get_node_name(src_node)
                            trg_name = _get_node_name(trg_node)
                            nxg.add_edge(src_name, trg_name)

                    node = next(node_gen)

            except StopIteration:
                pass
            finally:
                del root

        return nxg

    # --------------------------------------------------------------------------
    # callflow.nxg utilities.
    # --------------------------------------------------------------------------
    @staticmethod
    def add_prefix(graph, prefix):
        """
        Rename graph to obtain disjoint node labels
        """
        assert isinstance(graph, nx.DiGraph)
        if prefix is None:
            return graph

        def label(x):
            if isinstance(x, str):
                name = prefix + x
            else:
                name = prefix + repr(x)
            return name

        return nx.relabel_nodes(graph, label)

    @staticmethod
    def tailhead(edge):
        return (edge[0], edge[1])

    @staticmethod
    def tailheadDir(edge, edge_direction):
        return (str(edge[0]), str(edge[1]), edge_direction[edge])

    @staticmethod
    def leaves_below(nxg, node):
        assert isinstance(nxg, nx.DiGraph)
        return set(
            sum(
                (
                    [vv for vv in v if nxg.out_degree(vv) == 0]
                    for k, v in nx.dfs_successors(nxg, node).items()
                ),
                [],
            )
        )

    # -------------------------------------------------------------------------
    # TODO:
    def get_module_name(self, callsite):
        """
        Get the module name for a callsite.
        Note: The module names can be specified using the config file.
        If such a mapping exists, this function returns the module based on mapping. Else, it queries the graphframe for a module name.

        Return:
            module name (str) - Returns the module name
        """
        if "callsite_module_map" in self.config:
            if callsite in self.config["callsite_module_map"]:
                return self.config["callsite_module_map"][callsite]

        if "module" in self.df_columns():
            return self.df_lookup_with_column("name", callsite)["module"].unique()[0]
            #return self.lookup_with_name(callsite)["module"].unique()[0]
        else:
            return callsite

    # ------------------------------------------------------------------------
    # The next block of functions attach the calculated result to the variable `gf`.
    def process_gf(self):
        """
        Process graphframe to add properties depending on the format.
        Current processing is supported for hpctoolkit and caliper.

        Note: Process class follows a builder pattern.
        (refer: https://en.wikipedia.org/wiki/Builder_pattern#:~:text=The%20builder%20pattern%20is%20a,Gang%20of%20Four%20design%20patterns.)
        """

        # LOGGER.warning('>>>>>> before processing\n {}'.format(self.dataframe))

        profile_format = self.config["parameter_props"]["profile_format"][self.name]
        if profile_format == "hpctoolkit":

            process = (
                Process.Builder(self, self.name)
                    .add_path()
                    .create_name_module_map()
                    .add_callers_and_callees()
                    .add_dataset_name()
                    .add_imbalance_perc()
                    .add_module_name_hpctoolkit()
                    .add_vis_node_name()
                    .build()
            )

        elif profile_format == "caliper_json" or profile_format == "caliper":
            if "callsite_module_map" in self.config:
                process = (
                    Process.Builder(self, self.name)
                        .add_time_columns()
                        .add_rank_column()
                        .add_callers_and_callees()
                        .add_dataset_name()
                        .add_imbalance_perc()
                        .add_module_name_caliper(self.config["callsite_module_map"])
                        .create_name_module_map()
                        .add_vis_node_name()
                        .add_path()
                        .build()
                )
            else:
                process = (
                    Process.Builder(self, self.name)
                        .add_time_columns()
                        .add_rank_column()
                        .add_callers_and_callees()
                        .add_dataset_name()
                        .add_imbalance_perc()
                        .create_name_module_map()
                        .add_vis_node_name()
                        .add_path()
                        .build()
                )

        elif profile_format == "gprof":
            process = (
                Process.Builder(self, self.name)
                    .add_nid_column()
                    .add_time_columns()
                    .add_rank_column()
                    .add_callers_and_callees()
                    .add_dataset_name()
                    .add_imbalance_perc()
                    .create_name_module_map()
                    .add_vis_node_name()
                    .add_path()
                    .build()
            )

        self = process.gf

    def group_gf_sg(self, group_by="module"):
        """
        Group the graphframe based on `group_by` parameter.
        """
        self = Group(self, group_by).gf

    def filter_gf_sg(self, mode="single"):
        """
        Filter the graphframe.
        """
        self = Filter(
            gf=self,
            mode=mode,
            filter_by=self.config["filter_by"],
            filter_perc=float(self.config["filter_perc"]),
        ).gf

    def filter_gf(self, filter_by, filter_val):
        self.dataframe = self.df_filter_by_value(filter_by, filter_val)

        callsites = self.dataframe["name"].unique()
        nxg = nx.DiGraph()

        if filter_by == "time (inc)":
            for edge in self.nxg.edges():
                # If source is present in the callsites list
                if edge[0] in callsites and edge[1] in callsites:
                    nxg.add_edge(edge[0], edge[1])
                else:
                    LOGGER.debug(f"Removing the edge: {edge}")

        elif filter_by == "time":
            for callsite in callsites:
                path = self.df_lookup_with_column("name", callsite)["path"].tolist()[0]
                path = make_list(path)
                nxg.add_path(path)

        self.nxg = nxg

    # --------------------------------------------------------------------------
    def ensemble_auxiliary(
        self, datasets, MPIBinCount=20, RunBinCount=20, process=True, write=True
    ):
        LOGGER.error('ensemble_auxiliary() is blocked!')
        return

        EnsembleAuxiliary(
            self,
            datasets=datasets,
            props=self.config,
            MPIBinCount=MPIBinCount,
            RunBinCount=RunBinCount,
            process=process,
        )

    def single_auxiliary(self, dataset="", binCount=20, process=True):
        LOGGER.error('single_auxiliary() is blocked!')
        return
        SingleAuxiliary(
            self,
            dataset=dataset,
            props=self.config,
            MPIBinCount=binCount,
            process=process,
        )
