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
			<v-col cols="2"></v-col>
			<v-col cols="2">
				<v-select
					dense
					label="Chart Type"
					:items="chartTypes"
					v-model="selectedChartType"
					:menu-props="{maxHeight: '200'}"
					persistent-hint
				>
				</v-select>
			</v-col>
			<v-col cols="2">
				<v-select
					dense
					label="Y axis bandwidth"
					:items="seriesTypes"
					v-model="selectedSeriesType"
					:menu-props="{maxHeight: '200'}"
					persistent-hint
				>
				</v-select>
			</v-col>
			<v-col cols="2">
				<v-select
					dense
					label="Metric"
					:items="metrics"
					v-model="selectedMetric"
					:menu-props="{maxHeight: '200'}"
					persistent-hint
				>
				</v-select>
			</v-col>
			<v-col cols="2">
				<v-text-field
					dense
					label="Top N-callsites"
					type="number"
					v-model="selectedTopCallsiteCount"
					:menu-props="{maxHeight: '200'}"
					persistent-hint
				>
				</v-text-field>
			</v-col>
		</v-row>
		<v-row class="ml-3">
			<svg :id="id" :width="width" :height="height"></svg>
		</v-row>
	</v-card>
  </v-container>
</template>

<script>
import * as d3 from "d3";
import * as utils from "lib/utils";
import EventHandler from "lib/routing/EventHandler";
import APIService from "lib/routing/APIService";

export default {
	name: "TimeSeries",
	data: () => ({
		id: null,
		data: {},
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
		chartXAttr: "datasets",
		seriesTypes: ["stacked", "normalized"],
		selectedSeriesType: "normalized",
		metrics: ["time", "time (inc)"],
		selectedMetric: "time (inc)",
		selectedTopCallsiteCount: 5,
		selectedXDomain: "normal",
	}),

	mounted() {
		this.id = "timeline-overview";
		
		let self = this;
		EventHandler.$on("visualize-timeline", function () {
			// self.clear();
			self.visualize(true);
		});
	},

	watch: {
		selectedTopCallsiteCount() {
			this.clear();
			EventHandler.$emit("visualize-timeline");
		},

		selectedMetric() {
			this.clear();
			EventHandler.$emit("visualize-timeline");
		},

		selectedSeriesType() {
			this.clear();
			EventHandler.$emit("visualize-timeline");
		},

		selectedChartType() {
			this.clear();
			EventHandler.$emit("visualize-timeline");
		}
	},

	methods: {
		init() {
			this.width = this.$store.viewWidth - this.padding.left - this.padding.right;
			const settingsHeight = document.getElementById("settings").clientHeight;
			const topHalfSummaryHeight = document.getElementById("top-half").clientHeight;
			this.height = this.$store.viewHeight - settingsHeight - topHalfSummaryHeight;

			this.selectedMetric = this.$store.selectedMetric;

			EventHandler.$emit("visualize-timeline");
		},

		async visualize(fetchData) {
			this.svg = d3.select("#" + this.id).attrs({
				width: this.width,
				height: this.height,
				"pointer-events": "all",
			});

			const leftOffset = 100;
			const topOffset = 0;
			this.mainSvg = this.svg.append("g").attrs({
				id: "container",
				transform: `translate(${leftOffset}, ${topOffset})`,
			});

			if(fetchData){
				this.data = await APIService.POSTRequest("timeline", {
					"ntype": "module",
					"ncount": this.selectedTopCallsiteCount,
					"metric": this.selectedMetric,
				});

				this.nodes = this.data.nodes;
				this.timeline = Object.values(this.data.d).map((d) => d);
			}

			this.plot();
			this.axis();
			this.label();
			this.colorMap();
		},

		plot() {
			let series = null;
			let yDomain = [];
			if(this.selectedSeriesType == "stacked") {
				series = d3
					.stack()
					.keys(this.nodes)(this.timeline)
					.map((d) => (d.forEach((v) => (v.key = d.key)), d));
				yDomain = [d3.min(series, (d) => d3.min(d, (d) => d[1])), d3.max(series, (d) => d3.max(d, (d) => d[1]))];
			}
			else if (this.selectedSeriesType == "normalized") {
				series = d3
					.stack()
					.keys(this.nodes)
					.offset(d3.stackOffsetExpand)(this.timeline)
					.map((d) => (d.forEach((v) => (v.key = d.key)), d));
				yDomain = [0, 1];
			}

			this.timeline.reverse();

			this.color = d3
				.scaleOrdinal()
				.domain(series.map((d) => d.key))
				.range(d3.schemeSpectral[series.length])
				.unknown("#ccc");

			if (this.selectedXDomain == "normal") {
				this.x = d3
					.scaleBand()
					.domain(this.timeline.map((d) => d.name))
					.range([0, this.width - 2 * (this.padding.right + this.padding.left)]);
			} else if (this.selectedXDomain == "time") {
				this.x = d3
					.scaleUtc()
					.domain(d3.extent(this.timeline, d => d[this.chartXAttr]))
					.range([0, this.width - 2 * (this.padding.right + this.padding.left)]);
			}

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
			this.mainSvg
				.append("g")
				.selectAll("g")
				.data(series)
				.join("g")
				.attr("fill", (d) => this.color(d.key))
				.selectAll("rect")
				.data((d) => d)
				.join("rect")
				.attr("x", (d) => this.x(d.data.name))
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
				// .attr("fill", "transparent")
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
				.attr("stroke-width", 2)
				.attr("d", line)
				.append("title")
				.text(({key}) => key);
		},

		// Axis for timeline view
		axis() {
			this.xAxis = d3
				.axisBottom(this.x)
				.tickPadding(10)
				.tickFormat((d, i) => {
					return `${d}`;
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
					transform: `translate(${this.width - 2 * this.padding.left}, ${
						this.height - this.padding.top
					})`,
				})
				.style("text-anchor", "middle")
				.text(this.chartXAttr);

			this.svg
				.append("text")
				.attrs({
					class: "axis-labels",
					transform: `translate(${15}, ${this.height / 2}) rotate(${-90})`,
				})
				.style("text-anchor", "middle")
				.text((d, i) => this.$store.selectedMetric);
		},

		colorMap() {
			let width = this.width;
			let n_colors = this.nodes.length;
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
				.data(this.nodes)
				.enter()
				.append("circle")
				.style("stroke", "gray")
				.style("fill", (d, i) => {
					return this.color(this.nodes[i]);
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
				.data(this.nodes)
				.enter()
				.append("text")
				.text((d, i) => {
					return this.nodes[i];
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
		},
	},
};
</script>