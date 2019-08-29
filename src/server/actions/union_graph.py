import networkx as nx


class UnionGraph():
    def __init__(self):
        # Union is the same type as G
        self.R = nx.DiGraph()
        # self.union(G, H, dataset_name, rename, name)
        
    # Return the union of graphs G and H.    
    def unionize(self, H, name = None, rename=(None, None)):
        print(H)
        if not self.R.is_multigraph() == H.is_multigraph():
            raise nx.NetworkXError('G and H must both be graphs or multigraphs.')
        
        # add graph attributes, H attributes take precedent over G attributes
        # self.R.graph.update(G.graph)
        self.R.graph.update(H.graph)

        # rename graph to obtain disjoint node labels
        def add_prefix(graph, prefix):
            if prefix is None:
                return graph

            def label(x):
                if is_string_like(x):
                    name = prefix + x
                else:
                    name = prefix + repr(x)
                return name
            return nx.relabel_nodes(graph, label)
        
        # G = add_prefix(G, rename[0])
        H = add_prefix(H, rename[1])

        # if(set(G) != set(H)):
        #     break        
        # # TODO: Integrate the check_graph.

        # if G.is_multigraph():
            # G_edges = G.edges(keys=True, data=True)
        # else:
            # G_edges = G.edges(data=True)
        if H.is_multigraph():
            H_edges = H.edges(keys=True, data=True)
        else:
            H_edges = H.edges(data=True)

        # add nodes
        # self.R.add_nodes_from(G)
        # self.R.add_edges_from(G_edges)
        # add edges
        self.R.add_nodes_from(H)
        self.R.add_edges_from(H_edges)
        # add node attributes
        
        # for n in G:
            # R.nodes[n].update(G.nodes[n])
            # self.append(n, G.nodes(), '')
        for n in H:
            self.append(n, H.nodes(), name)
        

    def append(self, node, graph, dataset):
        for idx, (key, val) in enumerate(graph.items()):
            if(key == node):
                if(dataset not in self.R.nodes[node]):
                    self.R.nodes[node][dataset] = {}
                self.R.nodes[node][dataset] = val