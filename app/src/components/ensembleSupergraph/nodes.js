/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import * as d3 from "d3";
import * as utils from "../utils";

import EventHandler from "../EventHandler";
import MeanGradients from "./nodes/meanGradients";
import Guides from "./nodes/guides";
import TargetLine from "./nodes/targetLine";
import ToolTip from "./nodes/tooltip";
import Mean from "./nodes/mean";
import MeanDiff from "./nodes/meanDiff";
import RankDiff from "./nodes/rankDiff";

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
		compare(data) {
			console.log("[Comparison] Data:", data);
			this.clearGradients();
			// this.clearZeroLine()
			d3.selectAll(".target-path").remove();

			this.$refs.TargetLine.clearAll();
			d3.selectAll(".histogram-bar-target").remove();
			d3.selectAll("#ensemble-edge-target").remove();

			// remove target legend
			d3.selectAll(".target-circle-legend").remove();
			d3.selectAll(".target-circle-legend-text").remove();
			// remove ensemble legend
			d3.selectAll(".ensemble-circle-legend").remove();
			d3.selectAll(".ensemble-circle-legend-text").remove();

			// remove colormap container
			d3.selectAll(".dist-colormap").remove();

			if (this.$store.selectedCompareMode == "rank-diff") {
				this.$refs.RankDiff.init(this.graph.nodes, this.containerG, data);
			}
			else if (this.$store.selectedCompareMode == "mean-diff") {
				this.$refs.MeanDiff.init(this.graph.nodes, this.containerG, data);
			}
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
					sankey.relayout();
					link.attr("d", path);
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

			if (this.$store.selectedMode == "Ensemble") {
				this.$store.mode = "MEAN_GRADIENTS";
			}
			else if (this.$store.selectedMode == "Single") {
				this.$store.mode = "MEAN";
			}

			if (this.$store.mode == "MEAN_GRADIENTS") {
				this.$refs.MeanGradients.init(this.graph.nodes, this.containerG);
			}
			else if (this.$store.mode == "MEAN") {
				this.$refs.Mean.init(this.graph.nodes, this.containerG);
			}
			else if (this.$store.mode == "MEAN_DIFF") {
				console.log("TODO");
			}
			else if (this.$store.mode == "RANK_DIFF") {
				console.log("TODO");
			}

			this.ensemblePath();
			this.text();
			if (this.$store.showTarget && this.$store.selectedMode == "Ensemble") {
				this.$refs.TargetLine.init(this.graph.nodes);

				if (this.$store.comparisonMode == false) {
					this.targetPath();
				}
				this.$refs.Guides.init(this.graph.nodes);
			}
			this.$refs.ToolTip.init(this.$parent.id)
		},

		preVis() {
			let idx = 0;
			for (let node of this.graph.nodes) {
				this.nidNameMap[node.id] = idx;
				node.client_idx = idx;
				idx += 1;
			}
		},

		postVis() {
			for (let node of this.graph.nodes) {
				node.svg = this.containerG.select("#ensemble-callsite-" + node.client_idx);
			}
		},

		clearRectangle() {
			d3.selectAll(".ensemble-callsite").remove();
		},

		rectangle() {
			this.nodesSVG = this.containerG.selectAll(".ensemble-callsite")
				.data(this.graph.nodes)
				.enter()
				.append("g")
				.attrs({
					"class": "ensemble-callsite",
					"id": (d) => "ensemble-callsite-" + d.client_idx,
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
			let nodeSVG = this.containerG.select("#ensemble-callsite-" + node.client_idx);

			if (!this.drawGuidesMap[node.id]) {
				this.$refs.Guides.visualize(node, "permanent", nodeSVG);
				this.drawGuidesMap[node.id] = true;
			}

			this.$store.selectedNode = node;
			this.$store.selectedModule = node.module;
			this.$store.selectedName = node.name;

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

			EventHandler.$emit("select_module", {
				module: this.$store.selectedModule,
			});
		},

		mouseover(node) {
			this.$refs.ToolTip.visualize(self.graph, node)
			this.$refs.Guides.visualize(node, "temporary");
		},

		mouseout(node) {
			this.$refs.ToolTip.clear()
			this.$refs.Guides.clear(node, "temporary");
			if (this.permanentGuides == false) {
				d3.selectAll(".ensemble-edge")
					.style("opacity", 1.0);
			}
		},

		targetPath() {
			this.nodesSVG
				.append("path")
				.attrs({
					"class": "target-path",
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
							return this.$store.color.target;
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
				.style("fill-opacity", 1.0)
		},

		ensemblePath() {
			this.nodesSVG
				.append("path")
				.attrs({
					"class": "ensemble-path",
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

			this.nodesSVG.selectAll(".ensemble-path")
				.data(this.graph.nodes)
				.transition()
				.duration(this.transitionDuration)
				.delay(this.transitionDuration / 3)
				.style("fill-opacity", 1.0)
		},

		text() {
			this.nodesSVG
				.append("text")
				.data(this.graph.nodes)
				.attrs({
					"dy": "0.35em",
					"transform": "rotate(90)",
					"x": "5",
					"y": "-10"
				})
				.style("opacity", 1)
				.style("fill", d => {
					let rgbArray = this.$store.color.getColor(d)
					let hex = this.$store.color.rgbArrayToHex(rgbArray)
					return this.$store.color.setContrast(hex)
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

		clearGradients() {
			if (this.$store.mode == "mean-gradients") {
				this.$refs.MeanGradients.clear(this.graph.nodes, this.containerG);
			}
			else if (this.$store.mode == "mean") {
				console.log("TODO");
			}
			else if (this.$store.mode == "mean-diff") {
				this.$refs.MeanDiff.clear(this.graph.nodes, this.containerG);
			}
			else if (this.$store.mode == "rank-diff") {
				this.$refs.RankDiff.clear(this.graph.nodes, this.containerG);
			}
		},

		clear() {
			d3.selectAll(".ensemble-callsite").remove();
			d3.selectAll(".targetLines").remove();
			this.clearGradients();
			this.clearTargetPath();
			this.$refs.ToolTip.clear();
		},
	}
};