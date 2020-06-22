/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import * as d3 from "d3";
import * as utils from "../utils";

export default {
	template: `<g id="tooltip-auxiliary-function"></g>`,
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
			this.id = id;
			this.toolTipDiv = d3.select("#" + id);
			this.height = 80;
			this.halfWidth = document.getElementById(this.id).clientWidth / 2;
			this.halfHeight = document.getElementById(this.id).clientHeight / 2;
		},

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

		quartiles() {
			this.addText("Q1: " + utils.formatRuntimeWithUnits(this.data.q1));
			// this.addText('Q2: ' + utils.formatRuntimeWithUnits(this.data.q2))
			this.addText("Q3: " + utils.formatRuntimeWithUnits(this.data.q3));
		},

		outliers() {
			this.addText(this.data.count + " outliers");
		},

		drawRect(widthCount, heightCount) {
			this.clear();
			this.width = widthCount * this.fontSize;
			var svgScale = d3.scaleLinear().domain([2, 11]).range([50, 150]);
			this.mousePos = d3.mouse(d3.select("#" + this.id).node());
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

		renderQ(data) {
			this.data = data;
			this.drawRect(13, 4);
			this.quartiles();
		},

		renderOutliers(data) {
			this.data = data;
			this.drawRect(10, 4);
			this.outliers();
		},

		trunc(str, n) {
			str = str.replace(/<unknown procedure>/g, "proc ");
			return (str.length > n) ? str.substr(0, n - 1) + "..." : str;
		},

		clear() {
			this.textCount = 0;
			d3.selectAll(".toolTipContent").remove();
		},
	}
};