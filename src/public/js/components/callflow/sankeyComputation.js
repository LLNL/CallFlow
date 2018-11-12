export default function sankeyComputation(graph, view){
    console.log(view.minNodeScale)
    let sankey = d3sankeySingle()
	    .nodeWidth(view.nodeWidth)
	    .nodePadding(view.ySpacing)
        .size([view.width * 1.05, view.height - view.ySpacing])
	    .xSpacing(view.xSpacing)
	    .setReferenceValue(graph.rootRunTimeInc)
	    .setMinNodeScale(view.minNodeScale);
    
    let path = sankey.link();

    sankey.nodes(graph.nodes)
	    .links(graph.links)
	    .layout(32);

    correctGraph(graph.nodes, graph.links);

    console.log(graph.links, graph.nodes)
    
    return sankey
}

function correctGraph(nodes, edges) {
    let temp_nodes = nodes.slice()
    let temp_edges = edges.slice()

    computeNodeEdges(temp_nodes, temp_edges)
    computeNodeBreadths(temp_nodes, temp_edges)

    for (var i = 0; i < temp_edges.length; i++) {
        let source = temp_edges[i].sourceID;
        let target = temp_edges[i].targetID;

        if(source != undefined && target != undefined){
            let source_x = nodes[source].level
            let target_x = nodes[target].level
            let dx = target_x - source_x
	        
            // Put in intermediate steps
            for (let j = dx; 1 < j; j--) {
                let intermediate = nodes.length
                let tempNode = {
                    sankeyID: intermediate,
                    name: "intermediate",
                    weight: nodes[i].weight,
		            height: nodes[i].value
                }
                nodes.push(tempNode)
                edges.push({
                    source: intermediate,
                    target: (j == dx ? target : intermediate-1),
                    value: edges[i].value
                })
                if (j == dx) {
                    edges[i].original_target = target
                    edges[i].last_leg_source = intermediate
                }
                //            edges[i].target = tempNode
            }
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
        let source = link.sourceID,
	        target = link.targetID;

        if(source != undefined && target != undefined){
            nodes[source].sourceLinks.push(link);
            nodes[target].targetLinks.push(link);
        }
    });
}

// computeNodeBreadths from sankey re-written to use indexes
// Iteratively assign the breadth (x-position) for each node.
// Nodes are assigned the maximum breadth of incoming neighbors plus one;
// nodes with no incoming links are assigned breadth zero, while
// nodes with no outgoing links are assigned the maximum breadth.
function computeNodeBreadths(nodes,links) {
    var remainingNodes = nodes.map(function(d) { return d})
    var nextNodes
    var x = 0
    while (remainingNodes.length) {
        nextNodes = [];
        remainingNodes.forEach(function(node) {
            node.sourceLinks.forEach(function(link) {
                if (nextNodes.indexOf(link.target) < 0) {
                    nextNodes.push(link.target);
                }
            });
        });
        remainingNodes = nextNodes;
        ++x;
    }
}





