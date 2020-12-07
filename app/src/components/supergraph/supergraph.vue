/** 
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
  <div>
    <v-layout class="chip-container">
      <v-chip class="chip" chips color="teal" label outlined clearable>
        {{ summaryChip }}
      </v-chip>
      <v-spacer></v-spacer>
      <span class="component-info">
        Encoding = {{ selectedMetric }} runtime.
      </span>
    </v-layout>
    <v-layout>
      <svg :id="id">
        <g id="container">
          <EnsembleEdges ref="EnsembleEdges" />
          <EnsembleNodes ref="EnsembleNodes" />
          <MiniHistograms ref="MiniHistograms" />
          <EnsembleColorMap ref="EnsembleColorMap" />
        </g>
      </svg>
    </v-layout>
  </div>
</template>

<script>
import * as d3 from "d3";
import EventHandler from "../EventHandler.js";

import Sankey from "../../algorithms/sankey";

import EnsembleNodes from "./nodes";
import EnsembleEdges from "./edges";
import MiniHistograms from "./miniHistograms";
import EnsembleColorMap from "../colormap";

import Graph from "../../datastructures/graph";
import GraphVertex from "../../datastructures/node";
import GraphEdge from "../../datastructures/edge";
import detectDirectedCycle from "../../algorithms/detectcycle";
import APIService from "../../lib/APIService.js";

export default {
	name: "SuperGraph",
	components: {
		EnsembleNodes,
		EnsembleEdges,
		MiniHistograms,
		EnsembleColorMap,
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
			top: 10,
			right: 10,
			bottom: 20,
			left: 10,
		},
		width: null,
		height: null,
		treeHeight: null,
		data: null,
		message: "Summary Graph View",
		debug: false,
		sankeyWidth: 0,
		sankeyHeight: 0,
		summaryChip: "SuperGraph",
		selectedMetric: "",
	}),

	mounted() {
		this.id = "ensemble-supergraph-overview";
		let self = this;
		EventHandler.$on("clear_summary_view", function () {
			console.log("Clearing Summary view");
			self.clear();
		});

		EventHandler.$on("reveal-callsite", function () {
			self.clear();
		});

		EventHandler.$on("show_target_auxiliary", (data) => {
			self.$refs.EnsembleNodes.$refs.TargetLine.clear();
			self.$refs.MiniHistograms.clear();
		});

		this.selectedMetric = this.$store.selectedMetric;
	},

	methods: {
		async fetchData() {
			if (this.$store.selectedMode == "Single") {
				this.data = await APIService.POSTRequest("single_supergraph", {
					dataset: this.$store.selectedTargetDataset,
					groupBy: "module",
				});
				console.debug("[/single_supergraph]", this.data);
			} else if (this.$store.selectedMode == "Ensemble") {
				this.data = await APIService.POSTRequest("ensemble_supergraph", {
					datasets: this.$store.selectedDatasets,
					groupBy: "module",
				});
				console.debug("[/ensemble_supergraph]", this.data);
			}

			this.data = this._add_node_map(this.data);
			this.data.graph = this._construct_super_graph(this.data);

			// check cycle.
			let detectcycle = detectDirectedCycle(this.data.graph);

			if (this.debug) {
				for (let i = 0; i < this.data.links.length; i += 1) {
					let link = this.data.links[i];
					let source_callsite = link["source"];
					let target_callsite = link["target"];
					let weight = link["weight"];

					console.debug("=============================================");
					console.debug("[Ensemble SuperGraph] Source Name :", source_callsite);
					console.debug("[Ensemble SuperGraph] Target Name :", target_callsite);
					console.debug("[Ensemble SuperGraph] Weight: ", weight);
				}
			}

			this.render();
		},

		async init() {
			await this.fetchData();
			this.width = 5 * this.$store.viewWidth;
			this.height = 1 * this.$store.viewHeight;

			this.sankeySVG = d3.select("#" + this.id).attrs({
				width: this.width,
				height: this.height,
				top: this.toolbarHeight,
			});

			let inner = this.sankeySVG.select("#container");

			var zoom = d3.zoom().on("zoom", function () {
				inner.attrs({
					transform: d3.event.transform,
					scale: d3.event.scale,
				});
			});
			this.sankeySVG.call(zoom);
		},

		_debug_data(data) {
			console.debug("Data :", data);
			for (let i = 0; i < data.nodes.length; i += 1) {
				console.debug("Node name: ", data.nodes[i].id);
				console.debug("Time (inc): ", data.nodes[i]["time (inc)"]);
				console.debug("Time: ", data.nodes[i]["time"]);
			}

			for (let i = 0; i < data.links.length; i += 1) {
				console.debug("Source: ", data.links[i].source);
				console.debug("Target: ", data.links[i].target);
				console.debug("Weight: ", data.links[i].weight);
			}
		},

		clear() {
			this.$refs.EnsembleNodes.clear();
			this.$refs.EnsembleEdges.clear();
			this.$refs.MiniHistograms.clear();
			this.$refs.EnsembleColorMap.clear();
		},

		render() {
			this.sankeyWidth = 0.7 * this.$store.viewWidth;
			this.sankeyHeight = 0.9 * this.$store.viewHeight - this.margin.top - this.margin.bottom;

			this._init_sankey(this.data);

			let postProcess = this._add_intermediate(this.data.nodes, this.data.links);
			this.data.nodes = postProcess["nodes"];
			this.data.links = postProcess["links"];
			
			this._init_sankey();

			this.$store.graph = this.data;
			this.$refs.EnsembleColorMap.init(this.$store.runtimeColor);
			if (this.$store.selectedMode == "Ensemble") {
				this.$refs.EnsembleColorMap.init(this.$store.distributionColor);
			}
			this.$refs.EnsembleNodes.init(this.$store.graph, this.view);
			this.$refs.EnsembleEdges.init(this.$store.graph, this.view);
			this.$refs.MiniHistograms.init(this.$store.graph, this.view);
		},

		/**
		 * Add node map to maintain the index of the Sankey nodes.
		 */
		_add_node_map(graph) {
			let nodeMap = {};
			let idx = 0;
			for (const node of graph.nodes) {
				if (node.type == "super-node") {
					nodeMap[node.module] = idx;
				} else if (node.type == "component-node") {
					nodeMap[node.name] = idx;
				}
				if (this.debug) {
					console.log(
						"[Preprocess] Assigning",
						node.id,
						" with map index: ",
						idx
					);
				}
				idx += 1;
			}
			graph.nodeMap = nodeMap;
			return graph;
		},

		/**
		 * Internal function that construct the super graph structure.
		 */
		_construct_super_graph(data) {
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

		/**
		 * Initialize the Sankey layout computation.
		 */
		_init_sankey() {
			this.sankey = Sankey()
				.nodeWidth(this.nodeWidth)
				.nodePadding(this.ySpacing)
				.size([this.sankeyWidth, this.sankeyHeight])
				.levelSpacing(this.levelSpacing)
				.maxLevel(this.data.maxLevel)
				.setMinNodeScale(this.nodeScale)
				.targetDataset(this.$store.selectedTargetDataset)
				.store(this.$store);

			this.sankey.link();

			this.sankey.nodes(this.data.nodes).links(this.data.links).layout(32);
		},

		/**
		 * Internal function to initiate the intermediate nodes and edges computation.
		 */
		_add_intermediate(nodes, edges) {
			console.debug(
				"===================Adding intermediate nodes=================="
			);
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
					console.log(
						"[Ensemble SuperGraph] Source Node",
						source_node,
						target_node.level
					);
					console.log(
						"[Ensemble SuperGraph] Target Node",
						target_node,
						target_node.level
					);
				}

				const source_level = source_node.level;
				const target_level = target_node.level;
				const shift_level = target_level - source_level;

				if (this.debug) {
					console.log(source_level, target_level);
					console.log(
						"[Ensemble SuperGraph] Number of levels to shift: ",
						shift_level
					);
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
							module: target_node.module,
							type: "intermediate",
							count: 1,
						};
						tempNode[targetDataset] = target_node[targetDataset];

						if (firstNode) {
							console.log(tempNode);
							nodes.push(tempNode);
							firstNode = false;
						}

						this.existingIntermediateNodes[target_node.id] = tempNode;
					} else {
						if (count[temp_edges[i].source] == undefined) {
							count[temp_edges[i].source] = 0;
							console.log(
								temp_edges[i].weight,
								temp_edges[i].source,
								temp_edges[i].target
							);
							this.existingIntermediateNodes[target_node.id].value +=
                temp_edges[i].weight;
						} else {
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
						max_flow: max_flow,
					};
					edges.push(sourceTempEdge);
					if (this.debug) {
						console.log(
							"[Ensemble SuperGraph] Adding intermediate source edge: ",
							sourceTempEdge
						);
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
						max_flow: max_flow,
					};
					edges.push(targetTempEdge);
					if (this.debug) {
						console.log(
							"[Ensemble SuperGraph] Adding intermediate target edge: ",
							targetTempEdge
						);
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
						target,
					});
				}
			}

			if (this.debug) {
				console.log(
					"[Ensemble SuperGraph] Removing",
					removeActualEdges.length,
					" edges."
				);
			}

			for (let i = 0; i < removeActualEdges.length; i += 1) {
				let removeEdge = removeActualEdges[i];
				if (this.debug) {
					console.log("[Ensemble SuperGraph] Removing edge: ", removeEdge);
				}
				for (let edge_idx = 0; edge_idx < edges.length; edge_idx += 1) {
					let curr_edge = edges[edge_idx];
					if (
						removeEdge.source == curr_edge.source &&
            removeEdge.target == curr_edge.target
					) {
						edges.splice(edge_idx, 1);
					}
				}
			}
			return {
				nodes: nodes,
				links: edges,
			};
		},

		activateCompareMode(data) {
			this.$refs.EnsembleNodes.comparisonMode(data);
		},
	},
};
</script>

<style scoped>
.node rect {
  stroke: #333;
  fill: #fff;
}

.edgePath path {
  stroke: #333;
  fill: #333;
  stroke-width: 1.5px;
}

.node circle {
  stroke: black;
  stroke-width: 0.5px;
}

.node text {
  font: 12px sans-serif;
}

.link {
  fill: none;
  stroke: black;
  stroke-width: 5px;
}
</style>