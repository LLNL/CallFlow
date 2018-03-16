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
	    node.nameTemp = node.specialID;
	    node.specialID = node.specialID + '/G-' + i;
	    node.name = node.name + '/G-'+i;
	}
    }
    aggrNodes.sort( (a,b) => {
	return b['runTime'] - a['runTime'];
    })
    return aggrNodes;
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

function aggregateEdges(nodes, nodeIDMap, graphs){
    let ret = [];
    let color = ['#ff0', '#0af','ffa'];
    for(let i = 0; i < graphs.length; i++){
	let edges = graphs[i].edges;
	console.log(edges);
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
    console.log(ret);
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
    console.log(nodeIDMap);
    aggrEdges = aggregateEdges(aggrNodes, nodeIDMap, graphs);
    
    console.log(aggrNodes, aggrEdges);

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
