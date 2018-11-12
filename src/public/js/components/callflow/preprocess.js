export default function preprocess(graph, refresh){
    if(refresh == true){
	    graph = cleanGraph(graph)
        graph = c_a(graph)
        graph = addLinkNodeIDs_(graph)
    }
    else{
        graph = c_a(graph)
        graph = addLinkNodeIDs(graph)
    }

    graph = calculateFlow(graph)
    return graph
}

function cleanGraph(graph){
    let new_nodes = []
    let new_links = []
    for(let node of graph.nodes){
	    if(node.type != undefined){
	        new_nodes.push(node)
	    }
    }

    for(let link of graph.links){
	    if(link.name != 'intermediate' || link.name != 'intermediate' || link.name != undefined ){
	        new_links.push(link)
	    }
    }


    // Remove the unnecessary edges
    let tempLinks = []
    new_links.forEach((link) => {
        if(typeof(link.source) === 'object'){
            tempLinks.push(link)
        }
    })
    new_links = tempLinks

    
    return {
	    nodes : new_nodes,
	    links : new_links
    }
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
	    if(link.source[-1] == '_' || link.target[-1] == '_'){
	        continue
	    }
	    
        link.sourceID = nodeMap[link.source]
        link.targetID = nodeMap[link.target]
    }    
    return graph
}

/* Link: {
   sourceID : int, targetID: int , target: str, source: str 
   }*/
function addLinkNodeIDs_(graph){
    let nodeMap = {}
    for(let [idx, node] of graph.nodes.entries()){
        nodeMap[node.name] = idx
    }


    let links = graph.links
    for(let link of graph.links){
	    if(link.source.name[link.source.name.length - 1] == '_' || link.target.name[link.target.name.length - 1] == '_'){
	        continue
	    }
        link.sourceID = nodeMap[link.source.name]
        link.targetID = nodeMap[link.target.name]
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
	        let linkLabel = nodes[link.sourceID].name;
	        if(linkLabel == nodeLabel){
		        if(outGoing[linkLabel] == undefined){
		            outGoing[linkLabel] = 0;
		        }
		        outGoing[linkLabel] += link.weight
	        }
	        
	    });
	    
        links.forEach((link) => {
	        let linkLabel = nodes[link.targetID].name
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
