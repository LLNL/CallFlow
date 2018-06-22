export default function preprocess(graph){    
    let rootRunTime = calculateRootRunTime(graph.edges)
    graph.nodes = calculateFlow(graph.nodes, graph.edges)

    // Not sure why this is needed! 
    graph.nodes = moreProcessing(graph.nodes)
    return graph
}

// This method looks fishy ....
// Looks like it will return the root's total runTime but not sure of its need ...
function calculateRootRunTime(edges) {
    let ret = []
    edges.forEach((edge) => {
	    let label = edge['sourceInfo'].name;
        let graphID = edge['sourceInfo'].label;
	    if(label == '<program root>'){
	        if(ret[graphID] == undefined){
		       ret[graphID] = 0;
	        }
	        ret[graphID] += edge["value"];
	    }
    })
    return ret;
}

function calculateFlow(nodes, edges){
    let outGoing = [];
	let inComing = [];
    nodes.forEach((node) => {
	    let nodeLabel = node["lmID"];
        
	    edges.forEach((edge) => {
            let graphID = edge['sourceInfo'].label;
	        if(edge["sourceInfo"].label == nodeLabel){
		        if(outGoing[graphID] == undefined){
		            outGoing[graphID] = 0;
		        }
		        outGoing[graphID] += edge["value"];
	        }
        });
        
        edges.forEach((edge) => {
            let graphID = edge['targetInfo'].label;
	        if(edge["targetInfo"].label == nodeLabel){
		        if(inComing[graphID] == undefined){
		            inComing[graphID] = 0;
		        }
		        inComing[graphID] += edge["value"];
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

	    calcStat(node["inclusive"], node["exclusive"])
    })
    
    return nodes
}

function moreProcessing(nodes){
    let stat = {
	    "inTimeMin" : Number.MAX_SAFE_INTEGER,
	    "inTimeMax" : 0,
	    "exTimeMin" : Number.MAX_SAFE_INTEGER,
	    "exTimeMax" : 0,
	    "imPercMin" : Number.MAX_SAFE_INTEGER,
	    "imPercMax" : 0
    };

    // For now I am changing inTime to inc, exTime to exc. Not sure if this is needed. 
    nodes.forEach((data) => {
	    stat["inTimeMin"] = Math.min(stat["inTimeMin"], data["inc"]);
	    stat["inTimeMax"] = Math.max(stat["inTimeMax"], data["inc"]);
	    stat["exTimeMin"] = Math.min(stat["exTimeMin"], data["exc"]);
	    stat["exTimeMax"] = Math.max(stat["exTimeMax"], data["exc"]);
//	    stat["imPercMin"] = Math.min(stat["imPercMin"], data["imPerc"]);
//	    stat["imPercMax"] = Math.max(stat["imPercMax"], data["imPerc"]);
    });

    return nodes
}

function calcStat(inTime, exTime){
    let stat = resetStat()
    stat.maxInc = Math.max(stat.maxInc, inTime);
	stat.minInc = Math.min(stat.minInc, inTime);
	stat.maxExc = Math.max(stat.maxExc, exTime);
	stat.minExc = Math.min(stat.minExc, exTime);

    return stat
}


function resetStat(){
    let stat = {}
    stat.maxInc = 0;
	stat.minInc = Number.MAX_SAFE_INTEGER;
	stat.maxExc = 0;
	stat.minExc = Number.MAX_SAFE_INTEGER;
    return stat
}



