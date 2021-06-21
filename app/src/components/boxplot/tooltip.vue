/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
	<g id="tooltip-auxiliary-function"></g>	
</template>

<script>
import * as d3 from "d3";
import * as utils from "lib/utils";

export default {
	name: "ToolTip",
	components: {},

	data: () => ({
		textCount: 0,
		textxOffset: 20,
		textyOffset: 20,
		textPadding: 18,
		offset: 10,
		fontSize: 12,
	}),

	methods: {
		init(id) {
			this.toolTipDiv = d3.select("#" + id);
			this.height = 80;
			this.halfWidth = document.getElementById(id).clientWidth / 2;
			this.halfHeight = document.getElementById(id).clientHeight / 2;
		},

		/**
		 * 
		 * @param {*} text 
		 */
		addText(text) {
			this.toolTipText = this.toolTipDiv
				.append("text")
				.style("font-family", "sans-serif")
				.style("font-size", "")
				.attrs({
					"class": "toolTipContent",
					"x": () => {
						if (this.mousePosX > this.halfWidth) {
							return (this.mousePosX - this.halfWidth) + this.textxOffset + "px";
						}
						return this.mousePosX + this.textxOffset + "px";
					},
					"y": () => {
						if (this.mousePosY > this.halfHeight) {
							return ((this.mousePosY) + this.textyOffset + this.textPadding * this.textCount) - this.halfHeight + "px";
						}
						return (this.mousePosY) + this.textyOffset + this.textPadding * this.textCount + "px";
					}
				})
				.text(text);
			this.textCount += 1;
		},

		/**
		 * 
		 */
		quartiles() {
			this.addText("Q1: " + utils.formatRuntimeWithUnits(this.data.q1));
			// this.addText('Q2: ' + utils.formatRuntimeWithUnits(this.data.q2))
			this.addText("Q3: " + utils.formatRuntimeWithUnits(this.data.q3));
		},

		/**
		 * 
		 */
		outliers() {
			this.addText("Rank: " + this.data["rank"]);
		},

		/**
		 * 
		 * @param {*} widthCount 
		 * @param {*} heightCount 
		 */
		drawRect(widthCount, heightCount) {
			this.clear();
			this.width = widthCount * this.fontSize;
			var svgScale = d3.scaleLinear().domain([2, 11]).range([50, 150]);
			this.mousePos = d3.mouse(this.toolTipDiv.node());
			this.mousePosX = this.mousePos[0];
			this.mousePosY = this.mousePos[1];

			this.toolTipRect = this.toolTipDiv
				.append("rect")
				.attrs({
					"class": "toolTipContent",
					"fill": "white",
					"stroke": "black",
					"rx": "10px",
					"fill-opacity": 1,
					"width": this.width,
					"height": heightCount * this.fontSize,
					"x": () => {
						if (this.mousePosX > this.halfWidth) {
							return (this.mousePosX - this.halfWidth) + "px";
						}
						return (this.mousePosX) + "px";
					},
					"y": () => {
						if (this.mousePosY > this.halfHeight) {
							return (this.mousePosY - this.halfHeight) + "px";
						}
						return (this.mousePosY) + "px";
					}
				});

		},

		/**
		 * 
		 * @param {*} data 
		 */
		renderQ(data) {
			this.data = data;
			this.drawRect(13, 4);
			this.quartiles();
		},

		/**
		 * 
		 * @param {*} data 
		 */
		renderOutliers(data) {
			this.data = data;
			this.drawRect(10, 4);
			this.outliers();
		},
		
		/**
		 * 
		 */
		clear() {
			this.textCount = 0;
			d3.selectAll(".toolTipContent").remove();
		},
	}
};
</script>