/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import tpl from "../../html/ensembleScatterplot.html";
import * as d3 from "d3";
import ToolTip from "./tooltip";
import * as utils from "../utils";
import EventHandler from "../EventHandler";

export default {
	name: "EnsembleScatterplot",
	template: tpl,
	components: {
		ToolTip,
	},

	data: () => ({
		padding: {
			top: 10,
			right: 10,
			bottom: 15,
			left: 15
		},
		xMin: 0,
		xMax: 0,
		yMin: 0,
		yMax: 0,
		firstRender: true,
		xData: [],
		yData: [],
		nameData: [],
		id: "ensemble-scatterplot-view",
		svgID: "ensemble-scatterplot-view-svg",
		message: "Runtime Scatterplot",
		boxOffset: 20,
		settings: [{ title: "Show Difference plot" }, { title: "aaa" }],
		moduleUnDesirability: 1,
		x_max_exponent: 0,
		y_max_exponent: 0,
		superscript: "⁰¹²³⁴⁵⁶⁷⁸⁹",
		includesTarget: true,
		undesirability: {},
		maxUndesirability: 0,
		maxVarianceCallsite: ""
	}),

	mounted() {
		let self = this;
		EventHandler.$on("ensemble_scatterplot", function (data) {
			console.log("Ensemble Scatterplot: ", data);
			self.visualize(data["module"]);
		});
	},

	methods: {
		init() {
			this.width = window.innerWidth * 0.25;
			this.height = (this.$store.viewHeight) * 0.33;

			this.boxWidth = this.width - this.padding.right - this.padding.left;
			this.boxHeight = this.height - this.padding.top - this.padding.bottom;

			this.svg = d3.select("#" + this.svgID)
				.attr("width", this.boxWidth)
				.attr("height", this.boxHeight - this.padding.top)
				.attr("transform", "translate(" + this.padding.left + "," + this.padding.top + ")");

			this.$refs.ToolTip.init(this.svgID);
			EventHandler.$emit("ensemble_scatterplot", {
				module: this.$store.selectedModule,
				dataset: this.$store.selectedDatasets,
			});
		},

		preprocess(data, dataset_name) {
			for (let key in data["mean"]) {
				this.yData.push(data["mean"][key]);
			}

			for (let key in data["diff"]) {
				this.xData.push(data["diff"][key]);
				this.nameData.push(key);
			}
		},

		visualize(module) {
			if (!this.firstRender) {
				this.clear();
			}
			this.firstRender = false;
			this.maxVarianceCallsite = "";
			this.maxUndesirability = 0;
			this.selectedModule = module;

			this.selectedEnsembleModuleData = this.$store.modules["ensemble"][this.selectedModule][this.$store.selectedMetric];
			this.ensembleProcess();

			if (this.$store.modules[this.$store.selectedTargetDataset][this.selectedModule] != undefined) {
				this.selectedTargetModuleData = this.$store.modules[this.$store.selectedTargetDataset][this.selectedModule][this.$store.selectedMetric];
				this.targetProcess();
			}

			let xScaleMax = Math.max(this.xMax, this.xtargetMax);
			let xScaleMin = Math.min(this.xMin, this.xtargetMin);
			let yScaleMax = Math.max(this.yMax, this.ytargetMax);
			let yScaleMin = Math.min(this.yMin, this.ytargetMin);

			this.xScale = d3.scaleLinear().domain([xScaleMin, xScaleMax]).range([this.padding.left, this.xAxisHeight]);
			this.yScale = d3.scaleLinear().domain([yScaleMin, yScaleMax]).range([this.yAxisHeight, this.padding.top]);

			this.xAxis();
			this.yAxis();
			this.ensembleDots();
			if (this.$store.showTarget && this.$store.modules[this.$store.selectedTargetDataset][this.selectedModule] != undefined) {
				this.targetDots();
			}
			// this.correlationText()
			this.setTitle();
		},

		setTitle() {
			this.moduleUnDesirability = this.maxUndesirability;
		},

		ensembleProcess() {
			let mean_time = [];
			let mean_time_inc = [];
			for (let i = 0; i < this.$store.selectedDatasets.length; i += 1) {
				let callsites_in_module = this.$store.moduleCallsiteMap["ensemble"][this.selectedModule];
				for (let j = 0; j < callsites_in_module.length; j += 1) {
					let thiscallsite = callsites_in_module[j];
					let thisdata = this.$store.callsites[this.$store.selectedDatasets[i]][thiscallsite];
					if (thisdata != undefined) {
						mean_time.push({
							"callsite": thiscallsite,
							"val": thisdata["Exclusive"]["mean_time"],
							"run": this.$store.selectedDatasets[i]
						});
						mean_time_inc.push({
							"callsite": thiscallsite,
							"val": thisdata["Inclusive"]["mean_time"],
							"run": this.$store.selectedDatasets[i]
						});
					}
				}
			}

			let all_data = this.$store.modules["ensemble"][this.selectedModule];
			let temp;
			if (this.$store.selectedScatterMode == "mean") {
				temp = this.scatterMean(mean_time, mean_time_inc);
			}
			else if (this.$store.selectedScatterMode == "all") {
				temp = this.scatterAll(all_data["time"], all_data["time (inc)"]);
			}

			this.xMin = temp[0];
			this.yMin = temp[1];
			this.xMax = temp[2];
			this.yMax = temp[3];
			this.xArray = temp[4];
			this.yArray = temp[5];

			this.leastSquaresCoeff = this.leastSquares(this.xArray.slice(), this.yArray.slice());
			this.regressionY = this.leastSquaresCoeff["y_res"];
			this.corre_coef = this.leastSquaresCoeff["corre_coef"];

			this.xAxisHeight = this.boxWidth - 4 * this.padding.left;
			this.yAxisHeight = this.boxHeight - 4 * this.padding.left;
		},

		targetProcess() {
			let mean_time = [];
			let mean_time_inc = [];

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
			this.xtargetMin = temp[0];
			this.ytargetMin = temp[1];
			this.xtargetMax = temp[2];
			this.ytargetMax = temp[3];
			this.xtargetArray = temp[4];
			this.ytargetArray = temp[5];
		},

		scatterAll(xData, yData) {
			let xArray = [];
			let yArray = [];
			let yMin = 0;
			let xMin = 0;
			let xMax = 0;
			let yMax = 0;

			for (const [idx, d] of Object.entries(xData)) {
				xMin = Math.min(xMin, d);
				xMax = Math.max(xMax, d);
				xArray.push(d);
			}

			for (const [idx, d] of Object.entries(yData)) {
				yMin = Math.min(yMin, d);
				yMax = Math.max(yMax, d);
				yArray.push(d);
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
						return `${runtime[0]}`;
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

		calculateQDC(callsite, run) {
			let q = this.$store.callsites[run][callsite][this.$store.selectedMetric]["q"];

			if (q[3] == 0 && q[1] == 0) {
				this.undesirability[callsite] = 1;
			}
			else {
				this.undesirability[callsite] = (q[3] - q[1]) / (q[3] + q[1]) * 100;
			}
			if (this.maxUndesirability < this.undesirability[callsite]) {
				this.maxVarianceCallsite = utils.truncNames(callsite, 10);
			}
			this.maxUndesirability = Math.max(this.undesirability[callsite], this.maxUndesirability).toFixed(3);

			let opacity = this.undesirability[callsite] / this.maxUndesirability;
			return opacity;
		},

		ensembleDots() {
			let self = this;
			for (let i = 0; i < this.xArray.length; i += 1) {
				let callsite = this.xArray[i]["callsite"];
				let run = this.xArray[i]["run"];
				// let opacity = this.calculateQDC(callsite, run)
				let opacity = 1;

				this.svg
					.append("circle")
					.attrs({
						"class": "ensemble-dot",
						"r": 7.5,
						"opacity": opacity,
						"cx": () => {
							return this.xScale(this.xArray[i].val) + 3 * this.padding.left;
						},
						"cy": () => {
							return this.yScale(this.yArray[i].val);
						}
					})
					.style("stroke", "#202020")
					.style("stroke-width", 0.5)
					.style("fill", this.$store.distributionColor.ensemble)
					.on("mouseover", () => {
						let data = {
							"callsite": callsite,
							"QCD": opacity,
							"value": self.xArray[i].val,
							"run": self.xArray[i].run
						};
						self.$refs.ToolTip.render(data);
					})
					.on("mouseout", () => {
						self.$refs.ToolTip.clear();
					});
			}
		},

		targetDots() {
			let self = this;
			for (let i = 0; i < this.xtargetArray.length; i++) {
				let callsite = this.xtargetArray[i]["callsite"];
				let run = this.xArray[i]["run"];
				// let opacity = this.calculateQDC(callsite, run)

				let opacity = 1;
				this.svg
					.append("circle")
					.attrs({
						"class": "target-dot",
						"r": 7.5,
						"opacity": opacity,
						"cx": () => {
							return this.xScale(this.xtargetArray[i].val) + 3 * this.padding.left;
						},
						"cy": (d, i) => {
							return this.yScale(self.ytargetArray[i].val);
						}
					})
					.style("fill", this.$store.distributionColor.target)
					.style("stroke", this.$store.runtimeColor.edgeStrokeColor)
					.style("stroke-width", 0.5)
					.on("mouseover", () => {
						let data = {
							"callsite": callsite,
							"QCD": opacity,
							"value": self.xtargetArray[i].val,
							"run": run
						};
						self.$refs.ToolTip.render(data);
					})
					.on("mouseout", () => {
						// self.$refs.ToolTip.clear()
					});
			}
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
			d3.selectAll(".ensemble-dot").remove();
			d3.selectAll(".target-dot").remove();
			d3.selectAll(".axis").remove();
			d3.selectAll(".trend-line").remove();
			d3.selectAll(".scatterplot-axis-label").remove();
			d3.selectAll(".text").remove();
			d3.selectAll(".scatterplot-axis-label").remove();
		},
	}
};