export default function sankeyComputation(graph, view){
    console.log(graph, view)
    let sankey = d3sankeySingle()
	    .nodeWidth(view.nodeWidth)
	    .nodePadding(view.ySpacing)
        .size([view.width * 1.05, view.height - view.ySpacing])
	    .xSpacing(view.xSpacing)
	    .setReferenceValue(view.rootRunTime);
    
	let path = sankey.link();
    
	let graph_temp = buildGraph(graph.nodes, graph.edges);
	sankey.nodes(graph_temp.nodes)
	    .links(graph_temp.edges)
	    .layout(32);

    return sankey
}

function buildGraph(nodes, edges) {
    let temp_nodes = nodes.slice()
    let temp_edges = edges.slice()

    computeNodeEdges(temp_nodes, temp_edges)
    computeNodeBreadths(temp_nodes, temp_edges)

    for (var i = 0; i < temp_edges.length; i++) {
        let source = temp_edges[i].sourceID;
        let target = temp_edges[i].targetID;
        let source_x = nodes[source].x
        let target_x = nodes[target].x
        let dx = target_x - source_x

        // Put in intermediate steps
        for (let j = dx; 1 < j; j--) {
            let intermediate = nodes.length
            let tempNode = {
                sankeyID: intermediate,
                name: "intermediate",
                // runTime: nodes[i].runTime
            }
            nodes.push(tempNode)
            edges.push({
                source: intermediate,
                target: (j == dx ? target : intermediate-1),
                value: links[i].value
            })
            if (j == dx) {
                edges[i].original_target = target
                edges[i].last_leg_source = intermediate
            }
            edges[i].target = intermediate
        }
    }

    return {
        nodes: nodes,
        edges: edges
    }
}

function computeNodeEdges(nodes, links) {
    nodes.forEach(function(node) {
        node.sourceLinks = [];
        node.targetLinks = [];
    });
    links.forEach(function(link) {
        var source = link.sourceID,
		    target = link.targetID;
        nodes[source].sourceLinks.push(link);
        nodes[target].targetLinks.push(link);
    });
}

// computeNodeBreadths from sankey re-written to use indexes
// Iteratively assign the breadth (x-position) for each node.
// Nodes are assigned the maximum breadth of incoming neighbors plus one;
// nodes with no incoming links are assigned breadth zero, while
// nodes with no outgoing links are assigned the maximum breadth.
function computeNodeBreadths(nodes,links) {
    var remainingNodes = nodes.map(function(d) { return d.sankeyID })
    var nextNodes
    var x = 0
    // while (remainingNodes.length) {
    //     nextNodes = [];
    //     remainingNodes.forEach(function(node) {
    //         nodes[node].x = x;
    //         nodes[node].sourceLinks.forEach(function(link) {
    //             if (nextNodes.indexOf(link.target) < 0) {
    //                 nextNodes.push(link.target);
    //             }
    //         });
    //     });
    //     remainingNodes = nextNodes;
    //     ++x;
    // }
}

