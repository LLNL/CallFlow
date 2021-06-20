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
	name: "TargetLine",
	components: {},

	data: () => ({
		id: "target-line"
	}),

	computed: {
		...mapGetters({
			selectedTargetRun: "getSelectedTargetRun",
			generalColors: "getGeneralColors",
			selectedMetric: "getSelectedMetric",
		})
	},

	methods: {
		init(nodes) {
			this.nodes = nodes;

			for (let node of nodes) {
				this.visualize(node);
			}
		},

		visualize(node) {
			if(node.type == "intermediate") {
				return;
			}
			
			const gradients = node.attr_dict.gradients[this.selectedMetric];
			const targetPos = gradients["dataset"]["position"][this.selectedTargetRun];
			const binWidth = node.height / (this.selectedRunBinCount);
			const y = binWidth * targetPos;

			node.svg
				.append("line")
				.attrs({
					"class": "targetLines",
					"id": "line-2-" + this.selectedTargetRun + "-" + node.attr_dict.nid,
					"x1": 0,
					"y1": y,
					"x2": this.$parent.nodeWidth,
					"y2": y,
					"stroke-width": 5,
					"stroke": this.generalColors.target
				});

		},

		clear() {
			d3.selectAll(".targetLines").remove();
		}
	}
};

</script>