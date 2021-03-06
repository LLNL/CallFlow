/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

 <template>
  <div :id="id">
	<InfoChip ref="InfoChip" :title="title" :summary="summary" :info="info"/>
    <svg :id="svgID"></svg>
    <ToolTip ref="ToolTip" />
  </div>
</template>

<script>
// Library imports
import * as d3 from "d3";
import "d3-selection-multi";

// Local library imports
import * as utils from "lib/utils";
import EventHandler from "lib/routing/EventHandler";

import InfoChip from "../general/infoChip";

// Local component imports
import ToolTip from "./tooltip";

export default {
	name: "EnsembleHistogram",
	components: {
		ToolTip,
		InfoChip
	},
	props: [],
	data: () => ({
		data: [],
		width: null,
		height: null,
		padding: {
			top: 10,
			right: 10,
			bottom: 10,
			left: 15,
		},
		dataset_index: [],
		id: "ensemble-histogram-view",
		svgID: "ensemble-histogram-view-svg",
		firstRender: true,
		xVals: [],
		freq: [],
		selectedColorBy: "Inclusive",
		MPIcount: 0,
		title: "Runtime Distribution",
		summary: "MPI runtime distribution view shows the sampled distribution of the process-based metrics for a selected node. To connect the processes (e.g., MPI ranks) to the physical domain, we use shadow lines to visualize the rank-to-bin mapping. Shadow lines map the bins in the histogram to the process/rank id laid out on an ordered line at the bottom of the histogram.",
		info: "",
		paddingFactor: 3.5,
		thisNode: "",
		selectedPropLabel: "",
		selectedPropSum: 0,
		x_max_exponent: 0,
		superscript: "⁰¹²³⁴⁵⁶⁷⁸⁹",
	}),

	mounted() {
		let self = this;
		EventHandler.$on("ensemble-histogram", function (data) {
			console.log("Ensemble Histogram: ", data);
			self.visualize(data);
		});
	},

	methods: {
		init() {
			// Assign the height and width of container
			this.width = window.innerWidth * 0.25;
			this.height = this.$store.viewHeight * 0.33;

			// Assign width and height for histogram and rankLine SVG.
			this.boxWidth = this.width - 1 * (this.padding.right + this.padding.left);
			this.boxHeight = this.height - 2 * (this.padding.top + this.padding.bottom);

			this.xAxisHeight = this.boxWidth - (this.paddingFactor + 1) * this.padding.left;
			this.yAxisHeight = this.boxHeight - (this.paddingFactor + 1) * this.padding.left;

			// Create the SVG
			this.svg = d3.select("#" + this.svgID).attrs({
				width: this.boxWidth,
				height: this.boxHeight,
				transform: "translate(" + this.padding.left + "," + this.padding.top + ")",
			});

			// this.visualize(this.$store.selectedNode);
		},

		dataProcess(data) {
			let axis_x = [];
			let dataMin = 0;
			let dataMax = 0;

			dataMin = Math.min(...data["x"]);
			dataMax = Math.max(...data["x"]);

			let dataWidth = (dataMax - dataMin) / this.$store.selectedMPIBinCount;
			if (dataWidth == 0) {
				dataWidth = 1;
			}

			for (let i = 0; i < this.$store.selectedBinCount; i++) {
				axis_x.push(dataMin + i * dataWidth);
			}

			return [data["x"], data["y"], axis_x];
		},

		setupScale(data) {
			const _e_store = utils.getDataByNodeType(this.$store, "ensemble", data["node"]);
			const _t_store = utils.getDataByNodeType(this.$store, data["dataset"], data["node"]);
			
			let ensembleData = _e_store[this.$store.selectedMetric]["hists"][this.$store.selectedProp];
			let temp = this.dataProcess(ensembleData);
			this.xVals = temp[0];
			this.freq = temp[1];
			this.axis_x = temp[2];
			this.binContainsProcID = temp[3];
			this.logScaleBool = false;
			let isTargetThere = true;

			// If the module is not present in the target run.
			if (_t_store == undefined) {
				isTargetThere = false;
			} else {
				const targetData = _t_store[this.$store.selectedMetric]["hists"][this.$store.selectedProp];
				const targetTemp = this.dataProcess(targetData);
				this.targetXVals = targetTemp[0];
				this.targetFreq = targetTemp[1];
				this.target_axis_x = targetTemp[2];
				this.target_binContainsProcID = targetTemp[3];
				isTargetThere = true;
			}

			this.rankCount = parseInt(this.$store.summary["ensemble"].nranks);

			this.xScale = d3
				.scaleBand()
				.domain(this.xVals)
				.rangeRound([0, this.xAxisHeight]);

			if (this.$store.selectedScale == "Linear") {
				this.yScale = d3
					.scaleLinear()
					.domain([0, d3.max(this.freq)])
					.range([this.yAxisHeight, this.padding.top]);
				this.logScaleBool = false;
			} else if (this.$store.selectedScale == "Log") {
				this.yScale = d3
					.scaleLog()
					.domain([0.1, d3.max(this.freq)])
					.range([this.yAxisHeight, this.padding.top]);
				this.logScaleBool = true;
			}
			return isTargetThere;
		},

		visualize(callsite) {
			this.clear();
			let isTargetThere = this.setupScale(callsite);
			this.ensembleBars();
			this.xAxis();
			this.yAxis();
			this.setTitle();

			if (this.$store.showTarget && isTargetThere) {
				this.targetBars();
			}
			// this.$refs.ToolTip.init(this.svgID);
		},

		setTitle() {
			if (this.$store.selectedProp == "rank") {
				this.selectedPropLabel = "Ranks";
			} else if (this.$store.selectedProp == "name") {
				this.selectedPropLabel = "Callsites";
			} else if (this.$store.selectedProp == "dataset") {
				this.selectedPropLabel = "Runs";
			}

			this.selectedPropSum = this.freq.reduce((acc, val) => {
				return acc + val;
			});

			this.info = "Number of " + this.selectedPropLabel + "= "+ this.selectedPropSum;
			
		},

		clear() {
			d3.selectAll(".dist-histogram-bar").remove();
			d3.selectAll(".dist-histogram-target").remove();
			d3.selectAll(".dist-histogram-others").remove();
			d3.select(".x-axis").remove();
			d3.select(".y-axis").remove();
			d3.selectAll(".binRank").remove();
			d3.selectAll(".lineRank").remove();
			d3.selectAll(".target_lineRank").remove();
			d3.selectAll(".tick").remove();
			d3.selectAll(".histogram-axis-label").remove();
			// this.$refs.ToolTip.clear();
		},

		targetBars() {
			let self = this;
			this.svg
				.selectAll(".dist-target")
				.data(this.targetFreq)
				.enter()
				.append("rect")
				.attr("class", "dist-histogram-bar dist-target")
				.attrs({
					x: (d, i) => {
						return this.xScale(this.targetXVals[i]);
					},
					y: (d, i) => {
						return this.yScale(d);
					},
					width: (d) => {
						return this.xScale.bandwidth();
					},
					height: (d) => {
						return Math.abs(this.yAxisHeight - this.yScale(d));
					},
					fill: this.$store.distributionColor.target,
					opacity: 1,
					"stroke-width": "0.2px",
					stroke: "#202020",
					transform:
            "translate(" +
            this.paddingFactor * this.padding.left +
            "," +
            0 +
            ")",
				})
				.on("mouseover", function (d, i) {
					self.$refs.ToolTip.render(d);
				})
				.on("mouseout", function (d, i) {
					self.$refs.ToolTip.clear();
				});
		},

		ensembleBars() {
			let self = this;
			this.svg
				.selectAll(".dist-ensemble")
				.data(this.freq)
				.enter()
				.append("rect")
				.attr("class", "dist-histogram-bar dist-ensemble")
				.attrs({
					x: (d, i) => {
						return this.xScale(this.xVals[i]);
					},
					y: (d, i) => {
						return this.yScale(d);
					},
					width: (d) => {
						return this.xScale.bandwidth();
					},
					height: (d) => {
						return Math.abs(this.yAxisHeight - this.yScale(d));
					},
					fill: (d) => {
						let color = self.$store.distributionColor.ensemble;
						return color;
					},
					opacity: 1,
					"stroke-width": "0.2px",
					stroke: "#202020",
					transform:
            "translate(" +
            this.paddingFactor * this.padding.left +
            "," +
            0 +
            ")",
				})
				.on("mouseover", function (d, i) {
					self.$refs.ToolTip.render(d);
				})
				.on("mouseout", function (d, i) {
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
        this.$store.selectedMetric +
        " Runtime (" +
        "\u03BCs)";
			this.svg
				.append("text")
				.attrs({
					class: "histogram-axis-label",
					x: this.boxWidth - this.padding.left,
					y: this.yAxisHeight + 3 * this.padding.top,
				})
				.style("font-size", "12px")
				.style("text-anchor", "end")
				.text(label);
		},

		/* Axis for the histogram */
		xAxis() {
			let self = this;
			this.addxAxisLabel();
			const xAxis = d3
				.axisBottom(this.xScale)
				.ticks(5)
				.tickFormat((d, i) => {
					if (i % 3 == 0) {
						let runtime = utils.formatRuntimeWithExponent(
							d,
							self.x_max_exponent
						);
						return `${runtime[0]}`;
					}
				});

			const xAxisLine = this.svg
				.append("g")
				.attrs({
					class: "x-axis",
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
					if (this.$store.selectedProp == "rank") {
						if (d == 1) {
							return d;
						} else if (d % 10 == 0) {
							return d;
						}
					} else if (this.$store.selectedProp == "dataset") {
						if (d % 1 == 0) {
							return d;
						}
					} else if (this.$store.selectedProp == "name") {
						if (d % 1 == 0) {
							return d;
						}
					}
				});

			let yAxisText = "";
			if (this.$store.selectedProp == "name") {
				yAxisText = "Number of Callsites";
			} else if (this.$store.selectedProp == "dataset") {
				yAxisText = "Number of Runs";
			} else if (this.$store.selectedProp == "rank") {
				yAxisText = "Number of Ranks";
			} else if (this.$store.selectedProp == "all_ranks") {
				yAxisText = "Number of Processes";
			}

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
				.text(yAxisText);

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
	},
};
</script>