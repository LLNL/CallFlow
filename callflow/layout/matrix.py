# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

"""
CallFlow's Matrix layout API.
"""
import networkx as nx

# CallFlow imports
import callflow
from callflow.utils.timer import Timer
from callflow.utils.sanitizer import Sanitizer


class MatrixLayout:
    """
    Node link layout computation
    """

    _COLUMNS = ["time (inc)", "time", "name", "group"]

    def __init__(self, sg, selected_runs=None):
        """
        Constructor for node link layout.
        :param sg: SuperGraph
        :param selected_runs: Array of SuperGraphs to consider
        """
        assert isinstance(sg, (callflow.SuperGraph, callflow.EnsembleGraph))

        # set the current graph being rendered.
        self.sg = sg

        self.timer = Timer()

        self.time_exc = self.sg.df_get_proxy("time")
        self.time_inc = self.sg.df_get_proxy("time (inc)")

        # Do not filter if the selected_runs is a single run.
        if not isinstance(sg, callflow.SuperGraph):
            sg.nxg_filter_by_datasets(selected_runs)

        self.runs = selected_runs
        self.nxg = sg.nxg

        # Add node and edge attributes.
        self._add_node_attributes()
        self._add_edge_attributes()

        print(self.nxg.nodes(data=True))
        print(self.nxg.edges(data=True))

    # --------------------------------------------------------------------------
    @staticmethod
    def _mean(df, metric):
        import math

        time = df[metric].mean()
        if math.isnan(time):
            time = 0
        return time

    def _add_node_attributes(self):  # noqa: C901
        """
        Add node attributes to the nxg.
        :return: None
        """
        # compute data map
        datamap = {}
        for callsite in self.nxg.nodes():
            for column in MatrixLayout._COLUMNS:
                if column not in datamap:
                    datamap[column] = {}

                callsite_idx = self.sg.get_idx(callsite, "callsite")
                _df = self.sg.df_lookup_with_column("name", callsite_idx)

                if column == "time (inc)":
                    datamap[column][callsite] = MatrixLayout._mean(_df, self.time_inc)
                elif column == "time":
                    datamap[column][callsite] = MatrixLayout._mean(_df, self.time_exc)
                elif column == "name":
                    datamap[column][callsite] = callsite
                elif column == "group":
                    datamap["group"][callsite] = self.sg.get_module(callsite_idx)

        # ----------------------------------------------------------------------
        for idx, key in enumerate(datamap):
            nx.set_node_attributes(self.nxg, name=key, values=datamap[key])

    # --------------------------------------------------------------------------
    def _add_edge_attributes(self):
        """
        Add edge attributes to nxg.
        :return: None
        """
        source = None
        orientation = None
        is_directed = self.nxg.is_directed()

        edge_counter = {}

        for start_node in self.nxg.nbunch_iter(source):
            for edge in nx.edge_dfs(self.nxg, start_node, orientation):

                tail, head = MatrixLayout._tailhead(edge, is_directed, orientation)

                if edge not in edge_counter:
                    edge_counter[edge] = 0

                if tail == head:
                    edge_counter[edge] += 1
                else:
                    edge_counter[edge] = 1

        # ----------------------------------------------------------------------
        nx.set_edge_attributes(self.nxg, name="count", values=edge_counter)

    # --------------------------------------------------------------------------
    @staticmethod
    def _create_nxg_from_paths(paths):
        """

        :param paths:
        :return:
        """
        assert isinstance(paths, list)

        nxg = nx.DiGraph()

        # go over all path
        for i, path in enumerate(paths):

            # go over the callsites in this path
            plen = len(path)

            for j in range(plen - 1):
                source = Sanitizer.sanitize(path[j])
                target = Sanitizer.sanitize(path[j + 1])

                if not nxg.has_edge(source, target):
                    nxg.add_edge(source, target)

        return nxg

    @staticmethod
    def _tailhead(edge, is_directed, orientation=None):
        """

        :param edge:
        :param is_directed:
        :param orientation:
        :return:
        """
        # Probably belongs on graphframe?
        # definitaly also used in supergraph
        assert isinstance(edge, tuple)
        assert len(edge) == 2
        assert isinstance(is_directed, bool)
        # assert isinstance(orientation, (NoneType,str))

        if not is_directed or orientation in [None, "original"]:
            return edge[0], edge[1]
        elif orientation == "reverse":
            return edge[1], edge[0]
        elif orientation == "ignore" and edge[-1] == "reverse":
            return edge[1], edge[0]
        return edge[0], edge[1]

    # --------------------------------------------------------------------------
