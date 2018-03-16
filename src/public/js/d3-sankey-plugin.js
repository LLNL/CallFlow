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
function d3sankey() {
    var sankey = {},
	nodeWidth = 24,
	nodePadding = 8,
	size = [1, 1],
	nodes = [],
	links = [],
	nodeIDMap = {};
	graphCount = 0,
	xSpacing = 1,
	referenceValue = 0;

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
	if(!arguments.length) return referenceValue;
	referenceValue = +_;
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

    function d3sum(arr, graph){
	let ret = 0;
	for(let i = 0; i < arr.length; i+=1){
	    if(arr[i].graph == graph){
		ret += arr[i].value;
	    }
	}
	return ret;
    }

    // Compute the value (size) of each node by summing the associated links.
    function computeNodeValues() {
	nodes.forEach(function(node) {
	    
	    node.value = Math.max(
		d3sum(node.sourceLinks, node.graph),
		d3sum(node.targetLinks, node.graph)
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
	console.log(nodes, links);
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
    
    // Iteratively assign the (x-position) for each node.
    // Nodes are assigned the maximum breadth of incoming neighbors plus one;
    // nodes with no incoming links are assigned breadth zero, while
    // nodes with no outgoing links are assigned the maximum breadth.
    function computeNodeBreadths() {
	var graphNodes = partition(nodes),
            nextNodes = [],
            depthArr = [];
	
	for(var i = 0 ; i < graphCount; i++){
	    let remainingNodes = [graphNodes[i][0]];
	    let depth = 0;
	    while (remainingNodes.length) {
		console.log(nextNodes);
		nextNodes = [];
		remainingNodes.forEach(function(node) {
		    node.depth = depth;
		    node.dx = nodeWidth;
		    node.sourceLinks.forEach(function(link) {
			console.log(nodes[nodeIDMap[link.targetLabel]])
			nextNodes.push(nodes[nodeIDMap[link.targetLabel]]);
		    });
		});
		remainingNodes = nextNodes;
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
	console.log(nodes);
    }

    function moveSourcesRight() {
	nodes.forEach(function(node) {
	    if (!node.targetLinks.length) {
		node.depth = d3.min(node.sourceLinks, function(d) { console.log(d); return d.target; }) - 1;
	    }
	});
    }

    function scaleNodeBreadths(kx) {
	nodes.forEach(function(node) {
	    if(node.depth < 4){
		node.x = node.depth * minDistanceBetweenNode;
	    }
	    else{
		node.x = widthScale(node.depth);
	    }
	});

    }

    function computeNodeDepths(iterations) {
	var nodesByBreadth = d3.nest()
            .key(function(d) { return d.x; })
            .sortKeys(d3.ascending)
            .entries(nodes)
            .map(function(d) { return d.values; });

	//
	initializeNodeDepth();
	resolveCollisions();
	for (var alpha = 1; iterations > 0; --iterations) {
	    relaxRightToLeft(alpha *= .99);
	    resolveCollisions();
	    relaxLeftToRight(alpha);
	    resolveCollisions();
	}

	function initializeNodeDepth() {
	    var ky = d3.min(nodesByBreadth, function(nodes) {
		var divValue = 1;
		if(referenceValue > 0){
		    divValue = referenceValue;
		}
		else{
		    divValue = d3.sum(nodes, value);
		}
		// console.log("ky",(size[1] - (nodes.length - 1) * nodePadding) / divValue, size[1], (nodes.length - 1) * nodePadding, nodes.length, nodePadding);
		// console.log(nodes);
		// return (size[1] - (nodes.length - 1) * nodePadding) / divValue;
		return Math.abs((size[1] - (nodes.length - 1) * nodePadding)) / divValue;
	    });

	    //need to change the scaling here
	    nodesByBreadth.forEach(function(nodes) {
		nodes.forEach(function(node, i) {
		    var maxY = 0;
		    links.forEach(function(edge){
			if(edge["targetID"] == node['sankeyID']){
			    if(edge["source"] != null && edge["source"]['y'] != null){
				maxY = Math.max(maxY, edge["source"]['y']);
			    }
			}
		    })

		    node.maxY = maxY;
		    node.y = Math.max(maxY, i);
		    node.parY = maxY;
		    // node.y = i;
		    node.dy = node.value*ky + node.graph*100;
		    // node.dy = node["inTime"] * ky;
		});

		nodes.sort(function(a,b){
		    return a["parY"] - b["parY"];
		})
	    });

	    links.forEach(function(link) {
		link.dy = link.value * ky;
	    });
	}

	function relaxLeftToRight(alpha) {
	    nodesByBreadth.forEach(function(nodes, breadth) {
		nodes.forEach(function(node) {
		    if (node.targetLinks.length) {
			var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
			node.y += (y - center(node)) * alpha;
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
			var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
			node.y += (y - center(node)) * alpha;
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
	    // return b["runTime"] - a["runTime"];

	    if(a["parY"] > b["parY"]){
		return a["parY"] > b["parY"];
	    }

	    // if(a["maxLinks"] <= b["maxLinks"]){
            return a["maxLinks"] - b["maxLinks"];
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
	// return node.y + node.dy / 2;
	return 0;
    }

    function value(link) {
	return link.value;
    }

    return sankey;
};
