export default function preprocess(graph){    
    graph = calculateFlow(graph)

    // Not sure why this is needed! 
    graph = moreProcessing(graph)
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
            let linkLabel = nodes[link.source].name[0];
	    if(linkLabel == nodeLabel){
		if(outGoing[linkLabel] == undefined){
		    outGoing[linkLabel] = 0;
		}
		outGoing[linkLabel] += link.weight
	    }
        });
        
        links.forEach((link) => {
            let linkLabel = nodes[link.target].name[0]
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

function moreProcessing(graph){
    let stat = {
	"inTimeMin" : Number.MAX_SAFE_INTEGER,
	"inTimeMax" : 0,
	"exTimeMin" : Number.MAX_SAFE_INTEGER,
	"exTimeMax" : 0,
	"imPercMin" : Number.MAX_SAFE_INTEGER,
	"imPercMax" : 0
    };

    // For now I am changing inTime to inc, exTime to exc. Not sure if this is needed. 
    graph.nodes.forEach((data) => {
	graph.stat.inTimeMin = Math.min(graph.stat.inTimeMin, data.inc);
	graph.stat.inTimeMax = Math.max(graph.stat.inTimeMax, data.inc);
	graph.stat.exTimeMin = Math.min(graph.stat.exTimeMin, data.exc);
	graph.stat.exTimeMax = Math.max(graph.stat.exTimeMax, data.exc);
        //	    graph.stat.imPercMin = Math.min(graph.stat.imPercMin, data.imPerc);
        //	    graph.stat.imPercMax = Math.max(graph.stat.imPercMax, data.imPerc);
    });

    return graph
}

function calcStat(graph, inTime, exTime){
    graph.stat = resetStat()
    graph.stat.minInc = Math.min(graph.stat.minInc, inTime)
    graph.stat.maxInc = Math.max(graph.stat.maxInc, inTime)
    graph.stat.minExc = Math.min(graph.stat.minExc, exTime)
    graph.stat.maxExc = Math.max(graph.stat.maxExc, exTime)
}


function resetStat(){
    let stat = {}
    stat.maxInc = 0
    stat.minInc = Number.MAX_SAFE_INTEGER
    stat.maxExc = 0
    stat.minExc = Number.MAX_SAFE_INTEGER
    return stat
}



