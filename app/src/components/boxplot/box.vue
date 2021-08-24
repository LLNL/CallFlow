/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
	<g class="box"></g>
</template>

<script>
import * as d3 from "d3";
import * as utils from "lib/utils";

export default {
	name: "Box",
	data: () => ({
		paddingTop: 10,
		textOffset: 40,
		fontSize: 10,
		debug: false,
		superscript: "⁰¹²³⁴⁵⁶⁷⁸⁹",
	}),

	props: ["nid", "tq", "bq", "xScale", "idPrefix", "tColor", "bColor"],

	mounted() {
		if (this.debug) {
			console.log("Ensemble q: ", this.bq);
			console.log("Target q: ", this.tq);
		}

		// Get the SVG belonging to this callsite.
		this.svg = d3.select("#" + this.idPrefix + this.nid);

		this.g = this.svg
			.select(".box")
			.attrs({
				"transform": "translate(0, " + this.$parent.boxPosition + ")"
			});

		if (this.bq) {
			this.box(this.bq, this.bColor);
			this.centerLine(this.bq, this.bColor);
		}
		this.box(this.tq, this.tColor);
		this.axis();
		this.centerLine(this.tq, this.tColor);
		this.$parent.$refs.ToolTip.init(this.idPrefix + this.nid);
	},

	methods: {
		/**
		 * Draw the quartile box in the boxplot.
		 */
		box(q, color) {
			let self = this;
			this.targetBoxSVG = this.g
				.append("rect")
				.attr("class", "box")
				.attrs({
					"y": 0,
					"x": this.xScale(q.q1),
					"height": this.$parent.rectHeight,
					"fill": color,
					"width": (d) => {
						if (q.q1 == q.q3) {
							return 3;
						}
						return self.xScale(q.q3) - self.xScale(q.q1);
					},
					"stroke": "#202020",
					"stroke-width": 0.5
				})
				.style("z-index", 1)
				.on("mouseover", () => this.$parent.$refs.ToolTip.renderQ(q))
				.on("mouseout", () => this.$parent.$refs.ToolTip.clear());
		},

		/**
		 * Draw center line in the boxplot.
		 */
		centerLine(q, color) {
			let self = this;
			this.centerLineSVG = this.g
				.insert("line", "rect")
				.attrs({
					"class": "centerLine",
					"y1": this.$parent.centerLinePosition,
					"x1": this.xScale(q.min),
					"y2": this.$parent.centerLinePosition,
					"x2": this.xScale(q.max),
					"stroke": color,
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
</script>