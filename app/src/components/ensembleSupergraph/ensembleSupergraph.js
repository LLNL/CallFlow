/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import * as  d3 from "d3";

import tpl from "../../html/supergraph.html";
import EnsembleSankey from "./ensembleSankey";
import SingleSankey from "./singleSankey";
import EnsembleNodes from "./nodes";
import MiniHistograms from "./miniHistograms";
import EnsembleEdges from "./edges";
import EventHandler from "../EventHandler.js";
import EnsembleColorMap from "./colormap";
import Graph from "../../datastructures/graph";
import GraphVertex from "../../datastructures/node";
import GraphEdge from "../../datastructures/edge";
import detectDirectedCycle from "../../algorithms/detectcycle";

export default {
	name: "EnsembleSuperGraph",
	template: tpl,
	components: {
		EnsembleNodes,
		EnsembleEdges,
		MiniHistograms,
		EnsembleColorMap
	},
	data: () => ({
		graph: null,
		id: "ensemble-supergraph-overview",
		dashboardID: "ensemble-supergraph-dashboard",
		nodeWidth: 50,
		nodeScale: 1.0,
		ySpacing: 60,
		levelSpacing: 50,
		margin: {
			top: 10, right: 10, bottom: 20, left: 10
		},
		width: null,
		height: null,
		treeHeight: null,
		data: null,
		message: "Summary Graph View",
		debug: false,
		sankeyWidth: 0,
		sankeyHeight: 0
	}),

	mounted() {
		this.id = "ensemble-supergraph-overview";
		let self = this;
		EventHandler.$on("clear_summary_view", function () {
			console.log("Clearing Summary view");
			self.clear();
		});

		EventHandler.$on("reveal_callsite", function () {
			self.clear();
		});

		EventHandler.$on("split_by_entry_callsites", function () {
			self.clear();
		});

		EventHandler.$on("split_by_callees", function () {
			self.clear();
		});
	},

	sockets: {
		ensemble_supergraph(data) {
			data = JSON.parse(data);
			console.log("Data: ", data);
			let nodes = [];
			for (let i = 0; i < data.nodes.length; i += 1) {
				console.log("Node name: ", data.nodes[i].id);
				console.log("Time (inc): ", data.nodes[i]["time (inc)"]);
				console.log("Time: ", data.nodes[i]["time"]);
			}

			for (let i = 0; i < data.links.length; i += 1) {
				console.log("Source: ", data.links[i].source);
				console.log("Target: ", data.links[i].target);
				console.log("Weight: ", data.links[i].weight);
			}
			this.render(data);
		},

		single_supergraph(data) {
			data = JSON.parse(data);
			console.log("Data :", data);
			let nodes = [];
			for (let i = 0; i < data.nodes.length; i += 1) {
				console.log("Node name: ", data.nodes[i].id);
				console.log("Time (inc): ", data.nodes[i]["time (inc)"]);
				console.log("Time: ", data.nodes[i]["time"]);
			}

			for (let i = 0; i < data.links.length; i += 1) {
				console.log("Source: ", data.links[i].source);
				console.log("Target: ", data.links[i].target);
				console.log("Weight: ", data.links[i].weight);
			}
			this.render(data);
		}
	},

	methods: {
		init() {
			this.auxiliaryViewWidth = document.getElementById("auxiliary-function-overview").clientWidth;

			this.width = 5 * this.$store.viewWidth;
			this.height = 2 * this.$store.viewHeight;

			this.sankeySVG = d3.select("#" + this.id)
				.attrs({
					"width": this.width,
					"height": this.height,
					"top": this.toolbarHeight
				});

			if (this.$store.selectedMode == "Single") {
				this.$socket.emit("single_supergraph", {
					dataset: this.$store.selectedTargetDataset,
					groupBy: "module"
				});
			}
			else if(this.$store.selectedMode == "Ensemble") {
				this.$socket.emit("ensemble_supergraph", {
					datasets: this.$store.selectedDatasets,
					groupBy: "module"
				});
			}


			let inner = this.sankeySVG.select("#container");

			var zoom = d3.zoom().on("zoom", function () {
				inner.attrs({
					"transform": d3.event.transform,
					"scale": d3.event.scale
				});
			});
			this.sankeySVG.call(zoom);
		},

		clear() {
			this.$refs.EnsembleNodes.clear();
			this.$refs.EnsembleEdges.clear();
			this.$refs.MiniHistograms.clear();
			this.$refs.EnsembleColorMap.clear();
			this.$refs.EnsembleColorMap.clearMetric();
		},

		render(data) {

			this.sankeyWidth = 0.7 * this.$store.viewWidth;
			this.sankeyHeight = 0.9 * this.$store.viewHeight - this.margin.top - this.margin.bottom;

			this.data = data;

			this.data = this.addNodeMap(this.data);
			this.data.graph = this.createGraphStructure(this.data);

			// check cycle.
			let detectcycle = detectDirectedCycle(this.data.graph);
			console.log(detectcycle);
			if (Object.keys(detectcycle).length != 0) {
				console.log("cycle detected. Sankey cannot be created. ");
			}
			else {
				console.log("No cycles detected.");
			}

			if (this.debug) {
				for (let i = 0; i < this.data["links"].length; i += 1) {
					let link = this.data["links"][i];
					let source_callsite = link["source"];
					let target_callsite = link["target"];
					let weight = link["weight"];

					console.log("=============================================");
					console.log("[Ensemble SuperGraph] Source Name :", source_callsite);
					console.log("[Ensemble SuperGraph] Target Name :", target_callsite);
					console.log("[Ensemble SuperGraph] Weight: ", weight);

				}
			}
			this.initSankey(this.data);

			console.log("[Ensemble SuperGraph] Layout Calculation.");
			let postProcess = this.postProcess(this.data.nodes, this.data.links);
			this.data.nodes = postProcess["nodes"];
			this.data.links = postProcess["links"];
			this.initSankey(this.data);
			console.log("[Ensemble SuperGraph] Post-processing done.", this.data);

			this.$store.graph = this.data;
			this.$refs.EnsembleColorMap.init();
			this.$refs.EnsembleNodes.init(this.$store.graph, this.view);
			this.$refs.EnsembleEdges.init(this.$store.graph, this.view);
			if(this.$store.selectedMode == "Ensemble"){
				this.$refs.MiniHistograms.init(this.$store.graph, this.view);
			}
		},

		addNodeMap(graph) {
			let nodeMap = {};
			let idx = 0;
			for (const node of graph.nodes) {
				if (node.type == "super-node") {
					nodeMap[node.module] = idx;
				}
				else if (node.type == "component-node") {
					nodeMap[node.name] = idx;
				}
				if (this.debug) {
					console.log("[Preprocess] Assigning", node.id, " with map index: ", idx);
				}
				idx += 1;
			}

			graph.nodeMap = nodeMap;
			return graph;
		},

		createGraphStructure(data) {
			let graph = new Graph(true);

			for (let i = 0; i < data.links.length; i += 1) {
				let source = new GraphVertex(data.links[i].source);
				let target = new GraphVertex(data.links[i].target);
				let weight = data.links[i].weight;
				let edge = new GraphEdge(source, target, weight);
				graph.addEdge(edge);
			}
			return graph;
		},

		updateMiniHistogram() {
			this.$refs.MiniHistograms.clear();
			this.$refs.MiniHistograms.init(this.graph, this.view);
		},

		//Sankey computation
		initSankey() {
			if (this.$store.selectedMode == "Single"){
				this.sankey = SingleSankey()
					.nodeWidth(this.nodeWidth)
					.nodePadding(this.ySpacing)
					.size([this.sankeyWidth, this.sankeyHeight])
					.maxLevel(this.data.maxLevel)
					.levelSpacing(this.levelSpacing)
					.dataset(this.$store.selectedTargetDataset)
					.setMinNodeScale(this.nodeScale);

			}
			else if(this.$store.selectedMode == "Ensemble"){
				this.sankey = EnsembleSankey()
					.nodeWidth(this.nodeWidth)
					.nodePadding(this.ySpacing)
					.size([this.sankeyWidth, this.sankeyHeight])
					.levelSpacing(this.levelSpacing)
					.maxLevel(this.data.maxLevel)
					.datasets(this.$store.runNames)
					.setMinNodeScale(this.nodeScale)
					.dataset("ensemble")
					.targetDataset(this.$store.selectedTargetDataset)
					.store(this.$store);
			}

			let path = this.sankey.link();

			this.sankey.nodes(this.data.nodes)
				.links(this.data.links)
				.layout(32);
		},

		// Add intermediate nodes.
		postProcess(nodes, edges) {
			console.log("===================Adding intermediate nodes==================");
			const temp_nodes = nodes.slice();
			const temp_edges = edges.slice();

			this.existingIntermediateNodes = {};

			let removeActualEdges = [];
			let count = {};

			for (let i = 0; i < temp_edges.length; i++) {
				const source = temp_edges[i].source;
				const target = temp_edges[i].target;

				if (this.debug) {
					console.log("==============================");
					console.log("[Ensemble SuperGraph] Source Name", source);
					console.log("[Ensemble SuperGraph] Target Name", target);
					console.log("[Ensemble SuperGraph] This edge: ", temp_edges[i]);
				}

				let source_node = temp_edges[i].source_data;
				let target_node = temp_edges[i].target_data;

				if (this.debug) {
					console.log("[Ensemble SuperGraph] Source Node", source_node, target_node.level);
					console.log("[Ensemble SuperGraph] Target Node", target_node, target_node.level);
				}

				const source_level = source_node.level;
				const target_level = target_node.level;
				const shift_level = target_level - source_level;

				if (this.debug) {
					console.log(source_level, target_level);
					console.log("[Ensemble SuperGraph] Number of levels to shift: ", shift_level);
				}

				let targetDataset = this.$store.selectedTargetDataset;
				// Put in intermediate nodes.
				let firstNode = true;
				for (let j = shift_level; j > 1; j--) {
					const intermediate_idx = nodes.length;

					let tempNode = {};
					let actual_time = source_node["actual_time"];
					let max_flow = source_node["max_flow"];
					if (this.existingIntermediateNodes[target_node.id] == undefined) {
						// Add the intermediate node to the array
						tempNode = {
							id: "intermediate_" + target_node.id,
							level: j - 1,
							value: temp_edges[i].weight,
							targetValue: temp_edges[i].targetWeight,
							height: temp_edges[i].height,
							targetHeight: temp_edges[i].targetHeight,
							// value: target_node.value,
							// name: target_node.name,
							module: target_node.module,
							type: "intermediate",
							count: 1
						};
						tempNode[targetDataset] = target_node[targetDataset];

						if (firstNode) {
							console.log(tempNode);
							nodes.push(tempNode);
							firstNode = false;
						}

						this.existingIntermediateNodes[target_node.id] = tempNode;
					}
					else {
						if (count[temp_edges[i].source] == undefined) {
							count[temp_edges[i].source] = 0;
							console.log(temp_edges[i].weight, temp_edges[i].source, temp_edges[i].target);
							this.existingIntermediateNodes[target_node.id].value += temp_edges[i].weight;
						}
						else {
							count[temp_edges[i].source] += 1;
						}
						tempNode = this.existingIntermediateNodes[target_node.id];
					}

					// Add the source edge.
					const sourceTempEdge = {
						type: "source_intermediate",
						source: source_node.id,
						target: tempNode.id,
						weight: temp_edges[i].weight,
						targetWeight: temp_edges[i].targetWeight,
						actual_time: actual_time,
						max_flow: max_flow
					};
					edges.push(sourceTempEdge);
					if (this.debug) {
						console.log("[Ensemble SuperGraph] Adding intermediate source edge: ", sourceTempEdge);
					}

					if (j == shift_level) {
						edges[i].original_target = target;
					}
					edges[i].target_data = nodes[intermediate_idx];
					if (this.debug) {
						console.log("[Ensemble SuperGraph] Updating this edge:", edges[i]);
					}

					const targetTempEdge = {
						type: "target_intermediate",
						source: tempNode.id,
						target: target_node.id,
						actual_time: actual_time,
						weight: temp_edges[i].weight,
						targetWeight: temp_edges[i].targetWeight,
						max_flow: max_flow
					};
					edges.push(targetTempEdge);
					if (this.debug) {
						console.log("[Ensemble SuperGraph] Adding intermediate target edge: ", targetTempEdge);
					}

					if (j == shift_level) {
						edges[i].original_target = target;
					}
					edges[i].target_data = nodes[intermediate_idx];
					if (this.debug) {
						console.log("[Ensemble SuperGraph] Updating this edge:", edges[i]);
					}

					removeActualEdges.push({
						source,
						target
					});
				}
			}
			console.log(temp_edges.length, removeActualEdges.length, edges.length);


			if (this.debug) {
				console.log("[Ensemble SuperGraph] Removing", removeActualEdges.length, " edges.");
			}

			for (let i = 0; i < removeActualEdges.length; i += 1) {
				let removeEdge = removeActualEdges[i];
				if (this.debug) {
					console.log("[Ensemble SuperGraph] Removing edge: ", removeEdge);
				}
				for (let edge_idx = 0; edge_idx < edges.length; edge_idx += 1) {
					let curr_edge = edges[edge_idx];
					if (removeEdge.source == curr_edge.source && removeEdge.target == curr_edge.target) {
						edges.splice(edge_idx, 1);
					}
				}
			}
			console.log(edges.length);
			return {
				nodes: nodes,
				links: edges
			};
		},
	}
};