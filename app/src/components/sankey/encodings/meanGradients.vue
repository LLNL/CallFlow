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
import { mapGetters } from "vuex";

export default {
	name: "MeanGradients",
	data: () => ({
		id: "mean-gradients",
		intermediateStrokeWidth: 1,
		defaultStrokeWidth: 3,
		transitionDuration: 100,
	}),

	computed: {
		...mapGetters({
			selectedMetric: "getSelectedMetric",
			distributionColorMap: "getDistributionColorMap",
			selectedTargetRun: "getSelectedTargetRun",
			targetColorMap: "getTargetColorMap",
			generalColors: "getGeneralColors",
		})
	},

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
				.duration(this.transitionDuration)
				.attrs({
					opacity: (d) => (d.type == "intermediate" ? 0.4 : 1),
					stroke: (d) => this.stroke_by_metric(d, this.selectedMetric),
					"stroke-width": (d) =>
						d.type == "intermediate"
							? this.intermediateStrokeWidth
							: this.defaultStrokeWidth,
					fill: (d) =>
						this.fill_with_gradients(
							d,
							this.selectedMetric,
							this.$store.distributionColor
						),
				});
		},

		stroke_by_metric(d, metric) {
			if (d.attr_dict.type == "intermediate") {
				return this.generalColors.intermediate;
			} else if (d.attr_dict.type == "callsite") {
				return d3.rgb(this.$store.runtimeColor.getColor(d, metric));
			} else if (d.attr_dict.type == "module") {
				return d3.rgb(this.$store.runtimeColor.getColor(d, metric));
			}
		},

		fill_with_gradients(d, metric, color) {
			if(d.attr_dict["gradients"] == undefined) {
				return "#000";
			}

			let idx = d.attr_dict.idx;

			const defs = d3.select("#" + this.id)
				.append("defs");

			const linearGradient = defs
				.append("linearGradient")
				.attr("id", "mean-gradient-" + idx)
				.attr("class", "mean-gradient");

			linearGradient
				.attr("x1", "0%")
				.attr("y1", "0%")
				.attr("x2", "0%")
				.attr("y2", "100%");

			const grid = d.attr_dict["gradients"][metric]["hist"]["b"];
			const val = d.attr_dict["gradients"][metric]["hist"]["h"];	

			for (let i = 0; i < grid.length; i += 1) {
				let x = (i + 0.5) / grid.length;
				linearGradient
					.append("stop")
					.attr("offset", 100 * x + "%")
					.attr("stop-color", color.getColorByValue(val[i]));
			}

			return "url(#mean-gradient-" + idx + ")";
		},

		clear() {
			d3.selectAll(".mean-gradient").remove();
		}
	},
};
</script>