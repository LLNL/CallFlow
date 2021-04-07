/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
  <v-card fill-height flex>
    <v-row class="ml-3 pa-1">
      <svg :id="id" :width="width" :height="height"></svg>
    </v-row>
  </v-card>
</template>

<script>
import * as d3 from "d3";
import * as utils from "lib/utils";
import moment from "moment";

export default {
	name: "TimeSeries",
	props: [],
	data: () => ({
		id: null,
		height: 0,
		width: 0,
		yMin: 0,
		yMax: 0,
		padding: {
			top: 20,
			bottom: 30,
			left: 100,
			right: 0,
		},
		dimension: {
			chartTitle: 20,
			xAxis: 20,
			yAxis: 20,
			xTitle: 20,
			yTitle: 20,
		},
		chartType: "STACKED_BAR_CHART",
		// chartType: "STACKED_AREA_CHART",
		// chartXAttr: "total",
		chartXAttr: "time",
		// seriesType:"NORMALIZED",
		seriesType: "STACKED"
	}),

	mounted() {
		this.id = "time-overview";
	},

	methods: {
		init(data) {
			this.width = this.$store.viewWidth;
			this.height =
        this.$store.viewHeight / 2 - this.padding.bottom - this.padding.top;

			this.initSVG();
			this.plot(data);
			this.axis();
			this.label();
			this.colorMap();
		},

		initSVG() {
			this.svg = d3.select("#" + this.id).attrs({
				width: this.width,
				height: this.height,
				transform: `translate(${0}, ${0})`,
				"pointer-events": "all",
				border: "1px solid lightgray",
			});

			this.mainSvg = this.svg.append("g").attrs({
				height: this.height,
				width: this.width,
				id: "mainSVG",
				transform: `translate(${this.padding.left}, ${this.padding.top})`,
			});

			this.mainPathG = this.mainSvg.append("g").attrs({
				transform: `translate(${this.padding.left}, ${this.padding.top})`,
			});

			this.mainSvg
				.append("defs")
				.append("clipPath")
				.attr("id", "clip")
				.append("rect")
				.attrs({
					x: 0,
					y: 0,
					width: this.width - this.padding.left - this.padding.right,
					height: this.height - this.padding.top - this.padding.bottom,
				});
		},

		plot(data) {
			this.keys = Object.keys(data[0]);
			const filter_keys = ["time", "total", "name"];
			this.keys = this.keys.filter((e) =>  !filter_keys.includes(e));

			let series = null;
			if(this.seriesType == "STACKED") {
				series = d3
					.stack()
					.keys(this.keys)(data)
					.map((d) => (d.forEach((v) => (v.key = d.key)), d));
			}
			else if (this.seriesType == "NORMALIZED") {
				series = d3
					.stack()
					.keys(this.keys)
					.offset(d3.stackOffsetExpand)(data)
					.map((d) => (d.forEach((v) => (v.key = d.key)), d));
			}

			data.reverse();


			if (this.chartType == "STACKED_BAR_CHART") {
				this.x = d3
					.scaleBand()
					.domain(data.map((d) => d.name))
					.range([0, this.width - 2 * (this.padding.right + this.padding.left)]);
					
				this.color = d3
					.scaleOrdinal()
					.domain(series.map((d) => d.key))
					.range(d3.schemeSpectral[series.length])
					.unknown("#ccc");

				this.y = d3
					.scaleLinear()
					.domain([d3.min(series, (d) => d3.min(d, (d) => d[1])), d3.max(series, (d) => d3.max(d, (d) => d[1]))])
					.nice()
					.range([
						this.height - 2 * this.padding.bottom, 
						2 * this.padding.top
					]);

				this.mainSvg
					.append("g")
					.selectAll("g")
					.data(series)
					.join("g")
					.attr("fill", (d) => this.color(d.key))
					.selectAll("rect")
					.data((d) => d)
					.join("rect")
					.attr("x", (d, i) => this.x(d.data.name))
					.attr("y", (d) => this.y(d[1]))
					.attr("height", (d) => this.y(d[0]) - this.y(d[1]))
					.attr("width", this.x.bandwidth())
					.append("title")
					.text((d) => `[${d.data.name}] ${d.key} - ${utils.formatRuntimeWithoutUnits(d.data[d.key])}`);
			}
			else if(this.chartType == "STACKED_AREA_CHART") {
				this.x = d3.scaleUtc()
					.domain(d3.extent(data, d => d[this.chartXAttr]))
					.range([0, this.width - 2 * (this.padding.right + this.padding.left)]);
					
				this.y = d3.scaleLinear()
					.domain([d3.min(series, d => d3.min(d, d => d[1])), d3.max(series, d => d3.max(d, d => d[1]))]).nice()
					.range([this.height - 2 * this.padding.bottom, 2 * this.padding.top]);
					
				this.color =  d3.scaleOrdinal()
					.domain(series.map((d) => d.key))
					.range(d3.schemeSpectral[series.length])
					.unknown("#ccc");

				const area = d3.area()
					.x(d => this.x(d.data.time))
					// .y(d => this.y(d[0]))
					.y0(d => this.y(d[0]))
					.y1(d => this.y(d[1]));

				this.mainSvg.append("g")
					.selectAll("path")
					.data(series)
					.join("path")
					.attr("stroke", ({key}) => this.color(key))
					.attr("fill", "transparent")
					// .attr("fill", ({key}) => this.color(key))
					.attr("stroke-width", 5)
					.attr("d", area)
					.append("title")
					.text(({key}) => key);
			}
		},

		// Axis for timeline view
		axis() {
			const xFormat = d3.format("0.1f");
			this.xAxis = d3
				.axisBottom(this.x)
				.tickPadding(10)
				.tickFormat((d, i) => {
					if (this.chartXAttr == "total") {
						return `${d}`;
					}
					else if(this.chartXAttr == "time") {
						return moment(d.split("_")[1]).format("DD-MM-YY");
					}
				});

			const yFormat = d3.format("0.01s");
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
						this.height - 2.0 * this.padding.bottom
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

			// this.areaPath = this.mainSvg.append('path')
			//     .attrs({
			//         "clip-path": "url(#clip)",
			//     })
		},

		// draw axis label
		label() {
			this.isLabelled = true;
			this.svg
				.append("text")
				.attrs({
					class: "axis-labels",
					transform: `translate(${this.width - 0.5 * this.padding.left}, ${
						this.height - this.padding.top * 1.5
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
			let n_colors = this.keys.length;
			let x_offset = 20;
			let y_offset = 12;
			let radius = 10;
			let padding = 10;
			let height = 3 * radius + padding;
			let gap = width / n_colors;

			d3.select(".colorMapSVG").remove();

			let svg = this.svg
				.append("svg")
				.attrs({
					transform: `translate(${x_offset}, ${y_offset})`,
					width: this.width,
					height: height,
					class: "colorMapSVG",
				})
				.append("g");

			svg
				.selectAll("circle")
				.data(this.keys)
				.enter()
				.append("circle")
				.style("stroke", "gray")
				.style("fill", (d, i) => {
					return this.color(this.keys[i]);
				})
				.attrs({
					r: radius,
					cx: (d, i) => {
						return i * gap + radius;
					},
					cy: radius + y_offset,
				});

			svg
				.selectAll("text")
				.data(this.keys)
				.enter()
				.append("text")
				.text((d, i) => {
					return this.keys[i];
				})
				.attrs({
					x: (d, i) => {
						return i * gap + 2 * radius + padding;
					},
					y: 0.5 * radius + padding + y_offset,
					"font-family": "sans-serif",
					"font-size": 1.5* radius + "px",
					fill: "black",
				});
		},

		clear() {
			console.log("Clearing all lines");
			d3.selectAll(".line" + this.id).remove();
		},

	},
};
</script>