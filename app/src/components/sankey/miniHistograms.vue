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
import { mapGetters } from "vuex";

export default {
	name: "MiniHistograms",
	components: {},
	props: [],
	data: () => ({
		padding: {
			top: 0, left: 0, right: 0, bottom: 10
		},
		nodeScale: 0.99,
		id: "minihistogram-overview",
		offset: 7,
		bandWidth: 0,
		selectedScale: "Linear"
	}),

	computed: {
		...mapGetters({
			selectedMetric: "getSelectedMetric",
			generalColors: "getGeneralColors",
			selectedMode: "getSelectedMode",
			showTarget: "getShowTarget",
			comparisonMode: "getComparisonMode",
			targetColor: "getTargetColor"
		})
	},

	methods: {
		init(graph) {			
			for (const node of graph.nodes) {
				if (node.type !== "intermediate") {
					let data = node.attr_dict.hists[this.selectedMetric]["rank"];

					if (this.selectedMode == "ESG") {
						this.histogram(data, node, "ensemble");
						if (this.showTarget && this.comparisonMode == false) {
							this.histogram(data, node, "target");
						}
					} else if (this.selectedMode == "SG") {
						this.histogram(data, node, "ensemble");
					}

					
				}
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
				color = this.generalColors.ensemble;
				xVals = data.x;
				freq = data.y;
			}
			else if (type == "target" || type == "single") {
				if (type == "target")
					color = this.targetColor;
				else if (type == "single")
					color = this.generalColors.intermediate;
				xVals = data.x;
				freq = data.y;
			}

			if (this.selectedScale == "Linear") {
				this.minimapYScale = d3.scaleLinear()
					.domain([0, d3.max(freq)])
					.range([this.$parent.ySpacing - 10, 0]);
			}
			else if (this.selectedScale == "Log") {
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