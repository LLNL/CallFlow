# *******************************************************************************
# * Copyright (c) 2020, Lawrence Livermore National Security, LLC.
# * Produced at the Lawrence Livermore National Laboratory.
# *
# * Written by Suraj Kesavan <htpnguyen@ucdavis.edu>.
# *
# * LLNL-CODE-740862. All rights reserved.
# *
# * This file is part of CallFlow. For details, see:
# * https://github.com/LLNL/CallFlow
# * Please also read the LICENSE file for the MIT License notice.
# ******************************************************************************
# Library imports
import math
import pandas as pd
import networkx as nx

# CallFlow imports
import callflow
from callflow.timer import Timer

# CCT Rendering class.
class NodeLinkLayout_New:

    # --------------------------------------------------------------------------
    def __init__(self, graphframe):
        assert isinstance(graphframe, callflow.GraphFrame)
        self.gf = graphframe
        self.nxg = nx.DiGraph()

    # --------------------------------------------------------------------------
    def write_dot(self, filename="cct.dot"):
        from networkx.drawing.nx_agraph import write_dot

        write_dot(self.nxg, filename)

    # --------------------------------------------------------------------------
    def compute(self, filter_metric="",   # filter the CCT based on this metric
                                                  # empty string: no filtering
                      filter_count=50,    # filter to these many nodes
                ):

        assert isinstance(filter_metric, str)
        assert isinstance(filter_count, int)
        assert filter_count > 0

        timer = Timer()

        metrics = self.gf.get_metrics()
        cols = list(self.gf.df.columns)

        # does the dataframe contain module names?
        have_modules = "module" in cols

        # ----------------------------------------------------------------------
        # filter the dataframe if needed
        if filter_metric == "":
            filtered_df = self.gf.df
            filtered_callsites = list(filtered_df["name"].unique().to_dict().keys())

        else:
            if filter_metric not in metrics:
                raise ValueError(
                    "filter_metric = ({}) not found in dataframe".format(filter_metric)
                )

            filtered_callsites = list(
                self.gf.get_top_by_attr(filter_count, filter_metric)
            )
            filtered_df = self.gf.filter_by_name(filtered_callsites)

        # ----------------------------------------------------------------------
        # Create the graph (nodes and edges)
        with timer.phase("Creating CCT"):

            for node in self.gf.graph.traverse():
                if "function" != node.frame["type"]:
                    continue

                path = callflow.utils.path_list_from_frames(node.paths())
                for i in range(len(path) - 1):

                    source, target = path[i], path[i + 1]
                    if (
                        source not in filtered_callsites
                        or target not in filtered_callsites
                    ):
                        continue

                    source = callflow.utils.sanitize_name(source)
                    target = callflow.utils.sanitize_name(target)

                    if not self.nxg.has_edge(source, target):
                        self.nxg.add_edge(source, target)

        # ----------------------------------------------------------------------
        # Add node attributes.
        with timer.phase("Add node attributes"):

            module_map = {}

            # need to add these attributes to the nodes
            attr2add = metrics + ["name"]
            if have_modules:
                attr2add.append("module")
                for c in filtered_callsites:
                    module_map[c] = self.gf.get_module_name(c)

            # compute data map
            datamap = self.get_node_attrs_from_df(
                filtered_df, attr2add, filtered_callsites, module_map
            )
            for idx, key in enumerate(datamap):
                nx.set_node_attributes(self.nxg, name=key, values=datamap[key])

        # ----------------------------------------------------------------------
        # Add edge attributes.
        with timer.phase("Add edge counts"):

            # how many times does an edge exist?
            count_edge = {}

            # TODO: why starting from every node?
            # this should only be the root
            for start_node in self.nxg.nbunch_iter(source):
                for edge in nx.edge_dfs(self.nxg, start_node):
                    count_edge[edge] = count_edge.get(edge, 0) + 1

            nx.set_edge_attributes(self.nxg, name="count", values=count_edge)

        return self.nxg
        # ----------------------------------------------------------------------

    # --------------------------------------------------------------------------
    @staticmethod
    def get_node_attrs_from_df(dataframe, attr2add, callsites2add, module_map):

        assert isinstance(dataframe, pd.DataFrame)
        assert isinstance(attr2add, list)
        assert isinstance(callsites2add, list)
        assert isinstance(module_map, dict)

        have_modules = len(module_map) > 0

        # group the dataframe by module and name
        if have_modules:
            grouped_df = dataframe.groupby(["module", "name"])
        else:
            grouped_df = dataframe.groupby(["name"])

        # create data maps for each node (key = (attribute, callsite))
        node_data_maps = {}

        for attribute in attr2add:
            # TODO: this needs attention (why max?)
            attribute_map = grouped_df[attribute].max().to_dict()
            node_data_maps[attribute] = {}

            for callsite in callsites2add:
                if attribute == "name":
                    node_data_maps[attribute][callsite] = callsite
                elif attribute == "module":
                    node_data_maps[attribute][callsite] = module_map[callsite]
                elif have_modules:
                    if module_map[callsite] is not None:
                        node_data_maps[attribute][callsite] = attribute_map[
                            (module_map[callsite], callsite)
                        ]
                else:
                    node_data_maps[attribute][callsite] = attribute_map[callsite]

        return node_data_maps

    # --------------------------------------------------------------------------


class NodeLinkLayout:

    # TODO: delete this once the "new" get_node_attributes is testeed
    _COLUMNS = ["time (inc)", "time", "name", "module"]

    def __init__(
        self,
        graphframe,
        filter_metric="",  # filter the CCT based on this metric
        # empty string: no filtering!
        filter_count=50,
    ):  # filter to these many nodes

        assert isinstance(graphframe, callflow.GraphFrame)
        assert isinstance(filter_count, int)
        assert isinstance(filter_metric, str)
        assert filter_count > 0

        self.timer = Timer()

        # set the current graph being rendered.
        self.gf = graphframe

        # all the columns of this dataframe
        cols = list(self.gf.df.columns)

        # add paths if not already present
        # TODO: is this really needed?
        # should this be a local construct?
        if "path" not in cols:
            self.gf.add_paths()

        # Make this class support general metrics
        self.metrics = self.gf.get_metrics()

        # get a list of callsites to work with
        if filter_metric == "":
            df = self.gf.df

        else:
            if filter_metric not in self.metrics:
                raise ValueError(
                    "filter_metric = ({}) not found in dataframe".format(filter_metric)
                )
            callsites = list(self.gf.get_top_by_attr(filter_count, filter_metric))
            df = self.gf.filter_by_name(callsites)

        with self.timer.phase(f"Creating CCT."):
            self.nxg = NodeLinkLayout._create_nxg_from_paths(df["path"].tolist())

        # Number of runs in the state.
        # TODO: handle this better.
        if "dataset" in cols:
            self.runs = df["dataset"].unique()
        else:
            self.runs = []

        # Add node and edge attributes.
        with self.timer.phase("Add graph attributes"):
            self._add_node_attributes()
            self._add_edge_attributes()

        # Find cycles in the nxg.
        with self.timer.phase(f"Find cycles"):
            self.nxg.cycles = NodeLinkLayout._find_cycle(self.nxg)

        print(self.nxg.nodes())

    # --------------------------------------------------------------------------
    @staticmethod
    def _get_node_attrs_from_df(dataframe, attr2add, callsites2add, module_map):

        assert isinstance(dataframe, pd.DataFrame)
        assert isinstance(attr2add, list)
        assert isinstance(callsites2add, list)
        assert isinstance(module_map, dict)

        have_modules = len(module_map) > 0

        # group the dataframe by module and name
        if have_modules:
            grouped_df = dataframe.groupby(["module", "name"])
        else:
            grouped_df = dataframe.groupby(["name"])

        # create data maps for each node (key = (attribute, callsite))
        node_data_maps = {}

        for attribute in attr2add:
            attribute_map = grouped_df[attribute].max().to_dict()
            node_data_maps[attribute] = {}

            for callsite in callsites2add:
                if attribute == "name":
                    node_data_maps[attribute][callsite] = callsite
                elif attribute == "module":
                    node_data_maps[attribute][callsite] = module_map[callsite]
                elif have_modules:
                    node_data_maps[attribute][callsite] = attribute_map[
                        (module_map[callsite], callsite)
                    ]
                else:
                    node_data_maps[attribute][callsite] = attribute_map[callsite]

        return node_data_maps

    def _add_node_attributes(self):

        have_modules = "module" in list(self.gf.df.columns)

        # need to add these callsites (and their module map)
        callsites2add = list(self.nxg.nodes())
        module_map = {}

        # need to add these attributes to the nodes
        attr2add = self.metrics + ["name"]

        if have_modules:
            attr2add.append("module")
            for c in callsites2add:
                module_map[c] = self.gf.get_module_name(c)

        # ----------------------------------------------------------------------
        # compute data map
        datamap = self._get_node_attrs_from_df(
            self.gf.df, attr2add, callsites2add, module_map
        )
        for idx, key in enumerate(datamap):
            nx.set_node_attributes(self.nxg, name=key, values=datamap[key])

        # ----------------------------------------------------------------------
        # compute map across data
        for run in self.runs:
            target_df = self.gf.df.loc[self.gf.df["dataset"] == run]

            if have_modules:
                target_module_group_df = target_df.groupby(["module"])
                valid_callsites = list(
                    target_module_group_df["name"].unique().to_dict().keys()
                )
                callsites2add_run = [c for c in callsites2add if c in valid_callsites]

            datamap = self._get_node_attrs_from_df(
                target_df, attr2add, callsites2add_run, module_map
            )
            nx.set_node_attributes(self.nxg, name=run, values=datamap)

        # ----------------------------------------------------------------------

    # --------------------------------------------------------------------------
    # TODO: delete this once the original behavior is tested!
    def _add_node_attributes_v0(self):

        module_name_group_df = self.supergraph.gf.df.groupby(["module", "name"])
        name_time_inc_map = module_name_group_df["time (inc)"].max().to_dict()
        name_time_exc_map = module_name_group_df["time"].max().to_dict()

        # compute data map
        datamap = {}
        for callsite in self.nxg.nodes():

            module = self.supergraph.get_module_name(callsite)

            for column in NodeLinkLayout._COLUMNS:
                if column not in datamap:
                    datamap[column] = {}

                if column == "time (inc)":
                    datamap[column][callsite] = name_time_inc_map[(module, callsite)]
                elif column == "time":
                    datamap[column][callsite] = name_time_exc_map[(module, callsite)]
                elif column == "name":
                    datamap[column][callsite] = callsite
                elif column == "module":
                    datamap[column][callsite] = module

        # ----------------------------------------------------------------------
        for idx, key in enumerate(datamap):
            nx.set_node_attributes(self.nxg, name=key, values=datamap[key])

        # ----------------------------------------------------------------------
        # compute map across data
        for run in self.runs:
            target_df = self.supergraph.gf.df.loc[
                self.supergraph.gf.df["dataset"] == run
            ]
            target_module_group_df = target_df.groupby(["module"])
            target_module_name_group_df = target_df.groupby(["module", "name"])
            target_module_callsite_map = (
                target_module_group_df["name"].unique().to_dict()
            )
            target_name_time_inc_map = (
                target_module_name_group_df["time (inc)"].max().to_dict()
            )
            target_name_time_exc_map = (
                target_module_name_group_df["time"].max().to_dict()
            )

            datamap = {}
            for callsite in self.nxg.nodes():

                if callsite not in target_module_callsite_map.keys():
                    continue

                module = self.supergraph.get_module_name(callsite)

                if callsite not in datamap:
                    datamap[callsite] = {}

                for column in NodeLinkLayout._COLUMNS:

                    if column not in datamap:
                        datamap[column] = {}

                    if column == "time (inc)":
                        datamap[callsite][column] = target_name_time_inc_map[module]
                    elif column == "time":
                        datamap[callsite][column] = target_module_time_exc_map[module]
                    elif column == "module":
                        datamap[callsite][column] = module
                    elif column == "name":
                        datamap[callsite][column] = callsite

            # ------------------------------------------------------------------
            nx.set_node_attributes(self.nxg, name=run, values=datamap)

    # --------------------------------------------------------------------------
    def _add_edge_attributes(self):

        source = None
        orientation = None
        is_directed = self.nxg.is_directed()

        edge_counter = {}

        for start_node in self.nxg.nbunch_iter(source):
            for edge in nx.edge_dfs(self.nxg, start_node, orientation):

                tail, head = NodeLinkLayout._tailhead(edge, is_directed, orientation)

                if edge not in edge_counter:
                    edge_counter[edge] = 0

                if tail == head:
                    edge_counter[edge] += 1
                else:
                    edge_counter[edge] = 1

        # ----------------------------------------------------------------------
        nx.set_edge_attributes(self.nxg, name="count", values=edge_counter)

    # --------------------------------------------------------------------------
    # Reports the number of cycles in the callpaths.
    @staticmethod
    def _find_cycle(G, source=None, orientation=None):
        """
        if not G.is_directed() or orientation in (None, "original"):

            def tailhead(edge):
                return edge[:2]

        elif orientation == "reverse":

            def tailhead(edge):
                return edge[1], edge[0]

        elif orientation == "ignore":

            def tailhead(edge):
                if edge[-1] == "reverse":
                    return edge[1], edge[0]
                return edge[:2]
        """
        explored = set()
        cycle = []
        count = 0
        final_node = None
        is_directed = G.is_directed()
        for start_node in G.nbunch_iter(source):
            if start_node in explored:
                # No loop is possible.
                continue

            edges = []
            # All nodes seen in this iteration of edge_dfs
            seen = {start_node}
            # Nodes in active path.
            active_nodes = {start_node}
            previous_head = None

            for edge in nx.edge_dfs(G, start_node, orientation):
                # Determine if this edge is a continuation of the active path.
                tail, head = NodeLinkLayout._tailhead(edge, is_directed, orientation)
                if head in explored:
                    # Then we've already explored it. No loop is possible.
                    continue
                if previous_head is not None and tail != previous_head:
                    # This edge results from backtracking.
                    # Pop until we get a node whose head equals the current tail.
                    # So for example, we might have:
                    #  (0, 1), (1, 2), (2, 3), (1, 4)
                    # which must become:
                    #  (0, 1), (1, 4)
                    while True:
                        try:
                            popped_edge = edges.pop()
                        except IndexError:
                            edges = []
                            active_nodes = {tail}
                            break
                        else:
                            popped_head = NodeLinkLayout._tailhead(
                                popped_edge, is_directed, orientation
                            )[1]
                            active_nodes.remove(popped_head)

                        if edges:
                            # how can you pass a single element into tailhead?
                            last_head = NodeLinkLayout._tailhead(
                                edges[-1], is_directed, orientation
                            )[1]
                            if tail == last_head:
                                break
                edges.append(edge)

                if head in active_nodes:
                    # We have a loop!
                    cycle.extend(edges)
                    final_node = head
                    break
                else:
                    seen.add(head)
                    active_nodes.add(head)
                    previous_head = head

            if cycle:
                count += 1
                break
            else:
                explored.update(seen)

        else:
            assert len(cycle) == 0
            # raise nx.exception.NetworkXNoCycle('No cycle found.')

        # We now have a list of edges which ends on a cycle.
        # So we need to remove from the beginning edges that are not relevant.
        i = 0
        for i, edge in enumerate(cycle):
            tail, head = NodeLinkLayout._tailhead(edge, is_directed, orientation)
            if tail == final_node:
                break
        return cycle[i:]

    # --------------------------------------------------------------------------
    @staticmethod
    def _create_nxg_from_paths(paths):

        assert isinstance(paths, list)
        from ast import literal_eval as make_tuple

        nxg = nx.DiGraph()

        # go over all path
        for i, path in enumerate(paths):

            # go over the callsites in this path
            # TODO: for me, path is looking like a list
            if isinstance(path, list):
                callsites = path
            elif isinstance(path, str):
                callsites = make_tuple(path)

            plen = len(callsites)
            for j in range(plen - 1):
                source = callflow.utils.sanitize_name(callsites[j])
                target = callflow.utils.sanitize_name(callsites[j + 1])

                if not nxg.has_edge(source, target):
                    nxg.add_edge(source, target)
        return nxg

    @staticmethod
    def _tailhead(edge, is_directed, orientation=None):

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
