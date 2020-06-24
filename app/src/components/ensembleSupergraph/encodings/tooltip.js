/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import * as d3 from "d3";
import * as utils from "../../utils";

export default {
	template: "<g id=\"tooltip\"> </g>",
	name: "ToolTip",
	components: {},

	data: () => ({
		id: "",
		textCount: 0,
		textxOffset: 20,
		textyOffset: 20,
		textPadding: 15,
		height: 200,
		margin: 35
	}),

	sockets: {
		tooltip(data) {
			this.render(data);
		},
	},

	methods: {
		init(id) {
			this.id = id;
			this.toolTipDiv = d3.select("#" + this.id);
			this.toolTipG = this.toolTipDiv.append("g");
			this.callgraphOverviewWidth = this.$store.viewWidth;
			this.halfWidth = this.callgraphOverviewWidth / 2;
		},

		positionX() {
			let ret = 0;
			if (this.mousePosX >= this.halfWidth) {
				ret = this.mousePosX - this.halfWidth + this.textxOffset;
			}
			else {
				ret = this.halfWidth - this.mousePosX + this.textxOffset;
			}
			return ret;
		},

		positionY(node) {
			if (this.mousePosY < node.y) {
				return node.y - this.mousePosY + node.height / 2;
			}
			return this.mousePosY - node.y + node.height / 2;
		},

		visualize(graph, node) {
			this.clear();
			this.xOffset = this.positionX();
			this.yOffset = this.positionY(node);
			this.nodeHeight = node.height;
			var svgScale = d3.scaleLinear().domain([2, 11]).range([50, 150]);
			this.mousePos = d3.mouse(d3.select("#" + this.id).node());
			this.mousePosX = this.mousePos[0];
			this.mousePosY = this.mousePos[1];
			this.toolTipG.attr("height", svgScale(10) + "px");
			this.toolTipRect = this.toolTipG
				.append("rect")
				.attrs({
					"class": "toolTipContent",
					"fill": "#e0e0e0",
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
			this.graph = graph;
			this.node = node;

			this.times();
			this.paths();
		},

		addText(text) {
			let self = this;
			this.textCount += 1;
			this.toolTipText = this.toolTipG
				.append("text")
				.style("font-family", "sans-serif")
				.style("font-size", "")
				.attrs({
					"class": "toolTipContent",
					"x": () => {
						return this.xOffset + this.margin;
					},
					"y": () => {
						return this.yOffset + this.textyOffset + this.textPadding * this.textCount + "px";
					}
				})
				.text(text);
		},

		times() {
			this.addText("Name: " + this.trunc(this.node.id, 40));
			// this.addText('Inclusive Time: ' + (this.node['time (inc)'] * 0.000001).toFixed(3) + "s - " + Math.floor(((this.node['time (inc)'] / this.$store.maxIncTime['ensemble']) * 100).toFixed(3)) + "%")
			// this.addText('Exclusive Time: ' + (this.node['time'] * 0.000001).toFixed(3) + "s - " + Math.floor(((this.node['time'] / this.$store.maxExcTime['ensemble']) * 100).toFixed(3)) + "%")
			// this.addText('Inclusive Time: ' + utils.formatRuntimeWithUnits(this.node.actual_time['Inclusive']))
			// this.addText('Exclusive Time: ' + utils.formatRuntimeWithUnits(this.node.actual_time['Exclusive']))
			this.addText("Inclusive Time: " + utils.formatRuntimeWithUnits(this.node["time (inc)"]));
			this.addText("Exclusive Time: " + utils.formatRuntimeWithUnits(this.node["time"]));
			// this.addText('Node value: ' + utils.formatRuntimeWithUnits(this.node.value))
			// this.addText('Node height: ' + this.node.height)

		},

		trunc(str, n) {
			str = str.replace(/<unknown procedure>/g, "proc ");
			return (str.length > n) ? str.substr(0, n - 1) + "..." : str;
		},

		paths() {
			let entry_functions = this.$store.modules["ensemble"][this.node.id]["callers"];

			let entry_function_runtimes = {};
			for (let i = 0; i < entry_functions.length; i += 1) {
				let callsite = entry_functions[i].replace("'", "").replace("'", "").replace("[", "").replace("]", "");
				entry_function_runtimes[callsite] = this.$store.callsites["ensemble"][callsite][this.$store.selectedMetric]["mean_time"];
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

			// TODO: Bug here
			for (var tIndex = 0; tIndex < Math.min(3, entry_function_data.length); tIndex++) {
				this.textCount += 1;
				let fromColor = this.$store.color.getColorByValue(entry_function_data[tIndex][1]);
				let toColor = this.$store.color.getColor(this.node);
				let fromFunc = entry_function_data[tIndex][0];
				let toFunc = this.node.id;
				let xOffset = this.xOffset + this.margin;
				let yOffset = this.yOffset + this.textyOffset + this.textPadding * this.textCount;

				this.toolTipG
					.append("rect")
					.attrs({
						"width": this.rectWidth,
						"height": this.rectWidth,
						"x": xOffset + "px",
						"y": yOffset - 10 + "px",
						"class": "toolTipContent"
					})
					.style("fill", fromColor);

				this.toolTipG
					.append("text")
					.attrs({
						"x": xOffset + 15 + "px",
						"y": yOffset + "px",
						"class": "toolTipContent",
					})
					.text(this.trunc(fromFunc, 10));

				this.toolTipG
					.append("text")
					.attrs({
						"x": xOffset + 120 + "px",
						"y": yOffset + "px",
						"class": "toolTipContent",
					})
					.text("->");

				this.toolTipG
					.append("rect")
					.attrs({
						"width": this.rectWidth,
						"height": this.rectWidth,
						"x": xOffset + 140 + "px",
						"y": yOffset - 10 + "px",
						"class": "toolTipContent",
					})
					.style("fill", toColor);
				this.toolTipG
					.append("text")
					.attrs({
						"x": xOffset + 155 + "px",
						"y": yOffset + "px",
						"class": "toolTipContent",
					})
					.text(this.trunc(toFunc, 10));
			}

			let left_callsites = entry_function_data.length - 3;
			this.addText("and " + left_callsites + " call sites more.");

		},

		clear() {
			this.textCount = 0;
			d3.selectAll(".toolTipContent").remove();
		},

	}
};