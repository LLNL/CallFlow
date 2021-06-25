/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
  <v-layout row wrap :id="id">
	<InfoChip ref="InfoChip" :title="title" :summary="infoSummary" :info="info"/>
    <svg :id="svgID"></svg>
    <ToolTip ref="ToolTip" />
  </v-layout>
</template>

<script>
// Library imports
import * as d3 from "d3";
import "d3-selection-multi";
import { mapGetters } from "vuex";

// Local library imports
import * as utils from "lib/utils";
import APIService from "lib/routing/APIService";
import EventHandler from "lib/routing/EventHandler";

import InfoChip from "../general/infoChip";

// Local component imports
import ToolTip from "./tooltip";

export default {
	name: "SingleHistogram",
	components: {
		ToolTip,
		InfoChip
	},
	data: () => ({
		width: null,
		height: null,
		histogramHeight: null,
		histogramWidth: null,
		padding: {
			top: 10,
			right: 10,
			bottom: 20,
			left: 15,
		},
		dataset_index: [],
		id: "single-histogram-view",
		svg: null,
		svgID: "single-histogram-view-svg",
		firstRender: true,
		xVals: [],
		freq: [],
		selectedColorBy: "Inclusive",
		MPIcount: 0,
		paddingFactor: 3.5,
		bottomMargin: 15,
		boxOffset: 20,
		x_max_exponent: 0,
		superscript: "⁰¹²³⁴⁵⁶⁷⁸⁹",
		title: "MPI Runtime Distribution",
		infoSummary: "MPI runtime distribution view shows the sampled distribution of the process-based metrics for a selected node. To connect the processes (e.g., MPI ranks) to the physical domain, we use shadow lines to visualize the rank-to-bin mapping. Shadow lines map the bins in the histogram to the process/rank id laid out on an ordered line at the bottom of the histogram.",
		info: "",
		selectedProp: "rank",
		selectedScale: "Linear"
	}),

	computed: {
		...mapGetters({
			selectedTargetRun: "getSelectedTargetRun",
			selectedMetric: "getSelectedMetric",
			selectedNode: "getSelectedNode",
			rankBinCount: "getRankBinCount",
			data: "getSingleHistogram",
			generalColors: "getGeneralColors",
			selectedRankBinCount: "getRankBinCount",
		})
	},

	watch: {
		data: function (val) {
			this.visualize(val);
		}
	},

	mounted() {
		let self = this;
		EventHandler.$on("reset-single-histogram", function() {
			self.clear();
			self.init();
		});
	},

	methods: {
		init() {
			this.$store.dispatch("fetchSingleHistogram", {
				dataset: this.selectedTargetRun,
				node: this.selectedNode["name"],
				ntype: this.selectedNode["type"],
				nbins: this.selectedRankBinCount,
			});

			this.width = window.innerWidth * 0.25;
			this.height = this.$store.viewHeight * 0.5;

			this.boxWidth = this.width - this.padding.right - this.padding.left;
			this.boxHeight = this.height - this.padding.top - this.padding.bottom;

			this.histogramOffset = Math.floor(this.boxHeight / 4);
			this.histogramHeight = this.boxHeight - this.histogramOffset;
			this.histogramWidth = this.boxWidth;

			this.rankScaleHeight = this.boxHeight - this.histogramHeight;
			this.rankScaleWidth = this.histogramWidth;

			this.xAxisHeight = this.histogramWidth - (this.paddingFactor - 1.5) * this.padding.left;
			this.yAxisHeight = this.histogramHeight - (this.paddingFactor - 1.5) * this.padding.left;

			this.svg = d3.select("#" + this.svgID).attrs({
				width: this.boxWidth,
				height: this.boxHeight,
				transform: "translate(" + this.padding.left + "," + this.padding.top + ")",
			}).append("g");
		},

		visualize() {
			this.info = this.selectedNode["name"] + " (" + this.selectedNode["type"][0].toUpperCase() + ")";

			this.setupScale();
			this.bars();
			this.xAxis();
			this.yAxis();
			this.rankLineScale();
			this.brushes();
			this.$refs.ToolTip.init(this.svgID); 
		},

		setupScale() {
			const _data = this.data[this.selectedMetric][this.selectedProp];
			const _mpiData = this.data[this.selectedMetric]["d"];

			let temp = this.dataProcess(_data, _mpiData);
			this.xVals = temp[0];
			this.freq = temp[1];
			this.axis_x = temp[2];
			this.binContainsProcID = temp[3];
			this.logScaleBool = false;

			this.xScale = d3
				.scaleBand()
				.domain(this.xVals)
				.range([this.paddingFactor * this.padding.left, this.xAxisHeight]);

			if (this.selectedScale == "Linear") {
				this.yScale = d3
					.scaleLinear()
					.domain([0, d3.max(this.freq)])
					.range([this.yAxisHeight, this.padding.top]);
				this.logScaleBool = false;
			} else if (this.selectedScale == "Log") {
				this.yScale = d3
					.scaleLog()
					.domain([1, d3.max(this.freq)])
					.range([this.yAxisHeight, this.padding.top]);
				this.logScaleBool = true;
			}
		},

		clear() {
			d3.select("#" + this.svgID).select("g").remove();
			d3.selectAll(".single-histogram-bar").remove();
			d3.select(".x-axis").remove();
			d3.select(".y-axis").remove();
			d3.selectAll(".histogram-axis-label").remove();
			d3.selectAll(".binRank").remove();
			d3.selectAll(".lineRank").remove();
			d3.selectAll(".brush").remove();
			d3.selectAll(".histogram-rank-axis").remove();
			this.$refs.ToolTip.clear();
		},

		array_unique(arr) {
			return arr.filter(function (value, index, self) {
				return self.indexOf(value) === index;
			});
		},

		dataProcess(data) {
			let axis_x = [];
			let dataMin = data["x_min"];
			let dataMax = data["x_max"];

			const dataWidth = (dataMax - dataMin) / (data["x"].length - 1);
			for (let i = 0; i < data["x"].length; i++) {
				axis_x.push(dataMin + i * dataWidth);
			}

			return [data["x"], data["y"], axis_x, data["dig"]];
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
				array: groupArray,
			};
		},

		sanitizeGroupProc(string) {
			return string.replace(/\[/g, "").replace(/]/g, "");
		},

		bars() {
			let self = this;
			this.svg
				.selectAll(".single-histogram-bar")
				.data(this.freq)
				.enter()
				.append("rect")
				.attrs({
					class: "single-histogram-bar",
					x: (d, i) => this.xScale(this.xVals[i]),
					y: (d, i) => this.yScale(d),
					width: this.xScale.bandwidth(),
					height: (d) => {
						return Math.abs(this.yAxisHeight - this.yScale(d));
					},
					fill: this.generalColors.intermediate,
					opacity: 1,
					"stroke-width": "0.2px",
					stroke: "#202020",
				})
				.style("z-index", 1)
				.on("click", function (d, i) {
					d3.select(this).attr("fill", "orange");
					d3.selectAll(`.lineRank_${i}`)
						.style("fill", "orange")
						.style("fill-opacity", 1);

					let groupProcStr = self.groupProcess(self.binContainsProcID[i])
						.string;
					groupProcStr =  "MPI ranks:" + self.sanitizeGroupProc(groupProcStr);
					self.$refs.ToolTip.render(groupProcStr, d);
				})
				.on("mouseover", function (d, i) {
					d3.select(this).attr("fill", "orange");
					d3.selectAll(".lineRank")
						.style("fill-opacity", 0.1);
					d3.selectAll(`.lineRank_${i}`)
						.style("fill", "orange")
						.style("fill-opacity", 1);
					let groupProcStr = self.groupProcess(self.binContainsProcID[i])
						.string;
					groupProcStr = d + " MPI ranks:" + self.sanitizeGroupProc(groupProcStr);
					self.$refs.ToolTip.render(groupProcStr, d);
				})
				.on("mouseout", function (d, i) {
					d3.select(this).attr("fill", self.generalColors.intermediate);
					d3.selectAll(".lineRank")
						.style("fill", "grey")
						.style("fill-opacity", 0.4);
					self.$refs.ToolTip.clear();
				});
		},

		addxAxisLabel() {
			let max_value = this.xScale.domain()[1];
			this.x_max_exponent = utils.formatExponent(max_value);
			let exponent_string = this.superscript[this.x_max_exponent];
			let label =
        "(e+" +
        this.x_max_exponent +
        ") " +
        this.selectedMetric +
        " Runtime (" +
        "\u03BCs)";
			this.svg
				.append("text")
				.attrs({
					class: "histogram-axis-label",
					x: this.histogramWidth - this.padding.left,
					y: this.yAxisHeight + 3 * this.padding.top,
				})
				.style("font-size", "12px")
				.style("text-anchor", "end")
				.text(label);
		},

		/* Axis for the histogram */
		xAxis() {
			this.addxAxisLabel();
			const xAxis = d3
				.axisBottom(this.xScale)
				.ticks(10)
				.tickFormat((d, i) => {
					if (i % 3 == 0) {
						let runtime = utils.formatRuntimeWithExponent(
							this.xVals[i],
							self.x_max_exponent
						);
						return `${runtime[0]}`;
					}
				});

			const xAxisLine = this.svg
				.append("g")
				.attrs({
					class: "x-axis",
					transform: "translate(" + 0 + "," + this.yAxisHeight + ")",
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
				.style("stroke-width", "1px")
				.style("opacity", 0.5);

			xAxisLine
				.selectAll("text")
				.style("font-size", "12px")
				.style("font-family", "sans-serif")
				.style("font-weight", "lighter");
		},

		yAxis() {
			const yAxis = d3
				.axisLeft(this.yScale)
				.ticks(10)
				.tickFormat((d, i) => {
					if (d % 1 == 0) return d;
				});

			this.svg
				.append("text")
				.attrs({
					transform: "rotate(-90)",
					class: "histogram-axis-label",
					x: -this.padding.top,
					y: this.padding.left,
				})
				.style("font-size", "12px")
				.style("text-anchor", "end")
				.text("Number of Processes");

			const yAxisLine = this.svg
				.append("g")
				.attrs({
					class: "y-axis",
					transform:
            "translate(" + this.paddingFactor * this.padding.left + ", 0)",
				})
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
				.style("opacity", 0.2);

			yAxisLine
				.selectAll("text")
				.style("font-size", "12px")
				.style("font-family", "sans-serif")
				.style("font-weight", "lighter");
		},

		rankLineScale() {
			let rankCount = this.data[this.selectedMetric].d.length;

			this.ranklinescale = d3
				.scaleLinear()
				.domain([0, rankCount])
				.range([this.paddingFactor * this.padding.left, this.xAxisHeight]);

			this.freq.forEach((freqVal, idx) => {
				const processIDs = this.binContainsProcID[idx];

				if (processIDs) {
					const rankLinesG = this.svg
						.append("g")
						.attr("class", `binRank bin_${idx}`)
						.attr("data-name", idx);

					processIDs.sort((a, b) => a - b);

					const groupArray = this.groupProcess(processIDs).array;
					const binWidth = this.xScale.bandwidth();
					const widthPerRank = binWidth / rankCount;
					const binLocation = this.xScale(this.xVals[idx]);
					let cumulativeBinSpace = 0;

					groupArray.forEach((group) => {
						let start = 0,
							end = 0;
						if (group.length == 1) {
							start = group[0];
							end = start + 1;
						} else {
							start = group[0];
							end = group[1] + 1;
						}

						let topX1 = cumulativeBinSpace + binLocation + widthPerRank + binWidth  / 4;
						let topX2 = cumulativeBinSpace + (end - start + 1) * widthPerRank + binLocation + binWidth / 4;

						let botX3 = this.ranklinescale(start);
						let botX4 = this.ranklinescale(end);

						let topY = this.boxHeight - this.histogramOffset + 15;
						let botY = this.boxHeight;

						cumulativeBinSpace += (end - start + 1) * widthPerRank;

						const line = "M" + topX1 + " " + topY +
									"L " + topX2 + " " + topY +
									"L " + botX4 + " " + botY +
									"L " + botX3 + " " + botY;

						rankLinesG
							.append("path")
							.attr("d", line)
							.attr("class", "lineRank lineRank_" + idx)
							.style("fill", (d) => {
								return "grey";
							})
							.style("fill-opacity", 0.4)
							.attr("transform", `translate(${0},${-3 * this.bottomMargin})`);
					});
				}
			});

			const rankLineAxis = d3
				.axisBottom(this.ranklinescale)
				.ticks(10)
				.tickFormat((d, i) => {
					if (d % 1 == 0) return d;
				});

			const rankLineAxisLine = this.svg
				.append("g")
				.attr("class", "histogram-rank-axis")
				.attr("id", "rankAxis")
				.attr(
					"transform",
					`translate(${0},${this.boxHeight - 3 * this.bottomMargin})`
				)
				.call(rankLineAxis);

			rankLineAxisLine
				.selectAll("path")
				.style("fill", "none")
				.style("stroke", "black")
				.style("stroke-width", "1px");

			rankLineAxisLine
				.selectAll("line")
				.style("fill", "none")
				.style("stroke", "#000")
				.style("stroke-width", "1px")
				.style("opacity", 0.5);

			rankLineAxisLine
				.selectAll("text")
				.style("font-size", "12px")
				.style("font-family", "sans-serif")
				.style("font-weight", "lighter");
		},

		brushes() {
			this.brushdata = [];

			this.brushSVG = this.svg.append("svg");

			this.brush = d3
				.brushX()
				.extent([
					[this.paddingFactor * this.padding.left, this.yAxisHeight],
					[
						this.paddingFactor * this.padding.left +
              this.xAxisHeight -
              this.paddingFactor * this.padding.left,
						this.yAxisHeight + this.rankScaleHeight,
					],
				])
				.on("brush", this.brushing)
				.on("end", this.brushend);

			let id = 0;
			this.brushdata.push({
				id: id,
				brush: this.brush,
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
			const brushScale = d3
				.scaleLinear()
				.domain([
					this.xScale.domain()[0],
					this.xScale.domain()[this.xScale.domain().length - 1],
				])
				.range(this.xScale.range());

			let brushStart = d3.event.selection.map(brushScale.invert)[0];
			let brushEnd = d3.event.selection.map(brushScale.invert)[1];
			let brushPoints = this.xScale.domain().length;

			let brushMin = this.xScale.domain()[0];
			let brushMax = this.xScale.domain()[this.xScale.domain().length - 1];

			this.localBrushStart = Math.floor(
				((brushStart - brushMin) / (brushMax - brushMin)) * brushPoints
			);
			this.localBrushEnd = Math.ceil(
				((brushEnd - brushMin) / (brushMax - brushMin)) * brushPoints
			);

			// highlight rank lines that is brush
			this.svg.selectAll(".binRank").attr("opacity", 0.5);
			for (let i = this.localBrushStart; i < this.localBrushEnd; i++) {
				this.svg.selectAll(`.bin_${i}`).attr("opacity", 1);
			}

			if (this.localBrushStart == this.localBrushEnd) {
				this.svg.selectAll(".binRank").attr("opacity", 1);
			}
		},

		async brushend() {
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

			const split_sgs = await APIService.POSTRequest("split_ranks", {
				dataset: this.$store.selectedTargetDataset,
				ranks: processIDList,
				ntype: "callsite",
			});
		},
	},
};
</script>