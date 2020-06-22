/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import * as d3 from "d3";
import { lasso } from "../../lib/lasso";
import template from "../../html/parameterProjection/index.html";
import EventHandler from "../EventHandler.js";
import * as utils from "../utils";

export default {
	name: "ParameterProjection",
	template: template,
	props: [],
	data: () => ({
		id: null,
		ts: null,
		config: null,
		vis: null,
		colorBy: null,
		zoomed: false,
		xMin: 0,
		xMax: 0,
		yMin: 0,
		yMax: 0,
		message: "Parameter Projection",
		showMessage: false,
		colorset: ["#FF7F00", "#16BECF", "#984EA3", "#8C564B", "#E377C2", "#7F7F7F", "#BCBD21", "#4daf4a", "#D62728"]
	}),
	sockets: {
		parameter_projection(data) {
			data = JSON.parse(data);
			console.log("Projections: ", data);
			this.visualize(data);
		}
	},
	mounted() {
		this.id = "parameter-projection-view";
		let self = this;
		// EventHandler.$on('highlight_dataset', (dataset) => {
		//     // console.log("[Projection] Highlighting the dataset :", dataset)
		//     self.highlight(dataset)
		// })

		EventHandler.$on("update_number_of_clusters", (data) => {
			self.clear();
			self.$socket.emit("parameter_projection", {
				datasets: self.$store.selectedDatasets,
				targetDataset: self.$store.selectedTargetDataset,
				groupBy: "module",
				numOfClusters: self.$store.selectedNumOfClusters
			});
		});


	},
	methods: {
		init() {
			let visContainer = document.getElementById(this.id);

			this.width = visContainer.clientWidth;
			this.tooltipHeight = 110;

			this.height = this.$store.viewHeight * 0.33 - this.tooltipHeight;

			this.padding = { left: 50, top: 0, right: 50, bottom: 30 };
			this.x = d3.scaleLinear().range([0, this.width]);
			this.y = d3.scaleLinear().range([this.height, 0]);

			this.$socket.emit("parameter_projection", {
				datasets: this.$store.selectedDatasets,
				targetDataset: this.$store.selectedTargetDataset,
				groupBy: "module",
				numOfClusters: this.$store.selectedNumOfClusters
			});
		},

		axis() {
			this.xAxis = d3.axisBottom(this.x)
				.tickFormat((d, i) => {
					return "";
				});

			this.yAxis = d3.axisLeft(this.y)
				.tickFormat((d, i) => {
					return "";
				});

			this.yDom = [0, 0];

			this.xAxisSVG = this.svg.append("g")
				.attrs({
					transform: `translate(${this.padding.left}, ${this.height - this.padding.bottom})`,
					class: "x-axis",
					color: "transparent",
				})
				.call(this.xAxis);

			this.yAxisSVG = this.svg.append("g")
				.attrs({
					transform: `translate(${this.padding.left}, ${this.padding.top})`,
					class: "y-axis",
					color: "transparent"
				})
				.call(this.yAxis);

			this.lineLength = 75;

			this.svg.append("svg:defs").append("svg:marker")
				.attr("id", "triangle")
				.attr("refX", 15)
				.attr("refY", -1.5)
				.attr("markerWidth", 6)
				.attr("markerHeight", 6)
				.attr("orient", "auto")
				.append("path")
				.attr("d", "M 0 -5 10 10")
				.style("stroke", "black");

			this.svg.append("line")
				.attr("x1", this.padding.bottom)
				.attr("y1", this.height - this.padding.bottom / 2)
				.attr("x2", this.lineLength)
				.attr("y2", this.height - this.padding.bottom / 2)
				.attr("stroke-width", 1.5)
				.attr("stroke", "black")
				// .attr("marker-end", "url(#triangle)")
				.style("opacity", 0.5);

			this.svg.append("line")
				.attr("x1", this.padding.bottom)
				.attr("y1", this.height - this.padding.bottom / 2)
				.attr("x2", this.padding.bottom)
				.attr("y2", this.height - this.lineLength * 0.75)
				.attr("stroke-width", 1.5)
				.attr("stroke", "black")
				// .attr("marker-end", "url(#triangle)")
				.style("opacity", 0.5);

			this.svg.append("text")
				.attrs({
					"class": "projection-axis-label",
					"x": this.lineLength,
					"y": this.height,
				})
				.style("text-anchor", "end")
				.style("font-size", "10px")
				.style("fill", "none")
				.style("font-size", "10px")
				.style("stroke", "black")
				.style("stroke-width", "1px")
				.style("opacity", 0.5)
				.text("PC1");

			this.svg.append("text")
				.attrs({
					"class": "projection-axis-label",
					"x": - this.height + this.lineLength * 0.75,
					"y": this.padding.bottom * 0.75,
					"transform": "rotate(-90)"
				})
				.style("text-anchor", "end")
				.style("fill", "none")
				.style("font-size", "10px")
				.style("stroke", "black")
				.style("stroke-width", "1px")
				.style("opacity", 0.5)
				.text("PC2");
		},

		preprocess(data) {
			let ret = [];
			this.numberOfPoints = Object.entries(data["x"]).length;

			for (let id = 0; id < this.numberOfPoints; id += 1) {
				let dataset = data["dataset"][id];
				ret[id] = [];
				ret[id].push(data["x"][id]);
				ret[id].push(data["y"][id]);
				ret[id].push(data["dataset"][id]);
				ret[id].push(id);
				ret[id].push(data["label"][id]);
				ret[id].push(this.$store.maxIncTime[dataset]);
				ret[id].push(this.$store.maxExcTime[dataset]);

				let x = data["x"][id];
				let y = data["y"][id];

				if (x < this.xMin) {
					this.xMin = x;
				}
				if (x > this.xMax) {
					this.xMax = x;
				}
				if (y < this.yMin) {
					this.yMin = y;
				}
				if (y > this.yMax) {
					this.yMax = y;
				}
			}
			return ret;
		},

		setup() {
			this.svg = d3.select("#" + this.id).append("svg")
				.attrs({
					width: this.width,
					height: this.height,
					transform: "translate(0, 0)",
					id: "parameter-projection-svg"
				})
				.style("stroke-width", 1)
				.style("stroke", this.$store.ensemble)
				.style("background-color", this.$store.ensemble);

			// set the transition
			this.t = this.svg
				.transition()
				.duration(750);

			this.axis();
		},

		addTooltipTextBlock() {
			// Define the div for the tooltip
			this.tooltip = d3.select("#" + this.id)
				.append("div")
				.attrs({
					"class": "tooltip",
					"id": "parameter-projection-tooltip"
				})
				.style("opacity", 1);
		},

		drawInnerCircle() {
			let self = this;
			let selected = undefined;
			this.circles = this.svg.selectAll("circle")
				.data(this.$store.projection)
				.enter()
				.append("circle")
				.attrs({
					class: (d) => { return "dot"; },
					id: (d) => { return "dot-" + this.$store.datasetMap[d[2]]; },
					r: (d) => {
						return 6.0;
					},
					// 'stroke-width': 2.0,
					fill: (d) => {
						let color = "";
						if (d[2] == self.$store.selectedTargetDataset && self.$store.showTarget) {
							// color = d3.rgb(self.$store.color.ensemble)
							color = this.colorset[d[4]];
						}
						else {
							color = this.colorset[d[4]];
						}
						return color;
					},
					cx: (d, i) => { return self.x(d[0]); },
					cy: (d) => { return self.y(d[1]); },
				});
		},


		drawOuterDisc() {
			// Outer circle.
			this.outerCircles = this.svg.selectAll(".outer-circle")
				.data(this.$store.projection)
				.enter()
				.append("circle")
				.attrs({
					class: (d) => { return "outer-circle"; },
					id: (d) => { return "outer-circle-" + self.$store.datasetMap[d[2]]; },
					r: 8.0,
					"stroke-width": 3.0,
					stroke: (d) => {
						if (d[2] == self.$store.selectedTargetDataset && self.$store.showTarget) {
							// return d3.rgb(self.$store.color.target)
							return this.colorset[d[4]];
						}
						else {
							return d3.rgb(self.$store.color.ensemble);
						}
					},
					"fill-opacity": 0,
					cx: (d, i) => { return self.x(d[0]); },
					cy: (d) => { return self.y(d[1]); },
				})
				.on("mouseover", (d) => {
					this.mouseover(d);
				})
				.on("click", (d) => {
					// this.click(d)
				})
				.on("dblclick", (d) => {
					// this.dblclick(d)
				});

		},

		addLassoFeature() {
			this.lasso = lasso()
				.className("lasso" + this.id)
				.closePathSelect(true)
				.closePathDistance(100)
				.items(this.circles)
				.targetArea(this.svg)
				.on("start", this.lassoStart)
				.on("draw", this.lassoDraw)
				.on("end", this.lassoEnd);

			this.svg.call(this.lasso);
		},

		visualize(data) {
			let self = this;

			this.setup();

			this.$store.projection = this.preprocess(data);
			this.x.domain([2.0 * this.xMin, 2.0 * this.xMax]);
			this.y.domain([2.0 * this.yMin, 2.0 * this.yMax]);

			this.xAxisSVG
				.call(this.xAxis);

			this.yAxisSVG
				.call(this.yAxis);

			this.drawInnerCircle();
			this.addTooltipTextBlock();

			this.addLassoFeature();
			this.highlight(this.$store.selectedTargetDataset);
			this.showDetails(this.$store.selectedTargetDataset);
		},

		showDetails(dataset) {
			this.tooltip.html(
				"Run: " + dataset + "<br/>" +
				"[PC1] Inc. time (max): " + utils.formatRuntimeWithUnits(this.$store.maxIncTime[dataset]) + "<br/>" +
				"[PC2] Exc. time (max): " + utils.formatRuntimeWithUnits(this.$store.maxExcTime[dataset]));
		},

		mouseover(d) {
			let dataset_name = d[2];

			d3.selectAll(".dot")
				.style("opacity", 0.5);


			this.tooltip.transition()
				.duration(200)
				.style("opacity", 1)
				.style("left", 10);
			this.showDetails(dataset_name);
		},

		click(d) {
			console.log("click event");
			let self = this;
			this.selectedRun = d[2];
			d3.selectAll(".dot")
				.attr("stroke", self.$store.color.ensemble)
				.attr("stroke-width", 3);

			d3.select("#dot-" + self.$store.datasetMap[d[2]])
				.attr("stroke", self.$store.color.compare)
				.attr("stroke-width", 3);
			d3.select("#outer-dot" + self.$store.datasetMap[self.$store.selectedTargetDataset])
				.attr("stroke", self.$store.color.target)
				.attr("stroke-width", 3);

			// Set the local and global variables for compare dataset
			this.compareDataset = d[2];
			this.$store.selectedCompareDataset = this.compareDataset;

			// Update the UI elements.
			this.$emit("compare");

			// Send a request to the server to send the information.
			this.$socket.emit("compare", {
				targetDataset: self.$store.selectedTargetDataset,
				compareDataset: this.compareDataset,
				selectedMetric: this.$store.selectedMetric
			});
		},

		dblclick(d) {
			let dataset_name = d[2];
			this.$socket.emit("dist_group_highlight", {
				datasets: [dataset_name],
				groupBy: this.$store.selectedGroupBy
			});

			this.$socket.emit("dist_auxiliary", {
				datasets: [dataset_name],
				sortBy: this.$store.auxiliarySortBy,
				module: "all"
			});
			this.$store.selectedTargetDataset = dataset_name;

			EventHandler.$emit("highlight_datasets", this.$store.selectedTargetDataset);
		},

		// ====================================
		// Interaction functions
		// ====================================
		lassoStart() {
			d3.selectAll(".dot")
				.attrs({
					opacity: 1,
				});

			this.lasso.items()
				.attr("r", (d) => {
					return 4.5;
				}) // reset size
				.classed("not_possible", true)
				.classed("selected", false);
		},

		lassoDraw() {
			// Style the possible dots
			this.lasso.possibleItems()
				.classed("not_possible", false)
				.classed("possible", true);

			// Style the not possible dot
			this.lasso.notPossibleItems()
				.classed("not_possible", true)
				.classed("possible", false);
		},

		lassoEnd() {
			d3.selectAll(".dot")
				.attrs({
					opacity: 0.5,
				});

			this.selectedDatasets = [];
			// Reset the color of all dots
			this.lasso.items()
				.classed("not_possible", false)
				.classed("possible", false);

			// Style the selected dots
			this.lasso.selectedItems()
				.classed("selected", true)
				.attr("r", (d) => {
					return 4.5;
				})
				.attr("id", (d) => { this.selectedDatasets.push(d[2]); })
				.attr("opacity", 1);

			// Reset the style of the not selected dots
			this.lasso.notSelectedItems()
				.attr("r", 4.5)
				.attr("opacity", 0.3);

			this.$store.selectedDatasets = this.selectedDatasets;
			// EventHandler.$emit('highlight_datasets', this.selectedDatasets)
			EventHandler.$emit("lasso_selection", this.$store.selectedDatasets);
		},

		zoom() {
			// for unzoom button; Needs fix
			this.zoomed = true;

			// // adjust the scales
			// this.svg.select(".x-axis").transition(this.t).call(this.xAxis)
			// this.svg.select(".y-axis").transition(this.t).call(this.yAxis)

			// Put circles back in view
			let self = this;
			this.svg.selectAll(".circle" + this.id).transition(this.t)
				.attr("cx", function (d) { return self.x(d["PC0"][0]); })
				.attr("cy", function (d) { return self.y(d["PC1"][0]); });

			// Clear brush selection box
			this.svg.selectAll(".selection")
				.attrs({
					x: 0,
					y: 0,
					width: 0,
					height: 0
				});
		},

		unzoom() {
			// Untoggle the unzoom button.
			this.zoomed = false;

			// reset the scale domains
			this.x.domain([2.0 * this.xMin, 2.0 * this.xMax]);
			this.y.domain([2.0 * this.yMin, 2.0 * this.yMax]);

			// // adjust the scale
			// this.svg.select(".x-axis").transition(this.t).call(this.xAxis)
			// this.svg.select(".y-axis").transition(this.t).call(this.yAxis)

			// Put circles back
			let self = this;
			this.svg.selectAll(".circle" + this.id).transition(this.t)
				.attr("cx", function (d) { return self.x(d["PC0"][0]); })
				.attr("cy", function (d) { return self.y(d["PC1"][0]); });
		},

		brushended() {
			let idleDelay = 350;
			let s = d3.event.selection;
			if (!s) {
				if (!this.idleTimeout)
					return this.idleTimeout = setTimeout(this.idled, idleDelay);
				this.x.domain([2.0 * this.xMin, 2.0 * this.xMax]);
				this.y.domain([2.0 * this.yMin, 2.0 * this.yMax]);
			}
			else {
				let d0 = s.map(this.x.invert);
				let d1 = s.map(this.y.invert);

				this.selectedIds = this.findIdsInRegion(d0[0], d0[1], d1[0], d1[1]);

				// set the scale domains based on selection
				this.x.domain([s[0][0], s[1][0]].map(this.x.invert, this.x));
				this.y.domain([s[1][1], s[0][1]].map(this.y.invert, this.y));


				// console.log(d3.brushSelection(this.brushSvg.node()))

				// https://github.com/d3/d3-brush/issues/10
				if (!d3.event.sourceEvent) return;

				// to set the brush movement to null. But doesnt do the required trick.
				// Reason: maybe webpack
				// https://github.com/d3/d3-brush/issues/10
				d3.select(".brush").call(this.brush.move, null);
			}
			this.zoom();
			this.select();
		},

		idled() {
			this.idleTimeout = null;
		},

		highlight(dataset) {
			let datasetID = this.$store.datasetMap[dataset];

			this.circles = this.svg.selectAll("#dot-" + datasetID)
				.attrs({
					opacity: 1.0,
					stroke: this.$store.color.target,
					"stroke-width": 3.0,
				});

			this.circles = this.svg.selectAll("#dot-" + datasetID)
				.attrs({
					opacity: 1.0,
					stroke: this.$store.color.target,
					"stroke-width": 4.5,
				});

		},

		clear() {
			// d3.selectAll('#parameter-projection-svg').remove()
			// d3.selectAll('#parameter-projection-tooltip').remove()
			// d3.selectAll('.dot').remove()
			// d3.selectAll('.outer-circle').remove()
			// d3.selectAll('.lasso').remove()
		}
	},
};


