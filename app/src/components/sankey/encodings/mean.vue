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
import { mapGetters } from "vuex";
export default {
	name: "Mean",
	data: () => ({
		stroke_width: 3,
		id: "mean"
	}),

	computed: {
		...mapGetters({ 
			selectedMetric: "getSelectedMetric",
			generalColors: "getGeneralColors"
		})
	},

	methods: {
		init(nodes, containerG) {
			this.nodes = nodes;
			this.containerG = containerG;

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
							return this.generalColors.silver;
						}	
						return this.$store.runtimeColor.getColor(d, this.selectedMetric);						
					}
				});
		},

		clear() {
		},
	}
};
</script>