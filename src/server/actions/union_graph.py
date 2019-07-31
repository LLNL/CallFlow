import networkx as nx


class UnionGraph():
    def __init__(self, G, H, rename=(None, None), name=None):
        # R1 = nx.convert_node_labels_to_integers(G)
        # R2 = nx.convert_node_labels_to_integers(H, first_label=len(R1))
       self.union(G, H, rename, name)

    # Return the union of graphs G and H.    
    def union(self, G, H, rename, name):
        if not G.is_multigraph() == H.is_multigraph():
            raise nx.NetworkXError('G and H must both be graphs or multigraphs.')
        # Union is the same type as G
        self.R = G.__class__()
        # add graph attributes, H attributes take precedent over G attributes
        self.R.graph.update(G.graph)
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
        
        G = add_prefix(G, rename[0])
        H = add_prefix(H, rename[1])

        # if(set(G) != set(H)):
        #     break        
        # # TODO: Integrate the check_graph.

        if G.is_multigraph():
            G_edges = G.edges(keys=True, data=True)
        else:
            G_edges = G.edges(data=True)
        if H.is_multigraph():
            H_edges = H.edges(keys=True, data=True)
        else:
            H_edges = H.edges(data=True)

        # add nodes
        self.R.add_nodes_from(G)
        self.R.add_edges_from(G_edges)
        # add edges
        self.R.add_nodes_from(H)
        self.R.add_edges_from(H_edges)
        # add node attributes
        
        for n in G:
            # R.nodes[n].update(G.nodes[n])
            self.append(n, G.nodes(), 'calc-pi')
        for n in H:
            self.append(n, H.nodes(), 'calc-pi-half')

        # print(self.R.nodes(data=True))

    def append(self, node, graph, dataset):
        for idx, (key, val) in enumerate(graph.items()):
            if(key == node):
                if(dataset not in self.R.nodes[node]):
                    self.R.nodes[node][dataset] = {}
                self.R.nodes[node][dataset] = val