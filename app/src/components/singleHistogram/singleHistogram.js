/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */

import * as d3 from "d3";
import "d3-selection-multi";

import tpl from "../../html/histogram.html";
import ToolTip from "./tooltip";
import * as utils from "../utils";
import EventHandler from "../EventHandler";

export default {
	template: tpl,
	name: "SingleHistogram",
	components: {
		ToolTip
	},
	props: [],
	data: () => ({
		data: [],
		width: null,
		height: null,
		histogramHeight: null,
		histogramWidth: null,
		histogramSVG: null,
		padding: {
			top: 10,
			right: 10,
			bottom: 10,
			left: 15,
		},
		dataset_index: [],
		id: "single-histogram-view",
		svgID: "single-histogram-view-svg",
		firstRender: true,
		xVals: [],
		freq: [],
		selectedColorBy: "Inclusive",
		MPIcount: 0,
		message: "MPI Runtime Distribution",
		paddingFactor: 3.5,
		boxOffset: 20,
		x_max_exponent: 0,
		superscript: "⁰¹²³⁴⁵⁶⁷⁸⁹",
	}),

	mounted() {
		let self = this;
		EventHandler.$on("single_histogram", function (data) {
			self.clear();
			console.debug("Single histogram: ", data["module"]);
			self.render(data["module"]);
		});
	},

	methods: {
		init() {
			this.width = window.innerWidth * 0.25;
			this.height = this.$store.viewHeight * 0.45;

			this.boxWidth = this.width - this.padding.right - this.padding.left;
			this.boxHeight = this.height - this.padding.top - this.padding.bottom;

			this.histogramOffset = Math.floor(this.boxHeight / 4);
			this.histogramHeight = this.boxHeight - this.histogramOffset;
			this.histogramWidth = this.boxWidth;

			this.rankScaleHeight = this.boxHeight - this.histogramHeight;
			this.rankScaleWidth = this.histogramWidth;

			this.xAxisHeight = this.histogramWidth - (this.paddingFactor - 0.5) * this.padding.left;
			this.yAxisHeight = this.histogramHeight- (this.paddingFactor - 0.5) * this.padding.left;

			this.svg = d3.select("#" + this.svgID)
				.attrs({
					"width": this.boxWidth,
					"height": this.boxHeight,
					"transform": "translate(" + this.padding.left + "," + this.padding.top + ")"
				});

			EventHandler.$emit("single_histogram", {
				module: Object.keys(this.$store.modules[this.$store.selectedTargetDataset])[0],
				groupBy: this.$store.selectedGroupBy,
				dataset: this.$store.selectedTargetDataset,
			});
		},

		render(callsite) {
			let store = this.$store.modules[this.$store.selectedTargetDataset][callsite];
			let data = store[this.$store.selectedMetric]["prop_histograms"][this.$store.selectedProp]["ensemble"];

			let temp = this.dataProcess(data);
			this.xVals = temp[0];
			this.freq = temp[1];
			this.axis_x = temp[2];
			this.binContainsProcID = temp[3];
			this.logScaleBool = false;

			this.$refs.ToolTip.init(this.svgID);

			this.xScale = d3.scaleBand()
				.domain(this.xVals)
				.range([(this.paddingFactor) * this.padding.left, this.xAxisHeight]);

			if (this.$store.selectedScale == "Linear") {
				this.yScale = d3.scaleLinear()
					.domain([0, d3.max(this.freq)])
					.range([this.yAxisHeight, this.padding.top]);
				this.logScaleBool = false;
			} 
			else if (this.$store.selectedScale == "Log") {
				this.yScale = d3.scaleLog()
					.domain([1, d3.max(this.freq)])
					.range([this.yAxisHeight, this.padding.top]);
				this.logScaleBool = true;
			}
			this.visualize();
		},

		clear() {
			d3.selectAll(".single-histogram-bar").remove();
			d3.selectAll(".single-histogram-target").remove();
			d3.select(".x-axis").remove();
			d3.select(".y-axis").remove();
			d3.selectAll(".histogram-axis-label").remove();
			d3.selectAll(".binRank").remove();
			d3.selectAll(".lineRank").remove();
			d3.selectAll(".target_lineRank").remove();
			d3.selectAll(".tick").remove();
			this.$refs.ToolTip.clear();
		},

		visualize() {
			this.bars();
			this.xAxis();
			this.yAxis();
			this.rankLineScale();
			this.brushes();
		},

		array_unique(arr) {
			return arr.filter(function (value, index, self) {
				return self.indexOf(value) === index;
			});
		},

		dataProcess(data) {
			let axis_x = [];
			let binContainsProcID = {};
			let dataSorted = [];
			let dataMin = 0;
			let dataMax = 0;

			const dataWidth = ((dataMax - dataMin) / this.$store.selectedBinCount);
			for (let i = 0; i < this.$store.selectedBinCount; i++) {
				axis_x.push(dataMin + (i * dataWidth));
			}

			dataSorted.forEach((val, idx) => {
				let pos = Math.floor((val - dataMin) / dataWidth);
				if (pos >= this.$store.selectedBinCount) {
					pos = this.$store.selectedBinCount - 1;
				}
				if (binContainsProcID[pos] == null) {
					binContainsProcID[pos] = [];
				}
				binContainsProcID[pos].push(data["rank"][idx]);
			});
			return [data["x"], data["y"], axis_x, binContainsProcID];
		},

		removeDuplicates(arr) {
			var seen = {};
			return arr.filter(function (item) {
				return seen.hasOwnProperty(item) ? false : (seen[item] = true);
			});
		},

		// give an array of ids, group the ids into cosecutive group
		// return a string version and an array version
		// stolen from this: https://gist.github.com/XciA/10572206
		groupProcess(processIDs) {
			const constData = processIDs.slice();
			let a = 0;
			let groupArrayStr = "[ ";
			const groupArray = [];
			let first = true;
			cons(constData[0], 1);

			function cons(s, t) {
				if (s + 1 == constData[t]) {
					s = constData[t];
					t += 1;
					cons(s, t);
				} else {
					print(a, t - 1);
				}
			}

			function print(k, t) {
				display(k, t);
				t++;
				a = t;
				const start = constData[t];
				if (t < constData.length) {
					cons(start, t + 1);
				}
			}

			function display(k, t) {
				let string = "";
				const temp = [];
				if (k != t) {
					string = `[${constData[k]}-${constData[t]}]`;
					temp.push(constData[k]);
					temp.push(constData[t]);
				} else {
					string = `[${constData[k]}]`;
					temp.push(constData[k]);
				}
				// groupArray.push(temp);
				if (!first) {
					groupArrayStr += ", ";
				}
				groupArrayStr += string;
				groupArray.push(temp);
				first = false;
			}
			groupArrayStr += " ]";
			return {
				string: groupArrayStr,
				array: groupArray
			};
		},

		bars() {
			let self = this;
			this.svg.selectAll(".single-target")
				.data(this.freq)
				.enter()
				.append("rect")
				.attr("class", "single-histogram-bar single-target")
				.attrs({
					"x": (d, i) => { return this.xScale(this.xVals[i]) },
					"y": (d, i) => { return this.yScale(d); },
					"width": this.xScale.bandwidth(),
					"height": (d) => { return Math.abs(this.yAxisHeight - this.yScale(d)) },
					"fill": this.$store.runtimeColor.intermediate,
					"opacity": 1,
					"stroke-width": "0.2px",
					"stroke": "#202020",
				})
				.on("mouseover", function (d, i) {
					d3.select(this)
						.attr("fill", self.$store.runtimeColor.highlight);
					d3.selectAll(`.lineRank_${i}`)
						.style("fill", "orange")
						.style("fill-opacity", 1);
					let groupProcStr = self.groupProcess(self.binContainsProcID[i]).string;
					self.$refs.ToolTip.render(groupProcStr, d);
				})
				.on("mouseout", function (d, i) {
					d3.select(this)
						.attr("fill", self.$store.runtimeColor.intermediate);
					d3.selectAll(`.lineRank_${i}`)
						.style("fill", "grey")
						.style("fill-opacity", 0.4);
					self.$refs.ToolTip.clear();
				});
		},

		addxAxisLabel() {
			let max_value = this.xScale.domain()[1];
			console.log(max_value)
			this.x_max_exponent = utils.formatExponent(max_value);
			let exponent_string = this.superscript[this.x_max_exponent];
			let label = "(e+" + this.x_max_exponent + ") " + this.$store.selectedMetric + " Runtime (" + "\u03BCs)";
			this.svg.append("text")
				.attrs({
					"class": "histogram-axis-label",
					"x": this.histogramWidth - this.padding.left,
					"y": this.yAxisHeight + 3 * this.padding.top
				})
				.style("font-size", "12px")
				.style("text-anchor", "end")
				.text(label);
		},

		/* Axis for the histogram */
		xAxis() {
			this.addxAxisLabel()
			const xAxis = d3.axisBottom(this.xScale)
				.ticks(10)
				.tickFormat((d, i) => {
					if (i % 3 == 0) {
						let runtime = utils.formatRuntimeWithExponent(this.xVals[i], self.x_max_exponent);
						return `${runtime[0]}`;
					}
				});

			const xAxisLine = this.svg.append("g")
				.attrs({
					"class": "x-axis",
					"transform": "translate(" + 0 + "," + this.yAxisHeight + ")"
				})
				.call(xAxis);

			xAxisLine.selectAll("path")
				.style("fill", "none")
				.style("stroke", "black")
				.style("stroke-width", "1px");

			xAxisLine.selectAll("line")
				.style("fill", "none")
				.style("stroke", "#000")
				.style("stroke-width", "1px")
				.style("opacity", 0.5);

			xAxisLine.selectAll("text")
				.style("font-size", "12px")
				.style("font-family", "sans-serif")
				.style("font-weight", "lighter");
		},

		yAxis() {
			const yAxis = d3.axisLeft(this.yScale)
				.ticks(10)
				.tickFormat((d, i) => {
					if (d == 1) {
						return d;
					}
					else if (d % 10 == 0) {
						return d;
					}
				});

			this.svg.append("text")
				.attrs({
					"transform": "rotate(-90)",
					"class": "histogram-axis-label",
					"x": -this.padding.top,
					"y": this.padding.left
				})
				.style("font-size", "12px")
				.style("text-anchor", "end")
				.text("Number of Processes");

			const yAxisLine = this.svg.append("g")
				.attrs({
					"class": "y-axis",
					"transform": "translate(" + this.paddingFactor * this.padding.left + ", 0)"
				}).call(yAxis);

			yAxisLine.selectAll("path")
				.style("fill", "none")
				.style("stroke", "black")
				.style("stroke-width", "1px");

			yAxisLine.selectAll("line")
				.style("fill", "none")
				.style("stroke", "#000")
				.style("stroke-width", "1px")
				.style("opacity", 0.2);

			yAxisLine.selectAll("text")
				.style("font-size", "12px")
				.style("font-family", "sans-serif")
				.style("font-weight", "lighter");
		},

		rankLineScale() {
			let rankCount = parseInt(this.$store.numOfRanks[this.$store.selectedTargetDataset]);

			const ranklinescale = d3.scaleLinear()
				.domain([0, rankCount])
				.range([0, this.rankScaleWidth]);

			this.freq.forEach((freqVal, idx) => {
				const processIDs = this.binContainsProcID[idx];

				if (processIDs) {
					const rankLinesG = this.svg.append("g")
						.attr("class", `binRank bin_${idx}`)
						.attr("data-name", idx);

					processIDs.sort((a, b) => a - b);

					const groupArray = this.groupProcess(processIDs).array;
					const binWidth = this.histogramXScale.bandwidth();
					const widthPerRank = binWidth / processIDs.length;
					const binLocation = this.histogramXScale(this.xVals[idx]);
					let cumulativeBinSpace = 0;

					groupArray.forEach((group) => {
						let line;
						if (group.length == 1) {
							var start = group[0];
							var end = start + 1;
							var topX1 = cumulativeBinSpace + binLocation;
							var topX2 = cumulativeBinSpace + binLocation + (1) * widthPerRank;

							var botX3 = ranklinescale(start);
							var botX4 = ranklinescale(start);

							var topY = this.boxHeight - this.histogramOffset;
							var botY = this.boxHeight;
							cumulativeBinSpace += (1) * widthPerRank;

							line = "M" + topX1 + " " + topY +
								"L " + topX2 + " " + topY +
								"L " + botX4 + " " + botY +
								"L " + botX3 + " " + botY;
						} else {
							let start = group[0];
							let end = group[1];

							let topX1 = cumulativeBinSpace + binLocation;
							let topX2 = cumulativeBinSpace + (end - start + 1) * widthPerRank + binLocation;

							let botX3 = ranklinescale(start);
							let botX4 = ranklinescale(end);

							let topY = this.boxHeight - this.histogramOffset;
							let botY = this.boxHeight;

							cumulativeBinSpace += (end - start + 1) * widthPerRank;

							line = "M" + topX1 + " " + topY +
								"L " + topX2 + " " + topY +
								"L " + botX4 + " " + botY +
								"L " + botX3 + " " + botY;
						}

						rankLinesG.append("path")
							.attr("d", line)
							.attr("class", "lineRank lineRank_" + idx)
							.style("fill", (d) => {
								return "grey";
							})
							.style("fill-opacity", 0.4)
							.attr("transform", `translate(${this.axisLabelFactor * this.padding.left},${-this.padding.bottom})`);
					});
				}
			});

			const rankLineAxis = d3.axisBottom(ranklinescale)
				.ticks(this.$store.selectedBinCount)
				.tickFormat((d, i) => {
					if (i % 10 == 0 || i == this.$store.numOfRanks[this.$store.selectedTargetDataset] - 1) {
						return d;
					}
				});

			const rankLineAxisLine = this.svg.append("g")
				.attr("class", "histogram-rank-axis")
				.attr("id", "rankAxis")
				.attr("transform", `translate(${this.paddingFactor * this.padding.left},${this.boxHeight - this.padding.bottom})`)
				.call(rankLineAxis);

			rankLineAxisLine.selectAll("path")
				.style("fill", "none")
				.style("stroke", "black")
				.style("stroke-width", "1px");

			rankLineAxisLine.selectAll("line")
				.style("fill", "none")
				.style("stroke", "#000")
				.style("stroke-width", "1px")
				.style("opacity", 0.5);

			rankLineAxisLine.selectAll("text")
				.style("font-size", "12px")
				.style("font-family", "sans-serif")
				.style("font-weight", "lighter");
		},

		brushes() {
			this.brushdata = [];

			this.brushSVG = this.svg
				.append("svg");

			this.brush = d3.brushX()
				.extent([
					[this.axisLabelFactor * this.padding.left, this.histogramHeight - this.padding.top],
					[this.boxWidth, this.boxHeight - this.padding.top]
				])
				.on("brush", this.brushing)
				.on("end", this.brushend);

			let id = 0;
			this.brushdata.push({
				id: id,
				brush: this.brush
			});

			this.brushSVG
				.selectAll(".brush")
				.data(this.brushdata)
				.enter()
				.insert("g", ".brush")
				.attr("class", "brush")
				.call(this.brush);
		},

		brushing() {
			const brushScale = d3.scaleLinear()
				.domain(this.histogramXScale.domain())
				.range(this.histogramXScale.range());

			let brushStart = d3.event.selection.map(brushScale.invert)[0];
			let brushEnd = d3.event.selection.map(brushScale.invert)[1];
			let brushPoints = this.histogramXScale.domain().length;

			this.localBrushStart = Math.floor(brushStart * brushPoints);
			this.localBrushEnd = Math.ceil(brushEnd * brushPoints);

			// highlight rank lines that is brush
			this.histogramSVG.selectAll(".binRank").attr("opacity", 0);
			for (let i = this.localBrushStart; i < this.localBrushEnd; i++) {
				this.histogramSVG.selectAll(`.bin_${i}`).attr("opacity", 1);
			}

			if (this.localBrushStart == this.localBrushEnd) {
				this.histogramSVG.selectAll(".binRank").attr("opacity", 1);
			}
		},

		brushend() {
			let self = this;
			const processIDList = [];
			for (let i = this.localBrushStart; i < this.localBrushEnd; i++) {
				if (self.binContainsProcID[i] != null) {
					const curList = self.binContainsProcID[i];
					curList.forEach((processID) => {
						processIDList.push(processID);
					});
				}
			}
			self.$socket.emit("split-rank", {
				"dataset": self.$store.selectedDataset,
				"ids": processIDList
			});
		},
	}
};