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
import "d3-selection-multi";

import EventHandler from "lib/routing/EventHandler";

export default {
	name: "MiniHistograms",
	components: {},
	props: [],
	data: () => ({
		padding: {
			top: 0, left: 0, right: 0, bottom: 10
		},
		nodeScale: 0.99,
		id: "",
		offset: 7,
		bandWidth: 0,
	}),

	mounted() {
		this.id = "minihistogram-overview";

		// TODO: CAL-88: This code must return back once we fix the 
		// auxiliary processing.
		// let self = this;
		// EventHandler.$on("update-rank-bin-size", function(data) {
		// 	self.clear();
		// 	EventHandler.$emit("single-histogram", {

		// 	});			
		// });
	},

	methods: {
		init(graph) {
			const t_module_data = this.$store.data_mod[this.$store.selectedTargetDataset];
			const t_callsite_data = this.$store.data_cs[this.$store.selectedTargetDataset];
			
			for (const node of graph.nodes) {
				const module_idx = node.module_idx;
				const callsite = node.name;

				let data = {};
				if (node.type == "super-node") {
					data = t_module_data[module_idx][this.$store.selectedMetric]["hists"][this.$store.selectedProp];
				}
				else if (node.type == "component-node" && t_callsite_data[callsite] != undefined) {
					data = t_callsite_data[callsite][this.$store.selectedMetric]["hists"][this.$store.selectedProp];
				}
				this.render(data, graph, node);
			}
		},

		array_unique(arr) {
			return arr.filter(function (value, index, self) {
				return self.indexOf(value) === index;
			});
		},

		clear() {
			this.bandWidth = 0;
			d3.selectAll("#histobars").remove();
		},

		histogram(data, node_dict, type) {
			let color = "";
			let xVals = [], freq = [];
			if (type == "ensemble") {
				color = this.$store.distributionColor.ensemble;
				xVals = data.x;
				freq = data.y;
			}
			else if (type == "target" || type == "single") {
				if (type == "target")
					color = this.$store.distributionColor.target;
				else if (type == "single")
					color = this.$store.runtimeColor.intermediate;
				xVals = data.x;
				freq = data.y;
			}

			if (this.$store.selectedScale == "Linear") {
				this.minimapYScale = d3.scaleLinear()
					.domain([0, d3.max(freq)])
					.range([this.$parent.ySpacing - 10, 0]);
			}
			else if (this.$store.selectedScale == "Log") {
				this.minimapYScale = d3.scaleLog()
					.domain([0.1, d3.max(freq)])
					.range([this.$parent.ySpacing, 0]);
			}

			this.minimapXScale = d3.scaleBand()
				.domain(xVals)
				.rangeRound([0, this.$parent.nodeWidth]);
			this.bandWidth = this.minimapXScale.bandwidth();

			for (let i = 0; i < freq.length; i += 1) {
				d3.select("#" + this.id)
					.append("rect")
					.attrs({
						"id": "histobars",
						"class": "histogram-bar-" + type,
						"width": () => this.bandWidth,
						"height": (d) => {
							return this.$parent.nodeWidth - this.minimapYScale(freq[i]);
						},
						"x": (d) => {
							return node_dict.x + this.minimapXScale(xVals[i]);
						},
						"y": (d) => node_dict.y + this.minimapYScale(freq[i]) + this.offset,
						"stroke-width": "0.2px",
						"stroke": "black",
						"fill": color,
					});
			}
		},

		render(data, graph, node) {
			let node_dict = graph.nodes[graph.nodeMap[node.id]];
			if (this.$store.selectedMode == "Ensemble") {
				this.histogram(data, node_dict, "ensemble");
				if (this.$store.showTarget && this.$store.comparisonMode == false) {
					this.histogram(data, node_dict, "target");
				}
			}
			else if (this.$store.selectedMode == "Single") {
				this.histogram(data, node_dict, "single");
			}
		}
	}
};
</script>