/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
	<g :id="id">
		<ToolTip ref="ToolTip"/>	
	</g>
</template>

<script>
import * as d3 from "d3";
import { mapGetters } from "vuex";
import EventHandler from "lib/routing/EventHandler";

export default {
	name: "Edges",
	components: {
	},
	props: [],
	data: () => ({
		transitionDuration: 1000,
		id: "",
		offset: 4,
		precision: 2, // Adjust the precision for debugging.
	}),

	computed: {
		...mapGetters({
			selectedTargetRun: "getSelectedTargetRun",
			selectedMode: "getSelectedMode",
			showTarget: "getShowTarget",
			generalColors: "getGeneralColors",
			targetColor: "getTargetColor",
			summary: "getSummary",
		})
	},

	mounted() {
		this.id = "edges";

		let self = this;
		EventHandler.$on("update-node-encoding", function (data) {
			self.clearTarget();
		});
	},

	methods: {
		init(graph) {
			this.graph = graph;
			this.edges = d3.select("#" + this.id);

			if (this.selectedMode == "ESG") {
				this.initEdges("ensemble");
				this.drawEdges("ensemble");
				if (this.showTarget) {
					this.initEdges("target");
					this.drawEdges("target");
				}
			}
			else if (this.selectedMode == "SG") {
				this.initEdges("single");
				this.drawEdges("single");
			}

		},

		initEdges(dataset) {
			let self = this;
			this.edges.selectAll(".edge-" + dataset)
				.data(this.graph.links)
				.enter().append("path")
				.attrs({
					"class": "edge-" + dataset,
					"fill": (d) => {
						if (dataset === "ensemble") {
							return self.generalColors.ensemble;
						}
						else if (dataset === "target") {
							return self.generalColors.target;
						}
						else if (dataset === "single") {
							return self.generalColors.intermediate;
						}
					},
				})
				.style("opacity", 0.5)
				.on("mouseover", function (d) {
					d3.select(this).style("stroke-opacity", "1.0");
				})
				.sort(function (a, b) {
					return b.dy - a.dy;
				});
		},

		drawPath(d, linkHeight, edge_source_offset = 0, edge_target_offset = 0) {
			const Tx0 = (d.source_data.x + d.source_data.dx + edge_source_offset).toFixed(this.precision);
			const Tx1 = (d.target_data.x - edge_target_offset).toFixed(this.precision);
			const Txi = d3.interpolateNumber(Tx0, Tx1);
			const Tx2 = Txi(0.4).toFixed(this.precision);
			const Tx3 = Txi(1 - 0.4).toFixed(this.precision);

			// .ty is the y point that the edge meet the target(for top)
			// .sy is the y point of the source  (for top)
			// .dy is width of the edge
			const Ty0 = (d.source_data.y + this.$parent.ySpacing + d.sy).toFixed(this.precision);
			const Ty1 = (d.target_data.y + this.$parent.ySpacing + d.ty).toFixed(this.precision);
			
			const Bx0 = (d.source_data.x + d.source_data.dx + edge_source_offset).toFixed(this.precision);
			const Bx1 = (d.target_data.x - edge_target_offset).toFixed(this.precision);
			const Bxi = d3.interpolateNumber(Bx0, Bx1);
			const Bx2 = Bxi(0.4).toFixed(this.precision);
			const Bx3 = Bxi(1 - 0.4).toFixed(this.precision);

			let By0 = (d.source_data.y + this.$parent.ySpacing + d.sy + linkHeight).toFixed(this.precision);
			let By1 = (d.target_data.y + this.$parent.ySpacing + d.ty + linkHeight).toFixed(this.precision);

			const rightMoveDown = (By1 - Ty1).toFixed(this.precision);

			return `M${Tx0},${Ty0
			}C${Tx2},${Ty0
			} ${Tx3},${Ty1
			} ${Tx1},${Ty1
			} ` + ` v ${rightMoveDown
			}C${Bx3},${By1
			} ${Bx2},${By0
			} ${Bx0},${By0}`;
		},

		drawMiddlePath(d, linkHeight, edge_source_offset, edge_target_offset, dataset) {
			let Tx0 = d.source_data.x + d.source_data.dx + edge_source_offset,
				Tx1 = d.target_data.x - edge_target_offset,
				Txi = d3.interpolateNumber(Tx0, Tx1),
				Tx2 = Txi(0.4),
				Tx3 = Txi(1 - 0.4),
				Ty0 = d.source_data.y + this.$parent.ySpacing + d.sy + (d.source_data.height - linkHeight) * 0.5,
				Ty1 = d.target_data.y + this.$parent.ySpacing + d.ty + (d.target_data.height - linkHeight) * 0.5;

			// note .ty is the y point that the edge meet the target(for top)
			//		.sy is the y point of the source  (for top)
			//		.dy is width of the edge

			let Bx0 = d.source_data.x + d.source_data.dx + edge_source_offset,
				Bx1 = d.target_data.x - edge_target_offset,
				Bxi = d3.interpolateNumber(Bx0, Bx1),
				Bx2 = Bxi(0.4),
				Bx3 = Bxi(1 - 0.4);

			let By0 = 0, By1 = 0;
			By0 = d.source_data.y + this.$parent.ySpacing + d.sy + linkHeight; //- (d. - linkHeight) * 0.5
			By1 = d.target_data.y + this.$parent.ySpacing + d.ty + linkHeight;// - (d.target_data.height - linkHeight) * 0.5

			let rightMoveDown = By1 - Ty1;

			return `M${Tx0},${Ty0
			}C${Tx2},${Ty0
			} ${Tx3},${Ty1
			} ${Tx1},${Ty1
			} ` + ` v ${rightMoveDown
			}C${Bx3},${By1
			} ${Bx2},${By0
			} ${Bx0},${By0}`;
		},

		drawEdges(dataset) {
			let self = this;
			this.edges.selectAll(".edge-" + dataset)
				.data(this.graph.links)
				.attrs({
					"d": (d) => {
						let link_height = 0;
						if (dataset == "ensemble" || dataset == "single") {
							link_height = d.height;
						}
						else if (dataset == "target") {
							let max_time_inc = 0;
							for(let dataset in d.source_data.attr_dict.gradients["time (inc)"].dataset.mean) {
								max_time_inc = Math.max(max_time_inc, d.source_data.attr_dict.gradients["time (inc)"].dataset.mean[dataset]);
							}
							let ratio = d.source_data.attr_dict.gradients["time (inc)"].dataset.mean[this.selectedTargetRun]/max_time_inc;
							if (ratio > 1) {
								link_height = d.height;
							} 
							else {
								link_height = d.height * ratio;
							}
						}
						return this.drawPath(d, link_height, 0, 0);
					},
					"stroke": this.generalColors.darkGrey,
				})
				.on("mouseover", (d) => {
					// self.$refs.ToolTip.render(self.graph, d)
				})
				.on("mouseout", (d) => {
					// self.$refs.ToolTip.clear()
				});
		},

		//hide all links not connected to selected node
		fadeUnConnected(g) {
			let thisLink = this.graph.links.selectAll(".link");
			thisLink.filter(function (d) {
				return d.source !== g && d.target !== g;
			})
				.transition()
				.duration(500)
				.style("opacity", 0.05);
		},

		clear() {
			this.clearEnsemble();
			if(this.showTarget) {
				this.clearTarget();
			}
		},

		clearEnsemble() {
			this.edges.selectAll(".edge-ensemble").remove();
		},

		clearTarget() {
			this.edges.selectAll(".edge-target").remove();
		}
	}
};

</script>