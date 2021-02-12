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
export default {
	name: "Mean",
	data: () => ({
		stroke_width: 3,
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
					"stroke": "#000",
					"stroke-width": (d) => {
						if (d.type == "intermediate") {
							return 1;
						}
						return this.stroke_width;
					},
					"fill": (d) => {
						if (d.type == "intermediate") {
							return this.$store.runtimeColor.intermediate;
						}
						else {
							if (this.$store.selectedMetric == "Inclusive") {
								return this.$store.runtimeColor.getColor(d, "time (inc)");
							}
							else if (this.$store.selectedMetric == "Exclusive") {
								return this.$store.runtimeColor.getColor(d, "time");
							}
						}
					}
				});
		},

		clear() {
		},
	}
};
</script>