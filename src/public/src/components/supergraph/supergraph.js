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
import { max, min, sum } from "d3-array";
import { scalePow } from 'd3-scale';


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
			this.sankey = this.initSankey(this.graph)
			// console.log(this.sankey.nodes())
			console.log("Layout Calculation.")
			// this.graph.nodes = this.sankey.getNodes()
			// this.graph.links = this.sankey.getLinks()
			// console.log(this.sankey.getNodes())


			let postProcess = this.postProcess(this.graph.nodes, this.graph.links)
			this.graph.nodes = postProcess['nodes']
			this.graph.links = postProcess['links']

			// console.log(this.graph.nodes, this.graph.links)
			// this.graph = preprocess(this.graph, false)
			this.initSankey(this.graph)

			console.log("Post-processing done.")

			this.$refs.Nodes.init(this.graph, this.view)
			// this.$refs.IntermediateNodes.init(this.data)
			this.$refs.Edges.init(this.graph, this.view)
			// this.$refs.CallbackEdges.init(this.data, this.view)
			this.$refs.MiniHistograms.init(this.graph, this.view)
			this.$refs.ColorMap.init()

			if(this.debug){
				for (let i = 0; i < this.graph['links'].length; i += 1) {
					let link = this.graph['links'][i]
					let source_callsite = link['attr_dict']['source_callsite']
					let target_callsite = link['attr_dict']['target_callsite']
					let weight = link['weight']
					let exc_weight = link['exc_weight']
					let source_inclusive = link['source_data']['512-cores']['time (inc)']
					let source_exclusive = link['source_data']['512-cores']['time']
					let target_inclusive = link['target_data']['512-cores']['time (inc)']
					let target_exclusive = link['target_data']['512-cores']['time']

					console.log("Source Name :", source_callsite)
					console.log("Target Name :", target_callsite)
					console.log("Weight: ", weight)
					console.log("Exc weight: ", exc_weight)
					console.log("Source Inclusive: ", source_inclusive)
					console.log("Source Exclusive: ", source_exclusive)
					console.log("Target Inclusive: ", target_inclusive)
					console.log("Target Exclusive: ", target_exclusive)
				}
			}
		},

		updateMiniHistogram() {
			this.$refs.MiniHistograms.clear()
			this.$refs.MiniHistograms.init(this.graph, this.view)
		},

		updateColorMap() {
			this.$refs.ColorMap.clear()
			this.$refs.ColorMap.init()
		},

		resetStat() {
			this.maxInc = 0;
			this.minInc = Number.MAX_SAFE_INTEGER;
			this.maxExc = 0;
			this.minExc = Number.MAX_SAFE_INTEGER;
		},

		calcStat(incTime, excTime) {
			this.maxInc = Math.max(this.maxInc, incTime);
			this.minInc = Math.min(this.minInc, incTime);

			this.maxExc = Math.max(this.maxExc, excTime);
			this.minExc = Math.min(this.minExc, excTime);
		},

		//Sankey computation
		initSankey() {
			this.size = [this.width * 1.05, this.height - this.ySpacing]
			this.sankey = Sankey()
				.nodeWidth(this.nodeWidth)
				.nodePadding(this.ySpacing)
				.size(this.size)
				.levelSpacing(this.levelSpacing)
				.maxLevel(this.graph.maxLevel)
				.setMinNodeScale(this.nodeScale);

			let path = this.sankey.link()

			return this.sankey.nodes(this.graph.nodes)
				.links(this.graph.links)
				.layout(32)
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
			console.log("===================Adding intermediate nodes==================")
			const temp_nodes = nodes.slice();
			const temp_edges = edges.slice();

			for (let i = 0; i < temp_edges.length; i++) {
				const source = temp_edges[i].source;
				const target = temp_edges[i].target;

				if(this.debug){
					console.log("==============================")
					console.log("Source Name", source)
					console.log("Target Name", target)
					console.log("This edge: ", temp_edges[i])

				}

				let source_node = temp_edges[i].source_data
				let target_node = temp_edges[i].target_data

				if(this.debug){
					console.log("Source Node", source_node, target_node.level)
					console.log("Target Node", target_node, target_node.level)
				}

				const source_level = source_node.level;
				const target_level = target_node.level;
				const shift_level = target_level - source_level;

				if(this.debug){
					console.log(source_level, target_level)
					console.log("Number of levels to shift: ",shift_level)
				}

				// Put in intermediate nodes.
				for (let j = shift_level; j > 1; j--) {
					const intermediate_idx = nodes.length;
					const tempNode = {
						'512-cores': target_node['512-cores'],
						'attr_dict': temp_edges[i]['attr_dict'],
						id: 'intermediate_' + target_node.id,
						level: j - 1,
						height: temp_edges[i].height,
						name: target_node.id,
						// weight: nodes[i].weight,
						// x: this.widthScale(source_level) + this.widthScale(j - 1),
						// y: temp_edges[i].sy + 50,
					};
					if(this.debug){
						console.log("Adding intermediate node: ", tempNode);
					}
					nodes.push(tempNode);
					const sourceTempEdge = {
						source: source_node.id,
						target: tempNode.id,
						weight: temp_edges[i].weight,
					}
					if(this.debug){
						console.log("Adding intermediate source edge: ", sourceTempEdge);
					}
					edges.push(sourceTempEdge)

					if (j == shift_level) {
						edges[i].original_target = target
					}
					edges[i].target_data = nodes[intermediate_idx]
					if(this.debug){
						console.log("Updating this edge:", edges[i])
					}

					const targetTempEdge = {
						source: tempNode.id,
						target: target_node.id,
						weight: temp_edges[i].weight
					}
					edges.push(targetTempEdge)
					if(this.debug){
						console.log("Adding intermediate target edge: ", targetTempEdge);
					}

					if (j == shift_level) {
						edges[i].original_target = target;
					}
					edges[i].target_data = nodes[intermediate_idx]
					if(this.debug){
						console.log("Updating this edge:", edges[i])
					}
				}
			}

			return {
				nodes: nodes,
				links: edges
			}
		},

	}
}