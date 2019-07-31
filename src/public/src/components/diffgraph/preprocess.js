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

export default function preprocess(graph, refresh) {
    // graph = addUncertainityInfo(graph)
    graph = findMaxGraph(graph)
    graph = addLinkID(graph)
    graph = calculateFlow(graph)
    graph = addLines(graph)
    console.log("Graph after preprocessing: ", graph)
    return graph;
}

function findMaxGraph(graph){
    let datasets = ['calc-pi', 'calc-pi-half']
    
    for(const node of graph.nodes){
        let obj = {
            'name': '',
            'time': 0,
            'time (inc)': 0,
        }
        for(const dataset of datasets){
            if(node[dataset]['time'] > obj['time']){
                obj['time'] = node[dataset]['time']
            }
            if(node[dataset]['time (inc)'] > obj['time (inc)']){
                obj['time (inc)'] = node[dataset]['time (inc)']
            }
            obj['name'] = node[dataset]['name'][0]
            obj['xid'] = node[dataset]['n_index'][0]
        }
        for(const [key, value] of Object.entries(obj)){
            node[key] = value
        }
    }
    console.log(graph)
    return graph
}

function addUncertainityInfo(graph) {
    let dataset1 = {
        'libmonitor.so.0.0.0': [0.0, 0.0, 0.0, 194787687.0],
        'kripke': [0.0, 0.0, 472050.25, 194787687.0],
        'ld-2.17.so': [0.0, 0.0, 0.0, 5990.0],
        'libc-2.17.so': [0.0, 0.0, 0.0, 2413077.0],
        'libfabric.so.1.9.14': [0.0, 0.0, 0.0, 525976.0],
        'libm-2.17.so': [0.0, 0.0, 0.0, 5988.0],
        'libpsm2.so.2.1': [0.0, 0.0, 0.0, 245065.0],
        'libstdc++.so.6.0.20': [0.0, 0.0, 0.0, 604003.0],
        'libmpi.so.12.0.0': [0.0, 0.0, 5983.0, 2912673.0],
        '<unknown load module>': [5979.0, 11959.5, 11988.25, 41951.0]
    }
    let dataset2 = {
        'libmonitor.so.0.0.0': [0.0, 0.0, 5978.25, 194787687.0],
        'kripke': [0.0, 0.0, 5965.25, 194787687.0],
        'ld-2.17.so': [0.0, 5990.0, 23922.5, 107417.0],
        'libc-2.17.so': [0.0, 0.0, 0.0, 80080390.0],
        'libm-2.17.so': [0.0, 0.0, 0.0, 5980.0],
        'libpsm2.so.2.1': [0.0, 0.0, 0.0, 5773527.0],
        'libpthread-2.17.so': [0.0, 0.0, 5935.25, 17972.0],
        'libstdc++.so.6.0.20': [0.0, 0.0, 0.0, 80080390.0],
        'libintlc.so.5': [0.0, 0.0, 0.0, 5993.0],
        'libmpi.so.12.0.5': [0.0, 0.0, 0.0, 747178.0],
        '<unknown load module>': [5979.0, 11959.5, 11988.25, 41951.0]
    }

    for (const node of graph.nodes) {
        node.nrange = []
        if (node.name in dataset1) {
            let vals = dataset1[node.name]
            for (let i = 0; i < vals.length; i += 1) {
                node.nrange.push(vals[i])
            }
        }
        if (node.name in dataset2) {
            let vals = dataset2[node.name]
            for (let i = 0; i < vals.length; i += 1) {
                node.nrange.push(vals[i])
            }
        }
    }
    return graph
}

/* Link: {
   sourceID : int, targetID: int , target: str, source: str
   } */
function addLinkID(graph) {
    const nodeMap = {};
    for (const [idx, node] of graph.nodes.entries()) {
        nodeMap[node.name] = idx;
    }

    const links = graph.links;
    for (const link of graph.links) {
        if (link.source == undefined || link.target == undefined) {
            continue;
        }

        if (link.source[link.source.length - 1] == '_' || link.target[link.target.length - 1] == '_') {
            continue;
        }
        link['sourceID'] = nodeMap[link.source];
        link['targetID'] = nodeMap[link.target];
    }
    return graph;
}

function calculateFlow(graph) {
    const nodes = graph.nodes;
    const links = graph.links;
    const outGoing = [];
    const inComing = [];
    nodes.forEach((node) => {
        const nodeLabel = node.name;

        links.forEach((link) => {
            if (nodes[link.sourceID] != undefined) {
                const linkLabel = nodes[link.sourceID].name;
                if (linkLabel == nodeLabel) {
                    if (outGoing[linkLabel] == undefined) {
                        outGoing[linkLabel] = 0;
                    }
                    outGoing[linkLabel] += nodes[link.sourceID]['time (inc)'];
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
                    inComing[linkLabel] += nodes[link.targetID]['time (inc)'];
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
        node.exclusive = Math.max(inComing[nodeLabel], outGoing[nodeLabel]) - outGoing[nodeLabel];
    });

    return graph;
}

function addLines(graph){
    let datasets = ['calc-pi', 'calc-pi-half']
    
    let count = 0
    for(const node of graph.nodes){
        let obj = {}
        for(const dataset of datasets){
            obj[dataset] = node[dataset]['time (inc)']/node['time (inc)']
            obj['xid'] = node[dataset]['n_index'][0]

        }
        node['props'] = obj
        count += 1
    }
    console.log(graph)
    return graph
}