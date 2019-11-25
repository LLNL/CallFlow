import networkx as nx
from logger import log
import math, json, utils
from ast import literal_eval as make_tuple


class DistGraph(nx.Graph):
    # Attributes:
    # 1. State => Pass the state which needs to be handled.
    # 2. path => '', 'path', 'group_path' or 'component_path'
    # 3. construct_graph -> To decide if we should construct graph from path
    # 4. add_data => To
    def __init__(
        self, state, path, group_by_attr="module", construct_graph=True, add_data=True
    ):
        super(DistGraph, self).__init__()
        self.state = state
        self.path = path
        self.df = self.state.df
        self.group_by = group_by_attr
        #         self.columns = ['time']
        self.columns = [
            "time (inc)",
            "group_path",
            "name",
            "time",
            "callers",
            "callees",
            "vis_name",
        ]

        if construct_graph:
            print("Creating a Graph for {0}.".format(self.state.name))
            self.g = nx.DiGraph()
            self.add_paths(path)
        else:
            print("Using the existing graph from state {0}".format(state.name))
            self.g = state.g

        self.adj_matrix = nx.adjacency_matrix(self.g)
        self.dense_adj_matrix = self.adj_matrix.todense()

        self.callbacks = []
        self.edge_direction = {}

        if add_data == True:
            self.add_node_attributes()
            for node in self.g.nodes(data=True):
                print(node)
        #             self.add_edge_attributes()
        else:
            print("Creating a Graph without node or edge attributes.")
        self.adj_matrix = nx.adjacency_matrix(self.g)
        self.dense_adj_matrix = self.adj_matrix.todense()

    def no_cycle_path(self, path):
        ret = []
        mapper = {}
        for idx, elem in enumerate(path):
            if elem not in mapper:
                mapper[elem] = 1
                ret.append(elem)
            else:
                ret.append(elem + "_" + str(mapper[elem]))
                mapper[elem] += 1

        return tuple(ret)

    def add_paths(self, path):
        for idx, row in self.df.iterrows():
            if row.show_node:
                print(row[path], type(row[path]))
                if isinstance(row[path], list):
                    path_tuple = row[path]
                elif isinstance(row[path], str):
                    path_tuple = make_tuple(row[path])
                corrected_path = self.no_cycle_path(path_tuple)
                self.g.add_path(corrected_path)

    def add_edge_attributes(self):
        number_of_runs_mapping = self.number_of_runs()
        nx.set_edge_attributes(
            self.R, name="number_of_runs", values=number_of_runs_mapping
        )

    def number_of_runs(self):
        ret = {}
        for idx, name in enumerate(self.runs):
            for edge in self.runs[name].edges():
                if edge not in ret:
                    ret[edge] = 0
                ret[edge] += 1
        return ret

    # def add_node_attributes(self, H, node, dataset_name):
    #     for idx, (key, val) in enumerate(H.nodes.items()):
    #         if(key == node):
    #             if(dataset_name not in self.R.nodes[node]):
    #                 self.R.nodes[node][dataset_name] = {}
    #             self.R.nodes[node][dataset_name] = val

    def add_union_node_attributes(self):
        for node in self.R.nodes(data=True):
            node_name = node[0]
            node_data = node[1]
            max_inc_time = 0
            max_exc_time = 0
            self.R.nodes[node_name]["ensemble"] = {}
            for dataset in node_data:
                for idx, key in enumerate(node_data[dataset]):
                    if key == "name":
                        self.R.nodes[node_name]["union"]["name"] = node_data[dataset][
                            key
                        ]
                    elif key == "time (inc)":
                        max_inc_time = max(max_inc_time, node_data[dataset][key])
                    elif key == "time":
                        max_exc_time = max(max_exc_time, node_data[dataset][key])
                    elif key == "entry_functions":
                        entry_functions = node_data[dataset][key]

            self.R.nodes[node_name]["ensemble"]["time (inc)"] = max_inc_time
            self.R.nodes[node_name]["ensemble"]["time"] = max_exc_time
            self.R.nodes[node_name]["ensemble"]["entry_functions"] = entry_functions

    def add_node_attributes(self):
        ensemble_mapping = self.ensemble_map(self.g.nodes())

        for idx, key in enumerate(ensemble_mapping):
            nx.set_node_attributes(self.g, name=key, values=ensemble_mapping[key])

        dataset_mapping = {}
        for dataset in self.df["dataset"].unique():
            dataset_mapping[dataset] = self.dataset_map(self.g.nodes(), dataset)

            nx.set_node_attributes(
                self.g, name=dataset, values=dataset_mapping[dataset]
            )

    def tailhead(self, edge):
        return (edge[0], edge[1])

    def tailheadDir(self, edge):
        return (str(edge[0]), str(edge[1]), self.edge_direction[edge])

    def edges_from(self, node):
        for e in self.g.edges(node):
            yield e + ("forward",)

    def edge_id(self, edge):
        return edge[:-1]

    def assign_levels(self):
        levelMap = {}
        track_level = 0
        nodes = self.g.nbunch_iter(self.root)
        for start_node in nodes:
            active_nodes = [start_node]
            levelMap[self.root] = 0
            for edge in nx.edge_dfs(self.g, start_node, "original"):
                log.warn("[Graph] Edge: {0}".format(edge))
                head_level = None
                tail_level = None
                head, tail = self.tailhead(edge)
                if head != start_node:
                    active_nodes.append(head)
                if head in active_nodes:
                    if head != start_node:
                        if tail in active_nodes:
                            log.warn("Cycle found : {0} <====> {1}".format(head, tail))
                            continue
                        self.edge_direction[(head, tail)] = "forward_edge"
                        levelMap[tail] = levelMap[head] + 1
                        track_level += 1
                        log.warn("level for {0}: {1}".format(tail, levelMap[tail]))
                    active_nodes = head == start_node and [start_node]
                    track_level = 0

        return levelMap

    def flow_map(self):
        flowMap = {}
        nodes = self.g.nbunch_iter(self.root)
        for start_node in nodes:
            for edge in nx.edge_dfs(self.g, start_node, "original"):
                head_level = None
                tail_level = None
                head, tail = self.tailhead(edge)
                if head in self.level_mapping.keys():
                    head_level = self.level_mapping[head]
                if tail in self.level_mapping.keys():
                    tail_level = self.level_mapping[tail]
                flowMap[(edge[0], edge[1])] = (int(head_level), int(tail_level))

        return flowMap

    def add_edge_attributes(self):
        capacity_mapping = self.calculate_flows(self.g)
        nx.set_edge_attributes((self.g), name="weight", values=capacity_mapping)

    def leaves_below(self, graph, node):
        return set(
            sum(
                (
                    [vv for vv in v if graph.out_degree(vv) == 0]
                    for k, v in nx.dfs_successors(graph, node).items()
                ),
                [],
            )
        )

    def immediate_children(self):
        ret = {}
        parentChildMap = nx.dfs_successors(self.g, self.root)
        nodes = self.g.nodes()
        for node in nodes:
            if node in parentChildMap.keys():
                ret[node] = parentChildMap[node]

        return ret

    def edge_type(self, graph):
        ret = {}
        edges = graph.edges()
        for edge in edges:
            source = edge[0]
            target = edge[1]
            if source.endswith("_") or target.endswith("_"):
                ret[edge] = "back_edge"
            else:
                ret[edge] = "forward_edge"

        return ret

    def number_of_runs(self):
        ret = {}
        return ret

    def calculate_flows(self, graph):
        ret = {}
        edges = graph.edges()
        additional_flow = {}
        for edge in edges:
            source = edge[0]
            target = edge[1]

        for edge in edges:
            added_flow = 0
            group_df = self.df.groupby(["_" + self.group_by]).max()
            source_inc = group_df.loc[(edge[0], "time (inc)")]
            target_inc = group_df.loc[(edge[1], "time (inc)")]
            if source_inc == target_inc:
                ret[edge] = source_inc
            else:
                ret[edge] = target_inc

        return ret

    def ensemble_map(self, nodes):
        ret = {}
        # loop through the nodes
        for node in self.g.nodes():

            # Get their dataframe
            node_df = self.df.loc[self.df["name"] == node]

            for column in self.columns:
                if column not in ret:
                    ret[column] = {}

                if column == "time (inc)" or column == "time":
                    if len(node_df[column].value_counts() > 0):
                        ret[column][node] = node_df[column].max()
                    else:
                        ret[column][node] = -1
                elif (
                    column == "callers"
                    or column == "callees"
                    or column == "name"
                    or column == "group_path"
                    or column == "vis_name"
                ):
                    if len(node_df[column].value_counts() > 0):
                        ret[column][node] = node_df[column].tolist()[0]
                    else:
                        ret[column][node] = "None"
        return ret

    def dataset_map(self, nodes, dataset):
        ret = {}
        for node in self.g.nodes():
            if node not in ret:
                ret[node] = {}

            node_df = self.df.loc[
                (self.df["name"] == node) & (self.df["dataset"] == dataset)
            ]

            # print(node_df)
            for column in self.columns:
                #                 if column not in ret[node]:
                if column == "time (inc)" or column == "time":
                    if len(node_df[column].value_counts()) > 0:
                        ret[node][column] = node_df[column].max()
                    else:
                        ret[node][column] = -1
                elif (
                    column == "callers"
                    or column == "callees"
                    or column == "name"
                    or column == "group_path"
                    or column == "vis_name"
                ):
                    if len(node_df[column].value_counts()) > 0:
                        ret[node][column] = node_df[column].tolist()[0]
                    else:
                        ret[node][column] = "None"
        return ret

