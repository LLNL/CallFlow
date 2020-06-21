# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

# ----------------------------------------------------------------------------
# Library imports
import os
import pandas as pd
import hatchet as ht
import networkx as nx

# -----------------------------------------------------------------------------
# CallFlow imports
import callflow
LOGGER = callflow.get_logger(__name__)

#------------------------------------------------------------------------------
class GraphFrame (ht.GraphFrame):

    _FILENAMES = {'ht': 'hatchet_tree.txt',
                 'df': 'df.csv',
                 'nxg': 'nxg.json'}

    # ------------------------------------------------------------------------
    def __init__(self, graph=None, dataframe=None, exc_metrics=None, inc_metrics=None):
        """
        Constructs a callflow.GraphFrame object.
        """

        # TODO: will we ever want to create a graphframe without data?
        if graph is not None and dataframe is not None:
            super().__init__(graph, dataframe, exc_metrics, inc_metrics)

            # shortcut!
            self.df = self.dataframe

        if graph:
            self.nxg = self.hatchet_graph_to_nxg(graph)


    # -------------------------------------------------------------------------
    def write(self, path, write_df=True, write_graph=False, write_nxg=True):
        """
        Write the GraphFrame as separate files (refer _FILENAMES for file name mapping).
        """

        if not write_df and not write_graph and not write_nxg:
            return

        import json
        LOGGER.info("Writing graphframe to ({0})".format(path))

        # dump the filtered dataframe to csv if write_df is true.
        if write_df:
            self.df.to_csv(os.path.join(path, GraphFrame._FILENAMES['df']))

        if write_graph:
            fname = os.path.join(os.path.join(path, GraphFrame._FILENAMES['ht']))
            with open(fname, 'w') as fptr:
                fptr.write(super().tree(color=False))

        if write_nxg:
            fname = os.path.join(os.path.join(path, GraphFrame._FILENAMES['nxg']))
            with open(fname, 'w') as fptr:
                nxg = nx.readwrite.json_graph.node_link_data(self.nxg)
                json.dump(nxg, fptr, indent=2)

    def read(self, path, read_graph=False):
        """
        Read the GraphFrame from .callflow directory (refer _FILENAMES for file name mapping).
        """
        import json
        LOGGER.info("Reading graphframe from ({0})".format(path))

        # TODO: this function should not use assertions
        # but throw "ArgumentError" if file is not found, or data is not as expected
        fname = os.path.join(path, GraphFrame._FILENAMES['df'])
        self.df = pd.read_csv(fname)
        if self.df.empty:
            raise ValueError(f"{fname} is empty.")

        # Hatchet requires node and rank to be indexes.
        # remove the set indexes to maintain consistency.
        self.df = self.df.set_index(['node', 'rank'])
        self.df = self.df.reset_index(drop=False)


        fname = os.path.join(path, GraphFrame._FILENAMES['nxg'])
        with open(fname, "r") as nxg_file:
            graph = json.load(nxg_file)
            self.nxg = nx.readwrite.json_graph.node_link_graph(graph)
            assert self.nxg != None


        self.graph = None
        if read_graph:
            fname = os.path.join(path, GraphFrame._FILENAMES['ht'])
            with open(fname, "r") as graph_file:
                self.graph = json.load(graph_file)

            assert isinstance(graph, ht.GraphFrame.Graph)

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
    def from_config(config, name):
        """
        Uses config file to create a graphframe.
        """
        LOGGER.info(f"Creating graphframes: {name}")
        LOGGER.info(f"Data path: {config['data_path']}")

        if config["format"][name] == "hpctoolkit":
            gf = ht.GraphFrame.from_hpctoolkit(config["data_path"])

        elif config["format"][name] == "caliper":
            data_path = os.path.join(config["data_path"], config["paths"][name])
            gf = ht.GraphFrame.from_caliper(data_path, query="")

        elif config["format"][name] == "caliper_json":
            data_path = os.path.join(config["data_path"], config["paths"][name])
            gf = ht.GraphFrame.from_caliper(data_path, query="")

        elif config["format"][name] == "gprof":
            gf = ht.GraphFrame.from_grof_dot(config["data_path"])

        elif config["format"][name] == "literal":
            gf = ht.GraphFrame.from_literal(config["data_path"])

        elif config["format"][name] == "lists":
            gf = ht.GraphFrame.from_lists(config["data_path"])

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

        def _get_node_name(nd):
            nm = callflow.utils.sanitize_name(nd["name"])
            if nd["line"] != "NA":      nm += ":" + str(nd["line"])
            return nm

        # `node_dict_from_frame` converts the hatchet's frame to a dictionary
        from callflow.utils import node_dict_from_frame

        nxg = nx.DiGraph()
        for root in ht_graph.roots:
            node_gen = root.traverse()

            root_dict = node_dict_from_frame(root.frame)
            root_name = root_dict["name"]
            root_paths = root.paths()
            node = root

            try:
                while node:

                    node_dict = node_dict_from_frame(node.frame)
                    node_name = node_dict["name"]

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
            if is_string_like(x):   name = prefix + x
            else:                   name = prefix + repr(x)
            return name

        return nx.relabel_nodes(graph, label)

    @staticmethod
    def tailhead(edge):
        return (edge[0], edge[1])

    @staticmethod
    def tailheadDir(edge):
        return (str(edge[0]), str(edge[1]), self.edge_direction[edge])

    @staticmethod
    def leaves_below(nxg, node):
        assert isinstance(graph, nx.DiGraph)
        return set(sum(([vv for vv in v if nxg.out_degree(vv) == 0]
                            for k, v in nx.dfs_successors(nxg, node).items()),
                        [],))

    # --------------------------------------------------------------------------
    # callflow.df utilities
    def get_top_by_attr(self, count, sort_attr):
        assert isinstance(count, int) and isinstance(sort_attr, str)
        assert count > 0

        df = self.df.groupby(['name']).mean()
        df = df.sort_values(by=[sort_attr], ascending=False)
        df = df.nlargest(count, sort_attr)
        return df.index.values.tolist()

    def filter_by_name(self, names):
        assert isinstance(names, list)
        return self.df[self.df['name'].isin(names)]

    def lookup_with_node(self, node):
        return self.df.loc[self.df["name"] == node.callpath[-1]]

    def lookup_with_name(self, name):
        return self.df.loc[self.df["name"] == name]

    def lookup_with_vis_nodeName(self, name):
        return self.df.loc[self.df["vis_node_name"] == name]

    def lookup(self, node):
        return self.df.loc[ (self.df["name"] == node.callpath[-1]) &
                            (self.df["nid"]  == node.nid) ]

    def update_df(self, col_name, mapping):
        self.df[col_name] = self.df["name"].apply(
            lambda node: mapping[node] if node in mapping.keys() else "")

    # --------------------------------------------------------------------------
    @staticmethod
    def print_information(gf, top_n_callsites=10):
        # Print modules in the call graph.
        LOGGER.info("Modules: {0}".format(gf.df["module"].unique()))

        # Print top "N" callsites by inclusive time.
        LOGGER.info(f"Top {top_n_callsites} Inclusive time: ")
        rank_df = gf.df.groupby(["name", "nid"]).mean()
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
