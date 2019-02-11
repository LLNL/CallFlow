/* eslint-disable no-loop-func */
/* eslint-disable one-var */
/* eslint-disable no-param-reassign */
/* eslint-disable camelcase */
export default function sankeyComputation(graph, view) {
    const sankey = d3sankeySingle()
	    .nodeWidth(view.nodeWidth)
	    .nodePadding(view.ySpacing)
        .size([view.width * 1.05, view.height - view.ySpacing])
	    .xSpacing(view.xSpacing)
	    .setReferenceValue(graph.rootRunTimeInc)
	    .setMinNodeScale(view.minNodeScale);

    const path = sankey.link();

    sankey.nodes(graph.nodes)
	    .links(graph.links)
	    .layout(32);

    correctGraph(graph.nodes, graph.links);

    return sankey;
}

function correctGraph(nodes, edges) {
    const temp_nodes = nodes.slice();
    const temp_edges = edges.slice();

    computeNodeEdges(temp_nodes, temp_edges);
    computeNodeBreadths(temp_nodes, temp_edges);

    for (let i = 0; i < temp_edges.length; i++) {
        const source = temp_edges[i].sourceID;
        const target = temp_edges[i].targetID;

        if (source != undefined && target != undefined) {
            const source_x = nodes[source].level;
            const target_x = nodes[target].level;
            const dx = target_x - source_x;

            // Put in intermediate steps
            for (let j = dx; j > 1; j--) {
                const intermediate = nodes.length;
                const tempNode = {
                    sankeyID: intermediate,
                    name: 'intermediate',
                    //                    weight: nodes[i].weight,
                    //		            height: nodes[i].value
                };
                nodes.push(tempNode);
                edges.push({
                    source: intermediate,
                    target: (j == dx ? target : intermediate - 1),
                    value: edges[i].value,
                });
                if (j == dx) {
                    edges[i].original_target = target;
                    edges[i].last_leg_source = intermediate;
                }
                //            edges[i].target = tempNode
            }
        }
    }

    return {
        nodes,
        edges,
    };
}

function computeNodeEdges(nodes, links) {
    nodes.forEach((node) => {
        node.sourceLinks = [];
        node.targetLinks = [];
    });
    links.forEach((link) => {
        let source = link.sourceID,
	        target = link.targetID;

        if (source != undefined && target != undefined) {
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
function computeNodeBreadths(nodes, links) {
    let remainingNodes = nodes.map((d) => d);
    let nextNodes;
    let x = 0;
    while (remainingNodes.length) {
        nextNodes = [];
        remainingNodes.forEach((node) => {
            node.sourceLinks.forEach((link) => {
                if (nextNodes.indexOf(link.target) < 0) {
                    nextNodes.push(link.target);
                }
            });
        });
        remainingNodes = nextNodes;
        ++x;
    }
}

