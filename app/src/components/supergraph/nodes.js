import * as d3 from "d3";
import ToolTip from "./tooltip";
import EventHandler from "../EventHandler";

export default {
	template: `<g :id="id"><ToolTip ref="ToolTip" /></g>`,
	name: "Nodes",
	components: {
		ToolTip
	},
	props: [],
	data: () => ({
		currentNodeLevel: {},
		nodeHeights: {},
		nodeWidth: 50,
		transitionDuration: 1000,
		minHeightForText: 15,
		textTruncForNode: 25,
		id: "",
	}),
	mounted() {
		this.id = "node-" + this._uid;
	},
	sockets: {

	},
	methods: {
		init(graph) {
			this.graph = graph;
			this.nodes = d3.select("#" + this.id);

			this.drag = d3.drag()
				.subject((d) => {
					return d;
				})
				.on("start", function () {
					this.parentNode.appendChild(this);
				})
				.on("drag", this.dragmove);

			const node = this.nodes.selectAll(".node")
				.data(this.graph.nodes)
				.enter().append("g")
				.attr("class", (d) => {
					return "node";
				})
				.attr("opacity", 0)
				.attr("id", d => `node_${d.id}`)
				.attr("transform", (d) => {
					return `translate(${d.x},${d.y})`;
				});
			// .call(this.drag)

			this.nodes.selectAll(".node")
				.data(this.graph.nodes)
				.transition()
				.duration(this.transitionDuration)
				.attr("opacity", 1)
				.attr("transform", d => `translate(${d.x},${d.y + this.$parent.ySpacing})`);

			this.rectangle(node);
			this.path(node);
			this.text(node);
			this.$refs.ToolTip.init(this.$parent.id);
		},

		rectangle(node) {
			let self = this;
			const rect = node.append("rect")
				.attr("height", (d) => {
					this.currentNodeLevel[d.mod_index] = 0;
					this.nodeHeights[d.n_index] = d.height;
					return d.height;
				})
				.attr("width", this.nodeWidth)
				.attr("opacity", 0)
				.style("fill", d => {
					if (d.id.split("_")[0] == "intermediate") {
						return "#202020";
					}
					else {
						console.log(d);
						let color = this.$store.color.getColor(d);
						return color;
					}
				})
				.style("fill-opacity", (d) => {
					if (d.id.split("_")[0] == "intermediate") {
						return 0.0;
					}
					else {
						return 1.0;
					}
				})
				.style("shape-rendering", "crispEdges")
				.style("stroke", (d) => {
					if (d.id.split("_")[0] == "intermediate") {
						return "grey";
					}
					else {
						return d3.rgb(this.$store.color.getColor(d)).darker(2);
					}
				})
				.style("stroke-width", (d) => {
					if (d.id.split("_")[0] == "intermediate") {
						return 0.0;
					}
					else {
						return 1.0;
					}
				})
				.on("mouseover", function (d) {
					self.$refs.ToolTip.render(self.graph, d);
				})
				.on("mouseout", function (d) {
					self.$refs.ToolTip.clear();
				})
				.on("click", (d) => {
					console.log("Selected node: ", d);
					this.$store.selectedModule = d.id;
					let selectedModule = d.id;

					EventHandler.$emit("single_scatterplot", {
						module: this.$store.selectedModule,
						dataset1: this.$store.selectedDataset,
					});

					EventHandler.$emit("single_histogram", {
						module: this.$store.selectedModule,
						dataset: this.$store.selectedDataset,
					});

					EventHandler.$emit("function", {
						module: this.$store.selectedModule,
						dataset1: this.$store.selectedDataset,
					});
				});

			// Transition
			this.nodes.selectAll("rect")
				.data(this.graph.nodes)
				.transition()
				.duration(this.transitionDuration)
				.attr("opacity", d => {
					if (d.id.split("_")[0] == "intermediate") {
						return 0.0;
					}
					else {
						return 1.0;
					}
				})
				.attr("height", d => d.height)
				.style("fill", (d) => {
					if (d.id.split("_")[0] == "intermediate") {
						return this.$store.color.ensemble;
					}
					else {
						let color = this.$store.color.getColor(d);
						return color;
					}
				});
		},

		path(node) {
			node.append("path")
				.attr("d", (d) => {
					if (d.id.split("_")[0] == "intermediate") {
						return "m" + 0 + " " + 0
                            + "h " + this.nodeWidth
                            + "v " + (1) * d.height
                            + "h " + (-1) * this.nodeWidth;
					}
				})
				.style("fill", (d) => {
					if (d.id.split("_")[0] == "intermediate") {
						return "grey";
					}
				})
				.style("fill-opacity", (d) => {
					if (d.id.split("_")[0] == "intermediate") {
						return 0.0;
					}
					else {
						return 0;
					}
				})
				.style("stroke", function (d) {
					if (d.id.split("_")[0] == "intermediate") {
						return "grey";
					}
				})
				.style("stroke-opacity", "0.0");

			this.nodes.selectAll("path")
				.data(this.graph.nodes)
				.transition()
				.duration(this.transitionDuration)
				.delay(this.transitionDuration / 3)
				.style("fill-opacity", (d) => {
					return 1.0;
				});
		},

		textSize(text) {
			const container = d3.select("#" + this.$parent.id).append("svg");
			container.append("text")
				.attrs({
					x: -99999,
					y: -99999
				})
				.text((d) => text);
			const size = container.node().getBBox();
			container.remove();
			return {
				width: size.width,
				height: size.height
			};
		},

		trunc(str, n) {
			return (str.length > n) ? str.substr(0, n - 1) + "..." : str;
		},

		text(node) {
			node.append("text")
				.attr("dy", "0.35em")
				.attr("transform", "rotate(90)")
				.attr("x", "5")
				.attr("y", "-10")
				.style("opacity", 1)
				.text((d) => {
					return "";
				})
				.on("mouseover", function (d) {
					// if (d.name[0] != 'intermediate') {
					//     view.toolTipList.attr('width', '400px')
					//         .attr('height', '150px');
					//     d3.select(this.parentNode).select('rect').style('stroke-width', '2');
					// }
				})
				.on("mouseout", function (d) {
					// view.toolTipList.attr('width', '0px')
					//     .attr('height', '0px');
					// if (d.name[0] != 'intermediate') {
					//     d3.select(this.parentNode).select('rect').style('stroke-width', '1');
					//     //                unFade();
					// }
					// view.toolTip.style('opacity', 1)
					//     .style('left', () => 0)
					//     .style('top', () => 0);
					// view.toolTipText.html('');
					// view.toolTipG.selectAll('*').remove();
				});

			// Transition
			this.nodes.selectAll("text")
				.data(this.graph.nodes)
				.transition()
				.duration(this.transitionDuration)
				.style("opacity", 1)
				.style("fill", d => {
					return this.$store.color.setContrast(this.$store.color.getColor(d));
				})
				.text((d) => {
					if (d.id.split("_")[0] != "intermediate") {
						if (d.height < this.minHeightForText) {
							return "";
						}
						var textSize = this.textSize(d.id)["width"];
						if (textSize < d.height) {
							return d.id;
						} else {
							return this.trunc(d.id, this.textTruncForNode);
						}
					}
					else {
						return "";
					}
				});
		},

		clear() {
			d3.selectAll(".node").remove();
			this.$refs.ToolTip.clear();
		},

		dragmove(d) {
			d3.select(`node_${d.mod_index[0]}`).attr("transform",
				"translate(" + (
					d.x = Math.max(0, Math.min(this.$parent.width - d.dx, d3.event.x))
				) + "," + (
					d.y = Math.max(0, Math.min(this.$parent.height - d.dy, d3.event.y))
				) + ")");
			// sankey.relayout();
			// link.attr("d", path);
		}

	}
};