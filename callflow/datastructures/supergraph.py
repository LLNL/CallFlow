# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------
"""
CallFlow's data structure to construct Super Graphs.
"""
import os
import json
import numpy as np
import pandas as pd
import hatchet as ht
import networkx as nx
from ast import literal_eval as make_list

from callflow import get_logger
from callflow.utils.sanitizer import Sanitizer
from callflow.utils.utils import NumpyEncoder
from callflow.utils.df import *
from .metrics import FILE_FORMATS, METRIC_PROXIES, TIME_COLUMNS

LOGGER = get_logger(__name__)


# ------------------------------------------------------------------------------
class SuperGraph(ht.GraphFrame):
    """
    SuperGraph data structure
    """
    _FILENAMES = {
        "ht": "hatchet_tree.txt",
        "df": "df.pkl",
        "nxg": "nxg.json",
        "env_params": "env_params.txt",
        "aux": "aux-{}.npz",
    }

    # --------------------------------------------------------------------------
    def __init__(self, name):
        """
        Constructor to SuperGraph
        :param name: SuperGraph's tag.
        """
        assert isinstance(name, str)

        self.nxg = None

        self.name = name  # dataset name
        self.profile_format = ""

        self.parameters = {}
        self.auxiliary_data = {}
        self.proxy_columns = {}
        self.callers = {}
        self.callees = {}
        self.paths = {}
        self.hatchet_nodes = {}
        self.indexes = []

        self.modules = []
        self.callsite_module_map = {}
        self.module_callsite_map = {}

        #self.is_module_map = False
        #self.is_module_in_dataframe = False

    # --------------------------------------------------------------------------
    def __str__(self):
        """SuperGraph string representation"""
        return f"SuperGraph<{self.name}; df = {self.dataframe.shape}>"

    def __repr__(self):
        """SuperGraph string representation"""
        return self.__str__()

    # --------------------------------------------------------------------------
    def create(self, path, profile_format, module_callsite_map: dict = {}) -> None:
        """
        Create SuperGraph from basic information. It does the following:
            1. Using the config object, it constructs the Hatchet GraphFrame.
            2. Creates a NetworkX graph from the Hatchet GraphFrame.Graph.
            3. Add time proxies.
            4. Attempts to construct module callsite mapping, if information exists.
            5. Resets the indexes of the dataframe,
            6. Sanitizes the call site names and paths.

        :param path: Path to data
        :param profile_format: Format of data
        :param module_callsite_map: Module callsite mapping
        :return:
        """
        self.profile_format = profile_format
        LOGGER.info(f"Creating SuperGraph ({self.name}) from ({path}) "
                    f"using ({self.profile_format}) format")

        gf = SuperGraph.from_config(path, self.profile_format)
        assert isinstance(gf, ht.GraphFrame)
        assert gf.graph is not None
        super().__init__(gf.graph, gf.dataframe, gf.exc_metrics, gf.inc_metrics)

        self.nxg = self.hatchet_graph_to_nxg(self.graph)

        # ----------------------------------------------------------------------
        # graph-related operations
        for node in self.graph.traverse():
            node_name = Sanitizer.from_htframe(node.frame)
            self.hatchet_nodes[node_name] = node
            self.paths[node_name] = node.paths()
            self.callers[node_name] = [_.frame.get("name") for _ in node.parents]
            self.callees[node_name] = [_.frame.get("name") for _ in node.children]

        # ----------------------------------------------------------------------
        # Hatchet requires node and rank to be indexes.
        # remove the indexes to maintain consistency.
        self.indexes = list(self.dataframe.index.names)
        self.df_reset_index()

        # ----------------------------------------------------------------------
        LOGGER.info(f'Loaded dataframe: {self.dataframe.shape}, '
                    f'columns = {list(self.dataframe.columns)}')

        # add time proxies and modules
        self.add_time_proxies()
        self.add_modules(module_callsite_map)

        # add new columns to the dataframe
        self.df_add_nid_column()
        #self.df_add_column("rank", value=0)
        #self.df_add_column("dataset", value=self.name)
        self.df_add_column("callees", apply_func=lambda _: self.callees[_])
        self.df_add_column("callers", apply_func=lambda _: self.callers[_])
        self.df_add_column("path", apply_func=lambda _: [[
            Sanitizer.from_htframe(_f) for _f in f] for f in self.paths[_]][0])

        # ----------------------------------------------------------------------
        # TODO: For faster searches, bring this back.
        # self.indexes.insert(0, 'dataset')
        # self.dataframe.set_index(self.indexes, inplace=True, drop=True)

        LOGGER.info(f'Processed dataframe: {self.dataframe.shape}, '
                    f'columns = {list(self.dataframe.columns)}')

        # ----------------------------------------------------------------------

    # --------------------------------------------------------------------------
    def load(
        self, path, read_graph=False, read_parameter=False, read_aux=False
    ) -> None:
        """
        Load the SuperGraph class from reading .callflow data.

        :param path: (str) Path to .callflow directory.
        :param read_graph: (bool) Read the graph, default is False.
        :param read_parameter: (bool) Read parameters, default is False.
        :param read_aux: (bool) Read auxiliary data, default is True.
        :return:
        """
        LOGGER.info(f"Creating SuperGraph ({self.name}) from ({path})")
        self.dataframe = None
        self.nxg = None
        self.graph = None

        if True:
            self.dataframe = SuperGraph.read_df(path)
            #self.is_module_in_dataframe = "module" in self.dataframe

        if True:
            self.nxg = SuperGraph.read_nxg(path)

        if read_graph:
            self.graph = SuperGraph.read_graph(path)

        if read_parameter:
            self.parameters = SuperGraph.read_env_params(path)

        if read_aux:
            self.auxiliary_data = SuperGraph.read_aux(path)
            self.modules = self.auxiliary_data["moduleFctList"]

        # ----------------------------------------------------------------------
        self.add_time_proxies()
        self.df_reset_index()

    # --------------------------------------------------------------------------
    def add_modules(self, module_callsite_map={}):

        has_modules_in_df = "module" in self.dataframe.columns
        has_modules_in_map = len(module_callsite_map) > 0
        assert not (has_modules_in_df and has_modules_in_map)

        # ----------------------------------------------------------------------
        # if dataframe already has modules
        if has_modules_in_df:
            LOGGER.info('Found \"module\" column in the dataframe')
            self.module_callsite_map = self.df_mod2callsite()
            self.callsite_module_map = self.df_callsite2mod()

        # ----------------------------------------------------------------------
        # use the given module-callsite map
        elif has_modules_in_map:
            LOGGER.info('Found user-specified module_callsite_map')

            self.module_callsite_map = module_callsite_map
            self.callsite_module_map = {}

            for m, clist in self.module_callsite_map.items():
                for c in clist:
                    self.callsite_module_map[c] = m

            self.df_add_column("module",
                               apply_func=lambda _: self.callsite_module_map[_])

        # ----------------------------------------------------------------------
        else:
            LOGGER.info('No module map found. Defaulting to "module=callsite"')
            self.df_add_column("module",
                               apply_func=lambda _: Sanitizer.sanitize(_),
                               apply_on="name")

        # ----------------------------------------------------------------------
        self.modules = np.array(self.df_factorize_column("module", sanitize=True))

    # --------------------------------------------------------------------------
    def add_time_proxies(self):
        """

        :return:
        """
        for key, proxies in METRIC_PROXIES.items():
            if key in self.dataframe.columns:
                continue
            for _ in proxies:
                if _ in self.dataframe.columns:
                    self.proxy_columns[key] = _
                    break
            assert key in self.proxy_columns.keys()

        if len(self.proxy_columns) > 0:
            LOGGER.info(f"created column proxies: {self.proxy_columns}")

    # --------------------------------------------------------------------------
    def write(
        self, path, write_df=True, write_graph=False, write_nxg=True, write_aux=True
    ):
        """
        Write the SuperGraph (refer _FILENAMES for file name mapping).

        :param path: path to write the files. (.callflow directory)
        :param write_df: (bool) write dataframe
        :param write_graph: (bool) write graph
        :param write_nxg: (bool) write networkX graph
        :param write_aux: (bool) write auxiliary data
        :return:
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
            #if self.name in list(self.auxiliary_data.keys()):
            if self.name == 'ensemble':
                for k, v in self.auxiliary_data.items():
                    SuperGraph.write_aux(path, v, k)
            else:
                SuperGraph.write_aux(path, self.auxiliary_data, self.name)

    # --------------------------------------------------------------------------
    # SuperGraph.dataframe api
    # --------------------------------------------------------------------------
    def summary(self):

        cols = list(self.dataframe.columns)
        result = {"ncallsites": self.df_count("name"),
                  "nmodules": self.df_count("module"), # if "module" in cols else 0,
                  "nranks": self.df_count("rank") if "rank" in cols else 1,
                  "nedges": len(self.nxg.edges())}

        for p in TIME_COLUMNS:
            result[p] = self.df_minmax(p)

        return result

    # --------------------------------------------------------------------------
    # added these functions to support auxiliary
    # we need this
    def df_mod2callsite(self, modules = None):

        if modules is None:
            modules = self.df_unique("module")
        else:
            assert isinstance(modules, (list, np.ndarray))

        return {_: df_lookup_and_list(self.dataframe, "module", _, "name")
                for _ in modules}

    def df_callsite2mod(self, callsites = None):

        if callsites is None:
            callsites = self.df_unique("name")
        else:
            assert isinstance(callsites, (list, np.ndarray))

        map = {}
        for _ in callsites:
            mod_idx = df_lookup_and_list(self.dataframe, "name", _, "module")
            assert mod_idx.shape[0] in [0, 1]
            if mod_idx.shape[0] == 1:
                map[_] = mod_idx[0]
        return map

    # --------------------------------------------------------------------------
    # (Not documented)
    # TODO: CAL-65: Move to utils directory
    def df_reset_index(self):
        """

        :return:
        """
        self.dataframe.reset_index(drop=False, inplace=True)

    def df_columns(self):
        """

        :return:
        """
        return self.dataframe.columns

    def df_get_proxy(self, column):
        """

        :param column:
        :return:
        """
        return self.proxy_columns.get(column, column)

    def df_get_column(self, column, index="name"):
        """

        :param column:
        :param index:
        :return:
        """
        column = self.df_get_proxy(column)
        return self.dataframe.set_index(index)[column]

    def df_add_column(self, column_name, value=None, apply_func=None, apply_on="name"):
        """

        :param column_name:
        :param value:
        :param apply_func:
        :param apply_on:
        :return:
        """

        assert (value is None) != (apply_func is None)
        if column_name in self.dataframe.columns:
            return

        if value is not None:
            assert isinstance(value, (int, float, str))
            LOGGER.debug(f'appending column "{column_name}" = "{value}"')
            self.dataframe[column_name] = value

        if apply_func is not None:
            assert callable(apply_func) and isinstance(apply_on, str)
            LOGGER.debug(f'appending column "{column_name}" = {apply_func}')
            self.dataframe[column_name] = self.dataframe[apply_on].apply(apply_func)

    # TODO: merge this with the function above
    def df_add_nid_column(self):
        """

        :return:
        """
        if "nid" in self.dataframe.columns:
            return
        self.dataframe["nid"] = self.dataframe.groupby("name")["name"].transform(
            lambda x: pd.factorize(x)[0]
        )

    def df_update_mapping(self, col_name, mapping, apply_on="name"):
        """

        :param col_name:
        :param mapping:
        :param apply_on:
        :return:
        """
        self.dataframe[col_name] = self.dataframe[apply_on].apply(
            lambda _: mapping[_] if _ in mapping.keys() else ""
        )

    def df_unique(self, column):
        """

        :param column:
        :return:
        """
        column = self.df_get_proxy(column)
        return self.dataframe[column].unique()

    def df_count(self, column):
        """

        :param column:
        :return:
        """
        return len(self.df_unique(column))

    def df_minmax(self, column):
        """

        :param column:
        :return:
        """
        column = self.df_get_proxy(column)
        return self.dataframe[column].min(), self.dataframe[column].max()

    def df_filter_by_value(self, column, value):
        """

        :param column:
        :param value:
        :return:
        """
        assert isinstance(value, (int, float))
        column = self.df_get_proxy(column)
        df = self.dataframe.loc[self.dataframe[column] > value]
        return df[df["name"].isin(df["name"].unique())]

    def df_filter_by_name(self, names):
        """

        :param names:
        :return:
        """
        assert isinstance(names, list)
        return self.dataframe[self.dataframe["name"].isin(names)]

    def df_filter_by_search_string(self, column, search_strings):
        """

        :param column:
        :param search_strings:
        :return:
        """
        unq, ids = np.unique(self.dataframe[column], return_inverse=True)
        unq_ids = np.searchsorted(unq, search_strings)
        mask = np.isin(ids, unq_ids)
        return self.dataframe[mask]

    def df_lookup_with_column(self, column, value):
        """

        :param column:
        :param value:
        :return:
        """
        column = self.df_get_proxy(column)
        return self.dataframe.loc[self.dataframe[column] == value]

    def df_group_by(self, columns):
        """

        :param columns:
        :return:
        """
        if isinstance(columns, list):
            return self.dataframe.groupby(columns)
        else:
            assert isinstance(columns, str)
            return self.dataframe.groupby([columns])

    def df_get_top_by_attr(self, count, sort_attr):
        """

        :param count:
        :param sort_attr:
        :return:
        """
        assert isinstance(count, int) and isinstance(sort_attr, str)
        assert count > 0

        df = self.dataframe.groupby(["name"]).mean()
        df = df.sort_values(by=[sort_attr], ascending=False)
        df = df.nlargest(count, sort_attr)
        return df.index.values.tolist()

    def df_factorize_column(self, column, sanitize=False):
        """

        :param column:
        :param sanitize:
        :return:
        """
        column = self.df_get_proxy(column)
        # Sanitize column name.
        if sanitize:
            self.dataframe[column] = self.dataframe[column].apply(
                lambda _: Sanitizer.sanitize(_)
            )
        _fct = self.dataframe[column].factorize()
        self.dataframe[column] = _fct[0]
        return _fct[1].values.tolist()

    def df_xs_group_column(self, df, groups, name, column, apply_func):
        """

        :param df:
        :param groups:
        :param name:
        :param column:
        :param apply_func:
        :return:
        """
        # module_df = df.groupby(groups).mean()
        module_df = df.groupby(groups).apply(apply_func)
        return module_df.xs(name, level=column)

    # --------------------------------------------------------------------------
    # SuperGraph.graph utilities.
    # --------------------------------------------------------------------------
    # TODO: CAL-65: Move to utils directory
    @staticmethod
    def hatchet_graph_to_nxg(ht_graph):
        """
        Constructs a networkX graph from hatchet graph.

        :param ht_graph:
        :return:
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

    def get_module_idx(self, module):
        """
        Get module index of a given module.
        :param module:
        :return:
        """
        # TODO: CAL-53
        # If it is not in the module_fct_list, it means its a node with a cycle.
        # This might be the correct way to go, but lets place a quick fix by
        # comparing the strings...
        # if module not in self.modules:
        #     self.modules.append(module)
        #     return len(self.modules)

        if "=" in module:
            module = module.split("=")[0]

        return self.modules.index(module)

    # --------------------------------------------------------------------------
    # Create GraphFrame methods
    # --------------------------------------------------------------------------
    @staticmethod
    def from_config(data_path, profile_format):
        """
        Create a GraphFrame directly from the data_path and profile_format.

        :param data_path: path to data
        :param profile_format: Profile format
        :return gf: GraphFrame
        """
        if profile_format not in FILE_FORMATS:
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
    # static read/write functionality
    # --------------------------------------------------------------------------
    # TODO: CAL-66: Clean up unnecessary writing and reading functions.
    @staticmethod
    def write_df(path, df):
        """

        :param path:
        :param df:
        :return:
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["df"])
        LOGGER.debug(f"Writing ({fname})")

        ext = os.path.splitext(SuperGraph._FILENAMES["df"])[-1]
        if '.csv' == ext:
            df.to_csv(fname)
        elif '.pkl' == ext:
            df.to_pickle(fname)

    @staticmethod
    def write_nxg(path, nxg):
        """

        :param path:
        :param nxg:
        :return:
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["nxg"])
        LOGGER.debug(f"Writing ({fname})")
        nxg_json = nx.readwrite.json_graph.node_link_data(nxg)
        with open(fname, "w") as fptr:
            json.dump(nxg_json, fptr, indent=2)

    @staticmethod
    def write_graph(path, graph_str):
        """

        :param path:
        :param graph_str:
        :return:
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["ht"])
        LOGGER.debug(f"Writing ({fname})")
        with open(fname, "w") as fptr:
            fptr.write(graph_str)

    @staticmethod
    def write_aux(path, data, name):
        """

        :param path:
        :param data:
        :return:
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["aux"].format(name))
        LOGGER.debug(f"Writing ({fname})")

        ext = os.path.splitext(SuperGraph._FILENAMES["aux"])[-1]
        if '.json' == ext:
            with open(fname, "w") as f:
                json.dump(data, f, cls=NumpyEncoder)
        elif '.npz' == ext:
            np.savez_compressed(fname, **data)
        else:
            assert False

    @staticmethod
    def read_df(path):
        """

        :param path:
        :return:
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["df"])
        LOGGER.debug(f"Reading ({fname})")

        df = None
        ext = os.path.splitext(SuperGraph._FILENAMES["df"])[-1]
        if '.csv' == ext:
            df = pd.read_csv(fname)
        elif '.pkl' == ext:
            df = pd.read_pickle(fname)

        if df is None or df.empty:
            raise ValueError(f"Did not find a valid dataframe in ({fname}).")
        return df

    @staticmethod
    def read_nxg(path):
        """

        :param path:
        :return:
        """
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
        """

        :param path:
        :return:
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["ht"])
        LOGGER.debug(f"Reading ({fname})")
        with open(fname, "r") as graph_file:
            graph = json.load(graph_file)
        if not isinstance(graph, ht.GraphFrame.Graph):
            raise ValueError(f"Did not find a valid graph in ({fname}).")
        return graph

    @staticmethod
    def read_aux(path, name):
        """

        :param path:
        :return:
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["aux"].format(name))
        LOGGER.debug(f"Reading ({fname})")

        data = {}
        ext = os.path.splitext(SuperGraph._FILENAMES["aux"])[-1]
        try:
            if '.json' == ext:
                with open(fname, "r") as fptr:
                    data = json.load(fptr)
            elif '.npz' == ext:
                data = np.load(fname, allow_pickle=True)['aux_data'].item()

        except Exception as e:
            LOGGER.critical(f"Failed to read aux file: {e}")
        return data

    @staticmethod
    def read_env_params(path):
        """

        :param path:
        :return:
        """
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

    # --------------------------------------------------------------------------
    # functionality related to modules
    # --------------------------------------------------------------------------
    def get_module(self, callsite):
        """
        If such a mapping exists, this function returns the module based on
        mapping. Else, it queries the graphframe for a module name.

        :param callsite (str): call site
        :return (str): module for a call site
        """
        return self.module_map[callsite]

    def prc_construct_module_callsite_map(
        self, module_callsite_map={}, from_df=True
    ) -> dict:
        """
        Construct the module map for a given dataset.
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

    '''
    # --------------------------------------------------------------------------
    # Processing functions attach the calculated result to the GraphFrame.
    # --------------------------------------------------------------------------
    def process(self, module_map={}) -> None:
        """
        Process GraphFrame to add properties depending on the format.
        Current processing is supported for hpctoolkit and caliper.

        :param module_map: Module call site mapping
        :return: None
        """

        # add new columns to the dataframe
        self.df_add_column("dataset", value=self.name)
        self.df_add_column("rank", value=0)
        self.df_add_nid_column()
        self.df_add_column("callees", apply_func=lambda _: self.callees[_])
        self.df_add_column("callers", apply_func=lambda _: self.callers[_])

        if "module" in self.dataframe.columns:
            self.df_add_column("module",
                               apply_func=lambda _: Sanitizer.sanitize(_),
                               apply_on="module")

        elif len(module_map) > 0:
            self.df_add_column("module",
                               apply_func=lambda _: module_map[_])

        else:
            self.df_add_column("module",
                               apply_func=lambda _: _,
                               apply_on="name")

        self.module_fct_list = self.df_factorize_column("module", sanitize=True)
        self.df_add_column("path",
                           apply_func=lambda _: [[
                               Sanitizer.from_htframe(_f) for _f in f]
                               for f in self.paths[_]][0])

        # TODO: For faster searches, bring this back.
        # self.indexes.insert(0, 'dataset')
        # self.dataframe.set_index(self.indexes, inplace=True, drop=True)
    '''

    def filter_sg(self, filter_by, filter_val) -> None:
        """
        In-place filtering on the NetworkX Graph.

        :param filter_by: filter by value at "time" and "time (inc)".
        :param filter_val: filter threshold
        :return: None
        """
        LOGGER.debug(f'Filtering {self.__str__()}: "{filter_by}" <= {filter_val}')
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

    def filter_by_datasets(self, selected_runs):
        """
        Filter by the selected runs
        :param selected_runs: Array of dataset tag names.
        :return: runs
        """
        # TODO: This code is repeated in modules/auxiliary.py.
        # Move to a instance method of SuperGraph.
        if selected_runs is not None:
            runs = selected_runs
            self.dataframe = self.df_filter_by_search_string("dataset", runs)

        else:
            runs = [self.name]
            self.dataframe = self.dataframe

        return runs

    # --------------------------------------------------------------------------
