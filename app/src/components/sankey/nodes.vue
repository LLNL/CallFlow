/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
	<g :id="id">
		<MeanGradients ref="MeanGradients" />
		<Mean ref="Mean" />
		<ToolTip ref="ToolTip" />
		<Guides ref="Guides" />
		<TargetLine ref="TargetLine" />
		<MeanDiff ref="MeanDiff" />
		<RankDiff ref="RankDiff" />
	</g>
</template>
<script>
// Library imports
import * as d3 from "d3";
import { mapGetters } from "vuex";

// Local library imports
import * as utils from "lib/utils";
import EventHandler from "lib/routing/EventHandler";

// local imports
import MeanGradients from "./encodings/meanGradients";
import Guides from "./encodings/guides";
import TargetLine from "./encodings/targetLine";
import ToolTip from "./encodings/tooltip";
import Mean from "./encodings/mean";
import MeanDiff from "./encodings/meanDiff";
import RankDiff from "./encodings/rankDiff";

export default {
	name: "Nodes",
	components: {
		Mean,
		ToolTip,
		MeanGradients,
		Guides,
		TargetLine,
		MeanDiff,
		RankDiff
	},
	data: () => ({
		currentNodeLevel: {},
		nodeWidth: 50,
		transitionDuration: 500,
		nodeHeights: {},
		minHeightForText: 15,
		textTruncForNode: 25,
		id: "ensemble-nodes",
		graph: null,
		nidNameMap: {},
		intermediateColor: "#d9d9d9",
		drawGuidesMap: {},
		fontSize: 14,
		prevEncoding: "",
	}),

	computed: {
		...mapGetters({ 
			encoding: "getEncoding",
			showTarget: "getShowTarget",
			selectedMode: "getSelectedMode",
			summary: "getSummary",
			selectedTargetRun: "getSelectedTargetRun",
			selectedMetric: "getSelectedMetric",
			selectedNode: "getSelectedNode",
			compareData: "getCompareData",
			isComparisonMode: "getComparisonMode",
		})
	},

	mounted() {
		let self = this;
		EventHandler.$on("update-node-encoding", function (data) {
			self.clearEncoding();
			self.clearTargetLines();
			self.visualize();
		});
	},

	methods: {
		init(graph) {
			this.graph = graph;
			this.containerG = d3.select("#" + this.id);

			this.drag = d3.drag()
				.subject((d) => {
					return d;
				})
				.on("start", function () {
					this.parentNode.appendChild(this);
				})
				.on("drag", (d) => {
					d3.select(`node_${d.id}`).attr("transform",
						"translate(" + (
							d.x = Math.max(0, Math.min(this.$parent.width - d.dx, d3.event.x))
						) + "," + (
							d.y = Math.max(0, Math.min(this.$parent.height - d.dy, d3.event.y))
						) + ")");
					this.$parent.sankey.relayout();
					
					// link.attr("d", path);
				});

			this.zoom = d3.zoom()
				.scaleExtent([0.5, 2])
				.on("zoom", () => {
					let tx = Math.min(0, Math.min(d3.event.transform.x, this.width * d3.event.transform.k));
					let ty = Math.min(0, Math.min(d3.event.transform.y, this.height * d3.event.transform.k));
					this.sankeySVG.attr("transform", "translate(" + [tx, ty] + ")scale(" + d3.event.transform.k + ")");
				});

			this.visualize();
		},

		visualize() {
			this.rectangle();
			this.postVis();

			this.setEncoding();

			this.ensemblePath();
			this.text();

			if (this.showTarget && this.selectedMode === "ESG" && !this.isComparisonMode) {
				this.$refs.TargetLine.init(this.graph.nodes, this.containerG);
				this.$refs.Guides.init(this.graph.nodes, this.containerG);
				this.targetPath();
			}
		
			this.$refs.ToolTip.init(this.$parent.id);
		},

		// Attach the svg into the node object. 
		postVis() {
			for (let node of this.graph.nodes) {
				node.svg = this.containerG.select("#callsite-" + node.attr_dict.idx);
			}
		},

		clearRectangle() {
			d3.selectAll(".callsite").remove();
		},

		setEncoding() {
			if (this.selectedMode == "SG") {
				this.$store.commit("setEncoding", "MEAN");
			} else if (this.selectedMode == "ESG") {
				if (this.isComparisonMode) {
					this.$store.commit("setEncoding", "MEAN_DIFF");
				}
				else {
					this.$store.commit("setEncoding", "MEAN_GRADIENTS");
				}
			}

			this.prevEncoding = this.encoding;

			if (this.encoding == "MEAN") {
				this.$refs.Mean.init(this.graph.nodes, this.containerG);
			}
			else if (this.encoding == "MEAN_GRADIENTS") {
				this.$refs.MeanGradients.init(this.graph.nodes, this.containerG);
			}
			else if (this.encoding == "MEAN_DIFF") {
				this.$refs.MeanDiff.init(this.graph.nodes, this.containerG);
			}
			else if (this.encoding == "RANK_DIFF") {
				this.$refs.RankDiff.init(this.graph.nodes, this.containerG);
			}
		},

		rectangle() {
			this.nodesSVG = this.containerG.selectAll(".callsite")
				.data(this.graph.nodes)
				.enter()
				.append("g")
				.attrs({
					"class": "callsite",
					"id": (d) => "callsite-" + d.attr_dict.idx,
					"transform": (d) => `translate(${d.x},${d.y + this.$parent.ySpacing})`,
					"opacity": 1,
				});

			this.nodesSVG.append("rect")
				.attrs({
					"id": (d) => { return "callsite-rect" + d.attr_dict.idx; },
					"class": "callsite-rect",
					"height": (d) => d.height,
					"width": this.nodeWidth,
					"fill-opacity": (d) => {
						if (d.type == "intermediate") {
							return 0.0;
						}
						return 1.0;
					}
				})
				.style("shape-rendering", "crispEdges")
				.on("click", d => this.click(d))
				.on("mouseover", (d) => this.mouseover(d))
				.on("mouseout", (d) => this.mouseout(d));
		},

		click(node) {
			event.stopPropagation();
			if (node.id !== this.selectedNode.name || node.type !== this.selectedNode.type) {
				
				// Set the data.
				this.$store.commit("setSelectedNode", {
					name: node.id,
					type: node.type
				});

				// const nodeSVG = this.containerG.select("#callsite-" + node.attr_dict.idx);

				// Make appropriate event requests (Single and Ensemble).
				if (this.selectedMode == "ESG" && !this.isComparisonMode) {
					if (!this.drawGuidesMap[node.id]) {
						this.$refs.Guides.visualize(node, "detailed");
						this.drawGuidesMap[node.id] = true;
					}
					
					EventHandler.$emit("reset-ensemble-histogram");
					EventHandler.$emit("reset-ensemble-scatterplot");
					EventHandler.$emit("reset-ensemble-boxplots");
					EventHandler.$emit("reset-module-hierarchy");
					EventHandler.$emit("reset-ensemble-gradients");
				}
				else if (this.selectedMode == "SG") {
					EventHandler.$emit("reset-single-histogram");
					EventHandler.$emit("reset-single-scatterplot");
					EventHandler.$emit("reset-single-boxplots");
				}
			}
		},

		mouseover(node) {
			this.$refs.ToolTip.visualize(self.graph, node);
			// if (this.selectedMode === "ESG" && !this.isComparisonMode) {
			// 	this.$refs.Guides.visualize(node, "detailed");
			// }
		},

		mouseout(node) {
			this.$refs.ToolTip.clear();
			// if (this.selectedMode == "ESG") {
			// 	this.$refs.Guides.clear(node, "detailed");
			// 	if (this.permanentGuides == false) {
			// 		d3.selectAll(".ensemble-edge")
			// 			.style("opacity", 1.0);
			// 	}
			// }
		},

		targetPath() {
			this.nodesSVG
				.append("path")
				.attrs({
					"class": "path",
					"d": (d) => {
						if (d.type == "intermediate") {
							return "m" + 0 + " " + 0
								+ "h " + this.nodeWidth
								+ "v " + (1) * d.targetHeight
								+ "h " + (-1) * this.nodeWidth;
						}
					},
					"fill": (d) => {
						if (d.type == "intermediate") {
							return this.$store.distributionColor.target;
						}
					},
					"stroke": (d) => {
						if (d.type == "intermediate") {
							return this.intermediateColor;
						}
					}
				})
				.style("opacity", 0.6)
				.style("fill-opacity", 0)
				.style("stroke-opacity", 0.0);

			this.nodesSVG
				.selectAll(".target-path")
				.data(this.graph.nodes)
				.transition()
				.duration(this.transitionDuration)
				.delay(this.transitionDuration / 3)
				.style("fill-opacity", 1.0);
		},

		ensemblePath() {
			this.nodesSVG
				.append("path")
				.attrs({
					"class": "path",
					"d": (d) => {
						if (d.type == "intermediate") {
							return "m" + 0 + " " + 0
								+ "h " + this.nodeWidth
								+ "v " + (1) * d.height
								+ "h " + (-1) * this.nodeWidth;
						}
					},
					"fill": (d) => {
						if (d.type == "intermediate") {
							return this.intermediateColor;
						}
					},
				})
				.style("opacity", (d) => {
					if (this.$store.showTarget && this.$store.compareAnalysisMode == false) {
						return 0.5;
					}
					return 1;
				})
				.style("fill-opacity", 0)
				.style("stroke", function (d) {
					if (d.type == "intermediate") {
						return this.intermediateColor;
					}
				})
				.style("stroke-opacity", "0.0");

			this.nodesSVG.selectAll(".path")
				.data(this.graph.nodes)
				.transition()
				.duration(this.transitionDuration)
				.delay(this.transitionDuration / 3)
				.style("fill-opacity", 1.0);
		},

		text() {
			this.nodesSVG
				.append("text")
				.data(this.graph.nodes)
				.attrs({
					"class": "callsite-text",
					"dy": "0.35em",
					"transform": "rotate(90)",
					"x": "5",
					"y": "-10"
				})
				.style("opacity", 1)
				.style("fill", d => {
					if (this.encoding == "MEAN_GRADIENTS") {
						return "#000";
					}
					let rgbArray = this.$store.runtimeColor.getColor(d, this.selectedMetric);
					let hex = this.$store.runtimeColor.rgbArrayToHex(rgbArray);
					return this.$store.runtimeColor.setContrast(hex);
				})
				.text((d) => {
					if (d.type != "intermediate") {
						if (d.height < this.minHeightForText) {
							return "";
						}

						var textSize = utils.textSize(this.$parent.id, d.id)["width"];
						if (textSize < d.height) {
							return d.id;
						}

						let characterCount = d.height / this.fontSize;
						return utils.truncNames(d.id, characterCount);
					}
				});
		},

		clearTargetPath() {
			d3.selectAll(".target-path").remove();
		},

		clearEncoding() {
			if (this.prevEncoding == "MEAN_GRADIENTS") {
				this.$refs.MeanGradients.clear(this.graph.nodes, this.containerG);
			}
			else if (this.prevEncoding == "MEAN_DIFF") {
				this.$refs.MeanDiff.clear(this.graph.nodes, this.containerG);
			}
			else if (this.prevEncoding == "RANK_DIFF") {
				this.$refs.RankDiff.clear(this.graph.nodes, this.containerG);
			}
		},

		clearTargetLines() {
			d3.selectAll(".targetLines").remove();
		},

		clear() {
			d3.selectAll(".callsite").remove();
			d3.selectAll(".callsite-text").remove();
			d3.selectAll(".path").remove();
			this.clearTargetLines();
			this.clearEncoding(this.encoding);
			this.clearTargetPath();
			this.$refs.ToolTip.clear();
		},

		comparisonMode(data) {
			console.log("[Comparison] Data:", data);
			this.clearEncoding("MEAN_GRADIENTS");
			// this.clearZeroLine()
			d3.selectAll(".target-path").remove();

			// Clear target lines. 
			if (this.$store.showTarget) {
				this.$refs.TargetLine.clear();
			}
			d3.selectAll(".histogram-bar-target").remove();
			d3.selectAll("#ensemble-edge-target").remove();

			// remove target legend
			d3.selectAll(".legend").remove();
			d3.selectAll(".legend-text").remove();
			// // remove ensemble legend
			// d3.selectAll(".ensemble-circle-legend").remove();
			// d3.selectAll(".ensemble-circle-legend-text").remove();

			// remove colormap container
			d3.selectAll(".colormap").remove();

			this.setEncoding(this.$store.encoding, data);
		}
	}
};

</script>