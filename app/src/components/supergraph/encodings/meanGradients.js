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

			// this.colorScale();
			this.gradients();
			this.visualize();
		},

		colorScale() {
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
					grid = this.$store.modules["ensemble"][node.module][this.$store.selectedMetric]["gradients"]["hist"]["x"];
					val = this.$store.modules["ensemble"][node.module][this.$store.selectedMetric]["gradients"]["hist"]["y"];
				}
				else if (node.type == "component-node") {
					grid = this.$store.callsites["ensemble"][node.name][this.$store.selectedMetric]["gradients"]["hist"]["x"];
					val = this.$store.callsites["ensemble"][node.name][this.$store.selectedMetric]["gradients"]["hist"]["y"];

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
						.attr("stop-color", this.$store.distributionColor.getColorByValue(current_value));
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
						let attr = ''
						let runtimeColor = this.$store.runtimeColor.intermediate;
						if (this.$store.selectedMetric == 'Inclusive') {
							attr = 'time (inc)'
						}
						else {
							attr = 'time'
						} 
						
						if (d.type == "component-node") {
							if (this.$store.callsites[this.$store.selectedTargetDataset][d.id] != undefined) {
								runtimeColor = d3.rgb(this.$store.runtimeColor.getColor(d, attr	));
							}
						}
						else if (d.type == "super-node") {

							if (this.$store.modules[this.$store.selectedTargetDataset][d.id] != undefined) {
								runtimeColor = d3.rgb(this.$store.runtimeColor.getColor(d, attr));
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
							return this.$store.runtimeColor.intermediate;
						}
						else if (d.type == "super-node") {
							if (this.$store.modules[this.$store.selectedTargetDataset][d.id] == undefined) {
								return this.$store.runtimeColor.intermediate;
							}
							else {
								return "url(#mean-gradient" + d.client_idx + ")";
							}
						}
						else if (d.type == "component-node") {
							if (this.$store.callsites[this.$store.selectedTargetDataset][d.name] == undefined) {
								return this.$store.runtimeColor.intermediate;
							}
							else {
								return "url(#mean-gradient" + d.client_idx + ")";
							}
						}
					}
				});
		},

		clear() {
			this.containerG.selectAll(".mean-gradient").remove();
		},
	}
};