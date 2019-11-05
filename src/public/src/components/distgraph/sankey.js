/*******************************************************************************
 * Copyright (c) 2017-19, Lawrence Livermore National Security, LLC.
 * Produced at the Lawrence Livermore National Laboratory.
 *
 * Written by Suraj Kesavan <spkesavan@ucdavis.edu>.
 *
 * LLNL-CODE-740862. All rights reserved.
 *
 * This file is part of CallFlow. For details, see:
 * https://github.com/LLNL/CallFlow
 * Please also read the LICENSE file for the MIT License notice.
 ******************************************************************************/
import * as  d3 from 'd3'
import { scalePow } from 'd3-scale';


export default function Sankey() {
    let sankey = {}
    let nodeWidth = 24
    let nodePadding = 8
    let size = [1, 1]
    let nodes = []
    let links = []
    let levelSpacing = 10
    let referenceValue = 0
    let minNodeScale = 0
    let maxLevel = 1
    let datasets = []
    let store = {}
    let nodesByBreadth
    let total_in = {}
    let total_out = {}


    var widthScale;
    var minDistanceBetweenNode = 0;

    sankey.nodeWidth = function (_) {
        if (!arguments.length) return nodeWidth;
        nodeWidth = +_;
        return sankey;
    };

    sankey.levelSpacing = function (_) {
        if (!arguments.length) return levelSpacing;
        levelSpacing = +_;
        return sankey;
    }

    sankey.nodePadding = function (_) {
        if (!arguments.length) return nodePadding;
        nodePadding = +_;
        return sankey;
    };

    sankey.nodes = function (_) {
        if (!arguments.length) return nodes;
        nodes = _;
        return sankey;
    };

    sankey.links = function (_) {
        if (!arguments.length) return links;
        links = _;
        return sankey;
    };

    sankey.size = function (_) {
        if (!arguments.length) return size;
        size = _;
        return sankey;
    };

    sankey.maxLevel = function (_) {
        if (!arguments.length) return maxLevel
        maxLevel = _
        return sankey
    };

    sankey.datasets = function (_) {
        if (!arguments.length) return datasets
        datasets = _
        return sankey
    }

    sankey.store = function (_) {
        if (!arguments.length) return store
        store = _
        return sankey
    }

    sankey.layout = function (iterations) {
        computeNodeLinks()
        console.log("Computed Node links.")
        computeNodeValues()
        console.log("Computed node values.")
        computeNodeBreadths()
        console.log("Computed node breadths.")

        computeNodeDepths(iterations);
        console.log("Computed node depths")
        computeLinkDepths()
        console.log("Computed link depths.")
        sankey.total_in = total_in
        sankey.total_out = total_out
        return sankey;
    };

    sankey.relayout = function () {
        computeLinkDepths();
        return sankey;
    };

    sankey.setXSpacing = function (_) {
        if (!arguments.length) return xSpacing;
        xSpacing = +_;
        return sankey;
    }

    sankey.setReferenceValue = function (_) {
        if (!arguments.length) return referenceValue;
        referenceValue = +_;
        return sankey;
    }

    sankey.setMinNodeScale = function (_) {
        if (!arguments.length) return minNodeScale;
        minNodeScale = +_;
        return sankey;
    }

    sankey.link = function () {
        var curvature = .4;

        // this function draw links at bottom
        function link(d) {
            var x0 = d.source.x + d.source.height,
                x1 = d.target.x,
                xi = d3.interpolateNumber(x0, x1),
                x2 = xi(curvature),
                x3 = xi(1 - curvature),
                y0 = d.source.y + d.sy + d.height / 2,
                y1 = d.target.y + d.ty + d.height / 2;
            return "M" + x0 + "," + y0
                + "C" + x2 + "," + y0
                + " " + x3 + "," + y1
                + " " + x1 + "," + y1;
        }

        link.curvature = function (_) {
            if (!arguments.length) return curvature;
            curvature = +_;
            return link;
        };
        return link;
    };

    // Populate the sourceLinks and targetLinks for each node.
    // Also, if the source and target are not objects, assume they are indices.
    function computeNodeLinks() {
        nodes.forEach(function (node) {
            node.sourceLinks = [];
            node.targetLinks = [];
            node["maxLinkVal"] = 0;
            node["minLinkVal"] = 1000000000000000;
        });

        links.forEach(function (link) {
            // if (link.sourceID != undefined || link.targetID != undefined) {
            var source = link.sourceID,
                target = link.targetID;

            source = link.source = nodes[link.sourceID];
            target = link.target = nodes[link.targetID];

            // Come back here and correct this bug. 
            if (source != undefined && target != undefined) {
                source.sourceLinks.push(link);
                target.targetLinks.push(link);

                target["maxLinkVal"] = Math.max(target["maxLinkVal"], link["weight"]);
                source["maxLinkVal"] = Math.max(source["maxLinkVal"], link["weight"]);

                target["minLinkVal"] = Math.min(target["minLinkVal"], link["weight"]);
                source["minLinkVal"] = Math.min(source["minLinkVal"], link["weight"]);
            }

            // }
        });

        nodes.forEach(function (node) {
            var maxOfInandOut = Math.max(node.sourceLinks.length, node.targetLinks.length);

            if (node.sourceLinks.length == 0) {
                //it has no outgoing links
                maxOfInandOut = node.targetLinks.length;
            }
            node["maxLinks"] = maxOfInandOut;
        })

        // swap the source links and target links
        links.forEach(function (link) {
            let temp = link.sourceLinks;
            link.sourceLinks = link.targetLinks
            link.targetLinks = temp
        })
    }

    function d3sum(values, attr) {
        let sum = 0, value
        for (let i = 0; i < values.length; i++) {
            sum += values[i][attr] / values.length
        }
        return sum
    }

    // Compute the value (size) of each node by summing the associated links.
    function computeNodeValues() {
        nodes.forEach(function (node) {
            node.value = Math.max(
                d3.sum(node.sourceLinks, value),
                d3.sum(node.targetLinks, value));
        });
    }

    function findroot() {
        let ret = []
        nodes.forEach(function (node) {
            if (node['id'] == "libmonitor.so.0.0.0=<program root>") {
                ret.push(node)
            }
        })
        return ret
    }

    // Iteratively assign the breadth (x-position) for each node.
    // Nodes are assigned the maximum breadth of incoming neighbors plus one;
    // nodes with no incoming links are assigned breadth zero, while
    // nodes with no outgoing links are assigned the maximum breadth.
    function computeNodeBreadths() {
        let remainingNodes = findroot()
        let nextNodes = [];
        let level = 0
        while (remainingNodes.length) {
            nextNodes = [];
            remainingNodes.forEach(function (node) {
                node.level = level
                node.dx = nodeWidth;
                node.sourceLinks.forEach(function (link) {

                    nextNodes.push(link.target);
                });
            });
            remainingNodes = nextNodes;
            ++level
        }
        nodes.forEach(function (node) {
            node.dx = nodeWidth
        })

        minDistanceBetweenNode = nodeWidth
        widthScale = scalePow().domain([0, level + 1]).range([minDistanceBetweenNode, size[0]])
        scaleNodeBreadths((size[0] - nodeWidth / 2) / (maxLevel - 1));
    }

    function moveSourcesRight() {
        nodes.forEach(function (node) {
            if (!node.targetLinks.length) {
                node.x = d3.min(node.sourceLinks, function (d) { return d.target.level; }) - 1;
            }
        });
    }

    function moveSinksRight(x) {
        nodes.forEach(function (node) {
            // basically fix the last leaf in the graph as maximum possible level
            if (!node.sourceLinks.length) {
                //		node.x = x - 1;
            }
            //	    node.x = d3.min(node.sourceLinks, function(d) { return d.target.x; });
            //            node.x = node.x + 1;
        });
    }

    function scaleNodeBreadths(kx) {
        nodes.forEach(function (node) {
            let level = node.level
            let x = widthScale(level)
            node.x = x
        });
    }

    function calculateTotalLevelFlow(){
        let level = 0
        nodesByBreadth.forEach(function (nodes) {
            nodes.forEach(function (node) {
                total_in[level] = 0
                total_out[level] = 0

                links.forEach(function (link) {
                    if (link.target == node) {
                        // if (link.source != null && link.source.y != null) {
                            total_in[level] += link.target.in;
                        // }
                    }
                    if (link.source == node) {
                        // if (edge.target != null && edge.target.y != null) {
                            total_out[level] += link.source.out;
                        // }
                    }
                });
            })
            level += 1
        })
    }

    function computeNodeDepths(iterations) {
        nodesByBreadth = d3.nest()
            .key(function (d) { return d.level; })
            .sortKeys(d3.ascending)
            .entries(nodes)
            .map(function (d) { return d.values; })
        
        calculateTotalLevelFlow()
        initializeNodeDepth();
        resolveCollisions();
        iterations = 32
        for (var alpha = 1; iterations > 0; --iterations) {
            relaxRightToLeft(alpha *= .99);
            resolveCollisions();
            relaxLeftToRight(alpha);
            resolveCollisions();
        }

        function initializeNodeDepth() {
            let scale = d3.min(nodesByBreadth, function (nodes) {
                var divValue = 1;
                if (referenceValue > 0) {
                    divValue = referenceValue;
                }
                else {
                    divValue = d3.sum(nodes, d => d['time (inc)']);
                }
                return Math.abs((size[1] - (nodes.length - 1) * nodePadding)) / divValue;
            });

            let idx = 0, level = {}
            nodesByBreadth.forEach(function (nodes) {
                // Sort the nodes in a given level
                let n = nodes.sort(function (a, b) {
                    return b['time (inc)'] - a['time (inc)'];
                })

                // Asssign levels to the nodes based on time (inc)
                for (let i = 0; i < n.length; i += 1) {
                    level[n[i].id] = i
                }

                n.forEach(function (node, i) {
                    let nodeHeight = 0;

                    links.forEach(function (edge) {
                        if (edge["target"] == node) {
                            if (edge["source"] != null && edge["source"]['y'] != null) {
                                nodeHeight = Math.max(nodeHeight, edge["source"]['y']);
                            }
                        }
                    });
                    node.parY = nodeHeight;

                    node.level = level[node.id]

                    // Sum the heights of nodes on top of the current node. 
                    node.y = 0
                    for (let j = 0; j < i - 1; j += 1) {
                        node.y += n[j].height
                    }

                    node.y = Math.max(node.y, node.parY)


                    let height = Math.max(node['time (inc)'], node.in)
                    if (height == 0) {
                        height = node.out
                    }

                    if (node.weight > node.in) {
                        height = node.weight
                    }

                    node.height = height * minNodeScale * scale

                    node.scale = scale
                });

                nodes.sort(function (a, b) {
                    return a.y - b.y
                    // return a.parY - b.parY
                })
            });

            links.forEach(function (link) {
                let source_max_weight = 0
                let target_max_weight = 0
                if (datasets.length == 0) {
                    weight = link.weight
                }

                link.height = {}

                for (let i = 0; i < datasets.length; i += 1) {
                    let source_link = link['source'][datasets[i]]
                    let target_link = link['target'][datasets[i]]
                    let source_link_weight = 0
                    let target_link_weight = 0
                    if (source_link == undefined) {
                        source_link_weight = 0
                    }
                    else {
                        source_link_weight = source_link['time (inc)']
                    }
                    source_max_weight = Math.max(source_max_weight, source_link_weight)

                    if (target_link == undefined) {
                        target_link_weight = 0
                    }
                    else {
                        target_link_weight = target_link['time (inc)']
                    }
                    target_max_weight = Math.max(target_max_weight, target_link_weight)
                    link.height[datasets[i]] = target_link_weight * scale * minNodeScale
                }
                console.log(link.weight, total_out[link.target.level])
                link.source_proportion = link.weight / link.source.value 
                link.target_proportion = link.weight / link.target.value
                console.log(link.weight, link.source.level)
                console.log(link.source.name, link.target.name, link.proportion)
                link.height['union'] = target_max_weight * scale * minNodeScale//* proportion
                link.max_height = target_max_weight * scale * minNodeScale //* proportion
            });
        }

        function relaxLeftToRight(alpha) {
            nodesByBreadth.forEach(function (nodes, breadth) {
                nodes.forEach(function (node) {
                    if (node.targetLinks.length) {
                        var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
                        node.y += (y - center(node)) * alpha;
                    }
                });
            });

            function weightedSource(link) {
                return center(link.source) * link.weight
            }
        }

        function relaxRightToLeft(alpha) {
            nodesByBreadth.slice().reverse().forEach(function (nodes) {
                nodes.forEach(function (node) {
                    if (node.sourceLinks.length) {
                        var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);

                        node.y += (y + center(node)) * alpha;
                    }
                });
            });

            function weightedTarget(link) {
                return center(link.target) * link.weight;
            }
        }

        function resolveCollisions() {
            nodesByBreadth.forEach(function (nodes) {
                var node,
                    dy,
                    y0 = 0;

                // Push any overlapping nodes down.
                nodes.sort(ascendingDepth);

                for (node of nodes) {
                    dy = y0 - node.y;
                    if (dy > 0) {
                        node.y += dy;
                    }
                    y0 = node.y + node.height + nodePadding;
                }

                // If the bottommost node goes outside the bounds, push it back up.
                dy = y0 - nodePadding - size[1];
                if (dy > 0) {
                    y0 = node.y -= dy;
                    // Push any overlapping nodes back up.
                    for (let i = nodes.length - 2; i > 0; --i) {
                        node = nodes[i];
                        dy = node.y + node.height + nodePadding - y0;
                        if (dy > 0) node.y -= dy;
                        y0 = node.y;
                    }
                }
            });
        }

        function ascendingDepth(a, b) {
            // if(a["parY"] > b["parY"]){
            //     return a["parY"] > b["parY"];
            // }
            // return a["maxLinks"] - b["maxLinks"];
            return a.parY - b.parY
        }
    }

    function computeLinkDepths() {
        nodes.forEach(function (node) {
            node.sourceLinks.sort(ascendingTargetDepth);
            node.targetLinks.sort(ascendingSourceDepth);

            // node.sourceLinks.sort(descendingTargetDepth);
            // node.targetLinks.sort(descendingSourceDepth);

            // node.sourceLinks.sort(ascendingEdgeValue);
            // node.targetLinks.sort(descendingEdgeValue);

        });
        nodes.forEach(function (node) {
            var sy = 0, ty = 0;
            node.sourceLinks.forEach(function (link) {
                if (link.type != 'back_edge') {
                    link.sy = sy;
                    sy += link.height['union'];
                }
            });
            node.targetLinks.forEach(function (link) {
                if (link.type != 'back_edge') {
                    link.ty = ty;
                    ty += link.height['union']
                };
                // console.log(link.source.name, link.target.name, link.ty, ty)
            });
        });

        function ascendingSourceDepth(a, b) {
            return a.source.y - b.source.y;
        }

        function ascendingTargetDepth(a, b) {
            return a.target.y - b.target.y;
        }

        function descendingTargetDepth(a, b) {
            return b.target.y - a.target.y;
        }

        function descendingSourceDepth(a, b) {
            return b.source.y - a.source.y;
        }

        function ascendingEdgeValue(a, b) {
            return a["value"] - b["value"];
        }

        function descendingEdgeValue(a, b) {
            return b["value"] - a["value"];
        }
    }

    function center(node) {
        return 0;
    }

    function value(link) {
        return link.weight;
    }

    return sankey;
};
