/** *****************************************************************************
 * Copyright (c) 2017, Lawrence Livermore National Security, LLC.
 * Produced at the Lawrence Livermore National Laboratory.
 *
 * Written by Suraj Kesavan <spkesavan@ucdavis.edu>.
 *
 * LLNL-CODE-740862. All rights reserved.
 *
 * This file is part of CallFlow. For details, see:
 * https://github.com/LLNL/CallFlow
 * Please also read the LICENSE file for the MIT License notice.
 ***************************************************************************** */


import tpl from '../../html/supergraph/index.html'
import preprocess from './preprocess'
import Sankey from './sankey'
import Nodes from './nodes'
import IntermediateNodes from './intermediateNodes'
import MiniHistograms from './miniHistograms'
import Edges from './edges'
// import CallbackEdges from './callgraph/callbackEdges'
import ColorMap from './colormap'
import * as d3 from 'd3'

export default {
	name: 'SuperGraph',
	template: tpl,
	components: {
		Nodes,
		IntermediateNodes,
		Edges,
		MiniHistograms,
		ColorMap,
		// CallbackEdges,
	},
	props: [],
	data: () => ({
		id: 'supergraph-overview',
		dashboardID: 'supergraph-dashboard',
		nodeWidth: 50,
		levelSpacing: 40,
		ySpacing: 50,
		nodeScale: 1.0,
		margin: {
			top: 30,
			right: 30,
			bottom: 10,
			left: 10
		},
		width: null,
		height: null,
		treeHeight: null,
		data: null,
		graph: null,
	}),

	watch: {},

	mounted() {
	},

	methods: {
		init(data) {
			this.toolbarHeight = document.getElementById('toolbar').clientHeight
			this.footerHeight = document.getElementById('footer').clientHeight
			this.width = window.innerWidth * 0.7 - this.margin.left - this.margin.right
			this.height = window.innerHeight - this.margin.top - this.margin.bottom - this.toolbarHeight - this.footerHeight

			this.zoom = d3.zoom()
				.scaleExtent([0.5, 2])
				.on('zoom', () => {
					let tx = Math.min(0, Math.min(d3.event.transform.x, this.width * d3.event.transform.k))
					let ty = Math.min(0, Math.min(d3.event.transform.y, this.height * d3.event.transform.k))
					this.sankeySVG.attr("transform", "translate(" + [tx, ty] + ")scale(" + d3.event.transform.k + ")")
				});

			this.sankeySVG = d3.select('#' + this.id)
				.attrs({
					'width': this.width + this.margin.left + this.margin.right,
					"height": this.height + this.margin.top + this.margin.bottom,
					"top": this.toolbarHeight
				})
				// .call(this.zoom)

			this.data = data
			this.clear()
			this.render()
		},

		clear() {
			this.$refs.Nodes.clear()
			this.$refs.Edges.clear()
			// this.$refs.CallbackEdges.clear()
			this.$refs.MiniHistograms.clear()
			this.$refs.ColorMap.clear(0)
		},

		render() {
			this.graph = preprocess(this.data, false)
			console.log("Preprocessing done.")
			this.d3sankey = this.initSankey(this.graph)
			console.log("Layout Calculation.")
			// this.postProcess(this.data.nodes, this.data.links)
			console.log("Post-processing done.")

			this.$refs.Nodes.init(this.graph, this.view)
			// this.$refs.IntermediateNodes.init(this.data)
			this.$refs.Edges.init(this.graph, this.view)
			// this.$refs.CallbackEdges.init(this.data, this.view)
			this.$refs.MiniHistograms.init(this.graph, this.view)
			this.$refs.ColorMap.init()

		},

		updateMiniHistogram() {
			this.$refs.MiniHistograms.clear()
			this.$refs.MiniHistograms.init(this.graph, this.view)
		},

		updateColorMap(){
			this.$refs.ColorMap.clear()
			// this.$refs.ColorMap.init()
		},

		//Sankey computation
		initSankey() {
			let sankey = Sankey()
				.nodeWidth(this.nodeWidth)
				.nodePadding(this.ySpacing)
				.size([this.width * 1.05, this.height - this.ySpacing])
				.levelSpacing(this.levelSpacing)
				.maxLevel(this.graph.maxLevel)
				//    .setReferenceValue(this.data.rootRunTimeInc)
				.setMinNodeScale(this.nodeScale);

			let path = sankey.link()

			sankey.nodes(this.graph.nodes)
				.links(this.graph.links)
				.layout(32)
			return sankey
		},

		dragMove() {
			d3.select(this).attr("transform",
				"translate(" + (
					d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))) + "," + (
					d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
			sankey.relayout();
			link.attr("d", path);
		},

		// Add intermediate nodes.
		postProcess(nodes, edges) {
			const temp_nodes = nodes.slice();
			const temp_edges = edges.slice();

			this.computeNodeEdges(temp_nodes, temp_edges);
			console.log("Compute node edges (Post process)")
			this.computeNodeBreadths(temp_nodes, temp_edges)
			console.log("Compute node breadths (Post process)")

			for (let i = 0; i < temp_edges.length; i++) {
				const source = temp_edges[i].sourceID;
				const target = temp_edges[i].targetID;

				if (source != undefined && target != undefined) {
					const source_x = nodes[source].level;
					const target_x = nodes[target].level;
					const dx = target_x - source_x;

					// Put in intermediate nodes.
					for (let j = dx; j > 1; j--) {
						const intermediate = nodes.length;
						const tempNode = {
							sankeyID: intermediate,
							name: 'intermediate',
							weight: nodes[i].weight,
							height: nodes[i].value
						};
						nodes.push(tempNode);
						edges.push({
							source: intermediate,
							target: (j == dx ? target : intermediate - 1),
							value: edges[i].value,
						});
						if (j == dx) {
							edges[i].original_target = target;
							edges[i].last_leg_source = intermediate;
						}
					}
				}
			}
		},

		computeNodeEdges(nodes, edges) {
			nodes.forEach((node) => {
				node.sourceLinks = [];
				node.targetLinks = [];
			});
			edges.forEach((edge) => {
				let source = edge.sourceID,
					target = edge.targetID;

				if (source != undefined && target != undefined) {
					nodes[source].sourceLinks.push(edge);
					nodes[target].targetLinks.push(edge);
				}
			});

			return {
				nodes,
				edges,
			};
		},

		computeNodeBreadths(nodes, edges) {
			let remainingNodes = nodes.map((d) => d);
			let nextNodes;
			let level = 0;
			while (remainingNodes.length) {
				nextNodes = [];
				remainingNodes.forEach((node) => {
					node.level = level;
					node.sourceLinks.forEach((link) => {
						if (nextNodes.indexOf(link.target) < 0) {
							nextNodes.push(link.target);
						}
					});
				});
				remainingNodes = nextNodes
				++level
			}
		},
	}
}