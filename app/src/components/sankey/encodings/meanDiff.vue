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

import Color from "lib/color/";
import EventHandler from "lib/routing/EventHandler";

export default {
	name: "MeanDiff",
	components: {},

	data: () => ({
		strokeWidth: 7,
		id: "mean-diff-gradients",
		meanDiff: {},
		animationDuration: 1000,
		renderZeroLine: {},
		rank_min: 0,
		rank_max: 0,
		mean_min: 0,
		mean_max: 0,
		mean_diff_min: 0,
		mean_diff_max: 0
	}),

	computed: {
		...mapGetters({
			selectedMetric: "getSelectedMetric",
			data: "getCompareData",
			distributionColorMap: "getDistributionColorMap",
			selectedColorPoint: "getColorPoint",
		})
	},

	mounted() {
		EventHandler.$on("init-diff-color", function (data) {
			self.process();
		});
	},

	watch: {
		data: function() {
			this.process();
			this.visualize();
		}
	},

	methods: {
		init(nodes, containerG) {
			this.nodes = nodes;
			this.containerG = containerG;
			this.$store.dispatch("fetchCompare");
		},

		process() {
			for (let i = 0; i < this.data.length; i += 1) {
				this.rank_min = Math.min(this.rank_min, this.data[i]["hist"]["y_min"]);
				this.rank_max = Math.max(this.rank_max, this.data[i]["hist"]["y_max"]);
				this.mean_min = Math.min(this.mean_min, this.data[i]["hist"]["x_min"]);
				this.mean_max = Math.max(this.mean_max, this.data[i]["hist"]["x_max"]);
				this.mean_diff_min = Math.min(this.mean_diff_min, this.data[i]["mean_diff"]);
				this.mean_diff_max = Math.max(this.mean_diff_max, this.data[i]["mean_diff"]);
				this.meanDiff[this.data[i]["name"]] = this.data[i]["mean_diff"];
			}

			this.$store.diffColor = new Color("MeanDiff", 
				this.mean_diff_max,
				this.mean_diff_min, 
				this.distributionColorMap, 
				this.selectedColorPoint);	

			EventHandler.$emit("remove-ensemble-colors");
		},

		visualize() {
			let rectangles = this.containerG.selectAll("rect")
				.data(this.nodes);

			// Transition
			rectangles
				.transition()
				.duration(this.animationDuration)
				.attrs({
					"opacity": 1,
					"height": d => d.height,
					"stroke-width": 3,
				})
				.style("fill", (d, i) => {
					return d3.rgb(this.$store.diffColor.getColorByValue((this.meanDiff[d.id])));
				});

			let texts = this.containerG.selectAll(".callsite-text")
				.data(this.nodes);
			
			texts
				.transition()
				.duration(this.animationDuration)
				.style("fill", d => {
					let hex = this.$store.diffColor.getColorByValue(this.meanDiff[d.id]);
					return this.$store.diffColor.setContrast(hex);
				});

		},

		clear() {
		},
	}
};

</script>