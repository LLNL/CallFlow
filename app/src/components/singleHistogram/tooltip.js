/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import * as d3 from "d3";

export default {
	template: "<g id=\"tooltip-histogram\"></g>",
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

	mounted() {},
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
			this.width = data.length*this.fontSize + 10*this.fontSize;
			var svgScale = d3.scaleLinear().domain([2, 11]).range([50, 150]);
			console.log(d3.select("#" + this.parentID));
			this.mousePos = d3.mouse(d3.select("#" + this.parentID).node());
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
					"z-index": 100,
					"width": this.containerWidth,
					"height": this.containerHeight,
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
				});
			this.node = node;
			this.data = data;
			this.processes();
		},

		trunc(str, n) {
			str = str.replace(/<unknown procedure>/g, "proc ");
			return (str.length > n) ? str.substr(0, n - 1) + "..." : str;
		},


		addText(text) {
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
						return (this.mousePosX) + this.offset +  "px";

					},
					"y": () => {
						return (this.mousePosY) + 2*this.offset + "px";
					}
				})
				.text(text);
		},

		processes() {
			let self = this;
			this.addText("Processes (MPI ranks): " + this.data);

		},

		clear() {
			this.textCount = 0;
			d3.selectAll(".toolTipContent").remove();
		},

	}
};