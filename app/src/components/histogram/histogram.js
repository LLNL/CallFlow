/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import tpl from "../../html/histogram.html";
import * as d3 from "d3";
import "d3-selection-multi";
import ToolTip from "./tooltip";
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
			left: 10,
		},
		dataset_index: [],
		id: "single-histogram-view",
		svgID: "single-histogram-view-svg",
		firstRender: true,
		xVals: [],
		freq: [],
		selectedColorBy: "Inclusive",
		MPIcount: 0,
		message: "MPI Distribution",
		axisLabelFactor: 3.5,
		boxOffset: 20
	}),

	mounted() {
		let self = this;
		EventHandler.$on("single_histogram", function (data) {
			self.clear();
			console.log("Single histogram: ", data["module"]);
			self.render(data["module"]);
		});
	},

	methods: {
		init() {
			this.width = window.innerWidth * 0.25;
			this.height = this.$store.viewHeight * 0.45;

			this.boxWidth = this.width - this.padding.right - this.padding.left - this.boxOffset;
			this.boxHeight = this.height - this.padding.top - this.padding.bottom;

			this.histogramOffset = Math.floor(this.boxHeight / 3);
			this.histogramHeight = this.boxHeight - this.histogramOffset;
			this.histogramWidth = this.boxWidth - this.padding.left - this.padding.right;

			this.rankScaleHeight = this.boxHeight - this.histogramHeight;
			this.rankScaleWidth = this.histogramWidth - this.padding.left;

			this.svg = d3.select("#" + this.svgID)
				.attrs({
					"width": this.boxWidth + this.padding.right + this.padding.left,
					"height": this.boxHeight + this.padding.top + this.padding.bottom,
					"transform": "translate(" + this.padding.left + "," + this.padding.top + ")"
				});

			EventHandler.$emit("single_histogram", {
				module: Object.keys(this.$store.modules[this.$store.selectedTargetDataset])[0],
				groupBy: this.$store.selectedGroupBy,
				dataset: this.$store.selectedTargetDataset,
			});
		},

		render(callsite) {
			let data = this.$store.modules[this.$store.selectedTargetDataset][callsite];
			console.log(this.$store.selectedTargetDataset, callsite);
			console.log(data);
			let temp = this.dataProcess(data);
			this.xVals = temp[0];
			this.freq = temp[1];
			this.axis_x = temp[2];
			this.binContainsProcID = temp[3];
			this.logScaleBool = false;

			// const targetData = this.$store.modules[this.$store.selectedTargetDataset][callsite];
			// const targetTemp = this.dataProcess(targetData);
			// this.targetXVals = targetTemp[0];
			// this.targetFreq = targetTemp[1];
			// this.target_axis_x = targetTemp[3];
			// this.target_binContainsProcID = targetTemp[3];

			this.$refs.ToolTip.init(this.svgID);

			this.histogramXScale = d3.scaleBand()
				.domain(this.xVals)
				.range(["#c6dbef", "#6baed6", "#2171b5", "#084594"])
				.rangeRound([0, this.histogramWidth - this.padding.left]);

			if (this.$store.selectedScale == "Linear") {
				this.histogramYScale = d3.scaleLinear()
					.domain([0, d3.max(this.freq)])
					.range([this.histogramHeight - this.padding.top, 0]);
				this.logScaleBool = false;
			} else if (this.$store.selectedScale == "Log") {
				this.histogramYScale = d3.scaleLog()
					.domain([1, d3.max(this.freq)])
					.range([this.boxHeight, 10]);
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
			let attr_data = {};
			let axis_x = [];
			let binContainsProcID = {};
			let dataSorted = [];
			let dataMin = 0;
			let dataMax = 0;

			if (this.$store.selectedMetric == "Inclusive") {
				attr_data = data["hist_time (inc)"];
				dataMin = data["min_time (inc)"];
				dataMax = data["max_time (inc)"];
				dataSorted = data["sorted_time (inc)"];
			} else if (this.$store.selectedMetric == "Exclusive") {
				attr_data = data["hist_time"];
				dataMin = data["min_time"];
				dataMax = data["max_time"];
				dataSorted = data["sorted_time"];
			} else if (this.$store.selectedMetric == "Imbalance") {
				attr_data = data["hist_imbalance"];
			}

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
			return [attr_data["x"], attr_data["y"], axis_x, binContainsProcID];
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
				.attr("x", (d, i) => {
					return this.histogramXScale(this.xVals[i]) + this.axisLabelFactor * this.padding.left;
				})
				.attr("y", (d, i) => {
					return Math.floor(this.histogramYScale(d));
				})
				.attr("width", (d) => {
					return this.histogramXScale.bandwidth();
				})
				.attr("height", (d) => {
					return Math.floor(this.histogramHeight - this.histogramYScale(d)) - this.padding.top;
				})
				.attr("fill", this.$store.color.ensemble)
				.attr("opacity", 1)
				.attr("stroke-width", (d, i) => "0.2px")
				.attr("stroke", (d, i) => "black")
				.on("mouseover", function (d, i) {
					d3.select(this)
						.attr("fill", "red");
					d3.selectAll(`.lineRank_${i}`)
						.style("fill", "orange")
						.style("fill-opacity", 1);
					let groupProcStr = self.groupProcess(self.binContainsProcID[i]).string;
					self.$refs.ToolTip.render(groupProcStr, d);
				})
				.on("mouseout", function (d, i) {
					d3.select(this)
						.attr("fill", self.$store.color.target);
					d3.selectAll(`.lineRank_${i}`)
						.style("fill", "grey")
						.style("fill-opacity", 0.4);
					self.$refs.ToolTip.clear();
				});
		},

		/* Axis for the histogram */
		xAxis() {
			const xAxis = d3.axisBottom(this.histogramXScale)
				.tickFormat((d, i) => {
					let temp = this.axis_x[i];
					if (i % 2 == 1 || i == this.MPIcount.length - 1) {
						return;
					}
				});

			this.svg.append("text")
				.attr("class", "histogram-axis-label")
				.attr("x", this.boxWidth)
				.attr("y", this.histogramHeight + this.padding.top * this.axisLabelFactor)
				.style("font-size", "12px")
				.style("text-anchor", "end")
				.text(this.$store.selectedMetric + " Runtime");

			const xAxisLine = this.svg.append("g")
				.attr("class", "x-axis")
				.attr("transform", `translate(${this.axisLabelFactor * this.padding.left},${this.histogramHeight - this.padding.top})`)
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
			const yAxis = d3.axisLeft(this.histogramYScale)
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
				.attr("transform", "rotate(-90)")
				.attr("class", "histogram-axis-label")
				// .attr('y', this.axisLabelFactor*2*this.padding.left)
				// .attr('x', -this.padding.top)
				.attr("x", - this.histogramHeight + this.padding.top)
				.attr("y", this.padding.left)
				.style("font-size", "12px")
				.style("text-anchor", "end")
				.text("Frequency");

			const yAxisLine = this.svg.append("g")
				.attr("class", "y-axis")
				.attr("transform", `translate(${this.axisLabelFactor * this.padding.left},${0})`)
				.call(yAxis);

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
				.attr("transform", `translate(${this.axisLabelFactor * this.padding.left},${this.boxHeight - this.padding.bottom})`)
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