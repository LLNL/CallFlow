import networkx as nx


class UnionGraph:
    def __init__(self):
        self.R = nx.DiGraph()
        self.runs = {}
        self.diffset = {}


    # Return the union of graphs G and H.
    def unionize(self, H, name=None, rename=(None, None)):
        if not self.R.is_multigraph() == H.is_multigraph():
            raise nx.NetworkXError("G and H must both be graphs or multigraphs.")


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
            if dataset_name not in self.R.nodes[node]:
                self.R.nodes[node][dataset_name] = 0
            if key == node:
                self.R.nodes[node][dataset_name] = 1
