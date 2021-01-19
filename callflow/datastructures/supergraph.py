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
from scipy.stats import kurtosis, skew
from ast import literal_eval as make_list

from callflow import get_logger
from callflow.utils.sanitizer import Sanitizer

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

    _GROUP_MODES = ["name", "module"]
    _FILTER_MODES = ["time", "time (inc)"]

    # --------------------------------------------------------------------------
    def __init__(self, name):#, config):

        assert isinstance(name, str) # and isinstance(config, dict)

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
        self.name_module_map = None
        self.module_map = None

        # TODO: can we remove "config" from supergraph?
        #self.config = config
        #self.dir_path = os.path.join(self.config["save_path"], self.name)

    # --------------------------------------------------------------------------
    def __str__(self):
        return f"SuperGraph<{self.name}; df = {self.dataframe.shape}>"

    def __repr__(self):
        return self.__str__()

    # --------------------------------------------------------------------------
    def create(self, path, profile_format):

        self.profile_format = profile_format
        LOGGER.info(f"Creating SuperGraph ({self.name}) from ({path}) using ({self.profile_format}) format")

        gf = SuperGraph.from_config(path, self.profile_format)
        assert isinstance(gf, ht.GraphFrame)
        assert gf.graph is not None
        super().__init__(gf.graph, gf.dataframe, gf.exc_metrics, gf.inc_metrics)

        self.nxg = self.hatchet_graph_to_nxg(self.graph)

        # ----------------------------------------------------------------------
        self.df_add_time_proxies()

        # Hatchet requires node and rank to be indexes.
        # remove the set indexes to maintain consistency.
        self.df_reset_index()
        # ----------------------------------------------------------------------

        '''
        ## TODO: read/create module map here!
        if "callsite_module_map" in self.config:
            print (self.config["callsite_module_map"])
            exit ()
        '''

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

        if read_parameter: #self.config["read_parameter"]:
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
            SuperGraph.write_aux(path, self.aux.auxiliary_data)

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



    # --------------------------------------------------------------------------
    # callflow.graph utilities.
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
        fname = os.path.join(os.path.join(path, SuperGraph._FILENAMES["nxg"]))
        LOGGER.debug(f"Writing ({fname})")
        nxg_json = nx.readwrite.json_graph.node_link_data(nxg)
        with open(fname, "w") as fptr:
            json.dump(nxg_json, fptr, indent=2)

    @staticmethod
    def write_graph(path, graph_str):
        fname = os.path.join(os.path.join(path, SuperGraph._FILENAMES["ht"]))
        LOGGER.debug(f"Writing ({fname})")
        with open(fname, "w") as fptr:
            fptr.write(graph_str)

    @staticmethod
    def write_aux(path, data):
        with open(os.path.join(os.path.join(path, SuperGraph._FILENAMES["aux"])), "w") as f:
            json.dump(data, f)

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
    def read_params(path):
        data = {}
        try:
            fname = os.path.join(path, SuperGraph._FILENAMES["params"])
            LOGGER.debug(f"Reading ({fname})")
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
            LOGGER.debug(f"Reading ({fname})")
            with open(fname, "r") as fptr:
                data = json.load(fptr)
        except Exception as e:
            LOGGER.critical(f"Failed to read aux file: {e}")

        return data

    # --------------------------------------------------------------------------
    def prc_add_vis_node_name(self):
        self.module_group_df = self.dataframe.groupby(["module"])
        self.module_callsite_map = self.module_group_df["name"].unique()

        self.name_group_df = self.dataframe.groupby(["name"])
        self.callsite_module_map = self.name_group_df["module"].unique().to_dict()

        self.df_add_column('vis_node_name',
                           apply_func=lambda _:
                           Sanitizer.sanitize(self.callsite_module_map[_][0]) + "=" + _)

    def prc_add_path(self):

        map_node_count = len(self.paths.keys())
        df_node_count = self.df_count("name")

        if map_node_count != df_node_count:
            raise Exception(f"Unmatched Preprocessing maps: "
                            f"Map contains: {map_node_count} nodes, "
                            f"graph contains: {df_node_count} nodes")

        # TODO: see if this function needs to be pulled in from utils
        from callflow.utils.utils import path_list_from_frames
        self.df_add_column('path',
                           apply_func=lambda _: path_list_from_frames(self.paths[_]))

    def prc_add_imbalance_perc(self):

        # compute these metrics
        metrics = ['imbalance_perc', 'std_deviation', 'skewness', 'kurtosis']

        # compute for these columns
        column_names = ["time (inc)", "time"]

        # name the new columns as these
        column_labels = ["inclusive", "exclusive"]

        # proxy columns for required columns
        column_proxies = [self.df_get_proxy(_) for _ in column_names]

        metrics_dict = {}
        for node_name in self.dataframe["name"].unique():

            node_df = self.df_lookup_with_column("name", node_name)
            node_dfsz = len(node_df.index)

            metrics_dict[node_name] = {}
            for i, _proxy in enumerate(column_proxies):
                _data = node_df[_proxy]

                _mean, _max = _data.mean(), _data.max()
                _perc = (_max - _mean) / _mean if not np.isclose(_mean, 0.) else _max
                _std = np.std(_data, ddof=1) if node_dfsz > 1 else 0.
                _skew = skew(_data)
                _kert = kurtosis(_data)

                # same order as metrics (not ideal, but OK)
                metrics_dict[node_name][column_names[i]] = {}
                for j, _val in enumerate([_perc, _std, _skew, _kert]):
                    metrics_dict[node_name][column_names[i]][metrics[j]] = _val

        # now, add these columns to the data frame
        for metric_key, col_suffix in zip(column_names, column_labels):
            for metric in metrics:
                self.df_add_column(f'{metric}_{col_suffix}',
                                   apply_func=lambda _: metrics_dict[_][metric_key][metric])

    # --------------------------------------------------------------------------
    def prc_create_name_module_map(self):
        self.df_add_column("module", apply_func=lambda _: _)
        self.name_module_map = self.dataframe.groupby(["name"])["module"]\
            .unique().to_dict()

    def prc_add_module_name_caliper(self, module_map):
        self.df_add_column('module', apply_func=lambda _: module_map[_])

    def prc_add_module_name_hpctoolkit(self):
        self.df_add_column('module',
                           apply_func=lambda _: Sanitizer.sanitize(_),
                           apply_on='module')

    def add_module_name_caliper(self, module_map):
        self.df_add_column('module', apply_func=lambda _: module_map[_])

    # TODO: needs to be cleaned
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
            # return self.lookup_with_name(callsite)["module"].unique()[0]
        else:
            return callsite

    # --------------------------------------------------------------------------
    # The next block of functions attach the calculated result to the variable `gf`.
    def process_sg(self, module_map={}):
        """
        Process graphframe to add properties depending on the format.
        Current processing is supported for hpctoolkit and caliper.

        Note: Process class follows a builder pattern.
        (refer: https://en.wikipedia.org/wiki/Builder_pattern#:~:text=The%20builder%20pattern%20is%20a,Gang%20of%20Four%20design%20patterns.)
        """

        # ----------------------------------------------------------------------
        # copied from Builder.__init__()
        # TODO: should go in create/load?
        for node in self.graph.traverse():
            node_name = Sanitizer.from_htframe(node.frame)
            self.hatchet_nodes[node_name] = node
            self.paths[node_name] = node.paths()
            self.callers[node_name] = [_.frame.get("name") for _ in node.parents]
            self.callees[node_name] = [_.frame.get("name") for _ in node.children]

        # ----------------------------------------------------------------------
        # add new columns to the dataframe
        self.df_add_column('dataset', value=self.name)
        self.df_add_column('rank', value=0)
        self.df_add_nid_column()
        self.df_add_column('callees', apply_func=lambda _: self.callees[_])
        self.df_add_column('callers', apply_func=lambda _: self.callers[_])

        # ----------------------------------------------------------------------
        # TODO: check if we need to be so profile-specific!
        if self.profile_format == "hpctoolkit":
            self.prc_create_name_module_map()
            self.prc_add_module_name_hpctoolkit()

        elif self.profile_format in ["caliper_json", "caliper"]:
            if len(module_map) > 0:
                self.module_map = module_map
                self.prc_add_module_name_caliper(self.module_map)
            #if "callsite_module_map" in self.config:
            #    self.prc_add_module_name_caliper(self.config["callsite_module_map"])
            self.prc_create_name_module_map()

        elif self.profile_format == "gprof":
            self.prc_create_name_module_map()

        # ----------------------------------------------------------------------
        # TODO: these need more processing.
        #  figure out if they need to store member variables
        self.prc_add_imbalance_perc()
        self.prc_add_vis_node_name()
        self.prc_add_path()

        # ----------------------------------------------------------------------
        '''
        # copied from Process
        # ----------------------------------------------------------------------
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

        #self = process.gf
        '''

    # --------------------------------------------------------------------------
    def todelete_group_sg(self, group_by="module"):
        """
        Group the graphframe based on `group_by` parameter.
        """
        #self = Group(self, group_by).gf
        assert group_by in SuperGraph._GROUP_MODES

        # ----------------------------------------------------------------------
        # Group.__init__
        self.callsite_module_map = self.df_get_column("module", "name").to_dict()
        self.callsite_path_map = self.df_get_column("path", "name").to_dict()

        # Variables used by grouping operation.
        self.entry_funcs = {}
        self.other_funcs = {}

        # ----------------------------------------------------------------------
        # Group.compute
        # TODO: this is doing in-place
        group_path = {}
        component_path = {}
        component_level = {}
        entry_func = {}
        show_node = {}
        node_name = {}
        module = {}
        change_name = {}

        LOGGER.debug(
            f"Nodes: {len(self.nxg.nodes())}, Edges: {len(self.nxg.edges())}"
        )

        for idx, edge in enumerate(self.nxg.edges()):
            snode = edge[0]
            tnode = edge[1]

            if "/" in snode:
                snode = snode.split("/")[-1]
            if "/" in tnode:
                tnode = tnode.split("/")[-1]

            spath = self.callsite_path_map[snode]
            tpath = self.callsite_path_map[tnode]

            temp_group_path_results = self.create_group_path(spath)
            group_path[snode] = temp_group_path_results

            component_path[snode] = self.create_component_path(spath, group_path[snode])
            component_level[snode] = len(component_path[snode])

            temp_group_path_results = self.create_group_path(tpath)
            group_path[tnode] = temp_group_path_results

            component_path[tnode] = self.create_component_path(tpath, group_path[tnode])
            component_level[tnode] = len(component_path[tnode])

            if component_level[snode] == 2:
                entry_func[snode] = True
                show_node[snode] = True
            else:
                entry_func[snode] = False
                show_node[snode] = False

            node_name[snode] = self.callsite_module_map[snode] + "=" + snode

            if component_level[tnode] == 2:
                entry_func[tnode] = True
                show_node[tnode] = True
            else:
                entry_func[tnode] = False
                show_node[tnode] = False

            node_name[tnode] = self.callsite_module_map[snode] + "=" + tnode

        # update the graph
        self.df_update_mapping("group_path", group_path)
        self.df_update_mapping("component_path", component_path)
        self.df_update_mapping("show_node", entry_func)
        self.df_update_mapping("vis_name", node_name)
        self.df_update_mapping("component_level", component_level)
        # self.df_update_mapping("mod_index", module_idx)
        self.df_update_mapping("entry_function", entry_func)

    def todelete_create_group_path(self, path):
        if isinstance(path, str):
            path = make_list(path)
        group_path = []
        prev_module = None
        for idx, callsite in enumerate(path):
            if idx == 0:
                # Assign the first callsite as from_callsite and not push into an array.
                from_callsite = callsite
                from_module = self.callsite_module_map[from_callsite]

                # Store the previous module to check the hierarchy later.
                prev_module = from_module

                # Create the entry function and other functions dict.
                if from_module not in self.entry_funcs:
                    self.entry_funcs[from_module] = []
                if from_module not in self.other_funcs:
                    self.other_funcs[from_module] = []

                # Push into entry function dict since it is the first callsite.
                self.entry_funcs[from_module].append(from_callsite)

                # Append to the group path.
                group_path.append(from_module + "=" + from_callsite)

            elif idx == len(path) - 1:
                # Final callsite in the path.
                to_callsite = callsite
                if "/" in to_callsite:
                    to_callsite = to_callsite.split("/")[-1]

                to_module = self.callsite_module_map[to_callsite]

                if prev_module != to_module:
                    group_path.append(to_module + "=" + to_callsite)

                if to_module not in self.entry_funcs:
                    self.entry_funcs[to_module] = []
                if to_module not in self.other_funcs:
                    self.other_funcs[to_module] = []

                if to_callsite not in self.other_funcs[to_module]:
                    self.other_funcs[to_module].append(to_callsite)

                if to_callsite not in self.entry_funcs[to_module]:
                    self.entry_funcs[to_module].append(to_callsite)
            else:
                # Assign the from and to callsite.
                from_callsite = path[idx - 1]
                if "/" in callsite:
                    to_callsite = callsite.split("/")[-1]
                else:
                    to_callsite = callsite

                from_module = self.callsite_module_map[from_callsite]
                to_module = self.callsite_module_map[to_callsite]

                # Create the entry function and other function dict if not already present.
                if to_module not in self.entry_funcs:
                    self.entry_funcs[to_module] = []
                if to_module not in self.other_funcs:
                    self.other_funcs[to_module] = []

                # if previous module is not same as the current module.
                if to_module != prev_module:
                    # TODO: Come back and check if it is in the path.
                    if to_module in group_path:
                        prev_module = to_module
                    else:
                        group_path.append(to_module + "=" + to_callsite)
                        prev_module = to_module
                        if to_callsite not in self.entry_funcs[to_module]:
                            self.entry_funcs[to_module].append(to_callsite)

                elif to_module == prev_module:
                    to_callsite = callsite
                    # to_module = self.entire_df.loc[self.entire_df['name'] == to_callsite]['module'].unique()[0]
                    to_module = self.callsite_module_map[to_callsite]

                    prev_module = to_module

                    if to_callsite not in self.other_funcs[to_module]:
                        self.other_funcs[to_module].append(to_callsite)

        return group_path

    def todelete_create_component_path(self, path, group_path):
        component_path = []
        component_module = group_path[len(group_path) - 1].split("=")[0]

        for idx, node in enumerate(path):
            node_func = node
            if "/" in node:
                node = node.split("/")[-1]
            module = self.callsite_module_map[node]
            if component_module == module:
                component_path.append(node_func)

        component_path.insert(0, component_module)
        return tuple(component_path)

    # --------------------------------------------------------------------------
    def todelete_filter_sg_sg(self, mode="single"):
        """
        Filter the graphframe.
        """
        # TODO: remove "mode" argument
        '''
        self = Filter(
            gf=self,
            mode=mode,
            filter_by=self.config["filter_by"],
            filter_perc=float(self.config["filter_perc"]),
        ).gf
        '''
        assert 0
        # ----------------------------------------------------------------------
        filter_by = self.config["filter_by"]
        filter_perc = float(self.config["filter_perc"])
        assert filter_by in SuperGraph._FILTER_MODES
        assert 0. <= filter_perc <= 100.

        # ----------------------------------------------------------------------
        # compute the min/max
        # TODO: these variables were defined as members of Filter operation
        # do we need them here in SuperGraph?
        # self.set_max_min_times()
        _mn, _mx = self.df_minmax("time (inc)")
        self.min_time_inc_list = np.array([_mn])
        self.max_time_inc_list = np.array([_mx])

        _mn, _mx = self.df_minmax("time")
        self.min_time_exc_list = np.array([_mn])
        self.max_time_exc_list = np.array([_mx])

        LOGGER.info(f"Min. time (inc): {self.min_time_inc_list}")
        LOGGER.info(f"Max. time (inc): {self.max_time_inc_list}")
        LOGGER.info(f"Min. time (exc): {self.min_time_exc_list}")
        LOGGER.info(f"Max. time (exc): {self.max_time_exc_list}")

        self.max_time_inc = np.max(self.max_time_inc_list)
        self.min_time_inc = np.min(self.min_time_inc_list)
        self.max_time_exc = np.max(self.max_time_exc_list)
        self.min_time_exc = np.min(self.min_time_exc_list)

        # ----------------------------------------------------------------------
        if filter_by == "time (inc)":
            value = filter_perc * 0.01 * self.max_time_inc
            LOGGER.debug(f"[Filter] By \"{filter_by}\": {filter_perc} % ==> {value}")
            self.filter_sg(filter_by, value)
            # self.gf.df = self.df_by_time_inc()
            # self.gf.nxg = self.graph_by_time_inc()

        elif filter_by == "time":
            value = filter_perc
            LOGGER.debug(f"[Filter] By \"{filter_by}\": {filter_perc} % ==> {value}")
            self.filter_sg(filter_by, value)
            # self.gf.df = self.df_by_time()
            # self.gf.nxg = self.graph_by_time()

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
    '''
    def auxiliary_gf_sg(self):
        self.aux = Auxiliary(supergraph=self)
        self = Auxiliary(supergraph=self)
    '''
