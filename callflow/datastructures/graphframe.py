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
LOGGER = get_logger(__name__)


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class GraphFrame(ht.GraphFrame):
    """
    Graph extends functionality of ht.GraphFrame and provides several utils.
    """
    # --------------------------------------------------------------------------
    _FORMATS = ["hpctoolkit", "caliper", "caliper_json", "gprof", "literal", "lists"]
    _FILENAMES = {"ht": "hatchet_tree.txt", "df": "df.csv", "nxg": "nxg.json"}
    _METRIC_PROXIES = {"time (inc)": ["inclusive#time.duration"],
                       "time": ["sum#time.duration", "sum#sum#time.duration"]}

    # ------------------------------------------------------------------------
    def __init__(self, graph=None, dataframe=None, exc_metrics=None, inc_metrics=None):
        """
        Constructs a callflow.GraphFrame object.
        """
        self.dataframe = None
        self.graph = None
        self.nxg = None
        self.proxy_columns = {}

        if graph is not None and dataframe is not None:
            super().__init__(graph, dataframe, exc_metrics, inc_metrics)

        if graph is not None:
            self.graph = graph
            self.nxg = self.hatchet_graph_to_nxg(graph)

        if dataframe is not None:
            self.dataframe = dataframe

        # TODO: need to remove this shortcut!
        # shortcut!
        self.df = self.dataframe

    # -------------------------------------------------------------------------
    def write(self, path, write_df=True, write_graph=False, write_nxg=True):
        """
        Write the GraphFrame as separate files (refer _FILENAMES for file name mapping).
        """
        if not write_df and not write_graph and not write_nxg:
            return

        LOGGER.info(f"Writing graphframe to ({path})")

        # dump the filtered dataframe to csv if write_df is true.
        if write_df:
            self.dataframe.to_csv(os.path.join(path, GraphFrame._FILENAMES["df"]))

        if write_graph:
            fname = os.path.join(os.path.join(path, GraphFrame._FILENAMES["ht"]))
            with open(fname, "w") as fptr:
                fptr.write(super().tree(color=False))

        if write_nxg:
            fname = os.path.join(os.path.join(path, GraphFrame._FILENAMES["nxg"]))
            with open(fname, "w") as fptr:
                nxg = nx.readwrite.json_graph.node_link_data(self.nxg)
                json.dump(nxg, fptr, indent=2)

    def read(self, path, read_graph=False):
        """
        Read the GraphFrame from .callflow directory (refer _FILENAMES for file name mapping).
        """
        LOGGER.info(f"Reading graphframe from ({path})")

        self.dataframe = None
        self.nxg = None
        self.graph = None

        if True:
            fname = os.path.join(path, GraphFrame._FILENAMES["df"])
            self.dataframe = pd.read_csv(fname)
            if self.dataframe is None or self.dataframe.empty:
                raise ValueError(f"Did not find a valid dataframe in ({fname}).")

            # Hatchet requires node and rank to be indexes.
            # remove the set indexes to maintain consistency.
            # self.dataframe = self.dataframe.set_index(['node', 'rank'])
            # self.dataframe = self.dataframe.reset_index(drop=False)
            self.df_reset_index()

        if True:
            fname = os.path.join(path, GraphFrame._FILENAMES["nxg"])
            with open(fname, "r") as nxg_file:
                graph = json.load(nxg_file)
                self.nxg = nx.readwrite.json_graph.node_link_graph(graph)
            if self.nxg is None:
                raise ValueError(f"Did not find a valid nxg in ({fname}).")

        if read_graph:
            fname = os.path.join(path, GraphFrame._FILENAMES["ht"])
            with open(fname, "r") as graph_file:
                self.graph = json.load(graph_file)
            if not isinstance(graph, ht.GraphFrame.Graph):
                raise ValueError(f"Did not find a valid graph in ({fname}).")

    # --------------------------------------------------------------------------
    # Hatchet's GraphFrame utilities.
    @staticmethod
    def from_hatchet(gf):
        """
        Promotes a hatchet graph frame to callflow graph frame
        """
        assert isinstance(gf, ht.GraphFrame)
        return GraphFrame(gf.graph, gf.dataframe, gf.exc_metrics, gf.inc_metrics)

    # create a graph frame directly from the config
    @staticmethod
    def from_config(name, config):
        """
        Uses config file to create a graphframe.
        """
        profile_format = config["parameter_props"]["profile_format"][name]
        data_path = config["parameter_props"]["data_path"][name]
        data_path = os.path.join(config["data_path"], data_path)

        LOGGER.info(f"Creating graphframe ({name}) from ({data_path}) using ({profile_format}) format")

        if profile_format not in GraphFrame._FORMATS:
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
        return GraphFrame.from_hatchet(gf)

    # --------------------------------------------------------------------------
    # --------------------------------------------------------------------------
    # callflow.graph utilities.
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

    # --------------------------------------------------------------------------
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
                path = self.df_lookup_with_column("name",callsite)["path"].tolist()[0]
                path = make_list(path)
                nxg.add_path(path)

        self.nxg = nxg

    # --------------------------------------------------------------------------
    # callflow.df utilities
    def df_reset_index(self):
        self.dataframe.reset_index(drop=False, inplace=True)

    def df_columns(self):
        return self.dataframe.columns

    def df_get_proxy(self, column):
        return self.proxy_columns.get(column, column)

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

    def df_add_time_proxies(self):
        for key, proxies in GraphFrame._METRIC_PROXIES.items():
            if key in self.dataframe.columns:
                continue
            for _ in proxies:
                if _ in self.dataframe.columns:
                    self.proxy_columns[key] = _
                    break
            assert key in self.proxy_columns.keys()

        if len(self.proxy_columns) > 0:
            LOGGER.debug(f'created column proxies: {self.proxy_columns}')

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

    def lookup_with_name(self, name):
        return self.df_lookup_with_column("name", name)

    def lookup_with_node_name(self, node):
        return self.df_lookup_with_column("name", node.callpath[-1])

    def lookup_with_vis_node_name(self, name):
        return self.df_lookup_with_column("vis_node_name", name)

    def lookup(self, node):
        return self.dataframe.loc[
            (self.dataframe["name"] == node.callpath[-1]) & (self.dataframe["nid"] == node.nid)
        ]

    def get_top_by_attr(self, count, sort_attr):
        assert isinstance(count, int) and isinstance(sort_attr, str)
        assert count > 0

        df = self.dataframe.groupby(["name"]).mean()
        df = df.sort_values(by=[sort_attr], ascending=False)
        df = df.nlargest(count, sort_attr)
        return df.index.values.tolist()

    def df_update_mapping(self, col_name, mapping):
        self.dataframe[col_name] = self.dataframe["name"].apply(
            lambda _: mapping[_] if _ in mapping.keys() else ""
        )

    def df_get_column(self, column, index="name"):
        column = self.df_get_proxy(column)
        return self.dataframe.set_index(index)[column]

    # --------------------------------------------------------------------------
    @staticmethod
    def print_information(gf, top_n_callsites=10):
        # Print modules in the call graph.
        LOGGER.info("Modules: {0}".format(gf.dataframe["module"].unique()))

        # Print top "N" callsites by inclusive time.
        LOGGER.info(f"Top {top_n_callsites} Inclusive time: ")
        rank_df = gf.dataframe.groupby(["name", "nid"]).mean()
        top_inclusive_df = rank_df.nlargest(top_n_callsites, "time (inc)", keep="first")
        for name, row in top_inclusive_df.iterrows():
            LOGGER.info("{0} [{1}]".format(name, row["time (inc)"]))

        # Print top "N" callsites by exclusive time.
        LOGGER.info(f"Top {top_n_callsites} Enclusive time: ")
        top_exclusive_df = rank_df.nlargest(top_n_callsites, "time", keep="first")
        for name, row in top_exclusive_df.iterrows():
            LOGGER.info("{0} [{1}]".format(name, row["time"]))

        # Print nodes in the nxg.
        LOGGER.info("Nodes in the CallGraph: {0}".format(len(gf.nxg.nodes)))
        for node in gf.nxg.nodes(data=True):
            LOGGER.info("Node: {0}".format(node))

        # Pring edges in the nxg.
        LOGGER.info("Edges in the CallGraph: {0}".format(len(gf.nxg.edges)))
        for edge in gf.nxg.edges():
            LOGGER.info("Edge: {0}".format(edge))
