# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import os
import json
import numpy as np
import pandas as pd
import hatchet as ht
import networkx as nx
from ast import literal_eval as make_list

from callflow import get_logger
from callflow.utils.sanitizer import Sanitizer
from callflow.utils.utils import NumpyEncoder, read_json

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
                  "env_params": "env_params.txt",
                  "aux": "auxiliary_data.json"}

    _METRIC_PROXIES = {"time (inc)": ["inclusive#time.duration"],
                       "time": ["sum#time.duration", "sum#sum#time.duration"]}

    _GROUP_MODES = ["name", "module"]
    _FILTER_MODES = ["time", "time (inc)"]

    # --------------------------------------------------------------------------
    def __init__(self, name):

        assert isinstance(name, str)

        self.nxg = None

        self.name = name        # dataset name
        self.profile_format = ''

        self.parameters = {}
        self.auxiliary_data = {}
        self.proxy_columns = {}
        self.callers = {}
        self.callees = {}
        self.paths = {}
        self.hatchet_nodes = {}
        self.callsite_module_map = None
        self.module_callsite_map = None
        self.module_fct_map = {}
        self.indexes = []

    # --------------------------------------------------------------------------
    def __str__(self):
        return f"SuperGraph<{self.name}; df = {self.dataframe.shape}>"

    def __repr__(self):
        return self.__str__()

    # --------------------------------------------------------------------------
    def create(self, path, profile_format, module_callsite_map):

        self.profile_format = profile_format
        LOGGER.info(f"Creating SuperGraph ({self.name}) from ({path}) using ({self.profile_format}) format")

        gf = SuperGraph.from_config(path, self.profile_format)
        assert isinstance(gf, ht.GraphFrame)
        assert gf.graph is not None
        super().__init__(gf.graph, gf.dataframe, gf.exc_metrics, gf.inc_metrics)

        self.nxg = self.hatchet_graph_to_nxg(self.graph)

        # ----------------------------------------------------------------------
        # df-related operations
        self.df_add_time_proxies()

        if len(module_callsite_map) > 0:
            self.module_callsite_map = self.prc_construct_module_callsite_map(module_callsite_map=module_callsite_map)

        if "module" in self.dataframe.columns:
            self.module_callsite_map = self.prc_construct_module_callsite_map()
            
        self.callsite_module_map = {}

        # Hatchet requires node and rank to be indexes.
        # remove the indexes to maintain consistency.
        self.indexes = list(self.dataframe.index.names)
        self.df_reset_index()

        # ----------------------------------------------------------------------
        # graph-related operations
        for node in self.graph.traverse():
            node_name = Sanitizer.from_htframe(node.frame)
            self.hatchet_nodes[node_name] = node
            self.paths[node_name] = node.paths()
            self.callers[node_name] = [_.frame.get("name") for _ in node.parents]
            self.callees[node_name] = [_.frame.get("name") for _ in node.children]

    # --------------------------------------------------------------------------
    def load(self, path, read_graph=False, read_parameter=False):
        # Load the SuperGraph (refer _FILENAMES for file name mapping).

        LOGGER.info(f"Creating SuperGraph ({self.name}) from ({path})")
        self.dataframe = None
        self.nxg = None
        self.graph = None

        if True:
            self.dataframe = SuperGraph.read_df(path)

        if True:
            self.nxg = SuperGraph.read_nxg(path)

        if read_graph:
            self.graph = SuperGraph.read_graph(path)

        if read_parameter:
            self.parameters = SuperGraph.read_params(path)

        if True:
            self.auxiliary_data = SuperGraph.read_aux(path)

        self.df_add_time_proxies()
        self.df_reset_index()

    # --------------------------------------------------------------------------
    def write(self, path, write_df=True, write_graph=False, write_nxg=True, write_aux=True):
        """
        Write the SuperGraph (refer _FILENAMES for file name mapping).
        """
        if not write_df and not write_graph and not write_nxg:
            return

        LOGGER.info(f"Writing SuperGraph to ({path})")
        if write_df:
            SuperGraph.write_df(path, self.dataframe)

        if write_graph:
            SuperGraph.write_graph(path, super().tree(color=False))

        if write_nxg:
            SuperGraph.write_nxg(path, self.nxg)

        if write_aux: 
            SuperGraph.write_aux(path, self.auxiliary_data)

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
                    self.df_add_column(key, apply_func=lambda _: _, apply_on=_)
                    #self.proxy_columns[key] = _
                    break
            #assert key in self.proxy_columns.keys()

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

    # TODO: merge this with the function above
    def df_add_nid_column(self):
        if "nid" in self.dataframe.columns:
            return
        self.dataframe["nid"] = self.dataframe.groupby("name")["name"]\
            .transform(lambda x: pd.factorize(x)[0])

    def df_update_mapping(self, col_name, mapping, apply_on="name"):
        self.dataframe[col_name] = self.dataframe[apply_on].apply(
            lambda _: mapping[_] if _ in mapping.keys() else "")

    def df_unique(self, column):
        column = self.df_get_proxy(column)
        return self.dataframe[column].unique()

    def df_count(self, column):
        return len(self.df_unique(column))

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

    def df_filter_by_search_string(self, column, search_strings):
        unq, ids = np.unique(self.dataframe[column], return_inverse=True)
        unq_ids = np.searchsorted(unq, search_strings)
        mask = np.isin(ids, unq_ids)
        return self.dataframe[mask]

    def df_lookup_with_column(self, column, value):
        column = self.df_get_proxy(column)
        return self.dataframe.loc[self.dataframe[column] == value]

    def df_group_by(self, columns):
        if isinstance(columns, list):
            return self.dataframe.groupby(columns)
        else:
            assert isinstance(columns, str)
            return self.dataframe.groupby([columns])

    def df_get_top_by_attr(self, count, sort_attr):
        assert isinstance(count, int) and isinstance(sort_attr, str)
        assert count > 0

        df = self.dataframe.groupby(["name"]).mean()
        df = df.sort_values(by=[sort_attr], ascending=False)
        df = df.nlargest(count, sort_attr)
        return df.index.values.tolist()
    
    def df_factorize_column(self, column, sanitize=False):
        column = self.df_get_proxy(column)
        # Sanitize column name.
        if sanitize:
            self.dataframe[column] = self.dataframe[column].apply(lambda _: Sanitizer.sanitize(_))
        _fct = self.dataframe[column].factorize()
        self.dataframe[column] = _fct[0]
        return _fct[1].values.tolist()

    # --------------------------------------------------------------------------
    # SuperGraph.graph utilities.
    # --------------------------------------------------------------------------
    @staticmethod
    def hatchet_graph_to_nxg(ht_graph):
        """
        Constructs a networkX graph from hatchet graph.
        """
        assert isinstance(ht_graph, ht.graph.Graph)

        nxg = nx.DiGraph()
        for root in ht_graph.roots:
            node_gen = root.traverse()
            node = root

            try:
                while node:

                    # Get all node paths from hatchet.
                    node_paths = node.paths()

                    # Loop through all the node paths.
                    for node_path in node_paths:
                        if len(node_path) >= 2:
                            src_name = Sanitizer.from_htframe(node_path[-2])
                            trg_name = Sanitizer.from_htframe(node_path[-1])
                            nxg.add_edge(src_name, trg_name)
                    node = next(node_gen)

            except StopIteration:
                pass
            finally:
                del root

        return nxg

    # --------------------------------------------------------------------------
    # static read/write functionality
    # --------------------------------------------------------------------------
    # create a graph frame directly from the config
    @staticmethod
    def from_config(data_path, profile_format):

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

    @staticmethod
    def write_df(path, df):
        fname = os.path.join(path, SuperGraph._FILENAMES["df"])
        LOGGER.debug(f"Writing ({fname})")
        df.to_csv(fname)

    @staticmethod
    def write_nxg(path, nxg):
        fname = os.path.join(path, SuperGraph._FILENAMES["nxg"])
        LOGGER.debug(f"Writing ({fname})")
        nxg_json = nx.readwrite.json_graph.node_link_data(nxg)
        with open(fname, "w") as fptr:
            json.dump(nxg_json, fptr, indent=2)

    @staticmethod
    def write_graph(path, graph_str):
        fname = os.path.join(path, SuperGraph._FILENAMES["ht"])
        LOGGER.debug(f"Writing ({fname})")
        with open(fname, "w") as fptr:
            fptr.write(graph_str)

    @staticmethod
    def write_aux(path, data):
        fname = os.path.join(path, SuperGraph._FILENAMES["aux"])
        LOGGER.debug(f"Writing ({fname})")
        with open(fname, "w") as f:
            json.dump(data, f, cls=NumpyEncoder)

    @staticmethod
    def read_df(path):
        fname = os.path.join(path, SuperGraph._FILENAMES["df"])
        LOGGER.debug(f"Reading ({fname})")
        df = pd.read_csv(fname)
        if df is None or df.empty:
            raise ValueError(f"Did not find a valid dataframe in ({fname}).")
        return df

    @staticmethod
    def read_nxg(path):
        fname = os.path.join(path, SuperGraph._FILENAMES["nxg"])
        LOGGER.debug(f"Reading ({fname})")
        with open(fname, "r") as nxg_file:
            graph = json.load(nxg_file)
            nxg = nx.readwrite.json_graph.node_link_graph(graph)
        if nxg is None:
            raise ValueError(f"Did not find a valid nxg in ({fname}).")
        return nxg

    @staticmethod
    def read_graph(path):
        fname = os.path.join(path, SuperGraph._FILENAMES["ht"])
        LOGGER.debug(f"Reading ({fname})")
        with open(fname, "r") as graph_file:
            graph = json.load(graph_file)
        if not isinstance(graph, ht.GraphFrame.Graph):
            raise ValueError(f"Did not find a valid graph in ({fname}).")
        return graph

    @staticmethod
    def read_env_params(path):
        data = {}
        try:
            fname = os.path.join(path, SuperGraph._FILENAMES["params"])
            LOGGER.debug(f"Reading ({fname})")
            for line in open(fname, "r"):
                for num in line.strip().split(","):
                    split_num = num.split("=")
                    data[split_num[0]] = split_num[1]
        except Exception as e:
            LOGGER.critical(f"Failed to read env_params file: {e}")
        return data

    @staticmethod
    def read_aux(path):
        data = {}
        try:
            fname = os.path.join(path, SuperGraph._FILENAMES["aux"])
            LOGGER.debug(f"Reading ({fname})")
            with open(fname, "r") as fptr:
                data = json.load(fptr)
        except Exception as e:
            LOGGER.critical(f"Failed to read aux file: {e}")

        return data

    def get_module(self, callsite):
        """If such a mapping exists, this function returns the module based on
        mapping. Else, it queries the graphframe for a module name.

        :param callsite (str): call site
        :return (str): module for a call site
        """
        return self.module_map[callsite]

    def prc_construct_module_callsite_map(self, module_callsite_map={}, from_df=True):
        """Construct the module map for a given dataset.
        Note: The module names can be specified using --module_map option.

        The file should contain the module name as the key, and a list of
        callsites to match on.

        TODO: expand the callsites using regex expressions

        :param module_map (bool):
        :param from_df (bool):

        Return:
            module name (str) - Returns the module name
        """
        if from_df:
            assert "module" in self.dataframe.columns
            _gdf = self.df_group_by(columns=["module"])
            return _gdf["name"].unique()

        if len(module_callsite_map) > 0:
            return module_callsite_map

    # --------------------------------------------------------------------------
    # The next block of functions attach the calculated result to the variable `gf`.
    def process(self, module_map={}):
        """
        Process graphframe to add properties depending on the format.
        Current processing is supported for hpctoolkit and caliper.
        """

        # ----------------------------------------------------------------------
        # add new columns to the dataframe
        self.df_add_column('dataset', value=self.name)
        self.df_add_column('rank', value=0)
        self.df_add_nid_column()
        self.df_add_column('callees', apply_func=lambda _: self.callees[_])
        self.df_add_column('callers', apply_func=lambda _: self.callers[_])

        if 'module' in self.dataframe.columns:
            self.df_add_column('module', apply_func=lambda _: Sanitizer.sanitize(_), apply_on='module')
        elif len(module_map) > 0:
            self.df_add_column('module', apply_func=lambda _: module_map[_])
        else:
            self.df_add_column('module', apply_func=lambda _: _, apply_on='name')

        self.module_fct_map = self.df_factorize_column('module')
        self.df_add_column('path',
                           apply_func=lambda _: [Sanitizer.from_htframe(f[0]) for f in self.paths[_]])
        
        # TODO: For faster searches, bring this back.
        # self.indexes.insert(0, 'dataset')
        # self.dataframe.set_index(self.indexes, inplace=True, drop=True)

    # --------------------------------------------------------------------------
    # in place filtering!
    def filter_sg(self, filter_by, filter_val):

        LOGGER.debug(f"Filtering {self.__str__()}: \"{filter_by}\" <= {filter_val}")
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
