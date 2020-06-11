import networkx as nx

# Mostly derive from supergraph.
# Should contain the vector that stores the properties as explained in paper.
# should contain a function `create` which contains the
class Union(nx.DiGraph):
    def __init__(self):
        self.union = nx.DiGraph()

    # Return the union of graphs G and H.
    def unionize(self, nxg, name=None, rename=(None, None)):
        if not self.union.is_multigraph() == H.is_multigraph():
            raise nx.NetworkXError("G and H must both be graphs or multigraphs.")

        self.union.graph.update(nxg)

        renamed_nodes = self.add_prefix(nxg, rename[1])

        LOGGER.debug("-=========================-")
        LOGGER.debug("Nodes in R and H are same? ", set(self.union) == set(nxg))
        if set(self.union) != set(H):
            LOGGER.debug("Difference is ", list(set(H) - set(self.union)))
            LOGGER.debug("Nodes in R", set(self.union)),
            LOGGER.debug("Nodes in H", set(nxg))
        LOGGER.debug("-=========================-")

        if nxg.is_multigraph():
            new_edges = nxg.edges(keys=True, data=True)
        else:
            new_edges = nxg.edges(data=True)

        # add nodes and edges.
        self.union.add_nodes_from(nxg)
        self.union.add_edges_from(new_edges)

        # add node attributes for each run
        for n in renamed_nodes:
            self.add_node_attributes(nxg, n, name)

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
            self.union, name="number_of_runs", values=number_of_runs_mapping
        )

    def number_of_runs(self):
        ret = {}
        for idx, name in enumerate(self.unionuns):
            for edge in self.unionuns[name].edges():
                if edge not in ret:
                    ret[edge] = 0
                ret[edge] += 1
        return ret

    def add_node_attributes(self, H, node, dataset_name):
        for idx, (key, val) in enumerate(H.nodes.items()):
            if dataset_name not in self.union.nodes[node]:
                self.union.nodes[node][dataset_name] = 0
            if key == node:
                self.union.nodes[node][dataset_name] = 1
