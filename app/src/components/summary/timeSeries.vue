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

export default {
	name: "TimeSeries",
	props: [],
	data: () => ({
		id: null,
		view: null,
		vis: null,
		container: null,
		enableInteraction: true,
		height: 0,
		width: 0,
		metrics: null,
		selectedMeasure: null,
		current_views: [],
		selectedIds: [],
		yMin: 0,
		yMax: 0,
		isLabelled: false,
		brushes: [],
		cpds: [],
		prev_cpd: 0,
		message: "Performance Behavior view",
		showMessage: true,
		actualTime: [],
		clusterMap: {},
		cluster: [],
		showCircleLabels: true,
		padding: {
			top: 30,
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
			navChart: 70,
		},
		currentMovingAvg: 0,
		movingAvgTs: {},
		navDrag: false,
	}),

	mounted() {
		this.id = "time-overview";
	},

	methods: {
		init(data) {
			this.width = this.$store.viewWidth;
			this.height = this.$store.viewHeight / 2 - this.padding.bottom - this.padding.top;

			this.initSVG();
			// this.initLine();
			this.renderAbsoluteStackedBarPlots(data);
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

		renderAbsoluteStackedBarPlots(data) {
			const sortable = Object.entries(data["ensemble"])
				.sort(([,a],[,b]) => a-b)
				.reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

			console.log(sortable);

			const keys = Object.keys(data[0]);

			const series = d3.stack().keys(keys)(data)
				.map(d => (d.forEach(v => v.key = d.key), d));

			this.x = d3
				.scaleBand()
				.domain(data.map(d => d.name))
				.range([0, this.width - this.padding.right - this.padding.left])
				.padding(0.1);
		
			this.y = d3
				.scaleLinear()
				.domain([0, d3.max(series, d => d3.max(d, d => d[1]))])
				.rangeRound([this.height - this.padding.bottom, this.padding.top]);
				
			this.color = d3.scaleOrdinal()
				.domain(series.map(d => d.key))
				.range(d3.schemeSpectral[11])
				.unknown("#ccc");

			const formatValue = x => isNaN(x) ? "N/A" : x.toLocaleString("en");

			this.mainSvg.append("g")
				.selectAll("g")
				.data(series)
				.join("g")
				.attr("fill", d => this.color(d.key))
				.selectAll("rect")
				.data(d => d)
				.join("rect")
				.attr("x", (d, i) => this.x(d.data.name))
				.attr("y", d => this.y(d[1]))
				.attr("height", d => this.y(d[0]) - this.y(d[1]))
				.attr("width", this.x.bandwidth())
				.append("title")
				.text(d => `${d.data.name} ${d.key}
				${formatValue(d.data[d.key])}`);
		},

		preprocess() {
			let ret = [];
			
			for (let [id, res] of Object.entries(this.data)) {
				// console.log(id, res);
				// console.log(this.$store)
			

			
				// if (ret[id] == undefined) {
				// 	ret[id] = [];
				// }
				// ret[id].push(res["time"]);
				// ret[id].push(res["ts"]);
				// ret[id].push(res["cluster"][0]);
				// ret[id].push(id);

				// let max = Math.max.apply(null, res["time"]);
				// if (max > this.yMax) {
				// 	this.yMax = max;
				// }

				// let min = Math.min.apply(null, res["time"]);
				// if (min < this.yMin) {
				// 	this.yMin = min;
				// }
			}

			// series = d3.stack().keys(data.columns.slice(1))(data)
			// 	.map(d => (d.forEach(v => v.key = d.key), d));
			return ret;
		},

		initLine() {
			this.line = d3
				.line()
				.x((d, i) => {
					// let windowActualTime = this.windowActualTime.splice(this.windowActualTime.length -1 , 1)
					// console.log(windowActualTime)
					return this.x(this.windowActualTime[i]);
				})
				.y((d) => this.y(d));

			// this.area = d3
			// 	.area()
			// 	.curve(d3.curveStepAfter)
			// 	.y0(this.y(0))
			// 	.y1(function (d) {
			// 		return this.y(d.value);
			// 	});
		},

		// Axis for timeline view
		axis() {
			const xFormat = d3.format("0.1f");
			this.xAxis = d3
				.axisBottom(this.x)
				.tickPadding(10)
				.tickFormat((d, i) => {
					let value = Math.round(d);
					return value;
				});

			const yFormat = d3.format("0.1s");
			this.yAxis = d3
				.axisLeft(this.y)
				.tickPadding(10)
				.tickFormat((d, i) => {
					if (i % 2 == 0) {
						return `${yFormat(d)}`;
					}
					return "";
				});

			this.xAxisSVG = this.mainSvg
				.append("g")
				.attrs({
					transform: `translate(${0}, ${
						this.height - 1.0 * this.padding.bottom
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

			this.yDom = [0, 0];
			this.yNavDom = [0, 0];
		},

		// draw axis label
		label() {
			this.isLabelled = true;
			this.svg
				.append("text")
				.attrs({
					class: "axis-labels",
					transform: `translate(${this.width / 2}, ${
						this.height - this.padding.top
					})`,
				})
				.style("text-anchor", "middle")
				.text((d, i) => this.$store.selectedMetric);

			this.svg
				.append("text")
				.attrs({
					class: "axis-labels",
					transform: `translate(${0}, ${this.height / 2}) rotate(${90})`,
				})
				.style("text-anchor", "middle")
				.text((d, i) => {
					if (this.$parent.panelId == "2") {
						if (this.$store.plotMetric2 in this.nameMapper) {
							return this.nameMapper[this.$store.plotMetric2];
						} else {
							return this.$store.plotMetric2;
						}
					}
					if (this.$parent.panelId == "1") {
						if (this.$store.plotMetric1 in this.nameMapper) {
							return this.nameMapper[this.$store.plotMetric1];
						} else {
							return this.$store.plotMetric1;
						}
					}
				});
		},

		clear() {
			console.log("Clearing all lines");
			d3.selectAll(".line" + this.id).remove();
		},

		// Draw Main timeline view.
		drawMainView(data) {
			// Reset the clusterMap every time we visualize.
			this.clusterMap = {};
			// Assign the number of processors.
			this.numberOfProcs = Object.entries(data).length;

			for (let [id, res] of Object.entries(data)) {
				this.startTime = 0;

				// let time = res['time']
				// ts is the main data. (Data of the plot metric chosen.)
				let ts = res["ts"];
				// Add zero to the data array.
				ts.unshift(0);

				// Add zero to the time array.
				let actualTime = res[this.plotMetric];
				if (id == 0) {
					actualTime.unshift(0);
				}
				// Actualtime corresponds to the x-axis data but store on the global props.
				this.actualTime = actualTime;

				// Assign a cluster Map.
				let cluster = res["cluster"][0];
				if (this.clusterMap[cluster] == undefined) {
					this.clusterMap[cluster] = 0;
				}
				this.clusterMap[cluster] += 1;
				this.cluster[id] = res["cluster"][0];

				// Set the X domain for Line and navLine
				let windowTs = [];
				if (this.actualTime.length > this.timepointMoveThreshold) {
					windowTs = ts.slice(
						this.actualTime.length - this.timepointMoveThreshold,
						this.actualTime.length,
					);
					this.windowActualTime = this.actualTime.slice(
						this.actualTime.length - this.timepointMoveThreshold,
						this.actualTime.length,
					);
					this.x.domain([
						this.actualTime[
							this.actualTime.length - this.timepointMoveThreshold
						],
						this.actualTime[this.actualTime.length - 1],
					]);
				} else {
					windowTs = ts;
					this.windowActualTime = this.actualTime;
					this.x.domain([
						this.startTime,
						this.actualTime[this.actualTime.length - 1],
					]);
				}

				// Set the Y domain for line.
				let yDomTemp = d3.extent(windowTs);
				if (yDomTemp[1] > this.yDom[1]) this.yDom[1] = yDomTemp[1];
				this.y.domain(this.yDom);

				// Draw Axis
				this.xAxisSVG.call(this.xAxis);
				this.yAxisSVG.call(this.yAxis);

				// Draw line to main TimeLine.
				this.path = this.mainSvg
					.append("path")
					.attr("class", "line line" + this.id);

				// console.log("Current Data: ", windowTs)
				this.path
					.datum(windowTs)
					.attrs({
						id: "line" + id,
						d: this.line,
						stroke: this.$store.colorset[cluster],
						"stroke-width": (d) => {
							if (this.numberOfProcs < 16) return 2.0;
							else return 1.0;
						},
						fill: "transparent",
					})
					.style("z-index", 0);

				// Calculate the avg out of the data (ts).
				if (this.movingAvgTs[this.plotMetric] == undefined) {
					if (id == 0) {
						this.currentMovingAvg = [];
						// this.currentMovingAvg[id] = 0
					}
					for (let i = 0; i < ts.length; i += 1) {
						if (this.currentMovingAvg[i] == undefined) {
							this.currentMovingAvg[i] = 0;
						}
						this.currentMovingAvg[i] += ts[i] / this.numberOfProcs;
					}
				} else {
					if (id == 0) {
						this.currentMovingAvg = 0;
					}
					this.currentMovingAvg +=
            ts[this.movingAvgTs[this.plotMetric].length - 1] /
            this.numberOfProcs;
				}
			}
			// Push the average values into the array.
			if (this.movingAvgTs[this.plotMetric] == undefined) {
				this.movingAvgTs[this.plotMetric] = [];
				for (let i = 0; i < this.currentMovingAvg.length; i += 1) {
					this.movingAvgTs[this.plotMetric].push(this.currentMovingAvg[i]);
				}
			} else {
				console.log("Time series [Moving average] = ", this.currentMovingAvg);
				this.movingAvgTs[this.plotMetric].push(this.currentMovingAvg);
			}
		},
	},
};
</script>