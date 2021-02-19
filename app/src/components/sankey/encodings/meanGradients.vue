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

export default {
	name: "MeanGradients",
	data: () => ({
		id: "mean-gradients",
		intermediateStrokeWidth: 1,
		defaultStrokeWidth: 7,
	}),

	methods: {
		init(nodes, containerG) {
			this.nodes = nodes;
			this.containerG = containerG;
			this.visualize();
		},

		visualize() {
			let rectangles = this.containerG.selectAll("rect").data(this.nodes);

			// Update the current rectangles.
			rectangles
				.transition()
				.duration(this.$store.transitionDuration)
				.attrs({
					opacity: (d) => (d.type == "intermediate" ? 0.4 : 1),
					stroke: (d) => this.stroke_by_metric(d),
					"stroke-width": (d) =>
						d.type == "intermediate"
							? this.intermediateStrokeWidth
							: this.strokeWidth,
					fill: (d) =>
						this.fill_with_gradients(
							d,
							this.$store.selectedMetric,
							this.$store.distributionColor
						),
				});
		},

		stroke_by_metric(d) {
			let metric =
        this.$store.selectedMetric == "Inclusive" ? "time (inc)" : "time";

			if (d.type == "intermediate") {
				return this.$store.runtimeColor.intermediate;
			} else if (d.type == "component-node") {
				if (
					this.$store.data_cs[this.$store.selectedTargetDataset][d.id] !=
          undefined
				) {
					return d3.rgb(this.$store.runtimeColor.getColor(d, metric));
				}
			} else if (d.type == "super-node") {
				if (
					this.$store.data_mod[this.$store.selectedTargetDataset][d.id] !=
          undefined
				) {
					return d3.rgb(this.$store.runtimeColor.getColor(d, metric));
				}
			}
		},

		fill_with_gradients(d, metric, color) {
			let index = null;
			if (d.type == "super-node") {
				index = d.module_idx;
			} else if (d.type == "component-node") {
				index = d.client_idx;
			}

			const defs = d3.select("#" + this.id).append("defs");

			const linearGradient = defs
				.append("linearGradient")
				.attr("id", "mean-gradient" + d.client_idx)
				.attr("class", "mean-gradient");

			linearGradient
				.attr("x1", "0%")
				.attr("y1", "0%")
				.attr("x2", "0%")
				.attr("y2", "100%");

			if (index == null) {
				return color.intermediate;
			}

			const grid = this.$store.data_cs["ensemble"][d.id][metric][
				"gradients"
			]["hist"]["x"];
			const val = this.$store.data_cs["ensemble"][d.id][metric]["gradients"][
				"hist"
			]["y"];

			for (let i = 0; i < grid.length; i += 1) {
				let x = (i + i + 1) / (2 * grid.length);
				let current_value = val[i];
				linearGradient
					.append("stop")
					.attr("offset", 100 * x + "%")
					.attr("stop-color", color.getColorByValue(current_value));
			}

			return "url(#mean-gradient" + index + ")";
		},
	},
};
</script>