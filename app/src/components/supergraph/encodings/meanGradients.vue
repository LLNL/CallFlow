/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
<g :id="id"></g>	
</template>

<script>
import * as d3 from "d3";
import * as utils from "../../utils";

export default {
	name: "MeanGradients",
	data: () => ({
		strokeWidth: 7,
		id: "mean-gradients"
	}),

	methods: {
		init(nodes, containerG) {
			this.nodes = nodes;
			this.containerG = containerG;
			this.gradients();
			this.visualize();
		},

		gradients() {
			for (let node of this.nodes) {
				const defs = d3.select("#" + this.id)
					.append("defs");

				const linearGradient = defs.append("linearGradient")
					.attr("id", "mean-gradient" + node.client_idx)
					.attr("class", "mean-gradient");

				linearGradient
					.attr("x1", "0%")
					.attr("y1", "0%")
					.attr("x2", "0%")
					.attr("y2", "100%");

				const module_idx = utils.getModuleIndex(this.$store, node.id);	
				const grid = this.$store.modules["ensemble"][module_idx][this.$store.selectedMetric]["gradients"]["hist"]["x"];
				const val = this.$store.modules["ensemble"][module_idx][this.$store.selectedMetric]["gradients"]["hist"]["y"];

				for (let i = 0; i < grid.length; i += 1) {
					let x = (i + i + 1) / (2 * grid.length);
					let current_value = (val[i]);
					linearGradient.append("stop")
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
						let attr = "";
						let runtimeColor = this.$store.runtimeColor.intermediate;
						if (this.$store.selectedMetric == "Inclusive") {
							attr = "time (inc)";
						}
						else {
							attr = "time";
						}

						if (d.type == "component-node") {
							if (this.$store.callsites[this.$store.selectedTargetDataset][d.id] != undefined) {
								runtimeColor = d3.rgb(this.$store.runtimeColor.getColor(d, attr));
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
							const module_idx = utils.getModuleIndex(this.$store, d.id);
							if (this.$store.modules[this.$store.selectedTargetDataset][module_idx] == undefined) {
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
	}
};

</script>