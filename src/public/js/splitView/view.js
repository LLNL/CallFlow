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
    let aggrNodes = {};
    var count = 0;
    for(let i = 0; i < graphs.length; i++){
	let nodeInGraph = 0;
	let nodes = graphs[i].sortedNodesArr;
	for(let nodeID = 0; nodeID < nodes.length; nodeID++){
	    let node = nodes[nodeID];
	    if(aggrNodes[node.name] == undefined){
		aggrNodes[node.name] = {};
	    }
	    aggrNodes[node.name].sankeyID = nodeCount;
	    aggrNodes[node.name].graph = i;
	    aggrNodes[node.name].graphSankeyID = node.sankeyID;
	    nodeCount += 1;


	    /* aggrNodes[node.name].sankeyID = node.sankeyID;
	    aggrNodes[node.name].name = node.name;
	    aggrNodes[node.name].runTime += node.runTime;
	    aggrNodes[node.name].value = 1000;
	    aggrNodes[node.name].dy +=100; */ 
	}
    }
    return sortObjToArr(aggrNodes, 'runTime');
}

function dualView(data){
    let maxNodeSize = 400;
    let graphs = data['graphs'][0];
    let aggrNodes = [];
    let aggrEdges = [];

    graphs = sortNodesEdges(graphs);
    
    
    for(var i = 0; i < graphs[0].sortedNodesArr.length; i++){
	aggrNodes.push(graphs[0].sortedNodesArr[i]);
    }

    for(var i = 0; i < graphs[1].sortedNodesArr.length; i++){
	aggrNodes.push(graphs[1].sortedNodesArr[i]);
    }

    for(var i = 0; i < graphs[0].edges.length; i++){
	aggrEdges.push(graphs[0].edges[i]);
    }

    for(var i = 0; i < graphs[1].edges.length; i++){
	aggrEdges.push(graphs[1].edges[i]);
    }

    console.log(aggrNodes, aggrEdges);

    //    let aggrNodes = aggregateNodes(graphs);
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
