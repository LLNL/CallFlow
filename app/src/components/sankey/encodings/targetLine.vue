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
import * as utils from "lib/utils";
import * as d3 from "d3";

export default {
	name: "TargetLine",
	components: {},

	data: () => ({
		id: "target-line"
	}),

	methods: {
		init(nodes) {
			this.nodes = nodes;

			this.ensemble_module_data = this.$store.modules["ensemble"];
			this.ensemble_callsite_data = this.$store.callsites["ensemble"];

			for (let node of nodes) {
				this.visualize(node);
			}
		},

		visualize(node) {
			const gradients = utils.getGradients(this.$store, node);

			if (Object.keys(gradients).length != 0) {
				let targetPos = gradients["dataset"]["position"][this.$store.selectedTargetDataset] + 1;
				let binWidth = node.height / (this.$store.selectedRunBinCount);

				let y = binWidth * targetPos - binWidth / 2;

				node.svg
					.append("line")
					.attrs({
						"class": "targetLines",
						"id": "line-2-" + this.$store.selectedTargetDataset + "-" + node.client_idx,
						"x1": 0,
						"y1": y,
						"x2": this.$parent.nodeWidth,
						"y2": y,
						"stroke-width": 5,
						"stroke": this.$store.distributionColor.target
					});

			}
		},

		clear() {
			d3.selectAll(".targetLines").remove();
		}
	}
};

</script>