/*******************************************************************************
 * Copyright (c) 2017, Lawrence Livermore National Security, LLC.
 * Produced at the Lawrence Livermore National Laboratory.
 *
 * Written by Huu Tan Nguyen <htpnguyen@ucdavis.edu>.
 *
 * LLNL-CODE-740862. All rights reserved.
 *
 * This file is part of CallFlow. For details, see:
 * https://github.com/LLNL/CallFlow
 * Please also read the LICENSE file for the MIT License notice.
 ******************************************************************************/

// d3.sankey = function() {
function d3sankeyMultiple() {
    var sankey = {},
	nodeWidth = 24,
	nodePadding = 8,
	size = [1, 1],
	nodes = [],
	links = [],
	nodeIDMap = {},
	graphCount = 0,
	xSpacing = 1,
	rootRunTime = [];

    var widthScale;
    
    var minDistanceBetweenNode = 0;

    sankey.nodeWidth = function(_) {
	if (!arguments.length) return nodeWidth;
	nodeWidth = +_;
	return sankey;
    };

    sankey.xSpacing = function(_) {
	if(!arguments.length) return xSpacing;
	xSpacing = +_;
	return sankey;
    }

    sankey.nodePadding = function(_) {
	if (!arguments.length) return nodePadding;
	nodePadding = +_;
	return sankey;
    };

    sankey.nodes = function(_) {
	if (!arguments.length) return nodes;
	nodes = _;
	return sankey;
    };

    sankey.nodeIDMap = function(_){
	if(!arguments.length) return nodeIDMap;
	nodeIDMap = _;
	return sankey;
    };

    sankey.graphCount = function(_){
	if(!arguments.length) {
	    return graphCount;
	}
	graphCount = _;
	return sankey;
    };
    
    sankey.links = function(_) {
	if (!arguments.length) return links;
	links = _;
	return sankey;
    };

    sankey.size = function(_) {
	if (!arguments.length) return size;
	size = _;
	return sankey;
    };

    sankey.layout = function(iterations) {
	computeNodeLinks();
	computeNodeValues();
	computeNodeBreadths();
	computeNodeDepths(iterations);
	computeLinkDepths();
	return sankey;
    };

    sankey.relayout = function() {
	computeLinkDepths();
	return sankey;
    };

    sankey.setXSpacing = function(_){
	if(!arguments.length) return xSpacing;
	xSpacing = +_;
	return sankey;    
    }

    sankey.setReferenceValue = function(_){
	if(!arguments.length) return rootRunTime;
	rootRunTime = _;
	return sankey;
    }

    sankey.link = function() {
	// var curvature = .5;
	var curvature = .4;

	// This function draw links at top
	// function link(d) {
	//   var x0 = d.source.x + d.source.dx,
	//       x1 = d.target.x,
	//       xi = d3.interpolateNumber(x0, x1),
	//       x2 = xi(curvature),
	//       x3 = xi(1 - curvature),
	//       y0 = d.source.y + d.sy + d.dy / 2,
	//       y1 = d.target.y + d.ty + d.dy / 2;
	//   return "M" + x0 + "," + y0
	//        + "C" + x2 + "," + y0
	//        + " " + x3 + "," + y1
	//        + " " + x1 + "," + y1;
	// }

	// this function draw links at bottom
	function link(d) {
	    var x0 = d.source.x + d.source.dx,
		x1 = d.target.x,
		xi = d3.interpolateNumber(x0, x1),
		x2 = xi(curvature),
		x3 = xi(1 - curvature),
		y0 = d.source.y + d.sy + d.dy / 2,
		y1 = d.target.y + d.ty + d.dy / 2;

	    return "M" + x0 + "," + y0
		+ "C" + x2 + "," + y0
		+ " " + x3 + "," + y1
		+ " " + x1 + "," + y1;
	}

	link.curvature = function(_) {
	    if (!arguments.length) return curvature;
	    curvature = +_;
	    return link;
	};

	return link;
    };

    function fetchCorrectNode(id, graph){
	for(let i = 0; i < nodes.length; i++){
	    if(nodes[i].graph == graph && nodes[i].graphSankeyID == id){
		return nodes[i];
	    }
	}
    }

    // Populate the sourceLinks and targetLinks for each node.
    // Also, if the source and target are not objects, assume they are indices.
    function computeNodeLinks() {
	nodes.forEach(function(node) {
	    node.sourceLinks = [];
	    node.targetLinks = [];
	    node["maxLinkVal"] = 0;
	    node["minLinkVal"] = 1000000000000000;
	});

	links.forEach(function(link) {
	    var sourceID = link.sourceID,
		targetID = link.targetID;

	    let source, target;
	    if (typeof sourceID === "number") {
		source = nodes[link.sourceID];
		if(source != undefined){
		    source.sourceLinks.push(link);
		    source["maxLinkVal"] = Math.max(source["maxLinkVal"], link["value"]);
		    source["minLinkVal"] = Math.min(source["minLinkVal"], link["value"]);
		}
	    }

	    if (typeof targetID === "number") {
		target = nodes[link.targetID];
		if(target != undefined){
		    target.targetLinks.push(link);
		    target["maxLinkVal"] = Math.max(target["maxLinkVal"], link["value"]);
		    target["minLinkVal"] = Math.min(target["minLinkVal"], link["value"]);
		}
	    }
	});

	nodes.forEach(function(node){
            var maxOfInandOut = Math.min(node.sourceLinks.length, node.targetLinks.length);
            if(node.sourceLinks.length == 0){
		//it has no outgoing links
		maxOfInandOut = node.targetLinks.length;
            }
            // var maxOfInandOut = node.sourceLinks.length + node.targetLinks.length;
            node["maxLinks"] = maxOfInandOut;
	})
    }

    function d3sum(values, valueOf){
	let sum = 0, value;
	for(let  i = 0 ; i < values.length; i++){
	    sum += values[i][valueOf];
	}
	return sum;
    }

    // Compute the value (size) of each node by summing the associated links.
    function computeNodeValues() {
	nodes.forEach(function(node) {
	    node.value = Math.max(
		d3sum(node.sourceLinks, "value"),
	        d3sum(node.targetLinks, "value")
	    ); 
	    // if(node.level ==  0){
	    //   console.log(node.sourceLinks, node);
	    //   node.value = d3.sum(node.sourceLinks, value);
	    // }
	    // else{
	    //   node.value = d3.sum(node.targetLinks, value);
	    // }

	    // if(node.level == 4 && node["myID"] == 8){
	    //   console.log(node.value, node.targetLinks, node.sourceLinks);
	    // }
	    // node.value = Math.max(
	    //   d3.sum(node.sourceLinks, value),
	    //   d3.sum(node.targetLinks, value)
	    // );

	    // node.value = Math.max(
	    //   d3.sum(node.targetLinks, value)
	    // );
	    // node.value = node["inTime"];
	});
    }

    function partition(nodes){
	let ret = [];
	for(let i = 0; i < nodes.length; i++){
	    if(ret[nodes[i].graph] == undefined){
		ret[nodes[i].graph] = [];
	    }
	    ret[nodes[i].graph].push(nodes[i]);
	}
	
	ret.sort( (a,b) => {
	    return b.runTime - a.runTime;
	})
	
	return ret;
    }

    function d3max(arr){
	let ret = 0;
	for(let i = 0; i < arr.length; i++){
	    ret = Math.max(arr[i], ret);
	}
	return ret;
    }

    function arrayContains(arr, id){
	for(let i = 0; i < arr.length; i++){
	    if(arr[i] == id){
		return true;
	    }
	}
	return false;
    }
    
    // Iteratively assign the (x-position) for each node.
    // Nodes are assigned the maximum breadth of incoming neighbors plus one;
    // nodes with no incoming links are assigned breadth zero, while
    // nodes with no outgoing links are assigned the maximum breadth.
    function computeNodeBreadths() {
	var graphNodes = nodes,
            nextNodes = [],
            depthArr = [];

	for(var i = 0 ; i < graphs.length; i++){
	    let depth = 0;
	    while (graphNodes.length) {		
		nextNodes = [];
		graphNodes.forEach(function(node) {
		    if(node.name == 'Root'){
			node.depth = 0;
		    }
		    else if(node.name == 'libmonitor.so.0.0.0' || node.name == 'unknown'){
			node.depth = 1;
		    }
		    else if(node.name == 'lulesh2.0'){
			node.depth = 3;
		    }
		    else if(node.name == 'libc-2.17.so'){
			node.depth = 2;
		    }
		    else if(node.name == 'libmpi-12.0.5'){
			node.depth = 3;
		    }
		    else{
			node.depth = 4;
		    }
		    
//		    node.depth = Math.ceil(Math.random()*5);
		    node.dx = nodeWidth;
		    node.sourceLinks.forEach(function(link) {
			if(node.specialID[0] != link.targetLabel){
//			    nextNodes.push(nodes[nodeIDMap[link.targetLabel]]);
			}
		    });
		});
		graphNodes = nextNodes;
		++depth;
	    }
	    depthArr.push(depth);
	}
	minDistanceBetweenNode = nodeWidth * 2;
	let depthMax = d3max(depthArr);
//	moveSourcesRight(depthMax);
	var minX;
	if(depthMax < 5){
	    widthScale = d3.scale.pow().domain([depthMax,depthMax + 1]).range([0, size[0]]);
	}

	widthScale = d3.scale.pow().domain([4, depthMax]).range([(depthMax-1)*minDistanceBetweenNode, size[0]]).exponent(.1);
	
	scaleNodeBreadths((size[0] - nodeWidth) / (depthMax - 1));
    }

    function moveSourcesRight() {
	nodes.forEach(function(node) {
	    if (!node.targetLinks.length) {
		node.depth = d3.min(node.sourceLinks, function(d) { return d.target; }) - 1;
	    }
	});
    }

    function scaleNodeBreadths(kx) {
	nodes.forEach(function(node) {
	    //	    if(node.depth > 0){
		node.x = node.depth * minDistanceBetweenNode;
//	    }
//	    else{
//		node.x = widthScale(node.depth);
//	    }
	});
    }

    function computeNodeDepths(iterations) {
	var nodesByBreadth = d3.nest()
            .key(function(d) { return d.x; })
            .sortKeys(d3.ascending)
            .entries(nodes)
            .map(function(d) {
		let ret = [];
		let idMap = {};
		for(let i = 0; i < d.values.length; i++){
		    if(idMap[d.values[i].name] == undefined){
			ret.push(d.values[i])
		    }
		    idMap[d.values[i].name] = true;
		}
		return d.values;
	    });
	
	initializeNodeDepth();
	resolveCollisions();
	for (var alpha = 1; iterations > 0; --iterations){
	    relaxRightToLeft(alpha *= .99);
	    resolveCollisions();
	    relaxLeftToRight(alpha);
	    resolveCollisions();
	}

	function normalize(obj){
	    let ret = 0;
	    for(let i in obj){
		if(obj.hasOwnProperty(i)){
		    ret = Math.max(ret, obj[i]);
		}
	    }
	    let norm = []
	    for(let i in obj){
		if(obj.hasOwnProperty(i)){
		    norm.push(obj[i]);
		}
	    }
	    return norm;
	}
	
	function initializeNodeDepth() {
	    let divValue = 1;
	    var ky = d3.min(nodesByBreadth, function(nodes) {
		let normalizedReferenceValue = normalize(rootRunTime);
//		if(normalizedReferenceValue > 0){
		    divValue = normalizedReferenceValue;
/*		}
		else{
		    divValue = d3.sum(nodes, value);
		    }*/
		return (Math.abs((size[1] - (nodes.length - 1) * nodePadding))/divValue );
	    });

	    
	    //need to change the scaling here
	    nodesByBreadth.forEach(function(nodes) {
		nodes.forEach(function(node, i) {
		    let maxY = 0;
		    links.forEach(function(edge){
			if(edge["targetID"] == node['sankeyID']){
			    if(edge.source != null && edge.source.y != null){
				maxY = Math.max(maxY, edge.source.y.length);
			    }
			}
		    })
		    node.dy = node.value*ky;
		    // node.dy = node["inTime"] * ky;
		});

/*		nodes.sort(function(a,b){
		    return a["parY"] - b["parY"];
		    })*/
		nodes.sort(function(a,b){
		    return a.value - b.value;
		})
	    });

	    links.forEach(function(link) {
		link.dy = Math.ceil(link.val*ky*link.maxVal);
	    });
	}

	function relaxLeftToRight(alpha) {
	    nodesByBreadth.forEach(function(nodes, breadth) {
		nodes.forEach(function(node) {
		    if (node.targetLinks.length) {
			var y = d3sum(node.sourceLinks, "value") / d3sum(node.targetLinks, "value");
			node.y += y * alpha;
//			node.y = node.dy;
		    }
		});
	    });

	    function weightedSource(link) {
		return center(link.source) * link.value;
	    }
	}

	function relaxRightToLeft(alpha) {
	    nodesByBreadth.slice().reverse().forEach(function(nodes) {
		nodes.forEach(function(node) {
		    if (node.sourceLinks.length) {
			var y = d3sum(node.targetLinks, "value") / d3sum(node.sourceLinks, "value");
//			node.y = node.dy;
			//			node.y += (y - center(node)) * alpha;
			node.y = y * alpha;
		    }
		});
	    });

	    function weightedTarget(link) {
		return center(link.target) * link.value;
	    }
	}

	function resolveCollisions() {
	    nodesByBreadth.forEach(function(nodes) {
		var node,
		    dy,
		    y0 = 0,
		    n = nodes.length,
		    i;

		// Push any overlapping nodes down.
		nodes.sort(ascendingDepth);
		for (i = 0; i < n; ++i) {
		    node = nodes[i];
		    dy = y0 - node.y;
		    if (dy > 0) node.y += dy;
		    y0 = node.y + node.dy + nodePadding;
		}
		
		// If the bottommost node goes outside the bounds, push it back up.
		dy = y0 - nodePadding - size[1];
		if (dy > 0) {
		    y0 = node.y -= dy;

		    // Push any overlapping nodes back up.
		    for (i = n - 2; i >= 0; --i) {
			node = nodes[i];
			dy = node.y + node.dy + nodePadding - y0;
			if (dy > 0) node.y -= dy;
			y0 = node.y;
		    }
		}
	    });
	}

	function ascendingDepth(a, b) {
	    // return a.y - b.y;
	    // return b.y - a.y;
	    return b["runTime"] - a["runTime"];

/*	    if(a["parY"] > b["parY"]){
		return a["parY"] > b["parY"];
	    }*/

	    // if(a["maxLinks"] <= b["maxLinks"]){
            //return a["maxLinks"] - b["maxLinks"];
	    // }
	    // else{
	    //   return a["minLinkVal"] - b["minLinkVal"];
	    // }
	}
    }

    function computeLinkDepths() {
	nodes.forEach(function(node) {
	    node.sourceLinks.sort(ascendingTargetDepth);
	    node.targetLinks.sort(ascendingSourceDepth);

	    // node.sourceLinks.sort(descendingTargetDepth);
	    // node.targetLinks.sort(descendingSourceDepth);

	    // node.sourceLinks.sort(ascendingEdgeValue);
	    // node.targetLinks.sort(descendingEdgeValue);

	});
	nodes.forEach(function(node) {
	    var sy = 0, ty = 0;
	    node.sourceLinks.forEach(function(link) {
		link.sy = sy;
		sy += link.dy;
		
	    });
	    node.targetLinks.forEach(function(link) {
		link.ty = ty;
		ty += link.dy;
	    });
	});

	function ascendingSourceDepth(a, b) {
	    return a.source.y - b.source.y;
	}

	function ascendingTargetDepth(a, b) {
	    return a.target.y - b.target.y;
	}

	function descendingTargetDepth(a, b){
	    return b.target.y - a.target.y;
	}

	function descendingSourceDepth(a,b){
	    return b.source.y - a.source.y;
	}

	function ascendingEdgeValue(a, b){
	    return a["value"] - b["value"];
	}

	function descendingEdgeValue(a, b){
	    return b["value"] - a["value"];
	}    

    }

    function center(node) {
	return node.y + node.dy / 2;
	return 0;
    }

    return sankey;
};
