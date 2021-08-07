/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
  <v-container fluid>
	<v-card tile>
		<v-row id="settings">
			<v-col cols="2">
				<v-card-title class="pa-2 pt-0"> Timeline View
				</v-card-title>
			</v-col>
			<v-col cols="2">
				<!-- <v-select
					dense
					label="Y-axis bandwidth"
					:items="seriesTypes"
					v-model="selectedSeriesType"
					:menu-props="{maxHeight: '200'}"
					persistent-hint
				>
				</v-select> -->
			</v-col>
			<v-col cols="2">
				<!-- <v-select
					dense
					label="Chart Type"
					:items="chartTypes"
					v-model="selectedChartType"
					:menu-props="{maxHeight: '200'}"
					persistent-hint
				>
				</v-select> -->
			</v-col>
			<v-col cols="2">
				<v-text-field
					dense
					label="Top N super nodes"
					type="number"
					v-model="selectedTopCallsiteCount"
					:menu-props="{maxHeight: '200'}"
					persistent-hint
				>
				</v-text-field>
			</v-col>
			<v-col cols="2">
				<v-select
					dense
					label="Runtime Metric"
					:items="metrics"
					v-model="selectedMetric"
					:menu-props="{maxHeight: '200'}"
					persistent-hint
				>
				</v-select>
			</v-col>
			<v-col cols="2">
				<v-select
					dense
					label="X-axis"
					:items="chartXAttr"
					v-model="selectedChartXAttr"
					:menu-props="{maxHeight: '200'}"
					persistent-hint
				>
				</v-select>
			</v-col>
			
		</v-row>
		<v-row class="ml-3">
			<svg :id="id" :width="width" :height="height" pointer-events="all" ></svg>
		</v-row>
	</v-card>
  </v-container>
</template>

<script>
import { mapGetters } from "vuex";
import moment from "moment";

import * as d3 from "d3";
import * as utils from "lib/utils";

export default {
	name: "TimeSeries",
	data: () => ({
		id: "timeline-overview",
		data: [],
		top_nodes: [],
		all_nodes: [],
		height: 0,
		width: 0,
		yMin: 0,
		yMax: 0,
		padding: {
			top: 10,
			bottom: 40,
			left: 20,
			right: 20,
		},
		dimension: {
			chartTitle: 20,
			xAxis: 20,
			yAxis: 20,
			xTitle: 20,
			yTitle: 20,
		},
		chartTypes: ["bar", "area", "line"],
		selectedChartType: "bar",
		chartXAttr: ["name", "timestamp", "root_time_inc"],
		selectedChartXAttr: "name",
		seriesTypes: ["stacked", "normalized"],
		selectedSeriesType: "stacked",
		metrics: ["time", "time (inc)"],
		selectedMetric: "time",
		selectedTopCallsiteCount: 5,
		selectedntype: "module",
		ntypes: ["module", "callsite"],
	}),

	computed: {
		...mapGetters({ 
			timeline: "getTimeline",
		}),
	},

	watch: {
		timeline: function (val) {
			console.log("[Timeline] data:", val);
			this.all_nodes = val.all_nodes;
			this.top_nodes = val.top_nodes;
			this.data = Object.values(val.d).map((d) => d);

			for (let key of this.all_nodes) {
				this.chartXAttr.push(key);
			}
			this.visualize();
		},

		selectedTopCallsiteCount() {
			this.reset();
		},

		selectedMetric() {
			this.reset();
		},

		selectedSeriesType() {
			this.reset();
		},

		selectedChartType() {
			this.reset();
		},

		selectedChartXAttr() {
			this.reset();
		}
	},

	mounted() {
		this.$store.dispatch("fetchTimeline", {
			"ntype": this.selectedntype,
			"ncount": this.selectedTopCallsiteCount,
			"metric": this.selectedMetric,
		});	
	},

	methods: {	
		reset() {
			this.clear();
			this.$store.dispatch("fetchTimeline", {
				"ntype": this.selectedntype,
				"ncount": this.selectedTopCallsiteCount,
				"metric": this.selectedMetric,
			});
		},

		visualize() {
			this.width = this.$store.viewWidth - this.padding.left - this.padding.right;
			
			// Enforce height of the timeline view to be atleast half screen. 
			// i.e., If height is less than half the screen, we set a constant height.
			const settingsHeight = document.getElementById("settings").clientHeight;
			const topHalfSummaryHeight = document.getElementById("top-half").clientHeight;
			const retailHeight = this.$store.viewHeight - settingsHeight - topHalfSummaryHeight;
			this.height = retailHeight;

			this.svg = d3.select("#" + this.id);

			const leftOffset = 100;
			const topOffset = 0;
			this.mainSvg = this.svg.append("g").attrs({
				id: "container",
				transform: `translate(${leftOffset}, ${topOffset})`,
			});

			this.plot();
			this.axis();
			this.label();
			this.colorMap();
		},

		plot() {
			let series = null;
			let yDomain = [];
			
			let order_nodes = this.top_nodes;
			if (this.top_nodes.includes(this.selectedChartXAttr)) {
				order_nodes.splice(order_nodes.indexOf(this.selectedChartXAttr), 1);
				order_nodes.unshift(this.selectedChartXAttr);
			}

			if(this.selectedMetric == "time") {
				series = d3
					.stack()
					.keys(order_nodes)(this.data)
					.map((d) => (d.forEach((v) => (v.key = d.key)), d));
				yDomain = [0, d3.max(series, (d) => d3.max(d, (d) => d[1]))];
			}
			else if (this.selectedMetric == "time (inc)") {
				series = d3
					.stack()
					.keys(order_nodes)
					.offset(d3.stackOffsetExpand)(this.data)
					.map((d) => (d.forEach((v) => (v.key = d.key)), d));
				yDomain = [0, 1];
			}
			this.data.reverse();

			this.color = d3
				.scaleOrdinal()
				.domain(series.map((d) => d.key))
				.range(d3.schemeSpectral[series.length])
				.unknown("#ccc");

			let xDomain = [];
			if (this.selectedChartXAttr == "runs") {
				xDomain = this.data.map((d) => d.name);
			} else if (this.selectedChartXAttr == "timestamp") {
				xDomain = this.data.map((d) => moment(d.timestamp).valueOf()).sort((a, b) => a - b);
			} else if (this.selectedChartXAttr == "root_inclusive") {
				xDomain = this.data.map((d) => d.root_time_inc).sort((a, b) => a - b);
			} else {
				xDomain = this.data.map((d) => d[this.selectedChartXAttr]).sort((a, b) => a - b);
			}

			this.x = d3
				.scaleBand()
				.domain(xDomain)
				.range([0, this.width - 2 * (this.padding.right + this.padding.left)]);

			this.y = d3
				.scaleLinear()
				.domain(yDomain)
				.nice(5)
				.range([this.height - 2 * this.padding.bottom, 2 * this.padding.top]);

			if (this.selectedChartType == "bar") {
				this.barChart(series, yDomain);
			} else if(this.selectedChartType == "area") {
				this.areaChart(series, yDomain);
			} else if(this.selectedChartType == "line") {
				this.lineChart(series, yDomain);
			}
		},

		barChart(series) {
			console.log(series);
			this.mainSvg
				.append("g")
				.selectAll("g")
				.data(series)
				.join("g")
				.attr("fill", (d) => this.color(d.key))
				.selectAll("rect")
				.data((d) => d)
				.join("rect")
				.attr("x", (d) => {
					let val;
					if(this.selectedChartXAttr == "timestamp") {
						val = moment(d.data.timestamp).valueOf();
					}
					else {
						val = d.data[this.selectedChartXAttr];
					}
					return this.x(val);
				})
				.attr("y", (d) => this.y(d[1]))
				.attr("height", (d) => this.y(d[0]) - this.y(d[1]))
				.attr("width", this.x.bandwidth())
				.append("title")
				.text((d) => `[${d.data.name}] ${d.key} - ${utils.formatRuntimeWithoutUnits(d.data[d.key])}`);
		},

		areaChart(series) {			
			const area = d3.area()
				.x(d => this.x(d.data.name) + this.x.bandwidth()/2)
				// .y(d => this.y(d[0]))
				.y0(d => this.y(d[0]))
				.y1(d => this.y(d[1]));

			this.mainSvg.append("g")
				.selectAll("path")
				.data(series)
				.join("path")
				.attr("stroke", ({key}) => this.color(key))
				.attr("fill", ({key}) => this.color(key))
				.attr("stroke-width", 5)
				.attr("d", area)
				.append("title")
				.text(({key}) => key);
		},

		lineChart(series) {
			const line = d3.line()
				.x(d => this.x(d.data.name) + this.x.bandwidth()/2)
				.y(d => this.y(d[0]));

			this.mainSvg.append("g")
				.selectAll("path")
				.data(series)
				.join("path")
				.attr("stroke", ({key}) => this.color(key))
				.attr("fill", "transparent")
				.attr("stroke-width", 2.5)
				.attr("d", line)
				.append("title")
				.text((d, i) => `[${d[i].data.name}] ${d[i].key} - ${utils.formatRuntimeWithoutUnits(d[i].data[d[i].key])}`);

			this.mainSvg.append("g")
				.data(series)
				.append("circle")
				.attr("fill", "transparent")
				.attr("stroke", "red")
				.attr("cx", (d, i) => this.x(d[i].data.name))
				.attr("cy", (d, i) => this.y(d[i][1]))
				.attr("r", 4);
		},

		// Axis for timeline view
		axis() {
			let format = d3.format(".2f");
			this.xAxis = d3
				.axisBottom(this.x)
				.tickPadding(10)
				.tickFormat((d, i) => {
					if(i % 4 == 0 || this.x.domain().length < 15) {
						if(this.selectedChartXAttr == "timestamp") {
							return `${moment(d).format("MM-DD/HH:mm")}`;
						} else if (this.selectedChartXAttr == "name"){
							if(d.includes(".")) {
								return d.split(".")[2] + "/" +  d.split(".")[3].split("_")[1];
							}
							else {
								return d;
							}
						} else {
							return format(d);
						}
					}
				});

			this.yAxis = d3
				.axisLeft(this.y)
				.tickPadding(10)
				.tickFormat((d, i) => {
					return `${utils.formatRuntimeWithoutUnits(d)}`;	
				});

			this.xAxisSVG = this.mainSvg
				.append("g")
				.attrs({
					transform: `translate(${0}, ${
						this.height - 2 * this.padding.bottom
					})`,
					class: "x-axis",
					"stroke-width": "1.5px",
				})
				.call(this.xAxis);

			this.yAxisSVG = this.mainSvg
				.append("g")
				.attrs({
					transform: `translate(${0}, ${0})`,
					class: "y-axis",
					"stroke-width": "1.5px",
				})
				.call(this.yAxis);
		},

		// draw axis label
		label() {
			this.isLabelled = true;
			this.svg
				.append("text")
				.attrs({
					class: "axis-labels",
					transform: `translate(${this.width - 3 * this.padding.left}, ${
						this.height - this.padding.top
					})`,
				})
				.style("text-anchor", "middle")
				.text(this.selectedChartXAttr);

			this.svg
				.append("text")
				.attrs({
					class: "axis-labels",
					transform: `translate(${15}, ${this.height / 2}) rotate(${-90})`,
				})
				.style("text-anchor", "middle")
				.text((d, i) => this.selectedMetric);
		},

		colorMap() {
			let width = this.width;
			let n_colors = this.top_nodes.length;
			let x_offset = 20;
			let y_offset = this.height;
			let radius = 10;
			let padding = 10;
			let height = 3 * radius + padding;
			let gap = width / n_colors;

			d3.select(".colorMapSVG").remove();

			let svg = this.svg
				.append("g")
				.attrs({
					transform: `translate(${20}, ${-2 * this.padding.top})`,
					width: this.width,
					height: height,
					class: "colorMapSVG",
				});

			svg
				.selectAll("circle")
				.data(this.top_nodes)
				.enter()
				.append("circle")
				.style("stroke", "gray")
				.style("fill", (d, i) => {
					return this.color(this.top_nodes[i]);
				})
				.attrs({
					r: radius,
					cx: (d, i) => {
						return i * gap + radius;
					},
					cy: (radius + y_offset),
				});

			svg
				.selectAll("text")
				.data(this.top_nodes)
				.enter()
				.append("text")
				.text((d, i) => {
					return this.top_nodes[i];
				})
				.attrs({
					x: (d, i) => {
						return i * gap + 2 * radius + padding;
					},
					y: 0.5 * radius + padding + y_offset,
					"font-family": "sans-serif",
					"font-size": 1.5 * radius + "px",
					fill: "black",
				});
		},

		clear() {
			d3.selectAll("#container").remove();
			d3.selectAll(".axis-labels").remove();
		},
	},
};
</script>