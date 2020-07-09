/*******************************************************************************
 * Copyright (c) 2020, Lawrence Livermore National Security, LLC.
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
import * as d3 from "d3";
import * as utils from "../utils";

import EventHandler from "../EventHandler";
import MeanGradients from "./encodings/meanGradients";
import Guides from "./encodings/guides";
import TargetLine from "./encodings/targetLine";
import ToolTip from "./encodings/tooltip";
import Mean from "./encodings/mean";
import MeanDiff from "./encodings/meanDiff";
import RankDiff from "./encodings/rankDiff";

export default {
	template: `<g :id="id">
				<MeanGradients ref="MeanGradients" />
				<Mean ref="Mean" />
				<ToolTip ref="ToolTip" />
				<Guides ref="Guides" />
				<TargetLine ref="TargetLine" />
				<MeanDiff ref="MeanDiff" />
				<RankDiff ref="RankDiff" />
			</g>`,
	name: "EnsembleNodes",
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
		id: "",
		graph: null,
		nidNameMap: {},
		intermediateColor: "#d9d9d9",
		drawGuidesMap: {}
	}),
	sockets: {
		// Move this to mean diff later.
		compare(data) {
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
	},
	mounted() {
		this.id = "ensemble-nodes";
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

			this.ensemble_module_data = this.$store.modules["ensemble"];
			this.ensemble_callsite_data = this.$store.callsites["ensemble"];

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
			// this.$refs.ToolTip.init(this.$parent.id)
		},

		preVis() {
			let idx = 0;
			for (let node of this.graph.nodes) {
				this.nidNameMap[node.id] = idx;
				node.client_idx = idx;
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
			let nodeSVG = this.containerG.select("#callsite-" + node.client_idx);

			if (this.$store.selectedMode == "Ensemble") {
				if (!this.drawGuidesMap[node.id]) {
					this.$refs.Guides.visualize(node, "permanent", nodeSVG);
					this.drawGuidesMap[node.id] = true;
				}

				this.$socket.emit("module_hierarchy", {
					module: this.$store.selectedModule,
					name: this.$store.selectedName,
					datasets: this.$store.selectedDatasets,
				});

				EventHandler.$emit("ensemble_histogram", {
					module: this.$store.selectedModule,
					datasets: this.$store.selectedDatasets,
				});

				EventHandler.$emit("ensemble_distribution", {
					module: this.$store.selectedModule,
					datasets: this.$store.selectedDatasets,
				});

				EventHandler.$emit("ensemble_scatterplot", {
					module: this.$store.selectedModule,
					dataset1: this.$store.selectedDatasets,
				});

				this.$socket.emit("ensemble_auxiliary", {
					module: this.$store.selectedModule,
					datasets: this.$store.selectedDatasets,
					sortBy: this.$store.auxiliarySortBy,
				});


			}
			else if (this.$store.selectedMode == "Single") {
				EventHandler.$emit("single_histogram", {
					module: this.$store.selectedModule,
					groupBy: this.$store.selectedGroupBy,
					dataset: this.$store.selectedTargetDataset,
				});

				EventHandler.$emit("single_scatterplot", {
					module: this.$store.selectedModule,
					dataset: this.$store.selectedTargetDataset,
				});
			}

			EventHandler.$emit("select_module", {
				module: this.$store.selectedModule,
			});

			this.$store.selectedNode = node;
			this.$store.selectedModule = node.module;
			this.$store.selectedName = node.name;
		},

		mouseover(node) {
			// this.$refs.ToolTip.visualize(self.graph, node)
			if (this.$store.selectedMode == "Ensemble" && this.$store.comparisonMode == false) {
				this.$refs.Guides.visualize(node, "temporary");
			}
		},

		mouseout(node) {
			// this.$refs.ToolTip.clear()
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
					let rgbArray = null;
					if (this.$store.selectedMetric == "Inclusive") {
						rgbArray = this.$store.runtimeColor.getColor(d, "time (inc)");
					}
					else if (this.$store.selectedMetric == "Exclusive") {
						rgbArray = this.$store.runtimeColor.getColor(d, "time");
					}
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
			// this.$refs.ToolTip.clear();
		},
	}
};