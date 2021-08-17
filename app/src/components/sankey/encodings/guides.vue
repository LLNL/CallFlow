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
		positionDatasetMap: {},
		fontSize: 12,
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
				this.datasetPositionMap = node.attr_dict.gradients[this.selectedMetric]["dataset"]["d2p"];
				this.positionDatasetMap = node.attr_dict.gradients[this.selectedMetric]["dataset"]["p2d"];
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
						"id": "line-2-" + node.attr_dict.idx,
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

		_text(node, _id, _class, data, x, y) {
			node.svg
				.append("text")
				.attrs({
					"class": _class,
					"id": _id,
					"x": x,
					"y": y,
					"fill": "black"
				})
				.style("z-index", 100)
				.style("font-size", this.fontSize + "px")
				.text(data);
		},

		detailedGuides(node, data, x, y, binWidth, count) {
			y += this.fontSize/2 + binWidth/2;

			for (let i = 0; i < count; i += 1) {
				let subtext = "";

				if (data[i] !== undefined && data[i].includes("_")){
					subtext = data[i].split("_")[data[i].split("_").length - 1];
				}

				let _id = "line-2-" + node.attr_dict.idx;
				let _class = "gradientGuidesText-detailed";

				if (i < count) {
					this._text(node, _id, _class, subtext, x, y + i * this.fontSize);
				}
				else {
					let leftover_count = data.length - count;
					subtext = data[i] + "+ " + leftover_count + " runs";
					this._text(node, _id, _class, subtext, x, y);
					break;
				}
			}
		},

		summaryGuides(node, data, x, y, binWidth) {
			y += this.fontSize/2 + binWidth/2;

			let _id = "line-2-" + node.attr_dict.idx;
			let _class = "gradientGuidesText-summary";

			let text = utils.formatRunCounts(data);
			this._text(node, _id, _class, text, x, y);
		},

		// TODO: Clean up the different modes. 
		drawText(node, guideType) {
			let xAxis = this.gradients[node.id]["hist"].b;
			let yAxis = this.gradients[node.id]["hist"].h;
			let p2d = this.gradients[node.id]["dataset"].p2d;

			let binWidth = node.height / (xAxis.length);

			for (let idx = 0; idx < xAxis.length; idx += 1) {
				let y = (binWidth) * idx;

				if (yAxis[idx] != 0) {
					let left_x = -(this.$parent.nodeWidth + 10);
					// Left guides => dataset information.
					if (guideType == "detailed") {
						this.detailedGuides(node, p2d[idx], left_x, y, binWidth, 3);
					}
					else if (guideType == "summary") {
						this.summaryGuides(node, yAxis[idx], left_x, y, binWidth);
					}

					// Right guides => runtime information.
					let right_x = this.$parent.nodeWidth + 10;
					let _class = "gradientGuidesText-runtime";
					let _id = "line-2-" + node.attr_dict.idx;
					let text = "";
					if (idx == 0) {
						text = "Min. = " + utils.formatRuntimeWithUnits(xAxis[idx]);
					} else if(idx == xAxis.length - 1) {
						text = "Max. = " + utils.formatRuntimeWithUnits(xAxis[idx]);
						y += binWidth;
					} else {
						text = utils.formatRuntimeWithUnits(xAxis[idx]);
						y += this.fontSize / 2 + binWidth / 2;
					}
					this._text(node, _class, _id, text, right_x, y);
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
			node.svg.selectAll(".gradientGuidesText-runtime").remove();

		},
	}
};

</script>