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

// Local library imports
import * as utils from "lib/utils";
import EventHandler from "lib/routing/EventHandler";
import APIService from "lib/routing/APIService";

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
		drawGuidesMap: {}
	}),

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
					d3.select(`node_${d.client_idx}`).attr("transform",
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

			this.ensemble_module_data = this.$store.data_mod["ensemble"];
			this.ensemble_callsite_data = this.$store.data_cs["ensemble"];

			this.preVis();
			this.visualize();
		},

		visualize() {
			this.rectangle();
			this.postVis();

			this.setEncoding(this.$store.encoding);

			this.ensemblePath();
			this.text();
			if (this.$store.showTarget && this.$store.selectedMode === "Ensemble") {
				this.$refs.TargetLine.init(this.graph.nodes);

				if (this.$store.comparisonMode == false) {
					this.targetPath();
				}
				this.$refs.Guides.init(this.graph.nodes);
			}
			this.$refs.ToolTip.init(this.$parent.id);
		},

		preVis() {
			// TODO: Move this to backend.
			let idx = 0;
			for (let node of this.graph.nodes) {
				node.client_idx = idx;
				node.module_idx = node.module;
				node.module = utils.getModuleName(this.$store, node.module_idx);
				idx += 1;
			}
		},

		// Attach the svg into the node object. 
		postVis() {
			for (let node of this.graph.nodes) {
				node.svg = this.containerG.select("#callsite-" + node.client_idx);
			}
		},

		clearRectangle() {
			d3.selectAll(".callsite").remove();
		},

		setEncoding(encoding, data) {
			if (encoding == "MEAN") {
				this.$refs.Mean.init(this.graph.nodes, this.containerG);
			}
			else if (encoding == "MEAN_GRADIENTS") {
				this.$refs.MeanGradients.init(this.graph.nodes, this.containerG);
			}
			else if (encoding == "MEAN_DIFF") {
				this.$refs.MeanDiff.init(this.graph.nodes, this.containerG, data);
			}
			else if (encoding == "RANK_DIFF") {
				this.$refs.RankDiff.init(this.graph.nodes, this.containerG, data);
			}
		},

		rectangle() {
			this.nodesSVG = this.containerG.selectAll(".callsite")
				.data(this.graph.nodes)
				.enter()
				.append("g")
				.attrs({
					"class": "callsite",
					"id": (d) => "callsite-" + d.client_idx,
					"transform": (d) => `translate(${d.x},${d.y + this.$parent.ySpacing})`,
					"opacity": 1,
				});

			this.nodesSVG.append("rect")
				.attrs({
					"id": (d) => { return d.id + " callsite-rect" + d.client_idx; },
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

			if (node !== this.$store.selectedNode) {
				// Set the data.
				this.$store.selectedNode = node;
				this.$store.selectedModule = node.module;
				this.$store.selectedName = node.name;

				const nodeSVG = this.containerG.select("#callsite-" + node.client_idx);

				// Make appropriate event requests (Single and Ensemble).
				if (this.$store.selectedMode == "Ensemble") {
					if (!this.drawGuidesMap[node.id]) {
						this.$refs.Guides.visualize(node, "permanent", nodeSVG);
						this.drawGuidesMap[node.id] = true;
					}
					
					EventHandler.$emit("ensemble-histogram", {
						node,
						datasets: this.$store.selectedDatasets,
					});

					EventHandler.$emit("ensemble-scatterplot", {
						node,
						dataset1: this.$store.selectedDatasets,
					});

					EventHandler.$emit("ensemble-select-module", {
						module: this.$store.selectedModule,
					});

					APIService.POSTRequest("module_hierarchy", {
						node,
						name: this.$store.selectedName,
						datasets: this.$store.selectedDatasets,
					});

				}
				else if (this.$store.selectedMode == "Single") {
					EventHandler.$emit("single-histogram", {
						node,
						groupBy: this.$store.selectedGroupBy,
						dataset: this.$store.selectedTargetDataset,
					});

					EventHandler.$emit("single-scatterplot", {
						node,
						dataset: this.$store.selectedTargetDataset,
					});

					// TODO: Bring this back.
					// EventHandler.$emit("single-select-module", {
					// 	node,
					// });
				}

				// EventHandler.$emit("show-target-auxiliary", {});
			}
		},

		mouseover(node) {
			this.$refs.ToolTip.visualize(self.graph, node);
			if (this.$store.selectedMode == "Ensemble" && this.$store.comparisonMode == false) {
				this.$refs.Guides.visualize(node, "temporary");
			}
		},

		mouseout(node) {
			this.$refs.ToolTip.clear();
			if (this.$store.selectedMode == "Ensemble" && this.$store.comparisonMode == false) {
				this.$refs.Guides.clear(node, "temporary");
				if (this.permanentGuides == false) {
					d3.selectAll(".ensemble-edge")
						.style("opacity", 1.0);
				}
			}
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
					if (this.$store.encoding == "MEAN_GRADIENTS") {
						return "#000";
					}
					let rgbArray = this.$store.runtimeColor.getColor(d, this.$store.selectedMetric);
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

						let characterCount = d.height / this.$store.fontSize;
						return utils.truncNames(d.id, characterCount);
					}
				});
		},

		clearTargetPath() {
			d3.selectAll(".target-path").remove();
		},

		clearEncoding(encoding) {
			if (encoding == "MEAN_GRADIENTS") {
				this.$refs.MeanGradients.clear(this.graph.nodes, this.containerG);
			}
			else if (encoding == "MEAN_DIFF") {
				this.$refs.MeanDiff.clear(this.graph.nodes, this.containerG);
			}
			else if (encoding == "RANK_DIFF") {
				this.$refs.RankDiff.clear(this.graph.nodes, this.containerG);
			}
		},

		clear() {
			d3.selectAll(".callsite").remove();
			d3.selectAll(".callsite-text").remove();
			d3.selectAll(".path").remove();
			d3.selectAll(".targetLines").remove();
			this.clearEncoding();
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