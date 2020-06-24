/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import * as d3 from "d3";

export default {
	template: "<g :id=\"id\"></g>",
	name: "MeanGradients",
	data: () => ({
		strokeWidth: 7,
		id: "mean-gradients"
	}),

	methods: {
		init(nodes, containerG) {
			this.nodes = nodes;
			this.containerG = containerG;

			this.ensemble_module_data = this.$store.modules["ensemble"];
			this.ensemble_callsite_data = this.$store.callsites["ensemble"];

			this.colorScale();
			this.gradients();
			this.visualize();
		},

		colorScale() {
			let hist_min = 0;
			let hist_max = 0;
			for (let node of this.nodes) {
				if (node.type == "super-node") {
					hist_min = Math.min(hist_min, this.ensemble_module_data[node.module][this.$store.selectedMetric]["gradients"]["hist"]["y_min"]);
					hist_max = Math.max(hist_max, this.ensemble_module_data[node.module][this.$store.selectedMetric]["gradients"]["hist"]["y_max"]);
				}
				else if (node.type == "component-node") {
					hist_min = Math.min(hist_min, this.ensemble_callsite_data[node.name][this.$store.selectedMetric]["gradients"]["hist"]["y_min"]);
					hist_max = Math.max(hist_max, this.ensemble_callsite_data[node.name][this.$store.selectedMetric]["gradients"]["hist"]["y_max"]);
				}
			}
			this.$store.color.setColorScale("MeanGradients", hist_min, hist_max, this.$store.selectedDistributionColorMap, this.$store.selectedColorPoint);
			this.$parent.$parent.$refs.EnsembleColorMap.update(this.$store.mode, hist_min, hist_max);
		},

		gradients() {
			for (let node of this.nodes) {
				var defs = d3.select("#" + this.id)
					.append("defs");

				this.linearGradient = defs.append("linearGradient")
					.attr("id", "mean-gradient" + node.client_idx)
					.attr("class", "mean-gradient");

				this.linearGradient
					.attr("x1", "0%")
					.attr("y1", "0%")
					.attr("x2", "0%")
					.attr("y2", "100%");

				let grid = [];
				let val = [];
				if (node.type == "super-node") {
					grid = this.ensemble_module_data[node.module][this.$store.selectedMetric]["gradients"]["hist"]["x"];
					val = this.ensemble_module_data[node.module][this.$store.selectedMetric]["gradients"]["hist"]["y"];
				}
				else if (node.type == "component-node") {
					grid = this.ensemble_callsite_data[node.name][this.$store.selectedMetric]["gradients"]["hist"]["x"];
					val = this.ensemble_callsite_data[node.name][this.$store.selectedMetric]["gradients"]["hist"]["y"];

				}
				else if (node.type == "intermediate") {
					grid = [];
					val = [];
				}

				for (let i = 0; i < grid.length; i += 1) {
					let x = (i + i + 1) / (2 * grid.length);
					let current_value = (val[i]);
					this.linearGradient.append("stop")
						.attr("offset", 100 * x + "%")
						.attr("stop-color", this.$store.color.getColorByValue(current_value));
				}
			}
		},

		visualize() {
			let rectangles = this.containerG.selectAll("rect")
				.data(this.nodes);

			// Update the current rectangles.
			rectangles
				.transition()
				.duration(this.$store.transitionDuration)
				.attrs({
					"opacity": d => {
						if (d.type == "intermediate") {
							return "#f00";
						}
						else {
							return "#0f0";
						}
					},
					"stroke": (d) => {
						let runtimeColor = "";
						if (d.type == "intermediate") {
							runtimeColor = this.$store.color.ensemble;
						}
						else if (d.type == "component-node") {
							if (this.$store.callsites[this.$store.selectedTargetDataset][d.id] != undefined) {
								runtimeColor = d3.rgb(this.$store.color.getColor(d));
							}
							else {
								runtimeColor = this.$store.color.ensemble;
							}
						}
						else if (d.type == "super-node") {
							if (this.$store.modules[this.$store.selectedTargetDataset][d.id] != undefined) {
								runtimeColor = d3.rgb(this.$store.color.getColor(d));
							}
							else {
								runtimeColor = this.$store.color.ensemble;
							}
						}
						return runtimeColor;
					},
					"stroke-width": (d) => {
						if (d.type == "intermediate") {
							return 1;
						}
						else {
							return this.strokeWidth;
						}
					},
					"fill": (d) => {
						if (d.type == "intermediate") {
							return this.$store.color.target;
						}
						else if (d.type == "super-node") {
							if (this.$store.modules[this.$store.selectedTargetDataset][d.id] == undefined) {
								return this.intermediateColor;
							}
							else {
								return "url(#mean-gradient" + d.client_idx + ")";
							}
						}
						else if (d.type == "component-node") {
							if (this.$store.callsites[this.$store.selectedTargetDataset][d.name] == undefined) {
								return this.intermediateColor;
							}
							else {
								return "url(#mean-gradient" + d.client_idx + ")";
							}
						}
					}
				});
		},

		//Gradients
		clearGradients() {
			this.svg.selectAll(".mean-gradient").remove();
		},

		clear() {
		},
	}
};