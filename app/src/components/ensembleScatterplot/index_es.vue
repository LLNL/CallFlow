/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
  <div :id="id">
	<InfoChip ref="InfoChip" :title="title" :summary="infoSummary" />
	<svg :id="svgID"></svg>
	<ToolTip ref="ToolTip" />
  </div>
</template>


<script>
// Library imports
import * as d3 from "d3";
import { mapGetters } from "vuex";

// Local library
import * as utils from "lib/utils";
import EventHandler from "lib/routing/EventHandler";

import InfoChip from "../general/infoChip";

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
		infoSummary: "MPI Runtime Scatterplot view correlates between the inclusive and exclusive runtime metrics across the ensemble. Each dot or point in the view represents a process.",
		svg: undefined,
	}),

	computed: {
		...mapGetters({
			selectedTargetRun: "getSelectedTargetRun",
			selectedNode: "getSelectedNode",
			data: "getEnsembleScatterplot",
			summary: "getSummary",
			showTarget: "getShowTarget",
			generalColors: "getGeneralColors",
			targetColor: "getTargetColor",
			isComparisonMode: "getComparisonMode",
			selectedCompareRun: "getSelectedCompareRun"
		})
	},

	watch: {
		data: function () {
			this.visualize();
		}
	},

	mounted() {
		let self = this;
		EventHandler.$on("reset-ensemble-scatterplot", function() {
			self.clear();
			self.init();
		});

		EventHandler.$on("update-node-encoding", function() {
			self.clear();
			self.init();
		});
	},

	methods: {
		init() {
			this.orientation = ["time", "time (inc)"];
			if (this.isComparisonMode) {
				this.$store.dispatch("fetchEnsembleScatterplot", {
					dataset: this.selectedTargetRun,
					background: this.selectedCompareRun,
					node: this.selectedNode["name"],
					ntype: this.selectedNode["type"],
					orientation: ["time", "time (inc)"],
				});
			} 
			else {
				this.$store.dispatch("fetchEnsembleScatterplot", {
					dataset: this.selectedTargetRun,
					node: this.selectedNode["name"],
					ntype: this.selectedNode["type"],
					orientation: ["time", "time (inc)"],
				});
			}

			this.width = window.innerWidth * 0.25;
			this.height = (this.$store.viewHeight) * 0.30;

			this.boxWidth = this.width - this.padding.right - this.padding.left;
			this.boxHeight = this.height - this.padding.top - this.padding.bottom;
			this.svg = d3.select("#" + this.svgID)
				.attr("width", this.boxWidth)
				.attr("height", this.boxHeight - this.padding.top)
				.attr("transform", "translate(" + this.padding.left + "," + this.padding.top + ")");
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

		visualize() {
			this.firstRender = false;
			this.maxVarianceCallsite = "";
			this.maxUndesirability = 0;

			this.xMin = this.data["bkg"]["xMin"];
			this.yMin = this.data["bkg"]["yMin"];
			this.xMax = this.data["bkg"]["xMax"];
			this.yMax = this.data["bkg"]["yMax"];
			this.xArray = this.data["bkg"]["x"];
			this.yArray = this.data["bkg"]["y"];

			this.xtargetMin = this.data["tgt"]["xMin"];
			this.ytargetMin = this.data["tgt"]["yMin"];
			this.xtargetMax = this.data["tgt"]["xMax"];
			this.ytargetMax = this.data["tgt"]["yMax"];
			this.xtargetArray = this.data["tgt"]["x"];
			this.ytargetArray = this.data["tgt"]["y"];

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
			
			this.drawXAxis();
			this.drawYAxis();

			this.ensembleDots();
			this.trendline(this.xArray, this.yArray, "red", "bkg");

			if (this.showTarget) {
				this.trendline(this.xtargetArray, this.ytargetArray, "blue", "tgt");
				this.targetDots();
			}

			// this.correlationText()
			this.setTitle();
			this.$refs.ToolTip.init(this.svgID);
		},

		setTitle() {
			this.moduleUnDesirability = this.maxUndesirability;
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

		drawXAxis() {
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

		drawYAxis() {
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

		trendline(xArray, yArray, lineColor, id) {
			const leastSquaresCoeff = utils.leastSquares(xArray, yArray);
			this.info = "Correlation : " + Math.round(leastSquaresCoeff[2] * 1000)/ 1000;

			// apply the reults of the least squares regression
			var x1 = this.xMin;
			var y1 = leastSquaresCoeff[0] * this.xMin + leastSquaresCoeff[1];
			var x2 = this.xMax;
			var y2 = leastSquaresCoeff[0] * this.xMax + leastSquaresCoeff[1];
			var trendData = [[x1, y1, x2, y2]];
			
			var trendline = this.svg.selectAll("#trendline" + id)
				.data(trendData);
			
			trendline.enter()
				.append("line")
				.attr("class", "trendline")
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
					.style("fill", this.generalColors.intermediate)
					.on("mouseover", () => {
						let data = {
							"callsite": callsite,
							"QCD": opacity,
							"x": self.xArray[i],
							"y": self.yArray[i],
							"run": self.xArray[i].run,
							"orientation": self.orientation
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
					.style("fill", this.targetColor)
					.style("opacity", 0.5)
					.style("stroke", this.generalColors.darkGrey)
					.style("stroke-width", 0.5)
					.on("mouseover", () => {
						let data = {
							"callsite": callsite,
							"QCD": opacity,
							"x": self.xtargetArray[i],
							"y": self.ytargetArray[i],
							"orientation": self.orientation,
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
			d3.selectAll(".trendline").remove();
		},
	}
};

</script>