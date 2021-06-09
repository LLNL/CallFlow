/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
  <div :id="id">
	<InfoChip ref="InfoChip" :title="title" :summary="summary" />
	<svg :id="svgID"></svg>
	<ToolTip ref="ToolTip" />
  </div>
</template>


<script>
// Library imports
import * as d3 from "d3";

// Local library
import * as utils from "lib/utils";

import InfoChip from "../general/infoChip";
import APIService from "lib/routing/APIService";
import EventHandler from "lib/routing/EventHandler";

// Local components
import ToolTip from "./tooltip";

export default {
	name: "EnsembleScatterplot",
	components: {
		ToolTip,
		InfoChip
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
		title: "Metric Correlation",
		info: "",
		message: "",
		boxOffset: 20,
		settings: [{ title: "Show Difference plot" }, { title: "aaa" }],
		moduleUnDesirability: 1,
		x_max_exponent: 0,
		y_max_exponent: 0,
		superscript: "⁰¹²³⁴⁵⁶⁷⁸⁹",
		includesTarget: true,
		undesirability: {},
		maxUndesirability: 0,
		maxVarianceCallsite: "",
		summary: "MPI Runtime Scatterplot view correlates between the inclusive and exclusive runtime metrics across the ensemble. Each dot or point in the view represents a process.",
		svg: undefined,
	}),

	mounted() {
		let self = this;
		EventHandler.$on("ensemble-scatterplot", function (callsite) {
			console.log("Ensemble Scatterplot: ", callsite);
			self.visualize(callsite);
		});

		// this.init();
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
			
			EventHandler.$emit("ensemble-scatterplot", "LagrangeElements");
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

		async visualize(callsite) {
			const data = await APIService.POSTRequest("ensemble_scatterplot", {
				dataset: this.$store.selectedTargetDataset,
				node: callsite,
				ntype: "callsite",
				orientation: ["time", "time (inc)"],
			});

			this.firstRender = false;
			this.maxVarianceCallsite = "";
			this.maxUndesirability = 0;
			this.selectedModule = this.$store.selectedNode["id"];

			this.scat_data = data;

			this.xMin = this.scat_data["bkg"]["xMin"];
			this.yMin = this.scat_data["bkg"]["yMin"];
			this.xMax = this.scat_data["bkg"]["xMax"];
			this.yMax = this.scat_data["bkg"]["yMax"];
			this.xArray = this.scat_data["bkg"]["x"];
			this.yArray = this.scat_data["bkg"]["y"];

			this.xtargetMin = this.scat_data["tgt"]["xMin"];
			this.ytargetMin = this.scat_data["tgt"]["yMin"];
			this.xtargetMax = this.scat_data["tgt"]["xMax"];
			this.ytargetMax = this.scat_data["tgt"]["yMax"];
			this.xtargetArray = this.scat_data["tgt"]["x"];
			this.ytargetArray = this.scat_data["tgt"]["y"];

			this.xAxisHeight = this.boxWidth - 4 * this.padding.left;
			this.yAxisHeight = this.boxHeight - 4 * this.padding.left;
			
			let xScaleMax = Math.max(this.xMax, this.xtargetMax);
			let xScaleMin = Math.min(this.xMin, this.xtargetMin);
			let yScaleMax = Math.max(this.yMax, this.ytargetMax);
			let yScaleMin = Math.min(this.yMin, this.ytargetMin);

			this.xScale = d3.scaleLinear()
				.domain([xScaleMin, xScaleMax])
				.nice(5)
				.range([this.padding.left, this.xAxisHeight]);

			this.yScale = d3.scaleLinear()
				.domain([yScaleMin, yScaleMax])
				.nice(5)
				.range([this.yAxisHeight, this.padding.top]);
			
			this.drawXAxis(this.svg);
			this.drawYAxis(this.svg);

			this.ensembleDots();
			this.trendline(this.xArray, this.yArray, "red", "bkg");

			if (this.$store.showTarget) {
				this.trendline(this.xtargetArray, this.ytargetArray, "blue", "tgt");
				this.targetDots();
			}

			// this.correlationText()
			this.setTitle();
			// this.$refs.ToolTip.init(this.svgID);
		},

		setTitle() {
			this.moduleUnDesirability = this.maxUndesirability;
		},

		// ensembleProcess() {
		// 	let mean_time = [];
		// 	let mean_time_inc = [];
		// 	// TODO: Expensivee!!!!
		// 	for (let i = 0; i < this.$store.selectedDatasets.length; i += 1) {
		// 		let callsites_in_module = this.$store.m2c["ensemble"][this.selectedModule];
		// 		for (let j = 0; j < callsites_in_module.length; j += 1) {
		// 			let _c = callsites_in_module[j];
		// 			let _d = this.$store.data_cs[this.$store.selectedDatasets[i]][_c];
		// 			mean_time.push({
		// 				"callsite": _c,
		// 				"val": _d["time"]["mean"],
		// 				"run": this.$store.selectedDatasets[i]
		// 			});
		// 			mean_time_inc.push({
		// 				"callsite": _c,
		// 				"val": _d["time (inc)"]["mean"],
		// 				"run": this.$store.selectedDatasets[i]
		// 			});
		// 		}
		// 	}

		// 	let all_data = this.$store.data_mod["ensemble"][this.selectedModule];
		// 	let temp;
		// 	if (this.$store.selectedScatterMode == "mean") {
		// 		temp = this.scatter(mean_time, mean_time_inc);
		// 	}
		// 	else if (this.$store.selectedScatterMode == "all") {
		// 		temp = this.scatter(all_data["time"], all_data["time (inc)"]);
		// 	}

		// 	this.xMin = temp[0];
		// 	this.yMin = temp[1];
		// 	this.xMax = temp[2];
		// 	this.yMax = temp[3];
		// 	this.xArray = temp[4];
		// 	this.yArray = temp[5];

		// 	this.leastSquaresCoeff = this.leastSquares(this.xArray.slice(), this.yArray.slice());
		// 	this.regressionY = this.leastSquaresCoeff["y_res"];
		// 	this.corre_coef = this.leastSquaresCoeff["corre_coef"];
		// },

		// targetProcess() {
		// 	let mean_time = [];
		// 	let mean_time_inc = [];

		// 	let callsites_in_module = this.$store.m2c[this.$store.selectedTargetDataset][this.selectedModule];
		// 	for (let i = 0; i < callsites_in_module.length; i += 1) {
		// 		let thiscallsite = callsites_in_module[i];
		// 		let thisdata = this.$store.data_cs[this.$store.selectedTargetDataset][thiscallsite];
		// 		mean_time.push({
		// 			"callsite": thiscallsite,
		// 			"val": thisdata["time"]["mean"],
		// 			"run": this.$store.selectedTargetDataset
		// 		});
		// 		mean_time_inc.push({
		// 			"callsite": thiscallsite,
		// 			"val": thisdata["time (inc)"]["mean"],
		// 			"run": this.$store.selectedTargetDataset
		// 		});
		// 	}

		// 	let temp;
		// 	this.$store.selectedScatterMode = "mean";
		// 	if (this.$store.selectedScatterMode == "mean") {
		// 		temp = this.scatter(mean_time, mean_time_inc);
		// 	}
		// 	else if (this.$store.selectedScatterMode == "all") {
		// 		let data = this.$store.data_mod[this.$store.selectedTargetDataset][this.selectedModule];
		// 		temp = this.scatter(data["time"], data["time (inc)"]);
		// 	}

		// 	this.xtargetMin = temp[0];
		// 	this.ytargetMin = temp[1];
		// 	this.xtargetMax = temp[2];
		// 	this.ytargetMax = temp[3];
		// 	this.xtargetArray = temp[4];
		// 	this.ytargetArray = temp[5];
		// },

		addxAxisLabel(svg) {
			let max_value = this.xScale.domain()[1];
			this.x_max_exponent = utils.formatExponent(max_value);
			let exponent_string = this.superscript[this.x_max_exponent];
			let label = "(e+" + this.x_max_exponent + ") " + "Exclusive Runtime (" + "\u03BCs)";
			svg.append("text")
				.attr("class", "scatterplot-axis-label")
				.attr("x", this.boxWidth - 1 * this.padding.right)
				.attr("y", this.yAxisHeight + 3 * this.padding.top)
				.style("font-size", "12px")
				.style("text-anchor", "end")
				.text(label);
		},

		drawXAxis(svg) {
			this.addxAxisLabel(svg);
			const xAxis = d3.axisBottom(this.xScale)
				.ticks(10)
				.tickFormat((d, i) => {
					if (i % 3 == 0) {
						let runtime = utils.formatRuntimeWithExponent(d, this.x_max_exponent);
						return `${runtime[0]}`;
					}
				});

			var xAxisLine = svg.append("g")
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

		addyAxisLabel(svg) {
			let max_value = this.yScale.domain()[1];
			this.y_max_exponent = utils.formatExponent(max_value);
			let exponent_string = this.superscript[this.y_max_exponent];
			let label = "(e+" + this.y_max_exponent + ") " + "Inclusive Runtime (" + "\u03BCs)";
			svg.append("text")
				.attr("class", "scatterplot-axis-label")
				.attr("transform", "rotate(-90)")
				.attr("x", -this.padding.top)
				.attr("y", this.padding.left)
				.style("text-anchor", "end")
				.style("font-size", "12px")
				.text(label);
		},

		drawYAxis(svg) {
			let tickCount = 10;
			this.addyAxisLabel(svg);
			let yAxis = d3.axisLeft(this.yScale)
				.ticks(tickCount)
				.tickFormat((d, i) => {
					if (i % 3 == 0 || i == tickCount - 1) {
						let runtime = utils.formatRuntimeWithExponent(d, this.y_max_exponent);
						return `${runtime[0]}`;
					}
				});

			var yAxisLine = svg.append("g")
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

		trendline(xArray, yArray, lineColor, id) {
			const leastSquaresCoeff = utils.leastSquares(xArray, yArray);
			this.info = "Correlation : " + Math.round(leastSquaresCoeff[2] * 1000)/ 1000;

			// apply the reults of the least squares regression
			var x1 = this.xMin;
			var y1 = leastSquaresCoeff[0] * this.xMin + leastSquaresCoeff[1];
			var x2 = this.xMax;
			var y2 = leastSquaresCoeff[0] * this.xMax + leastSquaresCoeff[1];
			var trendData = [[x1,y1,x2,y2]];
			
			var trendline = this.svg.selectAll("#trendline" + id)
				.data(trendData);
			
			trendline.enter()
				.append("line")
				.attr("id", "trendline" + id)
				.attr("x1", (d) => this.xScale(d[0]))
				.attr("y1", (d) => this.yScale(d[1]))
				.attr("x2", (d) => this.xScale(d[2]))
				.attr("y2", (d) => this.yScale(d[3]))
				.attr("stroke", lineColor)
				.attr("stroke-width", 1)
				.attr(
					"transform",
					"translate(" + 3 * this.padding.left + "," + this.padding.top + ")"
				);
		},

		calculateQDC(callsite, run) {
			let q = this.$store.data_cs[run][callsite][this.$store.selectedMetric]["q"];

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
						"r": 5,
						"opacity": opacity,
						"cx": () => this.xScale(self.xArray[i]) + 3 * self.padding.left,
						"cy": () => this.yScale(self.yArray[i])
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
						"r": 5,
						"opacity": opacity,
						"cx": () => this.xScale(this.xtargetArray[i]) + 3 * this.padding.left,
						"cy": (d, i) => this.yScale(self.ytargetArray[i]),
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
						self.$refs.ToolTip.clear();
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
		},
	}
};

</script>