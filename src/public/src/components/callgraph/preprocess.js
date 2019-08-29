/** *****************************************************************************
 * Copyright (c) 2017, Lawrence Livermore National Security, LLC.
 * Produced at the Lawrence Livermore National Laboratory.
 *
 * Written by Suraj Kesavan <spkesavan@ucdavis.edu>.
 *
 * LLNL-CODE-740862. All rights reserved.
 *
 * This file is part of CallFlow. For details, see:
 * https://github.com/LLNL/CallFlow
 * Please also read the LICENSE file for the MIT License notice.
 ***************************************************************************** */

export default function preprocess(graph) {
    // graph = addUncertainityInfo(graph)
    graph = addMaxLevel(graph)
    graph = addLinkID(graph)
    graph = calculateFlow(graph)
    console.log("Graph after preprocessing: ", graph)
    return graph
}

function addMaxLevel(graph) {
    let ret = 0
    let nodes = graph.nodes
    for (let i = 0; i < nodes.length; i += 1) {
        let node = nodes[i]
            if (ret < node.level) {
            ret = node.level
        }
    }
    graph['maxLevel'] = ret 
    return graph
}

/* Link: {
   sourceID : int, targetID: int , target: str, source: str
   } */
function addLinkID(graph) {
    const nodeMap = {}
    let idx = 0, node;
    for ([idx, node] of graph.nodes.entries()) {
        console.log(node.name)
        nodeMap[node.name] = idx;
    }

    idx += 1

    const links = graph.links;
    for (const link of graph.links) {
        if (link.source == undefined || link.target == undefined) {
            continue;
        }

        if(nodeMap[link.source] == undefined){
            nodeMap[link.source] = idx
            idx += 1
        }
        
        if(nodeMap[link.target] == undefined){
            nodeMap[link.target] = idx
            idx += 1
        }

        link['sourceID'] = nodeMap[link.source]
        link['targetID'] = nodeMap[link.target]
        console.log(link.source, link.target)
    }
    console.log(nodeMap)
    return graph;
}

function calculateFlow(graph) {
    const nodes = graph.nodes;
    const links = graph.links;
    const outGoing = [];
    const inComing = [];
    nodes.forEach((node) => {
        const nodeLabel = node.name[0];
        console.log("For node: ", nodeLabel)
        links.forEach((link) => {
            if (nodes[link.sourceID] != undefined) {
                const linkLabel = nodes[link.sourceID].name;
                if (linkLabel == nodeLabel) {
                    if (outGoing[linkLabel] == undefined) {
                        outGoing[linkLabel] = 0;
                    }
                    if(outGoing[linkLabel] != 0){
                        outGoing[linkLabel] = Math.max(link.weight, outGoing[linkLabel])
                    }
                    else{
                        outGoing[linkLabel] += link.weight;
                    }
                }
            }
        });

        links.forEach((link) => {
            if (nodes[link.targetID] != undefined) {
                const linkLabel = nodes[link.targetID].name;
                if (linkLabel == nodeLabel) {
                    if (inComing[linkLabel] == undefined) {
                        inComing[linkLabel] = 0;
                    }
                    
                    if(inComing[linkLabel] != 0) {
                        inComing[linkLabel] = Math.max(link.weight, inComing[linkLabel])
                    }
                    else{
                        inComing[linkLabel] += link.weight;
                    }
                }
            }
        });

        if (outGoing[nodeLabel] == undefined) {
            outGoing[nodeLabel] = 0;
        }

        if (inComing[nodeLabel] == undefined) {
            inComing[nodeLabel] = 0;
        }

        node.out = outGoing[nodeLabel];
        node.in = inComing[nodeLabel];

        node.inclusive = Math.max(inComing[nodeLabel], outGoing[nodeLabel]);
        node.exclusive = Math.max(inComing[nodeLabel], outGoing[nodeLabel]) - outGoing[nodeLabel]

    });

    return graph;
}