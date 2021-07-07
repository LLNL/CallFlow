/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
	<g id="tooltip"> </g>
</template>

<script>
import * as d3 from "d3";
import * as utils from "lib/utils";
import { mapGetters } from "vuex";

export default {
	template: "",
	name: "ToolTip",

	computed: {
		...mapGetters({ 
			summary: "getSummary",
			selectedTargetRun: "getSelectedTargetRun",
		})
	},

	data: () => ({
		id: "node-tooltip",
		textCount: 0,
		textxOffset: 20,
		textyOffset: 20,
		textPadding: 15,
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
			let ret = 0;
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
		visualize(node) {
			// Set current mouse position.
			this.mousePos = d3.mouse(d3.select("#" + this.id).node());
			this.mousePosX = this.mousePos[0];
			this.mousePosY = this.mousePos[1];

			this.clear();
			this.render(node);
			
			// Store the previous mouse positions to calculate the distance.
			this.prevMousePosX = this.mousePosX;
			this.prevMousePosY = this.mousePosY;
		},

		/**
		 * 
		 * @param {*} node 
		 */
		render(node) {
			this.xOffset = this.positionX() + 40;
			this.yOffset = this.positionY() + 40;

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
					"width": 325,
					"height": 100,
				})
				.attrs({
					"x": this.xOffset,
					"y": this.yOffset
				});

			this.runtimeInformation(node);
		},

		/**
		 * Add a single line of text.
		 * 
		 * @param {*} text 
		 */
		addText(text) {
			let maxWidth = 350;
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
				.text(text)
				.call(utils.textWrap, maxWidth);
		},

		/**
		 * 
		 * @param {*} node 
		 */
		runtimeInformation(node) {
			this.addText("Name: " + utils.truncNames(node.id, 40));
			this.addText("Module: " + this.summary[this.selectedTargetRun].modules[node.module]);
			this.addText("Inclusive Time: " + utils.formatRuntimeWithUnits(node["time (inc)"]));
			this.addText("Exclusive Time: " + utils.formatRuntimeWithUnits(node["time"]));
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
</script>