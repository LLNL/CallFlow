import tpl from "../../html/ensembleSupergraph/edges.html";
import * as d3 from "d3";
import ToolTip from "./edges/tooltip";

export default {
	template: tpl,
	name: "EnsembleEdges",
	components: {
		ToolTip
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
		this.id = "ensemble-edges";
	},

	methods: {
		init(graph) {
			this.graph = graph;
			this.edges = d3.select("#" + this.id);

			this.links = graph.links

			this.initEdges("ensemble");
			this.drawTopEdges("ensemble");
			if(this.$store.selectedMode == 'Ensemble'){
				this.drawTopEdges("target");
			}

			// if (this.$store.showTarget && this.$store.comparisonMode == false && this.$store.selectedMode == 'Ensemble') {
			// 	this.initEdges("target");
			// 	this.drawTopEdges("ensemble");
			// 	this.drawTopEdges("target");
			// }

			// this.$refs.ToolTip.init(this.$parent.id)
		},

		initEdges(dataset) {
			let self = this;
			this.edges.selectAll("#edge-" + dataset)
				.data(this.links)
				.enter().append("path")
				.attrs({
					"class": (d) => { return "edge"; },
					"id": (d) => {
						return "edge-" + dataset;
					}
				})
				.style("fill", (d) => {
					if (dataset == "ensemble") {
						return this.$store.color.ensemble;
					}
					else {
						return this.$store.color.target;
					}
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


		drawPath(d, linkHeight, edge_source_offset, edge_target_offset, dataset) {
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

			if (d.source == "LeapFrog" && d.target == "intermediate_CalcLagrange" && dataset == "target") {
				By0 = 398.074532;
			}
			else if (d.source == "LeapFrog" && d.target == "intermediate_CalcLagrange" && dataset == "ensemble") {
				By0 = 415.328692;
			}

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

		drawTopEdges(dataset) {
			let self = this;
			this.edges.selectAll("#edge-" + dataset)
				.data(this.links)
				.attrs({
					"d": (d) => {
						// Set link height
						let link_height = 0;
						if (dataset == "ensemble") {
							link_height = d.height;
						}
						else if (dataset == "target") {
							link_height = d.targetHeight;
						}

						// Set source offset
						let edge_source_offset = 0;
						if (d.source.split("_")[0] == "intermediate") {
							edge_source_offset = 0;
						}
						else if (dataset == "target") {
							edge_source_offset = 0;
						}

						// Set target offset
						let edge_target_offset = 0;
						if (d.target.split("_")[0] == "intermediate") {
							edge_target_offset = 0;
						}
						else if (dataset == "target") {
							edge_target_offset = 0;
						}

						if (this.$store.selectedEdgeAlignment == "Top") {
							return this.drawPath(d, link_height, edge_source_offset, edge_target_offset, dataset);
						}
						else if (this.$store.selectedEdgeAlignment == "Middle") {
							return this.drawMiddlePath(d, link_height, edge_source_offset, edge_target_offset, dataset);
						}

					},
					"fill": (d) => {
						if (dataset == "ensemble") {
							return this.$store.color.ensemble;
						}
						else if (dataset == "target") {
							return this.$store.color.target;
						}
					},
					"stroke": this.$store.color.edgeStrokeColor,
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
			this.edges.selectAll(".ensemble-edge").remove();
			this.edges.selectAll(".target-edge").remove();
			this.edges.selectAll(".edgelabel").remove();
			this.edges.selectAll(".edgelabelText").remove();
		}
	}
};