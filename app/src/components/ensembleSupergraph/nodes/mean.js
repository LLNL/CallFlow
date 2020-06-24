/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import * as d3 from "d3";

export default {
	template: "<g :id=\"id\"></g>",
	name: "Mean",
	components: {},

	data: () => ({
		stroke_width: 7,
		id: "mean"
	}),

	methods: {
		init(nodes, containerG) {
			this.nodes = nodes;
			this.containerG = containerG;

			this.ensemble_module_data = this.$store.modules["ensemble"];
			this.ensemble_callsite_data = this.$store.callsites["ensemble"];

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
						else {
							return 1.0;
						}
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
					else {
						return this.stroke_width;
					}
				})
				.style("fill", (d) => {
					if (d.type == "intermediate") {
						return this.$store.color.ensemble;
					}
					else {
						let color = this.$store.color.getColor(d);
						return color;
					}
				});
		},

		clear() {
		},
	}
};