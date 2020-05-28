def graphmltojson(graphfile, outfile):
    """
	Converts GraphML file to json while adding communities/modularity groups
	using python-louvain. JSON output is usable with D3 force layout.
	"""
    G = nx.read_graphml(graphfile)

    # finds best community using louvain
    #    partition = community_louvain.best_partition(G)

    # adds partition/community number as attribute named 'modularitygroup'
    #    for n,d in G.nodes_iter(data=True):
    #        d['modularitygroup'] = partition[n]

    node_link = json_graph.node_link_data(G)
    json_data = json.dumps(node_link)

    # Write to file
    fo = open(outfile, "w")
    fo.write(json_data)
    fo.close()
