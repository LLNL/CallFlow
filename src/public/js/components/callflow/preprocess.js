export default function preprocess(graph){    
    console.log(graph)
    graph = combineBackNodes(graph)
    console.log(graph)
    graph = addLinkNodeIDs(graph)
    graph = calculateFlow(graph)
    return graph
}

function findNodeById(graph, node_id){
    let ret 
    for(let node of graph.nodes){
	if(node_id == node.id){
	    ret = node
	}
    }
    return ret
}

function combineBackNodes(graph){
    let ret = []
    for(let node of graph.nodes){
	let node_id = node.id
	if (node_id.slice(-1) == '_'){
	    let correct_node_id = node.id.slice(0, node.id.length - 1)
	    let correct_node = findNodeById(graph, correct_node_id)
	    correct_node.weight += node.weight
	    for (let edge in node.sourceLinks){
		correct_node.targetLinks.push(edge)
	    }
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



