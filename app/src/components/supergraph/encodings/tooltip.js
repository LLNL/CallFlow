/** 
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

import * as d3 from "d3";
import * as utils from "../../utils";

export default {
	template: "<g id=\"tooltip\"> </g>",
	name: "ToolTip",
	components: {},

	data: () => ({
		id: "supernode-tooltip",
		textCount: 0,
		textxOffset: 20,
		textyOffset: 20,
		textPadding: 15,
		height: 200,
		margin: 35,
		mousePosX: 0,
		mousePosY: 0,
		prevMousePosX: undefined,
		prevMousePosY: undefined
	}),

	methods: {
		init(id) {
			this.id = id;
			const toolTipDiv = d3.select("#" + this.id);
			this.toolTipG = toolTipDiv.append("g");
		},

		/**
		 * Set the position for the tooltip SVG. (x-positioning)
		 */
		positionX() {
			let ret = 0;
			if (this.mousePosX >= this.$store.viewWidth / 2) {
				ret = this.mousePosX + this.textxOffset;
			}
			ret = this.mousePosX - this.textxOffset;
			return ret;
		},

		/**
		 * Set the position for the tooltip SVG. (y-positioning)
		 */
		positionY() {
			let ret = 0
			if (this.mousePosY >= this.$store.viewHeight / 2) {
				ret = this.mousePosY + this.textyOffset;
			}
			ret = this.mousePosY - this.textyOffset;
			return ret;
		},

		/**
		 * The below function decides if we have to render the tooltip or not.
		 * 
		 * @param {Graph} graph 
		 * @param {*} node 
		 */
		visualize(graph, node) {
			// Set current mouse position.
			this.mousePos = d3.mouse(d3.select("#" + this.id).node());
			this.mousePosX = this.mousePos[0];
			this.mousePosY = this.mousePos[1];

			// Draw the tooltip again only if the distance is more than the width of the supernode.
			// console.log(this.prevMousePosY, this.prevMousePosX, utils.distanceBtwnPoints(this.mousePosX, this.mousePosY, this.prevMousePosX, this.prevMousePosY))
			// if (this.prevMousePosX && this.prevMousePosY && utils.distanceBtwnPoints(this.mousePosX, this.mousePosY, this.prevMousePosX, this.prevMousePosY) > 0 ) {
			this.clear();
			this.render(graph, node);
			// }

			// Store the previous mouse positions to calculate the distance.
			this.prevMousePosX = this.mousePosX;
			this.prevMousePosY = this.mousePosY;
		},

		/**
		 * 
		 * @param {*} graph 
		 * @param {*} node 
		 */
		render(graph, node) {
			this.xOffset = this.positionX() + 40;
			this.yOffset = this.positionY() + 40;
			this.nodeHeight = node.height;

			const svgScale = d3.scaleLinear().domain([2, 11]).range([50, 150]);

			this.toolTipG.attr("height", svgScale(10) + "px");
			this.toolTipRect = this.toolTipG
				.append("rect")
				.attrs({
					"class": "tooltip-container",
					"fill": "#fff",
					"stroke": "black",
					"rx": "10px",
					"fill-opacity": 1,
					"width": "325",
					"height": this.height,
				})
				.attrs({
					"x": this.xOffset,
					"y": this.yOffset
				});

			this.runtimeInformation(node);
			this.pathInformation(node);
		},

		/**
		 * Add a single line of text.
		 * 
		 * @param {*} text 
		 */
		addText(text) {
			this.textCount += 1;
			this.toolTipText = this.toolTipG
				.append("text")
				.style("font-family", "sans-serif")
				.style("font-size", "")
				.attrs({
					"class": "tooltip-content",
					"x": () => {
						return this.xOffset + this.margin;
					},
					"y": () => {
						return this.yOffset + this.textyOffset + this.textPadding * this.textCount + "px";
					}
				})
				.text(text);
		},

		/**
		 * 
		 * @param {*} node 
		 */
		runtimeInformation(node) {
			this.addText("Name: " + utils.truncNames(node.id, 40));
			this.addText("Inclusive Time: " + utils.formatRuntimeWithUnits(node["time (inc)"]));
			this.addText("Exclusive Time: " + utils.formatRuntimeWithUnits(node["time"]));
		},

		/**
		 * 
		 * @param {*} node 
		 */
		pathInformation(node) {
			let module_data = {}
			if (this.$store.selectedMode == 'Single') {
				module_data = this.$store.modules[this.$store.selectedTargetDataset];
			}
			else if (this.$store.selectedMode == "Ensemble") {
				module_data = this.$store.modules["ensemble"];
			}

			let callsite_data = {}
			if (this.$store.selectedMode == 'Single') {
				callsite_data = this.$store.callsites[this.$store.selectedTargetDataset];
			}
			else if (this.$store.selectedMode == "Ensemble") {
				callsite_data = this.$store.callsites["ensemble"];
			}


			// TODO : Improve the logic here to not process the string input multiple times. 
			let entry_functions = node[this.$store.selectedTargetDataset]['entry_function'].split(",").map(String);
			let entry_function_runtimes = {};
			for (let i = 0; i < entry_functions.length; i += 1) {
				let callsite = entry_functions[i].replace("'", "").replace("'", "").replace("[", "").replace("]", "").replace(" ", "");
				entry_function_runtimes[callsite] = callsite_data[callsite][this.$store.selectedMetric]["mean_time"];
			}

			// Create items array
			let items = Object.keys(entry_function_runtimes).map(function (key) {
				return [key, entry_function_runtimes[key]];
			});

			// Sort the array based on the second element
			let entry_function_data = items.sort(function (first, second) {
				return second[1] - first[1];
			});

			this.rectWidth = "10px";

			this.addText("");
			this.addText("Entry call sites: ");
			this.entryFunctionInformation(node, entry_function_data)
		},

		entryFunctionInformation(node, entry_function_data) {
			// Needs clean up for sure.
			for (var tIndex = 0; tIndex < Math.min(3, entry_function_data.length); tIndex++) {
				this.textCount += 1;
				let toColor = this.$store.runtimeColor.getColorByValue(entry_function_data[tIndex][1]);
				let fromColor = this.$store.runtimeColor.getColorByValue(node);
				let toFunc = entry_function_data[tIndex][0];
				let fromFunc = node.id;
				let xOffset = this.xOffset + this.margin;
				let yOffset = this.yOffset + this.textyOffset + this.textPadding * this.textCount;

				this.toolTipG
					.append("rect")
					.attrs({
						"width": this.rectWidth,
						"height": this.rectWidth,
						"x": xOffset + "px",
						"y": yOffset - 10 + "px",
						"class": "tooltip-content",
					})
					.style("fill", fromColor);

				this.toolTipG
					.append("text")
					.attrs({
						"x": xOffset + 15 + "px",
						"y": yOffset + "px",
						"class": "tooltip-content",
					})
					.text(utils.truncNames(fromFunc, 10));

				this.toolTipG
					.append("text")
					.attrs({
						"x": xOffset + 120 + "px",
						"y": yOffset + "px",
						"class": "tooltip-content",
					})
					.text("->");

				this.toolTipG
					.append("rect")
					.attrs({
						"width": this.rectWidth,
						"height": this.rectWidth,
						"x": xOffset + 140 + "px",
						"y": yOffset - 10 + "px",
						"class": "tooltip-content",
					})
					.style("fill", toColor);
				this.toolTipG
					.append("text")
					.attrs({
						"x": xOffset + 155 + "px",
						"y": yOffset + "px",
						"class": "tooltip-content",
					})
					.text(utils.truncNames(toFunc, 10));
			}

			let left_callsites = entry_function_data.length - 3;
			this.addText("and " + left_callsites + " call sites more.");
		},


		/**
		 * Clear the content in the tooltip.
		 */
		clear() {
			this.textCount = 0;			
			d3.selectAll(".tooltip-container").remove();
			d3.selectAll(".tooltip-content").remove();
		},
	}
};