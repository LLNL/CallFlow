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
function d3sankeySingle() {
    var sankey = {},
        nodeWidth = 24,
        nodePadding = 8,
        size = [1, 1],
        nodes = [],
        links = [],
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
            // console.log(d.dy, d);
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
            var source = link.sourceID,
                target = link.targetID;

            if (typeof source === "number") source = link.source = nodes[link.sourceID];
            if (typeof target === "number") target = link.target = nodes[link.targetID];
            
            source.sourceLinks.push(link);
            target.targetLinks.push(link);

            target["maxLinkVal"] = Math.max(target["maxLinkVal"], link["value"]);
            source["maxLinkVal"] = Math.max(source["maxLinkVal"], link["value"]);

            target["minLinkVal"] = Math.min(target["minLinkVal"], link["value"]);
            source["minLinkVal"] = Math.min(source["minLinkVal"], link["value"]);

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
                d3sum(node.sourceLinks,'value'),
                d3sum(node.targetLinks,'value')
            );

            console.log(d3sum(node.sourceLinks,'value'), d3sum(node.targetLinks,'value'))
            console.log(node.value, node.name);

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

    // Iteratively assign the breadth (x-position) for each node.
    // Nodes are assigned the maximum breadth of incoming neighbors plus one;
    // nodes with no incoming links are assigned breadth zero, while
    // nodes with no outgoing links are assigned the maximum breadth.
    function computeNodeBreadths() {
/*        var remainingNodes = nodes,
            nextNodes,
            x = 0;
        console.log(remainingNodes);
        while (remainingNodes.length && x < 100) {
            console.log(remainingNodes);
            nextNodes = [];
            remainingNodes.forEach(function(node) {
                node.x = x;
                console.log(x);
                node.dx = nodeWidth;
                node.sourceLinks.forEach(function(link) {
                    nextNodes.push(link.target);
                });
            });
            remainingNodes = nextNodes;
            ++x;
            }*/

        nodes.forEach(function(node) {
            node.x = node.level; 
            node.dx = nodeWidth;
        })

        x = 6;
        
        minDistanceBetweenNode = nodeWidth * 2;

        var minX;
        if(x < 5){
            widthScale = d3.scale.pow().domain([x,x + 1]).range([0, size[0]]);
        }

        widthScale = d3.scale.pow().domain([4,x]).range([4*minDistanceBetweenNode, size[0]]).exponent(.1);
        
        moveSinksRight(x);
        scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
    }

    function moveSourcesRight() {
        nodes.forEach(function(node) {
            if (!node.targetLinks.length) {
                node.x = d3.min(node.sourceLinks, function(d) { return d.target.x; }) - 1;
            }
        });
    }

    function moveSinksRight(x) {
        nodes.forEach(function(node) {
            // if (!node.sourceLinks.length) {
            //   node.x = x - 1;
            // }
            // console.log(xSpacing);
            // node.x = node["level"] * xSpacing;
            
        });
    }

    function scaleNodeBreadths(kx) {
        nodes.forEach(function(node) {

            // node.x *= kx;

            var nodeX = node.x;

            if(nodeX < 10){
                nodeX = nodeX * minDistanceBetweenNode;
            }
            else{
                nodeX = widthScale(nodeX);
            }

            node.x = nodeX;

            //   if(node.targetLinks.length <= 1){
            //     node.x = node.x * (nodeWidth + 10) ;
            //   }
            //   else{

            //      node.x = node.targetLinks.length * 100 + node.x * (nodeWidth + 10);
            //   }

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
                return Math.abs((size[1] - (nodes.length - 1) * nodePadding)) / divValue;
            });

            nodesByBreadth.forEach(function(nodes) {
                nodes.forEach(function(node, i) {
                    var maxY = 0;
                    links.forEach(function(edge){
                        if(edge["targetID"] == node['sankeyID']){
                            if(edge["source"] != null && edge["source"]['y'] != null){
                                maxY = Math.max(maxY, edge["source"]['y']);
                            }
                        }
                    });
                    node.y = Math.max(maxY, i);
                    node.parY = maxY;
                    node.dy = node.value * ky;
                    console.log(node.value, node.name, ky)
                });

                nodes.sort(function(a,b){
                    return a['parY'] - b['parY'];
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
                        var y = d3sum(node.targetLinks, "value");
                        node.y += y*alpha;
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
                        var y = d3sum(node.sourceLinks, 'value');
                        node.y += (y) * alpha;
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
                    if (dy > 0){
                        node.y += dy;
                    }
                    
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
            if(a["parY"] > b["parY"]){
                return a["parY"] > b["parY"];
            }
            return a["maxLinks"] - b["maxLinks"];
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
