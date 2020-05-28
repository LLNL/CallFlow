import networkx as nx


class UnionGraph:
    def __init__(self):
        # Union is the same type as G
        self.R = nx.DiGraph()
        self.runs = {}
        self.diffset = {}

    # Return the union of graphs G and H.
    def unionize(self, H, name=None, rename=(None, None)):
        if not self.R.is_multigraph() == H.is_multigraph():
            raise nx.NetworkXError("G and H must both be graphs or multigraphs.")

        # add graph attributes, H attributes take precedent over G attributes
        self.R.graph.update(H.graph)

        renamed_nodes = self.add_prefix(H, rename[1])

        debug = False
        if debug:
            print("-=========================-")
            print("Nodes in R and H are same? ", set(self.R) == set(H))
            if set(self.R) != set(H):
                print("Difference is ", list(set(H) - set(self.R)))
                print("Nodes in R", set(self.R)),
                print("Nodes in H", set(H))
            print("-=========================-")

        if H.is_multigraph():
            H_edges = H.edges(keys=True, data=True)
        else:
            H_edges = H.edges(data=True)

        # add nodes and edges.
        self.R.add_nodes_from(H)
        self.R.add_edges_from(H_edges)

        # add node attributes for each run
        for n in renamed_nodes:
            self.add_node_attributes(H, n, name)

        self.runs[name] = H

    # rename graph to obtain disjoint node labels
    def add_prefix(self, graph, prefix):
        if prefix is None:
            return graph

        def label(x):
            if is_string_like(x):
                name = prefix + x
            else:
                name = prefix + repr(x)
            return name

        return nx.relabel_nodes(graph, label)

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

    def add_node_attributes(self, H, node, dataset_name):
        for idx, (key, val) in enumerate(H.nodes.items()):
            if key == node:
                if dataset_name not in self.R.nodes[node]:
                    self.R.nodes[node][dataset_name] = {}
                self.R.nodes[node][dataset_name] = val

    # def add_union_node_attributes(self):
    #     for node in self.R.nodes(data=True):
    #         node_name = node[0]
    #         node_data = node[1]
    #         max_inc_time = 0
    #         max_exc_time = 0
    #         self.R.nodes[node_name]["ensemble"] = {}
    #         for dataset in node_data:
    #             for idx, key in enumerate(node_data[dataset]):
    #                 if key == "name":
    #                     self.R.nodes[node_name]["union"]["name"] = node_data[dataset][
    #                         key
    #                     ]
    #                 elif key == "time (inc)":
    #                     max_inc_time = max(max_inc_time, node_data[dataset][key])
    #                 elif key == "time":
    #                     max_exc_time = max(max_exc_time, node_data[dataset][key])
    #                 elif key == "entry_functions":
    #                     entry_functions = node_data[dataset][key]

    #         self.R.nodes[node_name]["ensemble"]["time (inc)"] = max_inc_time
    #         self.R.nodes[node_name]["ensemble"]["time"] = max_exc_time
    #         self.R.nodes[node_name]["ensemble"]["entry_functions"] = entry_functions
