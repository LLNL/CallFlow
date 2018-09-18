export default function preprocess(graph){
    graph = c_a(graph)
    graph = addLinkNodeIDs(graph)
    graph = calculateFlow(graph)
    return graph
}

function c_a(graph){
    let nodes = graph.nodes    

    for(let node of nodes){
	if(node.name == 'libpsm_infinipath.so.1.14'){
	    node.level = 4;
	}
	else if(node.name == 'libc-2.12.so'){
	    node.level = 5;
	}
    }
    
    var nodesByBreadth = d3.nest()
	.key(function(d) { return d.level; })
        .sortKeys(d3.ascending)
        .entries(graph.nodes)
        .map(function(d) { return d.values; });

    var nodesByBreadt = d3.nest()
	.key(function(d) { return d.level; })
        .sortKeys(d3.ascending)
        .entries(graph.nodes)
        .map(function(d, i) {
	    let map = []	    
	    for(let nodesInLevel of d.values){
		map.push(nodesInLevel.name[0])
	    }
	    return map	    
	});

    for(let link of graph.links){
	console.log(link.type, link.source, link.target, link.weight)
	if(link.type != 'back_edge'){
//	    console.log(link.source, link.target, link.weight)
	}
    }
    
    return graph
}

/* Link: {
   sourceID : int, targetID: int , target: str, source: str 
   }*/
function addLinkNodeIDs(graph){
    let nodeMap = {}
    for(let [idx, node] of graph.nodes.entries()){
        nodeMap[node.name[0]] = idx
    }

    let links = graph.links
    for(let link of graph.links){
	if(link.source[0][-1] == '_' || link.target[0][-1] == '_'){
	    continue
	}
	
        link.sourceID = nodeMap[link.source]
        link.targetID = nodeMap[link.target]
    }    
    return graph
}

function calculateFlow(graph){
    let nodes = graph.nodes
    let links = graph.links
    let outGoing = [];
    let inComing = [];
    nodes.forEach((node) => {
	let nodeLabel = node.name[0];
        
	links.forEach((link) => {
	    let linkLabel = nodes[link.sourceID].name[0];
	    if(linkLabel == nodeLabel){
		if(outGoing[linkLabel] == undefined){
		    outGoing[linkLabel] = 0;
		}
		outGoing[linkLabel] += link.weight
	    }
	    
	});
	
        links.forEach((link) => {
	    let linkLabel = nodes[link.targetID].name[0]
	    if(linkLabel == nodeLabel){
		if(inComing[linkLabel] == undefined){
		    inComing[linkLabel] = 0;
		}
		inComing[linkLabel] += link.weight;
	    }
	})

	if(outGoing[nodeLabel] == undefined){
	    outGoing[nodeLabel] = 0;
	}

	if(inComing[nodeLabel] == undefined){
	    inComing[nodeLabel] = 0;
	}
	
	node["out"] = outGoing[nodeLabel];
	node["in"] = inComing[nodeLabel];

	node["inclusive"] = Math.max(inComing[nodeLabel], outGoing[nodeLabel]);
	node["exclusive"] = Math.max(inComing[nodeLabel], outGoing[nodeLabel]) - outGoing[nodeLabel];

	calcStat(graph, node["inclusive"], node["exclusive"])
    })

    return graph
}

// function moreProcessing(graph){
//     let stat = {
// 	"inTimeMin" : Number.MAX_SAFE_INTEGER,
// 	"inTimeMax" : 0,
// 	"exTimeMin" : Number.MAX_SAFE_INTEGER,
// 	"exTimeMax" : 0,
// 	"imPercMin" : Number.MAX_SAFE_INTEGER,
// 	"imPercMax" : 0
//     };

//     // For now I am changing inTime to inc, exTime to exc. Not sure if this is needed. 
//     graph.nodes.forEach((data) => {
// 	graph.stat.inTimeMin = Math.min(graph.stat.inTimeMin, data.in);
// 	graph.stat.inTimeMax = Math.max(graph.stat.inTimeMax, data.in);
// 	graph.stat.exTimeMin = Math.min(graph.stat.exTimeMin, data.out);
// 	graph.stat.exTimeMax = Math.max(graph.stat.exTimeMax, data.out);
//         //	    graph.stat.imPercMin = Math.min(graph.stat.imPercMin, data.imPerc);
//         //	    graph.stat.imPercMax = Math.max(graph.stat.imPercMax, data.imPerc);
//     });

//     return graph
// }

function calcStat(graph, inTime, exTime){
    graph.stat = resetStat()
    graph.nodes.forEach((data) => {
	graph.stat.minInc = Math.min(graph.stat.minInc, data.in)
	graph.stat.maxInc = Math.max(graph.stat.maxInc, data.in)
	graph.stat.minExc = Math.min(graph.stat.minExc, data.out)
	graph.stat.maxExc = Math.max(graph.stat.maxExc, data.out)
    })    
}


function resetStat(){
    let stat = {}
    stat.maxInc = 0
    stat.minInc = Number.MAX_SAFE_INTEGER
    stat.maxExc = 0
    stat.minExc = Number.MAX_SAFE_INTEGER
    return stat
}



// From sankey, but keep indices as indices
// Populate the sourceLinks and targetLinks for each node.
// Also, if the source and target are not objects, assume they are indices.
function computeNodeLinks(nodes, links) {
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

    while (remainingNodes.length) {
        nextNodes = [];
        remainingNodes.forEach(function(node) {
            nodes[node].level = x;
            nodes[node].sourceLinks.forEach(function(link) {
                if (nextNodes.indexOf(link.target) < 0) {
                    nextNodes.push(link.target);
                }
            });
        });
        remainingNodes = nextNodes;
        ++x;
    }
}

// Add nodes and links as needed
function rebuild(nodes, links) {
    var temp_nodes = nodes
    var temp_links = links
    computeNodeLinks(temp_nodes, temp_links)
    computeNodeBreadths(temp_nodes, temp_links)
    for (var i = 0; i < temp_links.length; i++) {
        // console.log(temp_links[i]);
        var source = temp_links[i].sourceID
        var target = temp_links[i].targetID
        var source_x = nodes[source].x
        var target_x = nodes[target].x
        var dx = target_x - source_x
        // Put in intermediate steps
        for (var j = dx; 1 < j; j--) {
            var intermediate = nodes.length
            var tempNode = {
                sankeyID: intermediate,
                name: "intermediate",
                // runTime: nodes[i].runTime
            }
            // console.log(tempNode)
            nodes.push(tempNode)
            links.push({
                source: intermediate,
                target: (j == dx ? target : intermediate-1),
                value: links[i].value
            })
            if (j == dx) {
                links[i].original_target = target
                links[i].last_leg_source = intermediate
            }
            links[i].target = intermediate
        }
    }

    return {
        nodes: nodes,
        links: links
    }
}

