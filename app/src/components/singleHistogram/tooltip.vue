/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
	<g id="tooltip-histogram"></g>
</template>

<script>
import * as d3 from "d3";
import * as utils from "../utils";

export default {
	name: "ToolTip",
	components: {},
	props: [],
	data: () => ({
		id: "single-histogram-tooltip",
		textCount: 0,
		textxOffset: 20,
		textyOffset: 20,
		textPadding: 13,
		offset: 10,
		fontSize: 12,
		containerHeight: 50,
		containerWidth: 200
	}),
	sockets: {
		tooltip(data) {
			this.render(data);
		},
	},
	watch: {

	},

	mounted() { },
	methods: {
		init(id) {
			this.parentID = id;
			this.toolTipDiv = d3.select("#" + this.parentID)
				.append("svg")
				.attr("class", "toolTipSVG");

			this.toolTipG = this.toolTipDiv.append("g");
			this.height = document.getElementById(this.parentID).clientHeight;
			this.halfWidth = document.getElementById(this.parentID).clientWidth / 2;
		},

		render(data, node) {
			this.clear();
			this.width = data.length * this.fontSize + 10 * this.fontSize;
			const svgScale = d3.scaleLinear().domain([2, 11]).range([this.containerWidth, this.containerHeight]);
			this.mousePos = d3.mouse(d3.select("#" + this.parentID).node());
			this.mousePosX = this.mousePos[0];
			this.mousePosY = this.mousePos[1];
			this.toolTipG.attr("height", svgScale(10) + "px");

			this.node = node;
			this.data = data;
			this.addText("Processes (MPI ranks):" + this.data);
		},

		optimizeTextHeight(text) {
			const measure = utils.measure(text);
			const rows = measure.width/this.containerWidth;

			return {
				"width": this.containerWidth,
				"height": rows * measure.height
			};
		},

		addText(text) {
			const measure = this.optimizeTextHeight(text);
			this.toolTipRect = this.toolTipG
				.append("rect")
				.attrs({
					"class": "toolTipContent",
					"fill": "white",
					"stroke": "black",
					"rx": "10px",
					"fill-opacity": 1,
					"width": measure.width + 20,
					"height": measure.height,
				})
				.attrs({
					"x": () => {
						if (this.mousePosX + this.halfWidth > document.getElementById(this.parentID).clientWidth - 25) {
							return (this.mousePosX - this.containerWidth) + "px";
						}
						return (this.mousePosX) + "px";

					},
					"y": () => {
						return (this.mousePosY) + "px";
					}
				})
				.style("z-index", 2);

			this.textCount += 1;
			this.toolTipText = this.toolTipG
				.append("text")
				.style("font-family", "sans-serif")
				.style("font-size", this.fontSize)
				.attrs({
					"class": "toolTipContent",
					"x": () => {
						if (this.mousePosX + this.halfWidth > document.getElementById(this.parentID).clientWidth - 25) {
							return (this.mousePosX - this.containerWidth + this.offset) + "px";
						}
						return (this.mousePosX) + this.offset + "px";

					},
					"y": () => {
						return (this.mousePosY) + 2 * this.offset + "px";
					}
				})
				.style("z-index", 2)
				.text(text)
				.call(utils.textWrap, measure.width);
		},

		processes() {
			let self = this;
		},

		clear() {
			this.textCount = 0;
			d3.selectAll(".toolTipContent").remove();
		},

	}
};
</script>