/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import * as d3 from "d3";
import { tickStep } from "d3";

export default {
	template: "<g :id=\"id\"></g>",
	name: "Mean",
	data: () => ({
		stroke_width: 7,
		id: "mean"
	}),
	methods: {
		init(nodes, containerG) {
			this.nodes = nodes;
			this.containerG = containerG;

			this.module_data = this.$store.modules[this.$store.selectedTargetDataset];
			this.callsite_data = this.$store.callsites[this.$store.selectedTargetDataset];

			// this.setColorScale();
			this.visualize();
		},

		setColorScale() {
			let hist_min = 0;
			let hist_max = 0;
			for (let node of this.nodes) {
				if (node.type == "super-node") {
					hist_min = Math.min(hist_min, this.module_data[node.module][this.$store.selectedMetric]["mean_time"]);
					hist_max = Math.max(hist_max, this.module_data[node.module][this.$store.selectedMetric]["mean_time"]);
				}
				else if (node.type == "component-node") {
					hist_min = Math.min(hist_min, this.ensemble_callsite_data[node.name][this.$store.selectedMetric]["gradients"]["hist"]["y_min"]);
					hist_max = Math.max(hist_max, this.ensemble_callsite_data[node.name][this.$store.selectedMetric]["gradients"]["hist"]["y_max"]);
				}
			}
			this.$store.color.setColorScale(this.$store.selectedMetric, hist_min, hist_max, this.$store.selectedRuntimeColorMap, this.$store.selectedColorPoint);
			this.$parent.$parent.$refs.EnsembleColorMap.update(this.$store.mode, hist_min, hist_max);
		},

		visualize() {
			this.containerG.selectAll(".callsite-rect")
				.data(this.nodes)
				.transition()
				.duration(this.$parent.transitionDuration)
				.attrs({
					"opacity": d => {
						if (d.type == "intermediate") {
							return 0.0;
						}
						return 1.0;
					},
					"height": (d) => {
						return d.height;
					},
					"stroke": "#000"
				})
				.style("stroke-width", (d) => {
					if (d.type == "intermediate") {
						return 1;
					}
					return this.stroke_width;
				})
				.style("fill", (d) => {
					let color = "";
					if (d.type == "intermediate") {
						color = this.$store.runtimeColor.intermediate;
					}
					else {
						if (this.$store.selectedMetric == "Inclusive") {
							color = this.$store.runtimeColor.getColor(d, "time (inc)");
						}
						else if (this.$store.selectedMetric == "Exclusive") {
							color = this.$store.runtimeColor.getColor(d, "time");
						}
					}
					return color;
				});
		},

		clear() {
		},
	}
};