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

/* 
   
*/ 
function aggregateNodes(graphs){
    let aggrNodes = [];
    var nodeCount = 0;
    for(let i = 0; i < graphs.length; i++){
	let nodeInGraph = 0;
	let nodes = graphs[i].sortedNodesArr;
	for(let nodeID = 0; nodeID < nodes.length; nodeID++){
	    let node = nodes[nodeID];
	    node.graphSankeyID = node.sankeyID;
	    node.sankeyID = nodeCount;
	    node.graph = i;
	    aggrNodes.push(node);
	    nodeCount += 1;
	}
    }
    aggrNodes.sort( (a,b) => {
	return b['runTime'] - a['runTime'];
    })
    return aggrNodes;
}

function nodeToIDMap(nodes, graphs){
    let ret = [];
    for(var i = 0; i < graphs.length; i++){
	ret[i] = [];
	for(var nodeID = 0; nodeID < nodes.length; nodeID++){
	    if(nodes[nodeID].graph == i){
		ret[i][nodes[nodeID].name] = nodes[nodeID].sankeyID;
	    }
	}
    }
    return ret;
}

function aggregateEdges(nodeIDMap, graphs){
    let ret = [];
    console.log(graphs);
    for(let i = 0; i < graphs.length; i++){
	let edges = graphs[i].edges;
	for(let edgeID = 0; edgeID < edges.length; edgeID++){
	    
	}
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
    nodeIDMap = nodeToIDMap(aggrNodes, graphs);
    aggregateEdges(nodeIDMap, graphs);
    
/*    for(var i = 0; i < graphs[0].sortedNodesArr.length; i++){
	aggrNodes.push(graphs[0].sortedNodesArr[i]);
    }

    for(var i = 0; i < graphs[1].sortedNodesArr.length; i++){
	aggrNodes.push(graphs[1].sortedNodesArr[i]);
    }*/

    for(var i = 0; i < graphs[0].edges.length; i++){
	aggrEdges.push(graphs[0].edges[i]);
    }

    for(var i = 0; i < graphs[1].edges.length; i++){
	aggrEdges.push(graphs[1].edges[i]);
    }

    console.log(aggrNodes, aggrEdges);

   let diffSankey1 = new diffSankey({
	ID: '#procedure_view',
	width: $('#procedure_view').width(),
	height: $('#procedure_view').height()/2,
	margin: { top: 0, right: 10, bottom: 10, left:10 },
	data: { 'nodes': aggrNodes, 'links': aggrEdges },
	clickCallBack: nodeClickCallBack,
	maxNodeSize: maxNodeSize
    })
}
