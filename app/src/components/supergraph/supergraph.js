import tpl from "../../html/supergraph.html";
import preprocess from "./preprocess";
import Sankey from "./sankey";
import Nodes from "./nodes";
import IntermediateNodes from "./intermediateNodes";
import MiniHistograms from "./miniHistograms";
import Edges from "./edges";
import ColorMap from "./colormap";
import * as d3 from "d3";

export default {
	name: "SuperGraph",
	template: tpl,
	components: {
		Nodes,
		IntermediateNodes,
		Edges,
		MiniHistograms,
		ColorMap,
	},
	props: [],
	data: () => ({
		id: "supergraph-overview",
		dashboardID: "supergraph-dashboard",
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

	sockets: {
		single_supergraph(data) {
			data = JSON.parse(data);
			console.log("Data :", data);
			let nodes = [];
			for (let i = 0; i < data.nodes.length; i += 1) {
				console.log("Node name: ", data.nodes[i].id);
				console.log("Time (inc): ", data.nodes[i]["time (inc)"]);
				console.log("Time: ", data.nodes[i]["time"]);
			}

			for (let i = 0; i < data.links.length; i += 1) {
				console.log("Source: ", data.links[i].source);
				console.log("Target: ", data.links[i].target);
				console.log("Weight: ", data.links[i].weight);
			}
			this.render(data);
		}
	},

	methods: {
		init() {
			this.width = 5 * this.$store.viewWidth;
			this.height = 2 * this.$store.viewHeight;

			this.sankeyWidth = 0.7 * this.$store.viewWidth;
			this.sankeyHeight = 0.9 * this.$store.viewHeight - this.margin.top - this.margin.bottom;

			this.sankeySVG = d3.select("#" + this.id)
				.attrs({
					"width": this.width,
					"height": this.height,
					"top": this.toolbarHeight
				});

			this.$socket.emit("single_supergraph", {
				dataset: this.$store.selectedTargetDataset,
				groupBy: "module"
			});

			let inner = this.sankeySVG.select("#container");

			var zoom = d3.zoom().on("zoom", function () {
				inner.attrs({
					"transform": d3.event.transform,
					"scale": d3.event.scale
				});
			});
			this.sankeySVG.call(zoom);
		},

		processJSON(data) {
			let json = JSON.parse(data);
			let d = json.data;
			let index = json.index;
			let columns = json.columns;

			let columnMap = {};
			let idx = 0;
			for (let column of columns) {
				columnMap[column] = idx;
				idx += 1;
			}
			return {
				d: d,
				index: index,
				columns: columns,
				columnMap: columnMap
			};
		},

		processCallsite(data) {
			let callsites = {};
			for (let i = 0; i < data.index.length; i += 1) {
				let callsite = {};
				let callsite_name = data.d[i][data.columnMap["name"]];
				for (let column of data.columns) {
					callsite[column] = data.d[i][data.columnMap[column]];
				}
				callsites[callsite_name] = callsite;
			}
			return callsites;
		},

		processModule(data) {
			let modules = {};
			for (let i = 0; i < data.index.length; i += 1) {
				let module_dict = {};
				let module_name = data.d[i][data.columnMap["module"]];
				for (let column of data.columns) {
					module_dict[column] = data.d[i][data.columnMap[column]];
				}
				modules[module_name] = module_dict;
			}
			return modules;
		},

		clear() {
			this.$refs.Nodes.clear();
			this.$refs.Edges.clear();
			this.$refs.MiniHistograms.clear();
			this.$refs.ColorMap.clear(0);
		},

		render(data) {
			this.graph = preprocess(data, false);
			console.log("[Single SuperGraph] Preprocessing done.");
			this.initSankey(this.graph);
			console.log("[Single SuperGraph] Layout Calculation.");

			let postProcess = this.postProcess(this.graph.nodes, this.graph.links);
			this.graph.nodes = postProcess["nodes"];
			this.graph.links = postProcess["links"];
			this.initSankey(this.graph);

			console.log("[Single SuperGraph] Post-processing done.");

			this.$store.graph = this.graph;
			this.$refs.Nodes.init(this.graph, this.view);
			this.$refs.Edges.init(this.graph, this.view);
			this.$refs.MiniHistograms.init(this.graph, this.view);
			this.$refs.ColorMap.init();

			if (this.debug) {
				for (let i = 0; i < this.graph["links"].length; i += 1) {
					let link = this.graph["links"][i];
					let source_callsite = link["attr_dict"]["source_callsite"];
					let target_callsite = link["attr_dict"]["target_callsite"];
					let weight = link["weight"];
					let exc_weight = link["exc_weight"];
					let source_inclusive = link["source_data"]["512-cores"]["time (inc)"];
					let source_exclusive = link["source_data"]["512-cores"]["time"];
					let target_inclusive = link["target_data"]["512-cores"]["time (inc)"];
					let target_exclusive = link["target_data"]["512-cores"]["time"];

					console.log("[Single SuperGraph] Source Name :", source_callsite);
					console.log("[Single SuperGraph] Target Name :", target_callsite);
					console.log("[Single SuperGraph] Weight: ", weight);
					console.log("[Single SuperGraph] Exc weight: ", exc_weight);
					console.log("[Single SuperGraph] Source Inclusive: ", source_inclusive);
					console.log("[Single SuperGraph] Source Exclusive: ", source_exclusive);
					console.log("[Single SuperGraph] Target Inclusive: ", target_inclusive);
					console.log("[Single SuperGraph] Target Exclusive: ", target_exclusive);
				}
			}
		},

		updateMiniHistogram() {
			this.$refs.MiniHistograms.clear();
			this.$refs.MiniHistograms.init(this.graph, this.view);
		},

		updateColorMap() {
			this.$refs.ColorMap.clear();
			this.$refs.ColorMap.init();
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
			this.size = [this.width * 1.05, this.height - this.ySpacing];
			this.sankey = Sankey()
				.nodeWidth(this.nodeWidth)
				.nodePadding(this.ySpacing)
				.size(this.size)
				.levelSpacing(this.levelSpacing)
				.maxLevel(this.graph.maxLevel)
				.dataset(this.$store.selectedTargetDataset)
				.setMinNodeScale(this.nodeScale);

			let path = this.sankey.link();

			this.sankey.nodes(this.graph.nodes)
				.links(this.graph.links)
				.layout(32);
		},

		// dragMove() {
		// 	d3.select(this).attr("transform",
		// 		"translate(" + (
		// 			d.x = Math.max(0, Math.min(this.width - d.dx, d3.event.x))) + "," + (
		// 			d.y = Math.max(0, Math.min(this.height - d.dy, d3.event.y))) + ")");
		// 	sankey.relayout();
		// 	link.attr("d", path);
		// },

		// Add intermediate nodes.
		postProcess(nodes, edges) {
			console.log("===================Adding intermediate nodes==================");
			const temp_nodes = nodes.slice();
			const temp_edges = edges.slice();

			let removeActualEdges = [];

			for (let i = 0; i < temp_edges.length; i++) {
				const source = temp_edges[i].source;
				const target = temp_edges[i].target;

				if (this.debug) {
					console.log("==============================");
					console.log("[Single SuperGraph] Source Name", source);
					console.log("[Single SuperGraph] Target Name", target);
					console.log("[Single SuperGraph] This edge: ", temp_edges[i]);

				}

				let source_node = temp_edges[i].source_data;
				let target_node = temp_edges[i].target_data;

				if (this.debug) {
					console.log("[Single SuperGraph] Source Node", source_node, target_node.level);
					console.log("[Single SuperGraph] Target Node", target_node, target_node.level);
				}

				const source_level = source_node.level;
				const target_level = target_node.level;
				const shift_level = target_level - source_level;

				if (this.debug) {
					console.log(source_level, target_level);
					console.log("[Single SuperGraph] Number of levels to shift: ", shift_level);
				}

				let dataset = this.$store.selectedTargetDataset;
				// Put in intermediate nodes.
				for (let j = shift_level; j > 1; j--) {
					const intermediate_idx = nodes.length;
					const tempNode = {
						"attr_dict": temp_edges[i]["attr_dict"],
						id: "intermediate_" + target_node.id,
						level: j - 1,
						height: temp_edges[i].height,
						name: target_node.id,
					};
					tempNode[dataset] = target_node[this.$store.selectedTargetDataset];

					if (this.debug) {
						console.log("[Single SuperGraph] Adding intermediate node: ", tempNode);
					}
					nodes.push(tempNode);
					const sourceTempEdge = {
						source: source_node.id,
						target: tempNode.id,
						weight: temp_edges[i].weight,
					};
					if (this.debug) {
						console.log("[Single SuperGraph] Adding intermediate source edge: ", sourceTempEdge);
					}
					edges.push(sourceTempEdge);

					if (j == shift_level) {
						edges[i].original_target = target;
					}
					edges[i].target_data = nodes[intermediate_idx];
					if (this.debug) {
						console.log("[Single SuperGraph] Updating this edge:", edges[i]);
					}

					const targetTempEdge = {
						source: tempNode.id,
						target: target_node.id,
						weight: temp_edges[i].weight
					};
					edges.push(targetTempEdge);
					if (this.debug) {
						console.log("[Single SuperGraph] Adding intermediate target edge: ", targetTempEdge);
					}

					if (j == shift_level) {
						edges[i].original_target = target;
					}
					edges[i].target_data = nodes[intermediate_idx];
					if (this.debug) {
						console.log("[Single SuperGraph] Updating this edge:", edges[i]);
					}

					removeActualEdges.push({
						source,
						target
					});
				}
			}
			for (let i = 0; i < removeActualEdges.length; i += 1) {
				let removeEdge = removeActualEdges[i];
				if (this.debug) {
					console.log("[Single SuperGraph] Removing", removeActualEdges.length, "actual edge: ", removeEdge);
				}
				for (let edge_idx = 0; edge_idx < edges.length; edge_idx += 1) {
					let curr_edge = edges[edge_idx];
					if (removeEdge.source == curr_edge.source && removeEdge.target == curr_edge.target) {
						edges.splice(edge_idx, 1);
					}
				}
			}

			return {
				nodes: nodes,
				links: edges
			};
		},

	}
};