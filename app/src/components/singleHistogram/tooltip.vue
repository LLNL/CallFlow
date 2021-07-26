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
import * as utils from "lib/utils";

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
		offset: 15,
		fontSize: 12,
	}),

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
			const svgScale = d3.scaleLinear().domain([2, 11]).range([this.containerWidth, this.containerHeight]);
			this.mousePos = d3.mouse(d3.select("#" + this.parentID).node());
			this.mousePosX = this.mousePos[0];
			this.mousePosY = this.mousePos[1];
			this.toolTipG.attr("height", svgScale(10) + "px");

			this.node = node;
			this.data = data;
			this.addText(this.data);
		},

		addText(text) {
			const maxWidth = 150;
			const measure = utils.measure(text, maxWidth);
			this.toolTipRect = this.toolTipG
				.append("rect")
				.attrs({
					"class": "toolTipContent",
					"fill": "white",
					"stroke": "black",
					"rx": "10px",
					"fill-opacity": 1,
					"width": measure.width + 30,
					"height": measure.height / 1.5 + this.offset / 1.5,
				})
				.attrs({
					"x": () => {
						if (this.mousePosX + this.halfWidth > document.getElementById(this.parentID).clientWidth) {
							return (this.mousePosX) - this.halfWidth + "px";
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
						if (this.mousePosX + this.halfWidth > document.getElementById(this.parentID).clientWidth) {
							return (this.mousePosX + this.offset) - this.halfWidth+ "px";
						}
						return (this.mousePosX) + this.offset + "px";

					},
					"y": () => {
						return (this.mousePosY) + this.offset + "px";
					}
				})
				.style("z-index", 2)
				.text(text)
				.call(utils.textWrap, maxWidth);
		},

		clear() {
			this.textCount = 0;
			d3.selectAll(".toolTipContent").remove();
		},

	}
};
</script>