/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
  <div>
	<v-row>
		<v-col cols="4">
			<InfoChip ref="InfoChip" :title="title" :summary="infoSummary" :info="info" />
		</v-col>
		<v-col cols="8">
			<ColorMap ref="ColorMap" />
		</v-col>
	</v-row>
	<v-layout>
      <svg :id="id">
        <g id="container">
          <Edges ref="Edges" />
          <Nodes ref="Nodes" />
          <MiniHistograms ref="MiniHistograms" />
        </g>
      </svg>
    </v-layout>
  </div>
</template>

<script>
// Library imports
import * as d3 from "d3";
import { mapGetters } from "vuex";

// Local library imports
import EventHandler from "lib/routing/EventHandler.js";
import Sankey from "./lib/sankey.js";
// import Graph from "./lib/graph";
// import GraphVertex from "./lib/node";
// import GraphEdge from "./lib/edge";
// import detectDirectedCycle from "./algorithms/detectcycle";

// General component imports
import ColorMap from "../general/colormap";
import InfoChip from "../general/infoChip";
import Color from "lib/color/";
import * as utils from "lib/utils";

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
		InfoChip
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
		sankeyWidth: 0,
		sankeyHeight: 0,
		existingIntermediateNodes: {},
		title: "Super Graph View",
		firstRender: true,
		message: "",
		info: "",
		infoSummary: "Super Graphs provides an overview of the application's control during execution using a Sankey Diagram. The Sankey diagram incorporates a flow-based metaphor to the call graph by show the resource flow from left to right. Each node's performance is mapped based on the runtime colormap. The mini-histograms (on top of the node) provides an overview of each node's runtime distribution across processes",
	}),

	computed: {
		...mapGetters({ 
			selectedMetric: "getSelectedMetric", 
			sg_data: "getSG",
			esg_data: "getESG",
			selectedTargetRun: "getSelectedTargetRun",
			selectedMode: "getSelectedMode",
			runBinCount: "getRunBinCount",
			selectedColorPoint: "getColorPoint",
			summary: "getSummary",
			targetColor: "getTargetColor",
			runtimeColorMap: "getRuntimeColorMap",
			distributionColorMap: "getDistributionColorMap",
			targetColorMap: "getTargetColorMap",
			isComparisonMode: "getComparisonMode",
		})
	},

	watch: {
		sg_data: function (val) {
			this.data = val;
			this.singleColors();
			this.visualize();
			this.firstRender = false;
		},

		esg_data: function (val) {
			this.data = val;
			this.singleColors();
			this.ensembleColors();
			this.visualize();
			this.firstRender = false;
		},
	},

	mounted() {
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

		EventHandler.$on("remove-ensemble-colors", () => {
			self.$refs.ColorMap.clear();
			if (self.isComparisonMode) {
				// TODO: Need to call the diffColor setup here. 
			}
			else {
				self.singleColors();
				self.ensembleColors();
			}
			this.initColorMaps();
		});
	},

	methods: {
		init() {
			if (this.selectedMode == "SG") {
				this.$store.dispatch("fetchSG", {
					dataset: this.selectedTargetRun,
				});
			} else if (this.selectedMode == "ESG") {
				this.$store.dispatch("fetchESG", {
					dataset: this.selectedTargetRun,
					nbins: this.runBinCount,
				});
			}
		},

		visualize() {
			this.width = this.$store.viewWidth;
			this.height = this.$store.viewHeight - 2 * this.margin.top - this.margin.bottom;

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

		singleColors() {
			const data = this.summary[this.selectedTargetRun][this.selectedMetric];
			const [ colorMin, colorMax ]  = utils.getMinMax(data);

			if (this.firstRender) {
				let runtimeColorMap = "";
				if (this.selectedMode === "SG") {
					runtimeColorMap = "OrRd";
				}
				else if (this.selectedMode === "ESG") {
					runtimeColorMap = "Blues";
				}
				this.$store.commit("setRuntimeColorMap", runtimeColorMap);
			}
			this.$store.runtimeColor = new Color(this.selectedMetric, colorMin, colorMax, this.runtimeColorMap, this.selectedColorPoint);
		},

		ensembleColors() {
			const arrayOfData = this.data.nodes.map((d) => d.attr_dict.gradients[this.selectedMetric]["hist"]["h"]);
			const [ colorMin, colorMax ]  = utils.getArrayMinMax(arrayOfData);
			this.$store.commit("setDistributionColorMap", "Reds");
			this.$store.distributionColor = new Color("MeanGradients", colorMin, colorMax, this.distributionColorMap, this.selectedColorPoint);			

		},

		clear() {
			this.$refs.Nodes.clear();
			this.$refs.Edges.clear();
			this.$refs.MiniHistograms.clear();
			this.$refs.ColorMap.clear();
		},

		render() {
			this.sankeyWidth = 0.7 * this.$store.viewWidth;
			this.sankeyHeight = 0.8 * this.$store.viewHeight - this.margin.top - this.margin.bottom;

			this._init_sankey(this.data);

			let postProcess = this._add_intermediate(this.data.nodes, this.data.links);
			this.data.nodes = postProcess["nodes"];
			this.data.links = postProcess["links"];
			
			this._init_sankey();

			this.$refs.Nodes.init(this.data);
			this.$refs.Edges.init(this.data);
			this.$refs.MiniHistograms.init(this.data);

			this.initColorMaps();
		},

		initColorMaps() {
			if (this.selectedMode == "SG") {
				this.$refs.ColorMap.init(this.$store.runtimeColor);
			}
			else if(this.selectedMode == "ESG") {
				if (this.isComparisonMode) {
					this.$refs.ColorMap.init(this.$store.diffColor);
				}
				else {
					this.$refs.ColorMap.init(this.$store.runtimeColor);
					this.$refs.ColorMap.init(this.$store.distributionColor);
				}
			}
		},

		// /**
		//  * Internal function that construct the super graph structure.
		//  */
		// _construct_super_graph(data) {
		// 	let graph = new Graph(true);

		// 	for (let i = 0; i < data.links.length; i += 1) {
		// 		let source = new GraphVertex(data.links[i].source);
		// 		let target = new GraphVertex(data.links[i].target);
		// 		let weight = data.links[i].weight;
		// 		let edge = new GraphEdge(source, target, weight);
		// 		graph.addEdge(edge);
		// 	}
		// 	return graph;
		// },

		/**
		 * Initialize the Sankey layout computation.
		 */
		_init_sankey() {
			this.sankey = Sankey()
				.nodeWidth(this.nodeWidth)
				.nodePadding(this.ySpacing)
				.size([this.sankeyWidth, this.sankeyHeight])
				.levelSpacing(this.levelSpacing)
				.setMinNodeScale(this.nodeScale);

			this.sankey.link();

			this.sankey.nodes(this.data.nodes).links(this.data.links).layout(32);
		},

		/**
		 * Adds the intermediate nodes and edges to the SuperGraph.
		 */
		_add_intermediate(nodes, edges) {
			this.existingIntermediateNodes = {};
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

				// console.debug(`[SuperGraph] Source Node: ${source_node}, Level: ${source_node.level}`);
				// console.debug(`[Ensemble SuperGraph] Target Node: ${target_node} Level: ${target_node.level}`);

				const source_level = source_node.attr_dict.level;
				const target_level = target_node.attr_dict.level;
				const shift_level = target_level - source_level;

				// console.debug(source_level, target_level);
				// console.debug(`[SuperGraph] Number of levels to shift: ${shift_level}`);

				// Put in intermediate nodes.
				let firstNode = true;
				for (let j = shift_level; j > 1; j--) {
					const intermediate_idx = nodes.length;

					let tempNode = {};
					let max_flow = source_node["max_flow"];
					if (this.existingIntermediateNodes[target_node.id] == undefined) {
						// Add the intermediate node to the array
						tempNode = {
							attr_dict: {
								...target_node.attr_dict,
								nid: -1,
								level: j,

							},
							level: j + 1,
							id: "i" + target_node.id,
							value: target_node.value,
							targetValue: target_node.targetValue,
							// height: temp_edges[i].height,
							// targetHeight: temp_edges[i].targetHeight,
							type: "intermediate",
							count: 1,
						};
						// tempNode[targetDataset] = target_node[this.selectedTargetRun];

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
						attr_dict: temp_edges[i].attr_dict,
						type: "source_intermediate",
						source: source_node.id,
						target: tempNode.id,
						weight: target_node.weight,
						targetWeight: temp_edges[i].attr_dict.targetWeight,
						max_flow: max_flow,
					};
					edges.push(sourceTempEdge);

					console.debug("[SuperGraph] Adding intermediate source edge:", sourceTempEdge);

					if (j == shift_level) {
						edges[i].original_target = target;
					}
					// edges[i].target_data = nodes[intermediate_idx];
					
					// console.debug(`[SuperGraph] Updating this edge: ${edges[i]}`);
					
					const targetTempEdge = {
						attr_dict: temp_edges[i].attr_dict,
						type: "target_intermediate",
						source: tempNode.id,
						target: target_node.id,
						weight: target_node.value,
						targetWeight: temp_edges[i].attr_dict.targetWeight,
						max_flow: max_flow,
					};
					edges.push(targetTempEdge);

					console.log("[SuperGraph] Adding intermediate target edge:", targetTempEdge);

					if (j == shift_level) {
						edges[i].original_target = target;
					}
					edges[i].target_data = nodes[intermediate_idx];

					// console.debug(`[SuperGraph] Updating this edge: ${edges[i]}`);

					removeActualEdges.push({
						source,
						target,
					});
				}
			}

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
			this.$refs.Edges.comparisonMode(data);
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