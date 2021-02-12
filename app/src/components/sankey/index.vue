/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
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
          <Edges ref="Edges" />
          <Nodes ref="Nodes" />
          <MiniHistograms ref="MiniHistograms" />
          <ColorMap ref="ColorMap" />
        </g>
      </svg>
    </v-layout>
  </div>
</template>

<script>
// Library imports
import * as d3 from "d3";

// Local library imports
import EventHandler from "lib/routing/EventHandler.js";
import Sankey from "lib/algorithms/sankey";
import * as utils from "lib/utils";
import Graph from "lib/datastructures/graph";
import GraphVertex from "lib/datastructures/node";
import GraphEdge from "lib/datastructures/edge";
import detectDirectedCycle from "lib/algorithms/detectcycle";
import APIService from "lib/routing/APIService.js";

// General component imports
import ColorMap from "../general/colormap";

// Local component imports
import Nodes from "./nodes";
import Edges from "./edges";
import MiniHistograms from "./miniHistograms";

export default {
	name: "Sankey",
	components: {
		Nodes,
		Edges,
		MiniHistograms,
		ColorMap,
	},
	data: () => ({
		graph: null,
		id: "ensemble-supergraph-overview",
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
		sankeyWidth: 0,
		sankeyHeight: 0,
		summaryChip: "SuperGraph",
		selectedMetric: "",
		existingIntermediateNodes: {},
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
			self.$refs.Nodes.$refs.TargetLine.clear();
			self.$refs.MiniHistograms.clear();
		});

		EventHandler.$on("fetch-super-graph", () => {
			self.clear();
			self.init();
		});

		this.selectedMetric = this.$store.selectedMetric;
	},

	methods: {
		async fetchData() {
			let data = {};
			const payload = {
				datasets: this.$store.selectedTargetDataset,
				groupBy: "module",
			};
			if (this.$store.selectedMode == "Single") {
				data = await APIService.POSTRequest("single_supergraph", payload);
				console.debug("[/single_supergraph]", data);
			} else if (this.$store.selectedMode == "Ensemble") {
				data = await APIService.POSTRequest("ensemble_supergraph", payload);
				console.debug("[/ensemble_supergraph]", data);
			}

			data = this._add_node_map(data);
			// data.graph = this._construct_super_graph(data);

			// check cycle.
			// let detectcycle = detectDirectedCycle(data.graph);

			for (let i = 0; i <data.links.length; i += 1) {
				let link = data.links[i];
				let source_callsite = link["source"];
				let target_callsite = link["target"];
				let weight = link["weight"];

				console.debug("=============================================");
				console.debug("[Ensemble SuperGraph] Source Name :", source_callsite);
				console.debug("[Ensemble SuperGraph] Target Name :", target_callsite);
				console.debug("[Ensemble SuperGraph] Weight: ", weight);
			}
			return data;
		},

		async init() {
			this.data = await this.fetchData();
			this.width = this.$store.viewWidth;
			this.height = this.$store.viewHeight;

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
			this.render();
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
			this.$refs.Nodes.clear();
			this.$refs.Edges.clear();
			this.$refs.MiniHistograms.clear();
			this.$refs.ColorMap.clear();
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

			this.$refs.Nodes.init(this.$store.graph, this.view);
			this.$refs.Edges.init(this.$store.graph, this.view);
			this.$refs.MiniHistograms.init(this.$store.graph, this.view);

			const selectedNode = utils.findExpensiveCallsite(this.$store, this.$store.selectedTargetDataset, "CCT");
			// Get node id from the graph.
			const node_id = this.$store.graph["nodeMap"][selectedNode];
			const node = this.$store.graph["nodes"][node_id];

			if (this.$store.selectedMode == "Single") {
				EventHandler.$emit("single-histogram", {
					node,
					dataset: this.$store.selectedTargetDataset,
				});

				EventHandler.$emit("single-scatterplot", {
					node,
					dataset: this.$store.selectedTargetDataset,
				});
			}
			else if(this.$store.selectedMode == "Ensemble") {
				EventHandler.$emit("ensemble-histogram", {
					node,
					dataset: this.$store.selectedTargetDataset,
				});

				EventHandler.$emit("ensemble-scatterplot", {
					node,
					dataset: this.$store.selectedTargetDataset,
				});
			}
			
			if (this.$store.selectedMode == "Ensemble") {
				this.$refs.ColorMap.init(this.$store.runtimeColor);
				this.$refs.ColorMap.init(this.$store.distributionColor);
			}
		},

		/**
		 * Add node map to maintain the index of the Sankey nodes.
		 */
		_add_node_map(graph) {
			let nodeMap = {};
			let idx = 0;
			for (const node of graph.nodes) {
				nodeMap[node.id] = idx;

				console.debug(`[Supergraph] Assigning ${node.id} with index ${idx}`);
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
		 * Adds the intermediate nodes and edges to the SuperGraph.
		 */
		_add_intermediate(nodes, edges) {
			const temp_nodes = nodes.slice();
			const temp_edges = edges.slice();

			let removeActualEdges = [];
			let count = {};

			for (let i = 0; i < temp_edges.length; i++) {
				const source = temp_edges[i].source;
				const target = temp_edges[i].target;

				console.debug("[SuperGraph] Source Name", source);
				console.debug("[SuperGraph] Target Name", target);
				console.debug("[SuperGraph] This edge: ", temp_edges[i]);

				let source_node = temp_edges[i].source_data;
				let target_node = temp_edges[i].target_data;

				console.debug(`[SuperGraph] Source Node: ${source_node}, Level: ${source_node.level}`);
				console.debug(`[Ensemble SuperGraph] Target Node: ${target_node} Level: ${target_node.level}`);

				const source_level = source_node.level;
				const target_level = target_node.level;
				const shift_level = target_level - source_level;

				console.debug(source_level, target_level);
				console.debug(`[SuperGraph] Number of levels to shift: ${shift_level}`);

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
							nodes.push(tempNode);
							firstNode = false;
						}

						this.existingIntermediateNodes[target_node.id] = tempNode;
					} else {
						if (count[temp_edges[i].source] == undefined) {
							count[temp_edges[i].source] = 0;
							this.existingIntermediateNodes[target_node.id].value += temp_edges[i].weight;
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

					console.debug(`[SuperGraph] Adding intermediate source edge: ${sourceTempEdge}`);

					if (j == shift_level) {
						edges[i].original_target = target;
					}
					edges[i].target_data = nodes[intermediate_idx];
					
					console.debug(`[SuperGraph] Updating this edge: ${edges[i]}`);
					
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

					console.log(`[SuperGraph] Adding intermediate target edge: ${targetTempEdge}`);

					if (j == shift_level) {
						edges[i].original_target = target;
					}
					edges[i].target_data = nodes[intermediate_idx];

					console.debug(`[SuperGraph] Updating this edge: ${edges[i]}`);

					removeActualEdges.push({
						source,
						target,
					});
				}
			}

			console.debug(`[SuperGraph] Removing ${removeActualEdges.length} edges`);

			for (let i = 0; i < removeActualEdges.length; i += 1) {
				let removeEdge = removeActualEdges[i];

				console.debug(`[SuperGraph] Removing edge: ${removeEdge}`);
				for (let edge_idx = 0; edge_idx < edges.length; edge_idx += 1) {
					let curr_edge = edges[edge_idx];
					if (removeEdge.source == curr_edge.source && removeEdge.target == curr_edge.target) {
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
			this.$refs.Nodes.comparisonMode(data);
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