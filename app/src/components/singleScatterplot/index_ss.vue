/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
  <v-layout row wrap :id="id">
    <InfoChip ref="InfoChip" :title="title" :summary="infoSummary" :info="info" />
    <svg :id="svgID"></svg>
    <ToolTip ref="ToolTip" />
  </v-layout>
</template>

<script>
// Library imports
import * as d3 from "d3";
import { mapGetters } from "vuex";

// Local library imports
import * as utils from "lib/utils";
import EventHandler from "lib/routing/EventHandler";

import InfoChip from "../general/infoChip";

// Local components
import ToolTip from "../singleHistogram/tooltip";

export default {
	name: "SingleScatterplot",
	components: {
		ToolTip,
		InfoChip
	},
	data: () => ({
		padding: {
			top: 10,
			right: 10,
			bottom: 30,
			left: 20,
		},
		xData: [],
		yData: [],
		xMin: 0,
		xMax: 0,
		yMin: 0,
		yMax: 0,
		firstRender: true,
		boxHeight: 0,
		boxWidth: 0,
		id: "scatterplot-view",
		svgID: "scatterplot-view-svg",
		boxOffset: 20,
		superscript: "⁰¹²³⁴⁵⁶⁷⁸⁹",
		paddingFactor: 3.5,
		x_max_exponent: 0,
		y_max_exponent: 0,
		xAxisHeight: 0,
		yAxisHeight: 0,
		title: "MPI Runtime Scatterplot",
		infoSummary: "MPI Runtime Scatterplot view correlates between the inclusive and exclusive runtime metrics. Each dot or point in the view represents a process.",
		info: ""
	}),

	computed: {
		...mapGetters({
			selectedTargetRun: "getSelectedTargetRun",
			selectedNode: "getSelectedNode",
			data: "getSingleScatterplot",
			summary: "getSummary",
			generalColors: "getGeneralColors",
		})
	},

	watch: {
		data: function () {
			this.visualize();
		}
	},

	mounted() {
		let self = this;
		EventHandler.$on("reset-single-scatterplot", function() {
			self.clear();
			self.init();
		});
	},

	methods: {
		init() {
			this.$store.dispatch("fetchSingleScatterplot", {
				dataset: this.selectedTargetRun,
				node: this.selectedNode["name"],
				ntype: this.selectedNode["type"],
				orientation: ["time", "time (inc)"],
			});

			this.width = this.$store.viewWidth * 0.25;
			this.height = this.$store.viewHeight * 0.5;

			this.boxWidth = this.width - this.padding.right - this.padding.left;
			this.boxHeight = this.height - this.padding.top - this.padding.bottom;

			this.svg = d3
				.select("#" + this.svgID)
				.attr("width", this.boxWidth)
				.attr("height", this.boxHeight - this.padding.top)
				.attr(
					"transform",
					"translate(" + this.padding.left + "," + this.padding.top + ")"
				);

			this.xAxisHeight = this.boxWidth - 4 * this.padding.left;
			this.yAxisHeight = this.boxHeight - 4 * this.padding.left;		
		},

		visualize() {
			this.xMin = this.data.xMin;
			this.yMin = this.data.yMin;
			this.xMax = this.data.xMax;
			this.yMax = this.data.yMax;
			this.xArray = this.data.x;
			this.yArray = this.data.y;
			this.ranks = this.data.ranks;

			this.xScale = d3
				.scaleLinear()
				.domain([this.xMin, this.xMax])
				.nice(5)
				.range([0, this.xAxisHeight]);

			this.yScale = d3
				.scaleLinear()
				.domain([this.yMin, this.yMax])
				.nice(5)
				.range([this.yAxisHeight, this.padding.top]);

			this.xAxis();
			this.yAxis();
			this.dots();
			this.trendline();
			this.$refs.ToolTip.init(this.svgID);
		},

		addxAxisLabel() {
			let max_value = this.xScale.domain()[1];
			this.x_max_exponent = utils.formatExponent(max_value);
			let exponent_string = this.superscript[this.x_max_exponent];
			let label =
        "(e+" + this.x_max_exponent + ") " + "Exclusive Runtime (" + "\u03BCs)";
			this.svg
				.append("text")
				.attrs({
					class: "ss-axis-label",
					x: this.boxWidth - this.padding.right,
					y: this.yAxisHeight + 3 * this.padding.top,
				})
				.style("text-anchor", "end")
				.style("font-size", "12px")
				.text(label);
		},

		xAxis() {
			let self = this;
			this.addxAxisLabel();
			const xAxis = d3
				.axisBottom(this.xScale)
				.ticks(5)
				.tickFormat((d, i) => {
					let runtime = utils.formatRuntimeWithExponent(d, self.x_max_exponent);
					return `${Math.round(runtime[0] * 100) / 100}`;
				});

			let xAxisLine = this.svg
				.append("g")
				.attrs({
					class: "axis",
					id: "xAxis",
					transform:
            "translate(" +
            this.paddingFactor * this.padding.left +
            "," +
            this.yAxisHeight +
            ")",
				})
				.call(xAxis);

			xAxisLine
				.selectAll("path")
				.style("fill", "none")
				.style("stroke", "black")
				.style("stroke-width", "1px");

			xAxisLine
				.selectAll("line")
				.style("fill", "none")
				.style("stroke", "#000")
				.style("stroke-width", "1px");

			xAxisLine
				.selectAll("text")
				.style("font-size", "12px")
				.style("font-family", "sans-serif")
				.style("font-weight", "lighter");
		},

		addyAxisLabel() {
			let max_value = this.yScale.domain()[1];
			this.y_max_exponent = utils.formatExponent(max_value);
			let exponent_string = this.superscript[this.y_max_exponent];
			let label =
        "(e+" + this.y_max_exponent + ") " + "Inclusive Runtime (" + "\u03BCs)";
			this.svg
				.append("text")
				.attrs({
					class: "ss-axis-label",
					transform: "rotate(-90)",
					x: -this.padding.top,
					y: 0.5 * this.padding.left,
				})
				.style("text-anchor", "end")
				.style("font-size", "12px")
				.text(label);
		},

		yAxis() {
			let self = this;
			let tickCount = 5;
			this.addyAxisLabel();
			let yAxis = d3
				.axisLeft(this.yScale)
				.ticks(tickCount)
				.tickFormat((d, i) => {
					let runtime = utils.formatRuntimeWithExponent(d, self.y_max_exponent);
					return runtime[0];
				});

			const yAxisLine = this.svg
				.append("g")
				.attr("id", "yAxis")
				.attr("class", "axis")
				.attr(
					"transform",
					"translate(" + this.paddingFactor * this.padding.left + ", 0)"
				)
				.call(yAxis);

			yAxisLine
				.selectAll("path")
				.style("fill", "none")
				.style("stroke", "black")
				.style("stroke-width", "1px");

			yAxisLine
				.selectAll("line")
				.style("fill", "none")
				.style("stroke", "#000")
				.style("stroke-width", "1px")
				.style("opacity", 0.5);

			yAxisLine
				.selectAll("text")
				.style("font-size", "14px")
				.style("font-family", "sans-serif")
				.style("font-weight", "lighter");
		},

		trendline() {
			const leastSquaresCoeff = utils.leastSquares(this.xArray, this.yArray);
			this.info = "Correlation : " + Math.round(leastSquaresCoeff[2]*1000)/1000;

			// apply the reults of the least squares regression
			var x1 = this.xMin;
			var y1 = leastSquaresCoeff[0] * this.xMin + leastSquaresCoeff[1];
			var x2 = this.xMax;
			var y2 = leastSquaresCoeff[0] * this.xMax + leastSquaresCoeff[1];
			var trendData = [[x1,y1,x2,y2]];
			
			var trendline = this.svg.selectAll(".trendline")
				.data(trendData);
			
			trendline.enter()
				.append("line")
				.attr("class", "trendline")
				.attr("x1", (d) => this.xScale(d[0]))
				.attr("y1", (d) => this.yScale(d[1]))
				.attr("x2", (d) => this.xScale(d[2]))
				.attr("y2", (d) => this.yScale(d[3]))
				.attr("stroke", "red")
				.attr("stroke-width", 1)
				.attr(
					"transform",
					"translate(" + 3 * this.padding.left + "," + this.padding.top + ")"
				);
		},

		dots() {
			let d = [];
			for(let i=0; i < this.yArray.length; i += 1) {
				d.push({
					"x": this.xArray[i],
					"y": this.yArray[i],
					"rank": this.ranks[i],
				});
			}

			let self = this;
			this.svg
				.selectAll(".dot")
				.data(d)
				.enter()
				.append("circle")
				.attr("class", "dot")
				.attr("r", 5)
				.attr("cx", (d, i) => this.xScale(this.xArray[i]) + 3 * this.padding.left)
				.attr("cy", (d, i) => this.yScale(this.yArray[i]))
				.style("fill", this.generalColors.intermediate)
				.style("stroke", "#202020")
				.style("stroke-width", 0.5)
				.on("mouseover", function (d, i) {
					d3.selectAll(".dot")
						.style("fill", self.generalColors.intermediate)
						.style("stroke", self.generalColors.intermediate)
						.style("fill-opacity", 0.1);	
					d3.select(this)
						.style("fill", "orange")
						.style("stroke", "#202020")
						.style("fill-opacity", 1);
					const text = "MPI rank: " + d.rank;
					self.$refs.ToolTip.render(text, d);
				})
				.on("mouseout", function (d, i) {
					d3.selectAll(".dot")
						.style("fill", self.generalColors.intermediate)
						.style("stroke", "#202020")
						.style("fill-opacity", 1);
					self.$refs.ToolTip.clear();
				});
		},

		clear() {
			d3.selectAll(".dot").remove();
			d3.selectAll(".axis").remove();
			d3.selectAll(".trendline").remove();
			d3.selectAll(".ss-axis-label").remove();
			this.$refs.ToolTip.clear();
		},
	},
};
</script>