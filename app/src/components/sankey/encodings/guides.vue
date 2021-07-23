/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
	<g :id="id"></g>
</template>

<script>
import * as d3 from "d3";
import * as utils from "lib/utils";
import { mapGetters } from "vuex";

export default {
	template: "",
	name: "Guides",
	components: {},

	data: () => ({
		id: "guides",
		nodes: [],
		svg: undefined,
		gradients: {},
		positionDatasetMap: {}
	}),

	computed: {
		...mapGetters({
			generalColors: "getGeneralColors",
			selectedMetric: "getSelectedMetric",
		}),
	},

	methods: {
		init(nodes) {
			this.nodes = nodes;

			// loop through each node and map the xAxis values 
			for (let node of this.nodes) {
				if (node.type == "intermediate") {
					return;
				}
				this.gradients[node.id] = node.attr_dict.gradients[this.selectedMetric];
				let datasetPositionMap = node.attr_dict.gradients[this.selectedMetric]["dataset"]["position"];

				this.positionDatasetMap[node] = {};
				for (let dataset in datasetPositionMap) {
					let datasetPosition = datasetPositionMap[dataset];
					if (this.positionDatasetMap[node][datasetPosition] == undefined) {
						this.positionDatasetMap[node][datasetPosition] = [];
					}
					this.positionDatasetMap[node][datasetPosition].push(dataset);
				}
			}
		},

		update(nodes) {
			// TODO: Find the newly added nodes. 
			this.new_nodes = [];

			// loop through each new node and map the xAxis values 
			for (let node of this.new_nodes) {
				this.process(node);
			}

		},

		drawLines(node, guideType) {
			let xAxis = this.gradients[node.id]["hist"].b;
			let binWidth = node.height / (xAxis.length);

			for (let idx = 0; idx < xAxis.length; idx += 1) {
				let y = binWidth * (idx);

				// For drawing the guide lines that have the value.
				node.svg
					.append("line")
					.attrs({
						"class": "gradientGuides-" + guideType,
						"id": "line-2-" + node.client_idx,
						"x1": 0,
						"y1": y,
						"x2": this.$parent.nodeWidth,
						"y2": y,
						"stroke-width": 1.5,
						"opacity": 0.3,
						"stroke": "#202020"
					});
			}
		},

		// TODO: Clean up the different modes. 
		drawText(node, guideType) {
			let xAxis = this.gradients[node.id]["hist"].b;
			let yAxis = this.gradients[node.id]["hist"].h;

			let binWidth = node.height / (xAxis.length);

			for (let idx = 0; idx < xAxis.length; idx += 1) {
				let y = binWidth * (idx);

				let fontSize = 12;
				if (yAxis[idx] != 0) {
					// For placing the run count values.
					// for (let i = 0; i < positionDatasetMap[idx].length; i += 1) {
					let textGuideType = "summary";
					let leftSideText = "";
					if (textGuideType == "detailed") {
						let text = this.positionDatasetMap[idx][0];
						if (this.positionDatasetMap[idx].length < 3) {
							for (let i = 0; i < 3; i += 1) {
								leftSideText = this.positionDatasetMap[idx][i];
								node.svg
									.append("text")
									.attrs({
										"class": "gradientGuidesText-" + guideType,
										"id": "line-2-" + node["client_idx"],
										"x": -60,
										"y": y + fontSize / 2 + binWidth / 2 + fontSize * i,
										"fill": "black"
									})
									.style("z-index", 100)
									.style("font-size", fontSize + "px")
									.text(leftSideText);

							}
						}
						else {
							let count = this.positionDatasetMap[idx].length - 3;
							text = text + "+" + count;

							node.svg
								.append("text")
								.attrs({
									"class": "gradientGuidesText-" + guideType,
									"id": "line-2-" + node["client_idx"],
									"x": -60,
									"y": y + fontSize / 2 + binWidth / 2 + fontSize * idx,
									"fill": "black"
								})
								.style("z-index", 100)
								.style("font-size", fontSize + "px")
								.text(leftSideText);
						}

					}
					else if (textGuideType == "summary") {
						leftSideText = utils.formatRunCounts(yAxis[idx]);
						node.svg
							.append("text")
							.attrs({
								"class": "gradientGuidesText-" + guideType,
								"id": "line-2-" + node["client_idx"],
								"x": -60,
								"y": y + fontSize / 2 + binWidth / 2, //+ fontSize * i,
								"fill": "black"
							})
							.style("z-index", 100)
							.style("font-size", fontSize + "px")
							.text(leftSideText);
					}

					// For placing the runtime values.
					if (idx != 0 && idx != xAxis.length - 1) {
						let text = utils.formatRuntimeWithUnits(xAxis[idx]);
						node.svg
							.append("text")
							.attrs({
								"class": "gradientGuidesText-" + guideType,
								"id": "line-2-" + node["client_idx"],
								"x": this.$parent.nodeWidth + 10,
								"y": y + fontSize / 2 + binWidth / 2,
								"fill": "black"
							})
							.style("z-index", 100)
							.style("font-size", fontSize + "px")
							.text(text);
					}
				}

				if (idx == 0) {
					node.svg
						.append("text")
						.attrs({
							"class": "gradientGuidesText-" + guideType,
							"id": "line-2-" + node.client_idx,
							"x": this.$parent.nodeWidth + 10,
							"y": y,
							"fill": "black"
						})
						.style("z-index", 100)
						.style("font-size", fontSize + "px")
						.text("Min. = " + utils.formatRuntimeWithUnits(xAxis[idx]));
				}
				else if (idx == xAxis.length - 1) {
					node.svg
						.append("text")
						.attrs({
							"class": "gradientGuidesText-" + guideType,
							"id": "line-2-" + node.client_idx,
							"x": this.$parent.nodeWidth + 10,
							"y": y + binWidth,
							"fill": "black"
						})
						.style("z-index", 100)
						.style("font-size", fontSize + "px")
						.text("Max. = " + utils.formatRuntimeWithUnits(xAxis[idx]));
				}
			}
		},

		visualize(node, guideType) {
			// Fade the edges when we see the guides. 
			d3.selectAll(".ensemble-edge")
				.style("opacity", 0.3);

			this.drawLines(node, guideType);
			this.drawText(node, guideType);
		},


		clear(node, type) {
			node.svg.selectAll(".gradientGuides-" + type).remove();
			node.svg.selectAll(".gradientGuidesText-" + type).remove();
		},
	}
};

</script>