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
			selectedRunBinCount: "getRunBinCount",
			targetColor: "getTargetColor",
		})
	},

	methods: {
		init(nodes, containerG) {
			this.nodes = nodes.filter((node) => !(node.type === "intermediate"));
			this.containerG = containerG;
			this.visualize();
		},

		visualize() {
			const callsites = this.containerG
				.selectAll(".callsite")
				.data(this.nodes);

			callsites
				.append("line")
				.attrs({
					"class": "targetLines",
					"id": (d) => "line-2-" + this.selectedTargetRun + "-" + d.attr_dict.idx,
					"x1": 0,
					"y1": (d) => this.getTargetPos(d),
					"x2": this.$parent.nodeWidth,
					"y2": (d) => this.getTargetPos(d),
					"stroke-width": 5,
					"stroke": this.targetColor
				});
		},

		getTargetPos(node) {
			if(node.type == "intermediate") {
				return;
			}
			const gradients = node.attr_dict.gradients[this.selectedMetric];
			const targetPos = gradients["dataset"]["d2p"][this.selectedTargetRun];
			const binWidth = node.height / this.selectedRunBinCount;
			return (targetPos + 0.5) * binWidth;
		},

		clear() {
			d3.selectAll(".targetLines").remove();
		}
	}
};

</script>