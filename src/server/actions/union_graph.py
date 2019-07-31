def union(G, H, rename=(None, None), name=None):
    """ Return the union of graphs G and H.

    Graphs G and H must be disjoint, otherwise an exception is raised.

    Parameters
    ----------
    G,H : graph
       A NetworkX graph

    rename : bool , default=(None, None)
       Node names of G and H can be changed by specifying the tuple
       rename=('G-','H-') (for example).  Node "u" in G is then renamed
       "G-u" and "v" in H is renamed "H-v".

    name : string
       Specify the name for the union graph

    Returns
    -------
    U : A union graph with the same type as G.

    Notes
    -----
    To force a disjoint union with node relabeling, use
    disjoint_union(G,H) or convert_node_labels_to integers().

    Graph, edge, and node attributes are propagated from G and H
    to the union graph.  If a graph attribute is present in both
    G and H the value from H is used.

    See Also
    --------
    disjoint_union
    """
    if not G.is_multigraph() == H.is_multigraph():
        raise nx.NetworkXError('G and H must both be graphs or multigraphs.')
    # Union is the same type as G
    R = G.__class__()
    # add graph attributes, H attributes take precedent over G attributes
    R.graph.update(G.graph)
    R.graph.update(H.graph)

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
    if set(G) & set(H):
        raise nx.NetworkXError('The node sets of G and H are not disjoint.',
                               'Use appropriate rename=(Gprefix,Hprefix)'
                               'or use disjoint_union(G,H).')
    if G.is_multigraph():
        G_edges = G.edges(keys=True, data=True)
    else:
        G_edges = G.edges(data=True)
    if H.is_multigraph():
        H_edges = H.edges(keys=True, data=True)
    else:
        H_edges = H.edges(data=True)

    # add nodes
    R.add_nodes_from(G)
    R.add_edges_from(G_edges)
    # add edges
    R.add_nodes_from(H)
    R.add_edges_from(H_edges)
    # add node attributes
    for n in G:
        R.nodes[n].update(G.nodes[n])
    for n in H:
        R.nodes[n].update(H.nodes[n])

    return R