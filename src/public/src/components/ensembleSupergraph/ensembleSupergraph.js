import tpl from '../../html/ensembleSupergraph/index.html'
import Sankey from './sankey'
import EnsembleNodes from './nodes'
import MiniHistograms from './miniHistograms'
import EnsembleEdges from './edges'
import * as  d3 from 'd3'
import EventHandler from '../EventHandler.js'
import EnsembleColorMap from './colormap'

export default {
	name: 'EnsembleSuperGraph',
	template: tpl,
	components: {
		EnsembleNodes,
		EnsembleEdges,
		MiniHistograms,
		EnsembleColorMap
	},
	props: [

	],
	data: () => ({
		graph: null,
		id: 'ensemble-supergraph-overview',
		dashboardID: 'ensemble-supergraph-dashboard',
		nodeWidth: 50,
		nodeScale: 1.0,
		ySpacing: 50,
		levelSpacing: 50,
		margin: {
			top: 10, right: 10, bottom: 20, left: 10
		},
		width: null,
		height: null,
		treeHeight: null,
		data: null,
		message: "Summary Graph View",
		debug: false
	}),

	mounted() {
		this.id = 'ensemble-supergraph-overview'
		let self = this
		EventHandler.$on('clear_summary_view', function () {
			console.log("Clearing Summary view")
			self.clear()
		})
	},

	sockets: {
		ensemble_supergraph(data) {
			console.log(data)
			data = JSON.parse(data)
			console.log("Data: ", data)
			this.render(data)
		},
	},

	methods: {
		init() {
			this.toolbarHeight = document.getElementById('toolbar').clientHeight
			this.footerHeight = document.getElementById('footer').clientHeight
			this.auxiliaryViewWidth = document.getElementById('auxiliary-function-overview').clientWidth

			this.width = window.innerWidth - 2 * this.auxiliaryViewWidth - this.margin.left - this.margin.right
			this.height = window.innerHeight - this.margin.top - this.margin.bottom - this.toolbarHeight - this.footerHeight

			this.sankeySVG = d3.select('#' + this.id)
				.attrs({
					'width': this.width,
					"height": this.height,
					"top": this.toolbarHeight
				})

			this.$socket.emit('ensemble_supergraph', {
				datasets: this.$store.runNames,
				groupBy: 'module'
			})
		},

		clear() {
			this.$refs.EnsembleNodes.clear()
			this.$refs.EnsembleEdges.clear()
			this.$refs.MiniHistograms.clear()
			this.$refs.EnsembleColorMap.clear()
			this.$refs.EnsembleColorMap.clearMetric()
		},

		render(data) {
			this.graph = this.preprocess(data, false)

			console.log("[Ensemble SuperGraph] Preprocessing done.")
			this.initSankey(this.graph)
			console.log("[Ensemble SuperGraph] Layout Calculation.")

			let postProcess = this.postProcess(this.graph.nodes, this.graph.links)
			this.graph.nodes = postProcess['nodes']
			this.graph.links = postProcess['links']
			this.initSankey(this.graph)
			console.log("[Ensemble SuperGraph] Post-processing done.")

			this.$store.graph = this.graph
			this.$refs.EnsembleColorMap.init()
			this.$refs.EnsembleEdges.init(this.$store.graph, this.view)
			this.$refs.EnsembleNodes.init(this.$store.graph, this.view)
			this.$refs.MiniHistograms.init(this.$store.graph, this.view)

			if (this.debug) {
				for (let i = 0; i < this.graph['links'].length; i += 1) {
					let link = this.graph['links'][i]
					let source_callsite = link['source_data']['id']
					let target_callsite = link['target_data']['id']
					let weight = link['weight']
					let exc_weight = link['exc_weight']
					let source_inclusive = link['source_data']['time (inc)']
					let source_exclusive = link['source_data']['time']
					let target_inclusive = link['target_data']['time (inc)']
					let target_exclusive = link['target_data']['time']

					console.log("=============================================")
					console.log("[Ensemble SuperGraph] Source Name :", source_callsite)
					console.log("[Ensemble SuperGraph] Target Name :", target_callsite)
					console.log("[Ensemble SuperGraph] Weight: ", weight)
					console.log("[Ensemble SuperGraph] Exc weight: ", exc_weight)
					console.log("[Ensemble SuperGraph] Source Inclusive: ", source_inclusive)
					console.log("[Ensemble SuperGraph] Source Exclusive: ", source_exclusive)
					console.log("[Ensemble SuperGraph] Target Inclusive: ", target_inclusive)
					console.log("[Ensemble SuperGraph] Target Exclusive: ", target_exclusive)
				}
			}
		},

		updateMiniHistogram() {
			this.$refs.MiniHistograms.clear()
			this.$refs.MiniHistograms.init(this.graph, this.view)
		},

		// Preprocessing the graph.
		preprocess(graph, refresh) {
			graph = this.addNodeMap(graph)
			graph = this.addLinkID(graph)
			graph = this.calculateFlow(graph)
			console.log("Graph after preprocessing: ", graph)
			return graph;
		},

		addNodeMap(graph) {
			let nodeMap = {}
			let idx = 0
			for (const node of graph.nodes) {
				nodeMap[node.module] = idx
				if (this.debug) {
					console.log("[Preprocess] Assigning", node.id, " with map index: ", idx)
				}
				idx += 1
			}

			graph.nodeMap = nodeMap
			return graph
		},

		/* Link: {
		   sourceID : int, targetID: int , target: str, source: str
		   } */
		addLinkID(graph) {
			let idx = 0
			for (const link of graph.links) {
				if (link.source == undefined || link.target == undefined) {
					continue;
				}

				if (graph.nodeMap[link.source] == undefined) {
					graph.nodeMap[link.source] = idx
					idx += 1
				}

				if (graph.nodeMap[link.target] == undefined) {
					graph.nodeMap[link.target] = idx
					idx += 1
				}
				link['sourceID'] = graph.nodeMap[link.source]
				link['targetID'] = graph.nodeMap[link.target]
			}

			return graph;
		},

		calculateFlow(graph) {
			const nodes = graph.nodes;
			const links = graph.links;
			const outGoing = [];
			const inComing = [];

			let debug = true
			nodes.forEach((node) => {
				const nodeLabel = node.id;
				links.forEach((link) => {
					if (nodes[link.sourceID] != undefined) {
						const linkLabel = nodes[link.sourceID].id;
						if (linkLabel == nodeLabel) {
							if (outGoing[linkLabel] == undefined) {
								outGoing[linkLabel] = 0
							}
							if (outGoing[linkLabel] == 0) {
								outGoing[linkLabel] = link.weight
							}
							else {
								outGoing[linkLabel] += link.weight;
							}
						}
					}
				});

				links.forEach((link) => {
					if (nodes[link.targetID] != undefined) {
						const linkLabel = nodes[link.targetID].id;
						if (linkLabel == nodeLabel) {
							if (inComing[linkLabel] == undefined) {
								inComing[linkLabel] = 0;
							}

							if (inComing[linkLabel] == 0) {
								inComing[linkLabel] = link.weight
							}
							else {
								inComing[linkLabel] += link.weight;
							}
						}
					}
				});

				// Set the outgoing as 0 for nodes with no target nodes.
				if (outGoing[nodeLabel] == undefined) {
					outGoing[nodeLabel] = 0;
				}

				// Set the incoming as 0 for nodes with no source nodes.
				if (inComing[nodeLabel] == undefined) {
					inComing[nodeLabel] = 0;
				}

				node.out = outGoing[nodeLabel];
				node.in = inComing[nodeLabel];

				node.inclusive = Math.max(inComing[nodeLabel], outGoing[nodeLabel]);
				node.exclusive = Math.max(inComing[nodeLabel], outGoing[nodeLabel]) - outGoing[nodeLabel]
			});


			if (this.debug) {
				links.forEach((link) => {
					let sourceLabel = link.source
					let targetLabel = link.target
					console.log("[Preprocess] Outgoing flow: {", sourceLabel, "}:", outGoing[sourceLabel])
					console.log("[Preprocess] Incoming flow {", targetLabel, "}: ", inComing[targetLabel])
				})

			}
			return graph;
		},

		//Sankey computation
		initSankey() {
			this.sankey = Sankey()
				.nodeWidth(this.nodeWidth)
				.nodePadding(this.ySpacing)
				.size([this.width * 1.05, this.height * .9 - this.ySpacing])
				.levelSpacing(this.levelSpacing)
				.maxLevel(this.graph.maxLevel)
				.datasets(this.$store.runNames)
				.setMinNodeScale(this.nodeScale)
				.dataset('ensemble')
				.targetDataset(this.$store.selectedTargetDataset)
				.store(this.$store)

			let path = this.sankey.link()

			this.sankey.nodes(this.graph.nodes)
				.links(this.graph.links)
				.layout(32)
		},

		// Add intermediate nodes.
		postProcess(nodes, edges) {
			console.log("===================Adding intermediate nodes==================")
			const temp_nodes = nodes.slice();
			const temp_edges = edges.slice();

			let removeActualEdges = []

			for (let i = 0; i < temp_edges.length; i++) {
				const source = temp_edges[i].source;
				const target = temp_edges[i].target;

				if (this.debug) {
					console.log("==============================")
					console.log("[Single SuperGraph] Source Name", source)
					console.log("[Single SuperGraph] Target Name", target)
					console.log("[Single SuperGraph] This edge: ", temp_edges[i])

				}

				let source_node = temp_edges[i].source_data
				let target_node = temp_edges[i].target_data

				if (this.debug) {
					console.log("[Single SuperGraph] Source Node", source_node, target_node.level)
					console.log("[Single SuperGraph] Target Node", target_node, target_node.level)
				}

				const source_level = source_node.level;
				const target_level = target_node.level;
				const shift_level = target_level - source_level;

				if (this.debug) {
					console.log(source_level, target_level)
					console.log("[Single SuperGraph] Number of levels to shift: ", shift_level)
				}

				let targetDataset = this.$store.selectedTargetDataset
				// Put in intermediate nodes.
				for (let j = shift_level; j > 1; j--) {
					const intermediate_idx = nodes.length;
					const tempNode = {
						'ensemble': target_node['ensemble'],
						'attr_dict': temp_edges[i]['attr_dict'],
						id: 'intermediate_' + target_node.id,
						level: j - 1,
						height: temp_edges[i].height,
						name: target_node.id,
						module: target_node.module
					};
					tempNode[targetDataset] = target_node[targetDataset]
					if (this.debug) {
						console.log("[Single SuperGraph] Adding intermediate node: ", tempNode);
					}
					nodes.push(tempNode);
					const sourceTempEdge = {
						source: source_node.id,
						target: tempNode.id,
						weight: temp_edges[i].weight,
					}
					if (this.debug) {
						console.log("[Single SuperGraph] Adding intermediate source edge: ", sourceTempEdge);
					}
					edges.push(sourceTempEdge)

					if (j == shift_level) {
						edges[i].original_target = target
					}
					edges[i].target_data = nodes[intermediate_idx]
					if (this.debug) {
						console.log("[Single SuperGraph] Updating this edge:", edges[i])
					}

					const targetTempEdge = {
						source: tempNode.id,
						target: target_node.id,
						weight: temp_edges[i].weight
					}
					edges.push(targetTempEdge)
					if (this.debug) {
						console.log("[Single SuperGraph] Adding intermediate target edge: ", targetTempEdge);
					}

					if (j == shift_level) {
						edges[i].original_target = target;
					}
					edges[i].target_data = nodes[intermediate_idx]
					if (this.debug) {
						console.log("[Single SuperGraph] Updating this edge:", edges[i])
					}

					removeActualEdges.push({
						source,
						target
					})
				}
			}
			for (let i = 0; i < removeActualEdges.length; i += 1) {
				let removeEdge = removeActualEdges[i]
				if (this.debug) {
					console.log("[Single SuperGraph] Removing", removeActualEdges.length, "actual edge: ", removeEdge)
				}
				for (let edge_idx = 0; edge_idx < edges.length; edge_idx += 1) {
					let curr_edge = edges[edge_idx]
					if (removeEdge.source == curr_edge.source && removeEdge.target == curr_edge.target) {
						edges.splice(edge_idx, 1)
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
