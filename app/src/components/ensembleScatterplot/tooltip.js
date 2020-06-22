/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import * as d3 from "d3";
import * as utils from "../utils";

export default {
	template: `<g id="tooltip_scatterplot"></g>`,
	name: "ToolTip",
	data: () => ({
		id: "",
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
			this.toolTipDiv = d3.select("#" + this.id)
				.append("svg")
				.attr("class", "toolTipSVG");

			this.toolTipG = this.toolTipDiv.append("g");
			this.height = 80;
			this.halfWidth = document.getElementById(this.id).clientWidth / 2;
			this.halfHeight = document.getElementById(this.id).clientHeight / 2;
		},

		addText(text) {
			this.toolTipText = this.toolTipG
				.append("text")
				.style("font-family", "sans-serif")
				.style("font-size", "")
				.attrs({
					"class": "toolTipContent",
					"x": () => {
						if (this.mousePosX + this.halfWidth > document.getElementById(this.id).clientWidth) {
							return (this.mousePosX - this.width) + this.textxOffset + "px";
						}
						return this.mousePosX + this.textxOffset + "px";
					},
					"y": () => {
						if (this.mousePosY + this.halfHeight > document.getElementById(this.id).clientHeight) {
							return ((this.mousePosY) + this.textyOffset + this.textPadding * this.textCount) - this.height + "px";
						}
						return (this.mousePosY) + this.textyOffset + this.textPadding * this.textCount + "px";
					}
				})
				.text(text);
			this.textCount += 1;
		},

		trunc(str, n) {
			str = str.replace(/<unknown procedure>/g, "proc ");
			return (str.length > n) ? str.substr(0, n - 1) + "..." : str;
		},

		truncTimeLabel(str) {
			if (str == "Inclusive") {
				return "Inc.";
			}
			else if (str == "Exclusive") {
				return "Exc.";
			}
		},

		info() {
			this.addText("Callsite: " + utils.truncNames(this.data.callsite, 10));
			this.addText("Mean " + this.truncTimeLabel(this.$store.selectedMetric) + " Time: " + utils.formatRuntimeWithUnits(this.data.value));
			this.addText("Run: " + this.data.run);
			// this.addText('QCD: ' + this.data.QCD.toFixed(3))
		},

		render(data) {
			this.clear();
			this.width = 19 * this.fontSize;
			var svgScale = d3.scaleLinear().domain([2, 11]).range([50, 150]);
			this.mousePos = d3.mouse(d3.select("#" + this.id).node());
			this.mousePosX = this.mousePos[0];
			this.mousePosY = this.mousePos[1];
			this.toolTipG.attr("height", svgScale(10) + "px");
			this.toolTipRect = this.toolTipG
				.append("rect")
				.attrs({
					"class": "toolTipContent",
					"fill": "white",
					"stroke": "black",
					"rx": "10px",
					"fill-opacity": 1,
					"width": this.width,
					"height": this.height,
					"x": () => {
						if (this.mousePosX + this.halfWidth > document.getElementById(this.id).clientWidth) {
							return (this.mousePosX - this.width) + "px";
						}
						return (this.mousePosX) + "px";
					},
					"y": () => {
						if (this.mousePosY + this.halfHeight > document.getElementById(this.id).clientHeight) {
							return (this.mousePosY - this.height) + "px";
						}
						return (this.mousePosY) + "px";
					}
				});
			this.data = data;
			this.info();
		},

		clear() {
			this.textCount = 0;
			d3.selectAll(".toolTipContent").remove();
		},

	}
};