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
import { max, min, sum } from "d3-array";

export default function Sankey() {
    var sankey = {},
        nodeWidth = 24,
        nodePadding = 8,
        size = [1, 1],
        nodes = [],
        links = [],
        levelSpacing = 10,
        referenceValue = 0,
        minNodeScale = 0,
        maxLevel = 1,
        nodeMap = {},
        dataset = '',
        targetDataset = '',
        store = {},
        datasets = [],
        debug = true;

    let widthScale;
    let minDistanceBetweenNode = 0;

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

    sankey.dataset = function (_) {
        if (!arguments.length) return dataset
        dataset = _
        return sankey
    }

    sankey.targetDataset = function (_) {
        if (!arguments.length) return targetDataset
        targetDataset = _
        return sankey
    }

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
        addLinkID()
        computeNodeLinks();
        console.log("[Sankey] Computed Node links.")
        computeNodeValues();
        console.log("[Sankey] Computed node values.")
        computeNodeBreadths();
        console.log("[Sankey] Computed node breadths.")
        computeNodeDepths(iterations);
        console.log("[Sankey] Computed node depths")
        computeLinkDepths();
        console.log("[Sankey] Computed linke depths.")
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
                y0 = d.source.y + d.sy + d.source.height / 2,
                y1 = d.target.y + d.ty + d.target.height / 2;
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

    function addLinkID() {
        let idx = 0, node;
        nodes.forEach(function (node) {
            nodeMap[node.id] = node;
            if (debug) {
                console.log("[Sankey] Assigning", node.id, "with map index: ", idx)
            }
            idx += 1
        })

        links.forEach(function (link) {
            if (nodeMap[link.source] == undefined) {
                nodeMap[link.source] = idx
                idx += 1
            }

            if (nodeMap[link.target] == undefined) {
                nodeMap[link.target] = idx
                idx += 1
            }
            link.source_data = nodeMap[link.source]
            link.target_data = nodeMap[link.target]
        })
    }


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
            link.source_data.sourceLinks.push(link);
            link.source_data.maxLinkVal = Math.max(link.source_data.maxLinkVal, link["weight"]);
            link.source_data.minLinkVal = Math.min(link.source_data.minLinkVal, link["weight"]);

            link.target_data.targetLinks.push(link);
            link.target_data.minLinkVal = Math.min(link.target_data.minLinkVal, link["weight"]);
            link.target_data.maxLinkVal = Math.max(link.target_data.maxLinkVal, link["weight"]);

        });

        nodes.forEach(function (node) {
            let numberOfLinks = Math.max(node.sourceLinks.length, node.targetLinks.length);

            if (node.sourceLinks.length == 0) {
                //it has no outgoing links
                numberOfLinks = node.targetLinks.length;
            }
            node["maxLinks"] = numberOfLinks;
        })
    }

    // Compute the value (size) of each node by summing the associated links.
    function computeNodeValues() {
        nodes.forEach(function (node) {
            let sourceSum = sum(node.sourceLinks, (link) => {
                if (link.source.split('_')[0] != 'intermediate' && link.target.split('_')[0] != "intermediate") {
                    return link.weight
                } 
            })

            let targetSum = sum(node.targetLinks, (link) => {
                if (link.source.split('_')[0] != 'intermediate' && link.target.split('_')[0] != "intermediate") {
                    return link.weight
                } 
            })

            node.value = Math.max(sourceSum, targetSum)

            // let sourceDatasetSum = sum(node.sourceLinks, (node) => {
            //     if (node.id.split('_')[0] != 'intermediate') {
            //         return node[dataset]['time (inc)']
            //     } 
            // })

            // let targetDatasetSum = sum(node.targetLinks, (node) => {
            //     if (node.id.split('_')[0] != 'intermediate') {
            //         return node[dataset]['time (inc)']
            //     } 
            // })

            // node.targetValue = Math.max(sourceDatasetSum, targetDatasetSum)
        });
    }

    // Iteratively assign the breadth (x-position) for each node.
    // Nodes are assigned the maximum breadth of incoming neighbors plus one;
    // nodes with no incoming links are assigned breadth zero, while
    // nodes with no outgoing links are assigned the maximum breadth.
    function computeNodeBreadths() {
        let remainingNodes = nodes
        let nextNodes = [];
        let level = 0
        let x = 0
        while (remainingNodes.length) {
            nextNodes = [];
            // if (x > 10) {
            //     break
            // }
            remainingNodes.forEach(function (node) {
                node.level = level
                node.dx = nodeWidth;
                node.sourceLinks.forEach(function (link) {
                    nextNodes.push(link.target_data);
                });
            })
            remainingNodes = nextNodes;
            level += 1

            MPI => MPI = function_name
            x += 1
        }

        minDistanceBetweenNode = nodeWidth * 2
        widthScale = scalePow().domain([0, level + 1]).range([minDistanceBetweenNode, size[0]])
        scaleNodeBreadths((size[0] - nodeWidth / 2) / (maxLevel - 1));

        // moveSinksRight()
        scaleNodeBreadths((size[0] - nodeWidth) / (level - 1));
    }

    function moveSourcesRight() {
        nodes.forEach(function (node) {
            if (!node.targetLinks.length) {
                node.level = d3.min(node.sourceLinks, function (d) {
                    return d.target_data.level;
                }) - 1;
            }
        });
    }

    function moveSinksRight(x) {
        nodes.forEach(function (node) {
            if (!node.sourceLinks.length) {
                node.level = d3.min(node.sourceLinks, function (d) { return d.target.x; });
                node.level = node.level + 1;
            }

        });
    }

    function scaleNodeBreadths(kx) {
        nodes.forEach(function (node) {
            let x = widthScale(node.level)
            node.x = x
        });
    }

    function computeNodeDepths(iterations) {
        var nodesByBreadth = d3.nest()
            .key(function (d) { return d.level; })
            .sortKeys(d3.ascending)
            .entries(nodes)
            .map(function (d) {
                let ret = []
                for(let i = 0; i < d.values.length; i += 1){
                    let node = d.values[i]
                    if(node.id.split('_')[0] != 'intermediate'){
                        ret.push(d.values[i])
                    }
                }
                console.log(ret)
                return ret;
            });

        initializeNodeDepth();
        resolveCollisions();

        let max_dy = 0
        for (var i = 0; i < iterations; ++i) {
            let alpha = Math.pow(0.99, i)
            let beta = Math.max(1 - alpha, (i + 1) / iterations);
            relaxRightToLeft(alpha);
            max_dy = resolveCollisions(beta);
            relaxLeftToRight(alpha);
            max_dy = resolveCollisions(beta);
        }

        if (max_dy > 0) {
            for (let node of nodes) {
                node.height *= (1 - max_dy / size[1])
            }

            for (let link of links) {
                link.height *= (1 - max_dy / size[1])
            }

            nodesByBreadth.forEach(function (nodes) {
                nodes.sort(ascendingDepth);

                for (let i = nodes.length - 1; i >= 0; --i) {
                    let node = nodes[i]
                    let dy = node.y - node.y * (1 - max_dy / size[1]);
                    node.y -= dy

                    if (i != 0) {
                        node.y += i * nodePadding
                    }
                }
            })
        }

        function pushIntermediateNodeBottom(nodes) {
            let tempNode
            for (let i = 0; i < nodes.length; i += 1) {
                if (nodes[i].id.split('_')[0] == 'intermediate') {
                    tempNode = nodes[i]
                    nodes.splice(i, 1);
                }
            }
            if (tempNode != undefined) {
                nodes.push(tempNode)
            }
            return nodes
        }

        function pushNodeBottomIfIntermediateTargets(nodes) {
            let tempNode
            for (let i = 0; i < nodes.length; i += 1) {
                let targets = nodes[i].targetLinks
                for (let j = 0; j < targets.length; j += 1) {
                    let target = targets[j].target
                    console.log(target)
                    if (target.split('_')[0] == 'intermediate') {
                        tempNode = nodes[i]
                        nodes.splice(i, 1);
                    }
                }
            }
            if (tempNode != undefined) {
                nodes.push(tempNode)
            }
            return nodes
        }

        function initializeNodeDepth() {

            var scale = min(nodesByBreadth, (column) => {
                var divValue = 1;
                let nodeCount = 0
                if (referenceValue > 0) {
                    divValue = referenceValue;
                }
                else {
                    divValue = sum(column, (node) => {
                        if (node.id.split('_')[0] != 'intermediate') {
                            nodeCount += 1
                            if (dataset == 'ensemble') {
                                return node['time (inc)']
                            }
                            else {
                                return node[dataset]['time (inc)']
                            }
                        }
                        else {
                            return 0
                        }
                    });
                }
                console.log(divValue, size[1], nodeCount, column.length, nodePadding)
                return Math.abs((size[1] - (nodeCount - 1) * nodePadding)) / divValue
            });

            // var targetScale = d3.min(nodesByBreadth, function (nodes) {
            //     var divValue = 1;
            //     if (referenceValue > 0) {
            //         divValue = referenceValue;
            //     }
            //     else {
            //         divValue = d3.sum(nodes, (d) => {
            //             return d[targetDataset]['time (inc)']
            //         })
            //     }
            //     return Math.abs((size[1] - (nodes.length - 1) * nodePadding)) / divValue;
            // });

            let levelCount = 0

            nodesByBreadth.forEach(function (nodes) {
                if (levelCount == 0) {
                    nodes.sort(function (a, b) {
                        return b['y'] - a['y']
                    })
                }
                if (levelCount == 2) {
                    nodes.sort(function (a, b) {
                        if (a.name.split('_')[0] != 'intermediate' || b.name.split('_')[0] != 'intermediate') {
                            return a['height'] - b['height']
                        }
                    })
                }

                // nodes = pushIntermediateNodeBottom(nodes)
                // nodes = pushNodeBottomIfIntermediateTargets(nodes)

                console.log(nodes)

                // nodes.forEach(function (node, i) {
                //     let nodeHeight = 0;
                //     links.forEach(function (edge) {
                //         if (edge["target"] == node) {
                //             if (edge["source"] != null && edge["source"]['y'] != null) {
                //                 nodeHeight = Math.max(nodeHeight, edge["source"]['y']);
                //             }
                //         }
                //     });
                //     node.y = Math.max(nodeHeight, i)
                //     node.parY = node.y;

                //     // nodes.sort(function (a, b) {
                //     //     return a["y"] - b["y"];
                //     // })
                //     console.log("Value: ", node.value, minNodeScale, scale)
                //     node.height = node['time (inc)'] * minNodeScale * scale;
                //     console.log("Height ", node.height)
                //     // node.targetHeight = node.value * minNodeScale * targetScale
                // });
                levelCount += 1
            });

            // links.forEach(function (link) {
            //     let weight = link.weight

            //     let targetWeight = link.source_data[targetDataset]['time (inc)']
            //     if (link.source.value < weight) {
            //         weight = link.source_data.minLinkVal
            //     }

            //     link.height = weight * minNodeScale * scale
            //     link.targetHeight = weight * minNodeScale * scale * (weight / targetWeight)
            // });
        }

        // // Reposition each node based on its incoming (target) links.
        // function relaxLeftToRight(columns, alpha, beta) {
        //     for (let i = 1, n = columns.length; i < n; ++i) {
        //         const column = columns[i];
        //         for (const target of column) {
        //             let y = 0;
        //             let w = 0;
        //             for (const { source, value } of target.targetLinks) {
        //                 let v = value * (target.layer - source.layer);
        //                 y += targetTop(source, target) * v;
        //                 w += v;
        //             }
        //             if (!(w > 0)) continue;
        //             let dy = (y / w - target.y0) * alpha;
        //             target.y0 += dy;
        //             target.y1 += dy;
        //             reorderNodeLinks(target);
        //         }
        //         if (sort === undefined) column.sort(ascendingBreadth);
        //         resolveCollisions(column, beta);
        //     }
        // }

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
            let max_dy = 0
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

                // // If the bottommost node goes outside the bounds, push it back up.
                // dy = y0 - nodePadding - size[1];
                // if (dy > 0) {
                //     y0 = node.y -= dy;
                //     // Push any overlapping nodes back up.
                //     for (let i = nodes.length - 2; i > 0; --i) {
                //         node = nodes[i];
                //         dy = node.y + node.height + nodePadding - y0;
                //         if (dy > 0) node.y -= dy;
                //         y0 = node.y;
                //     }
                // }

                dy = y0 - nodePadding - size[1]
                if (dy > 0) {
                    max_dy = Math.max(dy, max_dy)
                }
            });

            return max_dy
        }

        function resolveCollisions_old(alpha) {
            const i = nodesByBreadth.length >> 1;
            const subject = nodesByBreadth[i];
            subject.y = resolveCollisionsBottomToTop(nodesByBreadth, subject.y - nodePadding, i - 1, alpha);
            // resolveCollisionsTopToBottom(nodesByBreadth, subject.y1 + nodePadding, i + 1, alpha);
            subject.y = resolveCollisionsBottomToTop(nodesByBreadth, subject.y, nodesByBreadth.length - 1, alpha);
            // resolveCollisionsTopToBottom(nodesByBreadth, y0, 0, alpha);
        }

        // Push any overlapping nodes down.
        function resolveCollisionsTopToBottom(nodes, y, i, alpha) {
            for (; i < nodes.length; ++i) {
                const node = nodes[i];
                const dy = (y - node.y0) * alpha;
                if (dy > 1e-6) node.y0 += dy, node.y1 += dy;
                y = node.y1 + nodePadding;
            }
        }

        // Push any overlapping nodes up.
        function resolveCollisionsBottomToTop(nodes, y, i, alpha) {
            for (; i >= 0; --i) {
                const node = nodes[i];
                const dy = (node.y1 - y) * alpha;
                if (dy > 1e-6) node.y0 -= dy, node.y1 -= dy;
                y = node.y0 - nodePadding;
            }
            return y
        }

        // function ascendingDepth(a, b) {
        //     console.log(a['parY'], b['parY'])
        //     if (a["parY"] > b["parY"]) {
        //         return a["parY"] - b["parY"];
        //     }
        //     return a["maxLinks"] - b["maxLinks"];
        // }

        function ascendingDepth(a, b) {
            // if (a["parY"] > b["parY"]) {
            //     return a["parY"] - b["parY"];
            // }
            // return a["maxLinks"] - b["maxLinks"];
            return a['y'] - b['y']
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

            node.sourceLinks.sort(function (a, b) {
                return a.source_data.y - b.source_data.y
            })

            node.targetLinks.sort(function (a, b) {
                return a.target_data.y - b.target_data.y
            })

            node.sourceLinks.forEach(function (link) {
                if (link.type != 'back_edge') {
                    link.sy = sy;
                    sy += link.height;
                }
            });
            node.targetLinks.forEach(function (link) {
                if (link.type != 'back_edge') {
                    link.ty = ty;
                    ty += link.height
                };
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

    function targetValue(link) {
        return link.source_data[targetDataset]['time (inc)']
    }

    function computeNodeLayers(nodes) {
        let x0 = 0, y0 = 0, x1 = 1, y1 = 1; // extent
        const x = max(nodes, d => d.level) + 1;
        const kx = (x1 - x0 - this.nodeWidth) / (x - 1);
        const columns = new Array(x);
        for (const node of nodes) {
            const i = Math.max(0, Math.min(x - 1, Math.floor(this.justify.call(null, node, x))));
            node.layer = i;
            node.x = x0 + i * kx;
            // node.x1 = node.x0 + this.nodeWidth;
            if (columns[i]) columns[i].push(node);
            else columns[i] = [node];
        }

        for (const column of columns) {
            column.sort(this.ascendingBreadth);
        }
        return columns;
    }

    function targetDepth(d) {
        return d.target.depth;
    }

    function left(node) {
        return node.depth;
    }

    function right(node, n) {
        return n - 1 - node.height;
    }

    function justify(node, n) {
        return node.sourceLinks.length ? node.level : n - 1;
    }

    return sankey;
};