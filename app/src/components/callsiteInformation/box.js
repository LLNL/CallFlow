/** 
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
import * as d3 from "d3";
import * as utils from "../utils";

export default {
	name: "Box",
	template: "<g class=\"box\"></g>",

	data: () => ({
		id: "box",
		paddingTop: 10,
		textOffset: 40,
		fontSize: 10,
		debug: false,
		superscript: "⁰¹²³⁴⁵⁶⁷⁸⁹",
	}),

	methods: {
		/**
		 * 
		 * @param {*} callsite 
		 * @param {*} q 
		 * @param {*} targetq 
		 * @param {*} xScale 
		 */
		init(callsite, q, targetq, xScale) {
			if (this.debug) {
				console.log("Ensemble q: ", q);
				console.log("Target q: ", targetq);
			}
			this.q = q;
			this.targetq = targetq;
			this.xScale = xScale;

			// Get the SVG belonging to this callsite.
			this.svg = d3.select("#boxplot-" + callsite.id);
			this.id = "box-" + callsite.id;

			this.g = this.svg
				.select(".box")
				.attrs({
					"transform": "translate(0, " + this.$parent.boxPosition + ")"
				});

			this.box();
			this.axis();
			this.centerLine();
			this.$parent.$refs.ToolTip.init("boxplot-" + callsite.id);
		},

		/**
		 * Draw the quartile box in the boxplot.
		 */
		box() {
			let self = this;
			this.targetBoxSVG = this.g
				.append("rect")
				.attr("class", "box")
				.attrs({
					"y": 0,
					"x": this.xScale(this.targetq.q1),
					"height": this.$parent.rectHeight,
					"fill": this.$store.runtimeColor.intermediate,
					"width": (d) => {
						if (self.targetq.q1 == self.targetq.q3) {
							return 3;
						}
						return self.xScale(self.targetq.q3) - self.xScale(self.targetq.q1);
					},
					"stroke": "#202020",
					"stroke-width": 0.5
				})
				.style("z-index", 1)
				.on("mouseover", (d) => {
					self.$parent.$refs.ToolTip.renderQ(self.targetq);
				})
				.on("mouseout", (d) => {
					self.$parent.$refs.ToolTip.clear();
				});
		},

		/**
		 * Draw center line in the boxplot.
		 */
		centerLine() {
			let self = this;
			this.centerLineSVG = this.g
				.insert("line", "rect")
				.attrs({
					"class": "centerLine",
					"y1": this.$parent.centerLinePosition,
					"x1": this.xScale(this.targetq.min),
					"y2": this.$parent.centerLinePosition,
					"x2": this.xScale(this.targetq.max),
					"stroke": "black"
				})
				.style("stroke-width", "1.5")
				.style("z-index", 10);
		},

		/**
		 * Add label for the x-axis.
		 */
		addxAxisLabel() {
			let max_value = this.xScale.domain()[1];
			this.x_max_exponent = utils.formatExponent(max_value);
			let exponent_string = this.superscript[this.x_max_exponent];
			let label = "(e+" + this.x_max_exponent + ") " + "Exclusive Runtime (" + "\u03BCs)";
			this.g.append("text")
				.attr("class", "boxplot-axis-label")
				.attr("x", this.$parent.boxWidth - 20)
				.attr("y", this.$parent.centerLinePosition * 3.8)
				.style("font-size", "12px")
				.style("text-anchor", "end")
				.text(label);
		},

		/**
		 * Draw the axis for hte boxplot.
		 */
		axis() {
			this.addxAxisLabel();
			const xAxis = d3.axisBottom(this.xScale)
				.ticks(5)
				.tickFormat((d, i) => {
					let runtime = utils.formatRuntimeWithExponent(d, 1);
					return `${runtime[0]}`;
				});

			const xAxisLine = this.g.append("g")
				.attrs({
					"class": "boxplot-axis",
					"transform": "translate(" + 0 + "," + 2.5 * this.$parent.centerLinePosition + ")"
				})
				.call(xAxis);

			xAxisLine.selectAll("path")
				.style("fill", "none")
				.style("stroke", "black")
				.style("stroke-width", "1px");

			xAxisLine.selectAll("line")
				.style("fill", "none")
				.style("stroke", "black")
				.style("stroke-width", "1px");

			xAxisLine.selectAll("text")
				.style("font-size", "12px")
				.style("font-family", "sans-serif")
				.style("font-weight", "lighter");
		},

		/**
		 * Clear the boxplot. (box, center line, and axis)
		 */
		clear() {
			this.g.selectAll(".box").remove();
			this.g.selectAll(".centerLine").remove();
			this.g.selectAll(".boxplot-axis-label").remove();
			this.g.selectAll(".boxplot-axis").remove();
		}
	}
};