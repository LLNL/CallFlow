/* eslint-disable no-continue */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-param-reassign */
export default function preprocess(graph, refresh) {
    console.log(graph)
    
    if (refresh == true) {
    	graph = cleanGraph(graph);
        graph = c_a(graph);
        graph = addLinkNodeIDs_(graph);
    } else {
        graph = c_a(graph);
        graph = addLinkNodeIDs(graph);
    }
    graph = calculateFlow(graph);
    return graph;
}

function cleanGraph(graph) {
    const new_nodes = [];
    let new_links = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const node of graph.nodes) {
	    if (node.type != undefined) {
	        new_nodes.push(node);
	    }
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const link of graph.links) {
	    if (link.name != 'intermediate' || link.name != 'intermediate' || link.name != undefined) {
	        new_links.push(link);
	    }
    }


    // Remove the unnecessary edges
    const tempLinks = [];
    new_links.forEach((link) => {
        if (typeof (link.source) === 'object') {
            tempLinks.push(link);
        }
    });
    new_links = tempLinks;


    return {
	    nodes: new_nodes,
	    links: new_links,
    };
}

// eslint-disable-next-line camelcase
function c_a(graph) {
    console.log(graph);
    const nodes = graph.nodes;

    // eslint-disable-next-line no-restricted-syntax
    for (const node of nodes) {
	    if (node.name == 'libpsm_infinipath.so.1.14') {
	        node.level = 4;
	    } else if (node.name == 'libc-2.12.so') {
	        node.level = 5;
	    }
    }

    const nodesByBreadth = d3.nest()
	    .key(d => d.level)
        .sortKeys(d3.ascending)
        .entries(graph.nodes)
        .map(d => d.values);

    const nodesByBreadt = d3.nest()
	    .key(d => d.level)
        .sortKeys(d3.ascending)
        .entries(graph.nodes)
        .map((d, i) => {
	        const map = [];
	        // eslint-disable-next-line no-restricted-syntax
	        for (const nodesInLevel of d.values) {
		        map.push(nodesInLevel.name[0]);
	        }
	        return map;
	    });


    return graph;
}

/* Link: {
   sourceID : int, targetID: int , target: str, source: str
   } */
function addLinkNodeIDs(graph) {
    const nodeMap = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const [idx, node] of graph.nodes.entries()) {
        nodeMap[node.name[0]] = idx;
    }

    const links = graph.links;
    // eslint-disable-next-line no-restricted-syntax
    for (const link of graph.links) {
	    if (link.source[-1] == '_' || link.target[-1] == '_') {
	        continue;
	    }

        link['sourceID'] = nodeMap[link.source];
        link['targetID'] = nodeMap[link.target];
    }
    return graph;
}

/* Link: {
   sourceID : int, targetID: int , target: str, source: str
   } */
// eslint-disable-next-line no-underscore-dangle
function addLinkNodeIDs_(graph) {
    const nodeMap = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const [idx, node] of graph.nodes.entries()) {
        nodeMap[node.name] = idx;
    }


    const links = graph.links;
    // eslint-disable-next-line no-restricted-syntax
    for (const link of graph.links) {
	console.log(link.source, link.target)
	if (link.source.name[link.source.name.length - 1] == '_' || link.target.name[link.target.name.length - 1] == '_') {
	        // eslint-disable-next-line no-continue
	        continue;
	    }
        link['sourceID'] = nodeMap[link.source.name];
        link['targetID'] = nodeMap[link.target.name];
    }
    return graph;
}

function calculateFlow(graph) {
    // eslint-disable-next-line prefer-destructuring
    const nodes = graph.nodes;
    // eslint-disable-next-line prefer-destructuring
    const links = graph.links;
    const outGoing = [];
    const inComing = [];
    nodes.forEach((node) => {
	    const nodeLabel = node.name[0];

        links.forEach((link) => {
	        const linkLabel = nodes[link.sourceID].name;
	        if (linkLabel == nodeLabel) {
		        if (outGoing[linkLabel] == undefined) {
		            outGoing[linkLabel] = 0;
		        }
		        outGoing[linkLabel] += link.weight;
	        }
	    });

        links.forEach((link) => {
	        const linkLabel = nodes[link.targetID].name;
	        if (linkLabel == nodeLabel) {
		        if (inComing[linkLabel] == undefined) {
		            inComing[linkLabel] = 0;
		        }
		        inComing[linkLabel] += link.weight;
	        }
	    });

	    if (outGoing[nodeLabel] == undefined) {
	        outGoing[nodeLabel] = 0;
	    }

	    if (inComing[nodeLabel] == undefined) {
	        inComing[nodeLabel] = 0;
	    }

	    node.out = outGoing[nodeLabel];
	    node.in = inComing[nodeLabel];

	    node.inclusive = Math.max(inComing[nodeLabel], outGoing[nodeLabel]);
	    node.exclusive = Math.max(inComing[nodeLabel], outGoing[nodeLabel]) - outGoing[nodeLabel];

	    calcStat(graph, node.inclusive, node.exclusive);
    });

    return graph;
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

function calcStat(graph, inTime, exTime) {
    // eslint-disable-next-line no-param-reassign
    graph.stat = resetStat();
    graph.nodes.forEach((data) => {
	    // eslint-disable-next-line no-param-reassign
	    graph.stat.minInc = Math.min(graph.stat.minInc, data.in);
	    graph.stat.maxInc = Math.max(graph.stat.maxInc, data.in);
	    graph.stat.minExc = Math.min(graph.stat.minExc, data.out);
	    graph.stat.maxExc = Math.max(graph.stat.maxExc, data.out);
    });
}

function resetStat() {
    const stat = {};
    stat.maxInc = 0;
    stat.minInc = Number.MAX_SAFE_INTEGER;
    stat.maxExc = 0;
    stat.minExc = Number.MAX_SAFE_INTEGER;
    return stat;
}
