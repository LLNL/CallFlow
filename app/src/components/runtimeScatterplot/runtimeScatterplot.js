/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import tpl from "../../html/runtimeScatterplot.html";
import * as d3 from "d3";
import ToolTip from "./tooltip";
import * as utils from "../utils";
import EventHandler from "../EventHandler";


export default {
	name: "RuntimeScatterplot",
	template: tpl,
	components: {
		ToolTip
	},

	data: () => ({
		padding: {
			top: 10,
			right: 10,
			bottom: 15,
			left: 15
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
		message: "MPI Runtime Scatterplot",
		boxOffset: 20,
		superscript: "⁰¹²³⁴⁵⁶⁷⁸⁹",
		x_max_exponent: 0,
		y_max_exponent: 0,
	}),


	mounted() {
		let self = this;
		EventHandler.$on("single_scatterplot", function (data) {
			self.clear();
			console.debug("Single Scatterplot: ", data["module"]);
			self.render(data["module"]);
		});
	},

	methods: {
		init() {
			this.width = window.innerWidth * 0.25;
			this.height = this.$store.viewHeight * 0.5;

			this.boxWidth = this.width - this.padding.right - this.padding.left;
			this.boxHeight = this.height - this.padding.top - this.padding.bottom;

			this.svg = d3.select("#" + this.svgID)
				.attr("width", this.boxWidth)
				.attr("height", this.boxHeight)
				.attr("transform", "translate(" + this.padding.left + "," + this.padding.top + ")");

			EventHandler.$emit("single_scatterplot", {
				module: Object.keys(this.$store.modules[this.$store.selectedTargetDataset])[0],
				dataset: this.$store.selectedTargetDataset,
			});
		},

		render(module) {
			if (!this.firstRender) {
				this.clear();
			}
			this.firstRender = false;
			this.selectedModule = module

			this.process();

			this.xScale = d3.scaleLinear().domain([this.xMin, this.xMax]).range([this.padding.left, this.xAxisHeight]);
			this.yScale = d3.scaleLinear().domain([this.yMin, this.yMax]).range([this.yAxisHeight, this.padding.top]);

			this.xAxisHeight = this.boxWidth - 4 * this.padding.left;
			this.yAxisHeight = this.boxHeight - 4 * this.padding.left;

			this.xAxis();
			this.yAxis();
			// this.trendline()
			this.dots();
			this.correlationText();
		},

		process() {
			let mean_time = [];
			let mean_time_inc = [];

			let store = this.$store.modules[this.$store.selectedTargetDataset][this.$store.selectedModule];
			console.log(store, this.$store.selectedModule)
			console.log(store[this.$store.selectedMetric]["prop_histograms"][this.$store.selectedProp]["ensemble"])

			let callsites_in_module = this.$store.moduleCallsiteMap[this.$store.selectedTargetDataset][this.selectedModule];
			for (let i = 0; i < callsites_in_module.length; i += 1) {
				let thiscallsite = callsites_in_module[i];
				let thisdata = this.$store.callsites[this.$store.selectedTargetDataset][thiscallsite];
				mean_time.push({
					"callsite": thiscallsite,
					"val": thisdata["Exclusive"]["mean_time"],
					"run": this.$store.selectedTargetDataset
				});
				mean_time_inc.push({
					"callsite": thiscallsite,
					"val": thisdata["Inclusive"]["mean_time"],
					"run": this.$store.selectedTargetDataset
				});
			}

			let temp;
			this.$store.selectedScatterMode = "mean";
			if (this.$store.selectedScatterMode == "mean") {
				temp = this.scatterMean(mean_time, mean_time_inc);
			}
			else if (this.$store.selectedScatterMode == "all") {
				let data = this.$store.modules[this.$store.selectedTargetDataset][this.selectedModule];
				temp = this.scatterAll(data["time"], data["time (inc)"]);
			}
			this.xMin = temp[0];
			this.yMin = temp[1];
			this.xMax = temp[2];
			this.yMax = temp[3];
			this.xArray = temp[4];
			this.yArray = temp[5];
		},

		scatterAll() {
			let xArray = [];
			let yArray = [];
			let yMin = 0;
			let xMin = 0;
			let xMax = 0;
			let yMax = 0;

			for (const [idx, d] of Object.entries(this.yData)) {
				//for (let rank = 0; rank < d.length; rank += 1) {
				// yMin = Math.min(yMin, d[rank])
				// yMax = Math.max(yMax, d[rank])
				// yArray.push(d[rank])
				// }
				yMin = Math.min(yMin, d);
				yMax = Math.max(yMax, d);
				yArray.push(d);
			}

			for (const [idx, d] of Object.entries(this.xData)) {
				// for (let rank = 0; rank < d.length; rank += 1) {
				// xMin = Math.min(xMin, d[rank]);
				// xMax = Math.max(xMax, d[rank]);
				// xArray.push(d[rank])
				// }
				xMin = Math.min(xMin, d);
				xMax = Math.max(xMax, d);
				xArray.push(d);
			}

			return [xMin, yMin, xMax, yMax, xArray, yArray];
		},

		scatterMean(xData, yData) {
			let xArray = [];
			let yArray = [];
			let yMin = 0;
			let xMin = 0;
			let xMax = 0;
			let yMax = 0;

			for (const [idx, d] of Object.entries(xData)) {
				xMin = Math.min(xMin, d.val);
				xMax = Math.max(xMax, d.val);
				xArray.push(d);
			}

			for (const [idx, d] of Object.entries(yData)) {
				yMin = Math.min(yMin, d.val);
				yMax = Math.max(yMax, d.val);
				yArray.push(d);
			}

			return [xMin, yMin, xMax, yMax, xArray, yArray];
		},

		// returns slope, intercept and r-square of the line
		leastSquares(xSeries, ySeries) {
			var n = xSeries.length;
			var x_mean = 0;
			var y_mean = 0;
			var term1 = 0;
			var term2 = 0;

			for (var i = 0; i < n; i++) {
				x_mean += xSeries[i];
				y_mean += ySeries[i];
			}

			// calculate mean x and y
			x_mean /= n;
			y_mean /= n;

			// calculate coefficients
			var xr = 0;
			var yr = 0;
			for (i = 0; i < xSeries.length; i++) {
				xr = xSeries[i] - x_mean;
				yr = ySeries[i] - y_mean;
				term1 += xr * yr;
				term2 += xr * xr;

			}

			var b1 = term1 / term2;
			var b0 = y_mean - (b1 * x_mean);
			// perform regression

			let yhat = [];
			// fit line using coeffs
			for (i = 0; i < xSeries.length; i++) {
				yhat.push(b0 + (xSeries[i] * b1));
			}

			//compute correlation coef
			var xy = [];
			var x2 = [];
			var y2 = [];

			for (let i = 0; i < n; i++) {
				xy.push(xSeries[i] * ySeries[i]);
				x2.push(xSeries[i] * xSeries[i]);
				y2.push(ySeries[i] * ySeries[i]);
			}

			var sum_x = 0;
			var sum_y = 0;
			var sum_xy = 0;
			var sum_x2 = 0;
			var sum_y2 = 0;

			for (let i = 0; i < n; i++) {
				sum_x += xSeries[i];
				sum_y += ySeries[i];
				sum_xy += xy[i];
				sum_x2 += x2[i];
				sum_y2 += y2[i];
			}
			var step1 = (n * sum_xy) - (sum_x * sum_y);
			var step2 = (n * sum_x2) - (sum_x * sum_x);
			var step3 = (n * sum_y2) - (sum_y * sum_y);
			var step4 = Math.sqrt(step2 * step3);

			var corre_coef = step1 / step4;

			return {
				"y_res": yhat,
				"corre_coef": corre_coef
			};
		},

		addxAxisLabel() {
			let max_value = this.xScale.domain()[1];
			this.x_max_exponent = utils.formatExponent(max_value);
			let exponent_string = this.superscript[this.x_max_exponent];
			console.log(this.yAxisHeight)
			let label = "(e+" + this.x_max_exponent + ") " + "Exclusive Runtime (" + "\u03BCs)";
			this.svg.append("text")
				.attr("class", "scatterplot-axis-label")
				.attr("x", this.boxWidth - 1 * this.padding.right)
				.attr("y", this.yAxisHeight + 3 * this.padding.top)
				.style("font-size", "12px")
				.style("text-anchor", "end")
				.text(label);
		},

		xAxis() {
			this.addxAxisLabel();
			const xAxis = d3.axisBottom(this.xScale)
				.ticks(10)
				.tickFormat((d, i) => {
					console.log(d)
					if (i % 3 == 0) {
						let runtime = utils.formatRuntimeWithExponent(d, this.x_max_exponent);
						return `${runtime[0]}`;
					}
				});

			var xAxisLine = this.svg.append("g")
				.attr("class", "axis")
				.attr("id", "xAxis")
				.attr("transform", "translate(" + 3 * this.padding.left + "," + this.yAxisHeight + ")")
				.call(xAxis);

			xAxisLine.selectAll("path")
				.style("fill", "none")
				.style("stroke", "black")
				.style("stroke-width", "1px");

			xAxisLine.selectAll("line")
				.style("fill", "none")
				.style("stroke", "#000")
				.style("stroke-width", "1px");

			xAxisLine.selectAll("text")
				.style("font-size", "14px")
				.style("font-family", "sans-serif")
				.style("font-weight", "lighter");
		},

		addyAxisLabel() {
			let max_value = this.yScale.domain()[1];
			this.y_max_exponent = utils.formatExponent(max_value);
			let exponent_string = this.superscript[this.y_max_exponent];
			let label = "(e+" + this.y_max_exponent + ") " + "Inclusive Runtime (" + "\u03BCs)";
			this.svg.append("text")
				.attr("class", "scatterplot-axis-label")
				.attr("transform", "rotate(-90)")
				.attr("x", -this.padding.top)
				.attr("y", this.padding.left)
				.style("text-anchor", "end")
				.style("font-size", "12px")
				.text(label);
		},

		yAxis() {
			let tickCount = 10;
			this.addyAxisLabel();
			let yAxis = d3.axisLeft(this.yScale)
				.ticks(tickCount)
				.tickFormat((d, i) => {
					if (i % 3 == 0 || i == tickCount - 1) {
						let runtime = utils.formatRuntimeWithExponent(d, this.y_max_exponent);
						console.log(runtime)
						return `${parseInt(runtime[0])}`;
					}
				});

			var yAxisLine = this.svg.append("g")
				.attr("id", "yAxis")
				.attr("class", "axis")
				.attr("transform", "translate(" + 4 * this.padding.left + ", 0)")
				.call(yAxis);

			yAxisLine.selectAll("path")
				.style("fill", "none")
				.style("stroke", "black")
				.style("stroke-width", "1px");

			yAxisLine.selectAll("line")
				.style("fill", "none")
				.style("stroke", "#000")
				.style("stroke-width", "1px")
				.style("opacity", 0.5);

			yAxisLine.selectAll("text")
				.style("font-size", "14px")
				.style("font-family", "sans-serif")
				.style("font-weight", "lighter");
		},

		trendline() {
			let self = this;
			var line = d3.line()
				.x(function (d, i) {
					return self.xScale(self.xArray[i]) + 3 * self.padding.left;
				})
				.y(function (d, i) {
					return self.yScale(self.yArray[i]);
				});

			var trendline = this.svg.append("g")
				.attr("class", "trend-line")
				.append("path")
				.datum(this.regressionY)
				.attr("d", line)
				.style("stroke", "black")
				.style("stroke-width", "1px")
				.style("opacity", 0.5);
		},

		dots() {
			let self = this;
			this.svg.selectAll(".dot")
				.data(this.yArray)
				.enter().append("circle")
				.attr("class", "dot")
				.attr("r", 5)
				.attr("cx", function (d, i) {
					return self.xScale(self.xArray[i]) + 3 * self.padding.left;
				})
				.attr("cy", function (d, i) {
					return self.yScale(self.yArray[i]);
				})
				.style("fill", "#4682b4");
		},

		correlationText() {
			let self = this;
			let decimalFormat = d3.format("0.2f");
			this.svg.append("g").append("text")
				.attr("class", "text")
				.text("corr-coef: " + decimalFormat(this.corre_coef))
				.attr("x", function (d) {
					return self.boxWidth - self.width / 3;
				})
				.attr("y", function (d) {
					return 20;
				});
		},

		clear() {
			d3.selectAll(".dot").remove();
			d3.selectAll(".axis").remove();
			d3.selectAll(".trend-line").remove();
			d3.selectAll(".axis-label").remove();
			d3.selectAll(".text").remove();
		},
	}
};