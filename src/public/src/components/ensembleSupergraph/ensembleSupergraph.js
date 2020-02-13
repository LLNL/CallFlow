import tpl from '../../html/ensembleSupergraph/index.html'
import Sankey from './sankey'
import DistNodes from './nodes'
// import IntermediateNodes from './callgraph/intermediateNodes'
import MiniHistograms from './miniHistograms'
import DistEdges from './edges'
import Dataset from './dataset.js'
import * as  d3 from 'd3'
import EventHandler from '../EventHandler.js'
import DistColorMap from './colormap'

export default {
	name: 'Distgraph',
	template: tpl,
	components: {
		DistNodes,
		// IntermediateNodes,
		DistEdges,
		MiniHistograms,
		Dataset,
		DistColorMap
	},
	props: [

	],
	data: () => ({
		graph: null,
		id: 'distgraph-overview',
		dashboardID: 'distgraph-dashboard',
		nodeWidth: 50,
		nodeScale: 1.0,
		ySpacing: 50,
		levelSpacing: 40,
		margin: {
			top: 30, right: 30, bottom: 10, left: 10
		},
		width: null,
		height: null,
		treeHeight: null,
		data: null,
		message: "Summary Graph View",
	}),

	watch: {

	},

	mounted() {
		this.id = 'distgraph-overview-'
		let self = this
		EventHandler.$on('clear_summary_view', function () {
			console.log("Clearing Summary view")
			self.clear()
		})
	},

	sockets: {
	},

	methods: {
		init(data) {
			this.toolbarHeight = document.getElementById('toolbar').clientHeight
			this.footerHeight = document.getElementById('footer').clientHeight
			// this.projectionViewWidth = document.getElementById('similarity-matrix-view').clientWidth
			this.auxiliaryViewWidth = document.getElementById('auxiliary-function-overview').clientWidth

			// this.width = window.innerWidth - this.projectionViewWidth - this.auxiliaryViewWidth - this.margin.left - this.margin.right
			this.width = window.innerWidth - this.auxiliaryViewWidth - this.margin.left - this.margin.right
			this.height = window.innerHeight - this.margin.top - this.margin.bottom - this.toolbarHeight - this.footerHeight

			this.sankeySVG = d3.select('#' + this.id)
				.attrs({
					'width': this.width + this.margin.left + this.margin.right,
					"height": this.height + this.margin.top + this.margin.bottom,
					"top": this.toolbarHeight
				})

			this.data = data
			this.render(data)
		},


		clear() {
			// this.$refs.Dataset.clear()
			this.$refs.DistNodes.clear()
			this.$refs.DistEdges.clear()
			// this.$refs.CallbackEdges.clear()
			this.$refs.MiniHistograms.clear()
			this.$refs.DistColorMap.clear()
			this.$refs.DistColorMap.clearMetric()
		},

		render(data) {
			this.graph = this.preprocess(this.data, false)

			console.log("Preprocessing done.")
			this.d3sankey = this.initSankey(this.graph)
			console.log("Layout Calculation.")
			// this.postProcess(this.data.nodes, this.data.links)
			console.log("Post-processing done.")
			// this.graph = this.filterNodes(this.graph)
			this.$store.graph = this.graph
			this.$store.graph.graph.total_out = this.d3sankey.total_out
			this.$store.graph.graph.total_in = this.d3sankey.total_in
			this.$refs.DistNodes.init(this.$store.graph, this.view)
			// this.$refs.IntermediateNodes.init(this.data)
			this.$refs.DistEdges.init(this.$store.graph, this.view)
			this.$refs.DistColorMap.init()
			// this.$refs.CallbackEdges.init(this.data, this.view)
			this.$refs.MiniHistograms.init(this.$store.graph, this.view)
		},

		updateMiniHistogram() {
			this.$refs.MiniHistograms.clear()
			this.$refs.MiniHistograms.init(this.graph, this.view)
		},

		// Preprocessing the graph.
		preprocess(graph, refresh) {
			graph = this.filterShowNodes(graph)
			// graph = this.findMaxGraph(graph)
			// graph = this.addLines(graph)
			graph = this.addNodeMap(graph)
			graph = this.addLinkID(graph)
			graph = this.calculateFlow(graph)
			console.log("Graph after preprocessing: ", graph)
			return graph;
		},

		filterShowNodes(graph) {
			let node_names = []
			let nodes = []
			for (const node of graph.nodes) {
				nodes.push(node)
				node_names.push(node.name)
			}
			graph.nodes = nodes

			return graph
		},

		addNodeMap(graph) {
			let nodeMap = {}
			let idx = 0
			for (const node of graph.nodes) {
				nodeMap[node.name] = idx
				idx += 1
			}

			graph.nodeMap = nodeMap
			return graph
		},

		constructModules(graph) {
			for (const mod of graph.modules) {
				let module_group_paths = mod['group_path']
				if (module_group_paths.length > 1) {

				}
				else if (module_group_paths == 1) {

				}
				for (let i = 0; i < module_group_paths.length - 1; i += 1) {
					// if(this.isModuleEdge())
				}
			}
		},

		containsNode(node, list) {
			var i;
			for (i = 0; i < list.length; i++) {
				if (list[i] === node) {
					return true;
				}
			}
			return false;
		},

		findMaxGraph(graph) {
			let datasets = this.$store.actual_dataset_names
			for (const node of graph.nodes) {
				let obj = {
					'name': '',
					'time': 0,
					'time (inc)': 0,
				}
				for (const dataset of datasets) {
					if (node.hasOwnProperty(dataset)) {
						if (node[dataset]['time'] > obj['time']) {
							obj['time'] = node[dataset]['time']
						}
						if (node[dataset]['time (inc)'] > obj['time (inc)']) {
							obj['time (inc)'] = node[dataset]['time (inc)']
						}
						obj['id'] = node[dataset]['id']
					}
				}
				for (const [key, value] of Object.entries(obj)) {
					node[key] = value
				}
			}
			return graph
		},

		/* Link: {
		   sourceID : int, targetID: int , target: str, source: str
		   } */
		addLinkID(graph) {
			const nodeMap = {};
			for (const [idx, node] of graph.nodes.entries()) {
				nodeMap[node.id] = idx;
			}

			for (const link of graph.links) {
				link['sourceID'] = nodeMap[link.source];
				link['targetID'] = nodeMap[link.target];
			}

			return graph;
		},

		calculateFlow(graph) {
			const nodes = graph.nodes;
			const links = graph.links;
			console.log(nodes, links)

			const outGoing = {};
			const inComing = {};
			nodes.forEach((node) => {
				const nodeLabel = node.vis_name;

				links.forEach((link) => {
					if (nodes[link.sourceID] != undefined) {
						const linkLabel = nodes[link.sourceID].vis_name;
						if (outGoing[linkLabel] == undefined) {
							outGoing[linkLabel] = 0;
						}
						if (linkLabel == nodeLabel) {
							if (outGoing[linkLabel] != 0) {
								outGoing[linkLabel] = Math.max(link.weight, outGoing[linkLabel])
							}
							else {
								outGoing[linkLabel] += link.weight;
							}
						}
					}
				});

				links.forEach((link) => {
					if (nodes[link.targetID] != undefined) {
						const linkLabel = nodes[link.targetID].vis_name;
						if (inComing[linkLabel] == undefined) {
							inComing[linkLabel] = 0;
						}
						if (linkLabel == nodeLabel) {
							if (inComing[linkLabel] != 0) {
								inComing[linkLabel] = Math.max(link.weight, inComing[linkLabel])
							}
							else {
								inComing[linkLabel] += link.weight;
							}
						}
					}
				});

				if (outGoing[nodeLabel] == undefined) {
					outGoing[nodeLabel] = 0;
				}

				if (inComing[nodeLabel] == undefined) {
					inComing[nodeLabel] = 0;
				}

				node.out = outGoing[nodeLabel];
				node.in = inComing[nodeLabel];

				node.inclusive = Math.max(inComing[nodeLabel], outGoing[nodeLabel]);
				node.exclusive = Math.max(inComing[nodeLabel], outGoing[nodeLabel]) - outGoing[nodeLabel];
			});

			return graph;
		},

		addLines(graph) {
			let datasets = this.$store.actual_dataset_names
			let count = 0
			for (const node of graph.nodes) {
				let obj = {}
				for (const dataset of datasets) {
					if (node.hasOwnProperty(dataset)) {
						obj[dataset] = node[dataset]['time (inc)'] / node['time (inc)']
						obj['id'] = node[dataset]['id']
					}
				}
				obj['ensemble'] = node['ensemble']['time (inc)'] / node['time (inc)']
				node['props'] = obj
				count += 1
			}
			return graph
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
				.datasets(this.$store.actual_dataset_names)
				.setMinNodeScale(this.nodeScale)
				.store(this.$store)

			let path = sankey.link()

			sankey.nodes(this.graph.nodes)
				.links(this.graph.links)
				.layout(32)

			return sankey
		},

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

					// Put in intermediate steps
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
			console.log("Bug here. Correct me.")
			while (remainingNodes.length) {
				nextNodes = [];
				remainingNodes.forEach((node) => {
					node.sourceLinks.forEach((link) => {
						if (nextNodes.indexOf(link.target) < 0) {
							nextNodes.push(link.target);
						}
					});
				});
				remainingNodes = nextNodes;
			}
		},
	}
}
