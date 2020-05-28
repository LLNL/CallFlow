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
	graph = addNodeMap(graph);
	graph = addLinkID(graph);
	graph = calculateFlow(graph);
	console.log("Graph after preprocessing: ", graph);
	return graph;
}

function addNodeMap(graph) {
	let nodeMap = {};
	let idx = 0;
	for (const node of graph.nodes) {
		nodeMap[node.id] = idx;
		idx += 1;
	}

	graph.nodeMap = nodeMap;
	return graph;
}

/* Link: {
   sourceID : int, targetID: int , target: str, source: str
   } */
function addLinkID(graph) {
	const nodeMap = {};
	let idx = 0, node;
	for ([idx, node] of graph.nodes.entries()) {
		nodeMap[node.id] = idx;
		let debug = true;
		if(debug){
			console.log("[Preprocess] Assigning", node.id, " with map index: ", idx);
		}
	}
	graph.nodeMap = nodeMap;

	idx += 1;

	const links = graph.links;
	for (const link of graph.links) {
		if (link.source == undefined || link.target == undefined) {
			continue;
		}

		if(nodeMap[link.source] == undefined){
			nodeMap[link.source] = idx;
			idx += 1;
		}

		if(nodeMap[link.target] == undefined){
			nodeMap[link.target] = idx;
			idx += 1;
		}
		link["sourceID"] = nodeMap[link.source];
		link["targetID"] = nodeMap[link.target];
	}
	return graph;
}

function calculateFlow(graph) {
	const nodes = graph.nodes;
	const links = graph.links;
	const outGoing = [];
	const inComing = [];

	let debug = true;
	nodes.forEach((node) => {
		const nodeLabel = node.id;
		links.forEach((link) => {
			if (nodes[link.sourceID] != undefined) {
				const linkLabel = nodes[link.sourceID].id;
				if (linkLabel == nodeLabel) {
					if (outGoing[linkLabel] == undefined) {
						outGoing[linkLabel] = 0;
					}
					if(outGoing[linkLabel] == 0){
						outGoing[linkLabel] = link.weight;
					}
					else{
						outGoing[linkLabel] += link.weight;
					}
				}
			}
		});

		links.forEach((link) => {
			if (nodes[link.targetID] != undefined) {
				const linkLabel = nodes[link.targetID].id;
				if (linkLabel == nodeLabel) {
					if (inComing[linkLabel] == undefined) {
						inComing[linkLabel] = 0;
					}

					if(inComing[linkLabel] == 0) {
						inComing[linkLabel] = link.weight;
					}
					else{
						inComing[linkLabel] += link.weight;
					}
				}
			}
		});

		// Set the outgoing as 0 for nodes with no target nodes.
		if (outGoing[nodeLabel] == undefined) {
			outGoing[nodeLabel] = 0;
		}

		// Set the incoming as 0 for nodes with no source nodes.
		if (inComing[nodeLabel] == undefined) {
			inComing[nodeLabel] = 0;
		}

		node.out = outGoing[nodeLabel];
		node.in = inComing[nodeLabel];

		node.inclusive = Math.max(inComing[nodeLabel], outGoing[nodeLabel]);
		node.exclusive = Math.max(inComing[nodeLabel], outGoing[nodeLabel]) - outGoing[nodeLabel];
	});


	if(debug){
		links.forEach((link) => {
			let sourceLabel = link.source;
			let targetLabel = link.target;
			console.log("[Preprocess] Outgoing flow: {", sourceLabel, "}:", outGoing[sourceLabel]);
			console.log("[Preprocess] Incoming flow {", targetLabel,"}: ", inComing[targetLabel]);
		});

	}

	return graph;
}