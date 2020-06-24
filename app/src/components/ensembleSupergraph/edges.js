/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import * as d3 from "d3";

export default {
	template: "<g :id=\"id\"><ToolTip ref=\"ToolTip\" /></g>",
	name: "EnsembleEdges",
	components: {
	},
	props: [],
	data: () => ({
		transitionDuration: 1000,
		id: "",
		offset: 4,
	}),
	watch: {

	},
	mounted() {
		this.id = "edges";
	},

	methods: {
		init(graph) {
			this.graph = graph;
			this.edges = d3.select("#" + this.id);

			if (this.$store.selectedMode == "Ensemble") {
				this.initEdges("ensemble");
				this.drawEdges("ensemble");
				if (this.$store.showTarget && this.$store.comparisonMode == false) {
					this.initEdges("target");
					this.drawEdges("target");
				}
			}
			else if(this.$store.selectedMode == 'Single') {
				this.initEdges("single");
				this.drawEdges("single")
			}

		},

		initEdges(dataset) {
			let self = this;
			this.edges.selectAll("#edge-" + dataset)
				.data(this.graph.links)
				.enter().append("path")
				.attrs({
					"class": "edge",
					"id": "edge-" + dataset
				})
				.style("fill", (d) => {
					if (dataset == "ensemble") { return this.$store.distributionColor.ensemble; }
					return this.$store.runtimeColor.intermediate;
				})
				.style("opacity", 0.5)
				.on("mouseover", function (d) {
					d3.select(this).style("stroke-opacity", "1.0");
					// self.clearEdgeLabels()
					// self.drawEdgeLabels(d)
				})
				.sort(function (a, b) {
					return b.dy - a.dy;
				});
		},


		drawPath(d, linkHeight, edge_source_offset = 0, edge_target_offset = 0, dataset) {
			let Tx0 = d.source_data.x + d.source_data.dx + edge_source_offset,
				Tx1 = d.target_data.x - edge_target_offset,
				Txi = d3.interpolateNumber(Tx0, Tx1),
				Tx2 = Txi(0.4),
				Tx3 = Txi(1 - 0.4),
				Ty0 = d.source_data.y + this.$parent.ySpacing + d.sy,
				Ty1 = d.target_data.y + this.$parent.ySpacing + d.ty;

			// note .ty is the y point that the edge meet the target(for top)
			//		.sy is the y point of the source  (for top)
			//		.dy is width of the edge

			let Bx0 = d.source_data.x + d.source_data.dx + edge_source_offset,
				Bx1 = d.target_data.x - edge_target_offset,
				Bxi = d3.interpolateNumber(Bx0, Bx1),
				Bx2 = Bxi(0.4),
				Bx3 = Bxi(1 - 0.4);

			let By0 = 0, By1 = 0;
			By0 = d.source_data.y + this.$parent.ySpacing + d.sy + linkHeight;
			By1 = d.target_data.y + this.$parent.ySpacing + d.ty + linkHeight;

			let rightMoveDown = By1 - Ty1;

			// if (d.source == "LeapFrog" && d.target == "intermediate_CalcLagrange" && dataset == "target") {
			// 	By0 = 398.074532;
			// }
			// else if (d.source == "LeapFrog" && d.target == "intermediate_CalcLagrange" && dataset == "ensemble") {
			// 	By0 = 415.328692;
			// }

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
			this.edges.selectAll("#edge-" + dataset)
				.data(this.graph.links)
				.attrs({
					"d": (d) => {
						let link_height = 0;
						if (dataset == "ensemble" || dataset == "single") {
							link_height = d.height;
						}
						else if (dataset == "target") {
							link_height = d.targetHeight;
						}
						if (this.$store.selectedEdgeAlignment == "Top") {
							return this.drawPath(d, link_height, 0, 0, dataset);
						}
						else if (this.$store.selectedEdgeAlignment == "Middle") {
							return this.drawMiddlePath(d, link_height, 0, 0, dataset);
						}

					},
					"fill": (d) => {
						if (dataset == "ensemble") {
							return this.$store.distributionColor.ensemble;
						}
						else if (dataset == "target") {
							return this.$store.distributionColor.target;
						}
						else if(dataset == "single") {
							return this.$store.runtimeColor.intermediate;
						}
					},
					"stroke": this.$store.runtimeColor.edgeStrokeColor,
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
			this.edges.selectAll(".edge-ensemble").remove();
			this.edges.selectAll(".edge-target").remove();
			this.edges.selectAll(".edgelabel").remove();
			this.edges.selectAll(".edgelabelText").remove();
		}
	}
};