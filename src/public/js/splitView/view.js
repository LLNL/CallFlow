/* Sort an object and convert to an array
   @parameter: obj, sortAttribute
   @return : sorted array from the object
*/
function sortObjToArr(obj, sortAttr){
    let ret = [];
    let keys = Object.keys(obj);
    keys.forEach( (key) => {
	let tempObj = obj[key];
	ret.push(tempObj);
    })

    ret.sort( (a,b) => {
	return b[sortAttr] - a[sortAttr];
    })
    return ret;
}

function objToArr(obj){
    let ret = [];
    let keys = Object.keys(obj);
    keys.forEach( (key) => {
	let tempObj = obj[key];
	ret.push(tempObj);
    })
    return ret;
}

function sum(arr){
    let ret = 0;
    for(let i = 0; i < arr.length; i++){
	ret+= arr[i];
    }
    return ret;
}

/* 
   Sorted Nodes and edges added to Graph(In object changes)
   Nodes -> { } -> [ ]
   Edges -> [ ] -> [ ] 
   @parameter : graph 
   @return : sorted graph.
*/
function sortNodesEdges(graphs){
    for(let i = 0; i < graphs.length; i++){
	graphs[i].sortedNodesArr = nodesObjToArr(graphs[i].nodes);
	graphs[i].edges.sort( (a,b) => {
	    return a['sourceID'] - b['targetID'];
	})
    }
    return graphs;
}
 
/*function aggregateNodes(graphs){
    let aggrNodes = [];
    let nodeMap = {};
    var nodeCount = 0;
    for(let i = 0; i < graphs.length; i++){
	let nodeInGraph = 0;
	let nodes = graphs[i].sortedNodesArr;
	for(let nodeID = 0; nodeID < nodes.length; nodeID++){
	    let node = nodes[nodeID];
	    if(nodeMap[node.specidalID] != undefined){
		nodeMap[node.specidalID] = true;
	    }
	    else{
		node.graphSankeyID = node.sankeyID;
		node.sankeyID = nodeCount;
		node.graph = i;
		nodeCount += 1;
		node.specialID = node.specialID + '/G-' + i;
		node.runtime += node.runTime;
		node.name = node.name + '/G-'+i;
		aggrNodes.push(node);
	    }
	}
    }
    console.log(aggrNodes, nodeMap);
    aggrNodes.sort( (a,b) => {
	return b['runTime'] - a['runTime'];
    })
    return aggrNodes;
}
*/
function aggregateNodes(graphs){
    let aggrNodes = [];
    let nodeMap = {};
    for(let i = 0; i < graphs.length; i++){
	let nodes = graphs[i].sortedNodesArr;
	for(let j = 0; j < nodes.length; j++){
	    //By special ID;
/*	    if(nodeMap[nodes[j].specialID]== undefined){
		nodeMap[nodes[j].specialID] = [];
	    }
	    nodeMap[nodes[j].specialID].push(nodes[j]);*/
	    //By name;
	    if(nodeMap[nodes[j].name] == undefined){
		nodeMap[nodes[j].name] = [];
	    }
	    nodeMap[nodes[j].name].push(nodes[j]);
	}
    }
    aggrNodes = combineArrays(nodeMap);
    aggrNodes.sort( (a,b) => {
	return sum(b['runTime']) - sum(a['runTime']);
    })
    return aggrNodes;
}

function combineArrays(nodeMap){
    let ret = [];
    let count = 0;
    let nodeMapArr = objToArr(nodeMap);
    for(let i = 0; i < nodeMapArr.length; i++){
	let runTime = [];
	let specialID = [];
	if( nodeMapArr[i].length == 1){
	    runTime.push(nodeMapArr[i][0].runTime);
	    nodeMapArr[i][0].runTime = runTime;
	    ret[count] = nodeMapArr[i][0];
	}
	else{
	    for(var j = 0; j < nodeMapArr[i].length; j++){
		runTime.push(nodeMapArr[i][j].runTime);
		specialID.push(nodeMapArr[i][j].specialID);
		if(j == nodeMapArr[i].length - 1){
		    ret[count] = {
			sankeyID : count,
			name : nodeMapArr[i][0].name,
			specialID: specialID,
			runTime: runTime,
			nameTemp : nodeMapArr[i][0].name
		    }
		}
	    }
	}
	count++;
    }
    return ret;
}

/*function nodeToIDMap(graphs){
    let ret = [];
    for(let graph = 0; graph < graphs.length; graph++){
	ret[graph] = {};
	let nodes = objToArr(graphs[graph].nodes);
	for(let i = 0; i < nodes.length; i++){
/*	    if(ret[graph][nodes[i].name] == undefined){
		ret[graph][nodes[i].name] = [];
	    }
	    ret[graph][nodes[i].name].push(nodes[i].specialID);
	    if(ret[graph][nodes[i].specialID] == undefined){
		ret[graph][nodes[i].specialID] = [];
	    }
	    ret[graph][nodes[i].specialID]  = nodes[i].name;

	}
    }
    return ret;
}*/

function nodeToIDMap(nodes){
    let ret = [];
    for(let i = 0; i < nodes.length; i++){
	let node = nodes[i];
	if(node.specialID != undefined){
	    for(let j = 0; j < node.specialID.length; j++){
		if(ret[node.specialID[j]] == undefined){
		    ret[node.specialID[j]] = i;
		}
	    }
	}
    }
    return ret;
}

function labelToIDMap(nodes){
    let ret = {};
    for(let i = 0; i < nodes.length; i++){
	ret[nodes[i].specialID] = nodes[i].name;
    }
    return ret;
}

function aggregateEdges(nodes, graphs, nodeIDMap, labelIDMap){
    let ret = [];
    let color = ['#ff315c', '#49d25c'];
    let count = 0;
    let edgeMap = {};
    for(var i = 0; i < graphs.length; i++){
	let edges = graphs[i].edges;
	for(let edgeID = 0; edgeID < edges.length; edgeID++){
	    let sourceID = nodeIDMap[edges[edgeID].sourceLabel];
	    let targetID = nodeIDMap[edges[edgeID].targetLabel];
	    if(edgeMap[sourceID+'-'+targetID] == undefined || edgeMap[sourceID+'-'+targetID] == false){
		edges[edgeID].sankeyID = count;
//		edges[edgeID].sourceID = nodeIDMap[edges[edgeID].sourceLabel];
		//		edges[edgeID].targetID = nodeIDMap[edges[edgeID].targetLabel];
		edges[edgeID].sourceID = nodes[nodeIDMap[edges[edgeID].sourceLabel]].sankeyID;
		edges[edgeID].targetID = nodes[nodeIDMap[edges[edgeID].targetLabel]].sankeyID;
		edges[edgeID].source = nodes[nodeIDMap[edges[edgeID].sourceLabel]];
		edges[edgeID].target = nodes[nodeIDMap[edges[edgeID].targetLabel]];
		edges[edgeID].color = color[i];
		edgeMap[sourceID+'-'+targetID] = true;
		edgeMap[targetID+'-'+sourceID] = true;
		ret.push(edges[edgeID]);
		
	    }
	}
	count+=1;
    }
    return ret;
}

function dualView(data){
    let maxNodeSize = 400;
    let graphs = data['graphs'][0];
    let aggrNodes = [];
    let aggrEdges = [];
    
    graphs = sortNodesEdges(graphs);
    aggrNodes = aggregateNodes(graphs);
    let nodeIDMap = nodeToIDMap(aggrNodes);
    console.log(nodeIDMap);
    let labelIDMap = labelToIDMap(graphs);
    aggrEdges = aggregateEdges(aggrNodes, graphs, nodeIDMap, labelIDMap);
    
    console.log(aggrNodes, graphs, aggrEdges);
    let diffSankey1 = new diffSankey({
	ID: '#procedure_view',
	width: $('#procedure_view').width(),
	height: $('#procedure_view').height(),
	margin: { top: 0, right: 10, bottom: 10, left:10 },
	data: { 'nodes': aggrNodes, 'links': aggrEdges , 'graphCount': graphs.length, 'nodeIDMap': nodeIDMap },
	clickCallBack: nodeClickCallBack,
	maxNodeSize: maxNodeSize
    });
}
