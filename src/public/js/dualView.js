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
    for(let i = 0; i < graphs.length; i++){
	let nodes = graphs[i].sortedNodesArr;
	for(let nodeID = 0; nodeID < nodes.length; nodeID++){
	    let node = nodes[nodeID];
	    if(aggrNodes[node.name] == undefined){
		aggrNodes[node.name] = {};
		aggrNodes[node.name].runTime = 0;
	    }
	    aggrNodes[node.name].runTime += node.runTime;
	}
    }
    return sortObjToArr(aggrNodes, 'runTime');
}

function dualView(data){
    let graphs = data['graphs'][0];
    graphs = sortNodesEdges(graphs);
    console.log(graphs);
    let aggrNodes = aggregateNodes(graphs);
    let diffSankey1 = new diffSankey({
	ID: '#procedure_view',
	width: $('#procedure_view').width(),
	height: $('#procedure_view').height()/2,
	margin: { top: $('#procedure_view').height/2, right: 10, bottom: 10, left:10 },
	data: { 'nodes': aggrNodes, 'links': [] },
	clickCallBack: nodeClickCallBack,
	maxNodeSize: maxNodeSize
    })
}
