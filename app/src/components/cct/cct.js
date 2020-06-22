/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import tpl from "../../html/cct/index.html";
import ColorMap from "./colormap";

import * as d3 from "d3";
import dagreD3 from "dagre-d3/dist/dagre-d3";

export default {
	name: "SingleCCT",
	template: tpl,
	components: {
		ColorMap
	},

	data: () => ({
		graph: null,
		id: "single-cct-overview",
		sankey: {
			nodeWidth: 50,
			xSpacing: 0,
			ySpacing: 50,
			nodeScale: 1.0,
		},
		margin: {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0
		},
		view: {
			color: null,
		},
		width: null,
		height: null,
		treeHeight: null,
		color: null,
		firstRender: true,
	}),

	sockets: {
		single_cct(data) {
			console.log("CCT data: ", data);
			this.data = data;
			this.render();
		},
	},

	mounted() {
	},

	methods: {
		init() {
			this.$socket.emit("single_cct", {
				dataset: this.$store.selectedTargetDataset,
				functionsInCCT: this.$store.selectedFunctionsInCCT,
				selectedMetric: this.$store.selectedMetric,
			});
		},


		render() {
			this.width = this.$store.viewWidth - this.margin.left - this.margin.right;
			this.height = this.$store.viewHeight - this.margin.bottom - this.margin.top;

			this.svg = d3.select("#" + this.id)
				.attrs({
					"width": this.width,
					"height": this.height,
				});

			this.g = new dagreD3.graphlib.Graph().setGraph({});

			let graph = this.data;
			let nodes = graph.nodes;
			let links = graph.links;

			nodes.forEach((node, i) => {
				this.g.setNode(node["id"], {
					label: node["module"] + ":" + node["id"],
					"time": node["time"],
					"time (inc)": node["time (inc)"],
					module: node["module"],
					imbalance_perc: node["imbalance_perc"],
				});
			});

			// Set up the edges
			for (let i = 0; i < links.length; i += 1) {
				let edge_label = "";
				if (links[i]["count"] != 1) {
					edge_label = "" + links[i]["count"];
				}
				else {
					edge_label = "";
				}
				this.g.setEdge(links[i]["source"], links[i]["target"], {
					label: edge_label
				});

			}

			let self = this;
			// Set some general styles
			this.g.nodes().forEach(function (v) {
				let node = self.g.node(v);
				if (node != undefined) {
					let color = self.$store.color.getColor(node);
					node.style = "fill:" + color;
					node.rx = node.ry = 4;
					node.id = "cct-node";
				}
			});

			this.g.edges().forEach((e) => {
				var edge = self.g.edge(e);
				edge.id = "cct-edge";
				// g.edge(e).style = "stroke: 1.5px "
			});

			let inner = this.svg.select("#container");

			// Set up zoom support
			var zoom = d3.zoom().on("zoom", function () {
				inner.attr("transform", d3.event.transform);
			});
			this.svg.call(zoom);

			// Create the renderer
			var render = new dagreD3.render();

			// Run the renderer. This is what draws the final graph.
			render(inner, this.g);

			// Center the graph
			var initialScale = 1;
			this.svg.call(zoom.transform, d3.zoomIdentity.translate((this.svg.attr("width") - this.g.graph().width * initialScale) / 2, 20).scale(initialScale));

			this.$refs.ColorMap.init();
		},


		clear() {
			d3.selectAll("#cct-node").remove();
			d3.selectAll("#cct-edge").remove();
			this.$refs.ColorMap.clear();
		},
	}
};