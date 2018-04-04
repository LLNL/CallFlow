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
    var nodeCount = 0;
    for(let i = 0; i < graphs.length; i++){
	let nodes = graphs[i].sortedNodesArr;
	for(let j = 0; j < nodes.length; j++){
	    //By special ID;
	    if(nodeMap[nodes[j].specialID]== undefined){
		nodeMap[nodes[j].specialID] = [];
	    }
	    nodeMap[nodes[j].specialID].push(nodes[j]);
	    //By name;
/*	    if(nodeMap[nodes[j].name] == undefined){
		nodeMap[nodes[j].name] = [];
	    }
	    nodeMap[nodes[j].name].push(nodes[j]);*/
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
	let sankeyID = [];
	if( nodeMapArr[i].length == 1){
	    runTime.push(nodeMapArr[i][0].runTime);
	    nodeMapArr[i][0].runTime = runTime;
	    ret[count] = nodeMapArr[i][0];
	}
	else{
	    for(var j = 0; j < nodeMapArr[i].length; j++){
		runTime.push(nodeMapArr[i][j].runTime);
		sankeyID.push(nodeMapArr[i][j].sankeyID);
		if(j == nodeMapArr[i].length - 1){
		    ret[count] = {
			sankeyID : count,
			name : nodeMapArr[i][0].name,
			specialID: nodeMapArr[i][0].specialID,
			runTime: runTime,
		    }
		}
	    }
	}
	count++;
    }
    return ret;
}

function nodeToIDMap(nodes, graphs){
    let ret = {};
    for(var i = 0; i < graphs.length; i++){
	for(var nodeID = 0; nodeID < nodes.length; nodeID++){
	    if(nodes[nodeID].graph == i){
		ret[nodes[nodeID].specialID] = nodeID;
	    }
	}
    }
    return ret;
}

/*function aggregateEdges(nodes, nodeIDMap, graphs){
    let ret = [];
    let color = ['#ff0', '#0af','#0f6f6a'];
    for(let i = 0; i < graphs.length; i++){
	let edges = graphs[i].edges;
	for(let edgeID = 0; edgeID < edges.length; edgeID++){
	    edges[edgeID].sourceLabel = edges[edgeID].sourceLabel + '/G-' + i;
	    edges[edgeID].targetLabel = edges[edgeID].targetLabel + '/G-' + i;
	    edges[edgeID].sourceID = nodeIDMap[edges[edgeID].sourceLabel];
	    edges[edgeID].targetID = nodeIDMap[edges[edgeID].targetLabel];
	    edges[edgeID].source = nodes[nodeIDMap[edges[edgeID].sourceLabel]];
	    edges[edgeID].target = nodes[nodeIDMap[edges[edgeID].targetLabel]];	    
	    edges[edgeID].source.sankeyID = nodeIDMap[edges[edgeID].sourceLabel];
	    edges[edgeID].target.sankeyID = nodeIDMap[edges[edgeID].targetLabel];
	    edges[edgeID].color = color[i];
	    edges[edgeID].graph = i;
	    ret.push(edges[edgeID]);
	}
    }
    return ret;
    }*/

function aggregateEdges(nodes, graphs){
    console.log(nodes);
}

function dualView(data){
    let maxNodeSize = 400;
    let graphs = data['graphs'][0];
    let aggrNodes = [];
    let aggrEdges = [];

    graphs = sortNodesEdges(graphs);
    aggrNodes = aggregateNodes(graphs);
    aggrEdges = aggregateEdges(aggrNodes, graphs);
    
//    console.log(aggrNodes, aggrEdges);

/*   let diffSankey1 = new diffSankey({
       ID: '#procedure_view',
       width: $('#procedure_view').width(),
       height: $('#procedure_view').height(),
       margin: { top: 0, right: 10, bottom: 10, left:10 },
       data: { 'nodes': aggrNodes, 'links': aggrEdges , 'graphCount': graphs.length, 'nodeIDMap': nodeIDMap },
       clickCallBack: nodeClickCallBack,
       maxNodeSize: maxNodeSize
   });*/
}
