/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import tpl from "../../html/moduleHierarchy/index.html";
import * as d3 from "d3";
import ToolTip from "./tooltip";
import * as utils from "../utils";
import Queue from "../../datastructures/queue";

export default {
	name: "ModuleHierarchy",
	template: tpl,
	components: {
		ToolTip
	},
	props: [],
	data: () => ({
		margin: {
			top: 5,
			right: 5,
			bottom: 5,
			left: 5,
		},
		level: [0, 0],
		colorByAttr: "Inclusive",
		direction: ["LR", "TD"],
		selectedDirection: "TD",
		textTruncForNode: 15,
		color: null,
		width: null,
		height: null,
		totalSize: 0,
		b: {
			w: 150, h: 30, s: 3, t: 10
		},
		selectedSplitOption: {
			name: "split-caller",
		},
		splitOptions: [
			{
				"name": "split-caller",
			},
			{
				"name": "split-callee",
			},
			{
				"name": "split-level",
			}],
		placeholder: "Split options",
		maxLevel: 0,
		path_hierarchy: [],
		id: "",
		padding: 0,
		message: "SuperNode Hierarchy",
		offset: 4,
		stroke_width: 4,
		metric: "",
		selectedModule: "",
		svgID: "module-hierarchy-svg",
	}),

	watch: {
		level: {
			handler: function (val, oldVal) {
				this.update_level();
			},
			deep: true
		}
	},

	sockets: {
		module_hierarchy(data) {
			data = JSON.parse(data);
			console.log("Module hierarchy: ", data);
			this.update_from_graph(data);
		},

		level_change(data) {
			this.update_maxlevels(data);
		}
	},

	mounted() {
		this.id = "module-hierarchy-overview";
	},

	methods: {
		init() {
			if (this.$store.selectedMetric == "Inclusive") {
				this.metric = "max_time (inc)";
			}
			else if (this.$store.selectedMetric == "Exclusive") {
				this.metric = "max_time";
			}
			this.selectedModule = this.$store.selectedModule;
			this.$socket.emit("module_hierarchy", {
				module: this.$store.selectedModule,
				datasets: this.$store.selectedDatasets,
			});
		},

		// Formatting for the html view
		formatModule(module) {
			if (module.length < 10) {
				return module;
			}
			return this.trunc(module, 10);
		},

		setupSVG() {

			this.width = document.getElementById(this.id).clientWidth;
			this.height = this.$store.viewHeight * 0.3;
			this.icicleWidth = this.width - this.margin.right - this.margin.left;
			this.icicleHeight = this.height - this.margin.top - this.margin.bottom;

			this.hierarchySVG = d3.select("#" + this.id)
				.append("svg")
				.attrs({
					"id": this.svgID,
					"width": this.icicleWidth + this.margin.right + this.margin.left + 10,
					"height": this.icicleHeight + this.margin.top + this.margin.bottom,
				});

			this.$refs.ToolTip.init(this.svgID);
		},

		update_maxlevels(data) {
			let levels = data["level"];
			for (const [key, value] of Object.entries(levels)) {
				if (this.maxLevel < value) {
					this.maxLevel = value;
					this.level = [0, value];
				}
			}
		},

		// TODO: Need to make level view for the icicle plot.
		update_level() {
			this.clear();
			let ret = [];
			this.minLevel = this.level[0];
			this.maxLevel = this.level[1];

			if (this.minLevel > this.maxLevel) {
				console.log("Cannot generate icicle plot, min_level > max_level");
				return;
			}

			for (let i = 0; i < this.path_hierarchy.length; i += 1) {
				let level = this.path_hierarchy[i][0].length;
				if (level == 1) {
					ret.push(this.path_hierarchy[i]);
				}
				else if (level >= this.minLevel || level < this.maxLevel) {
					ret.push(this.path_hierarchy[i]);
				}
				else {
					console.log("TODO;");
				}
			}
			this.path_hierarchy = ret;

			const json = this.buildHierarchy(this.path_hierarchy);
			this.drawIcicles(json);
		},

		bfs(graph) {
			const vertexQueue = new Queue();

			// Do initial queue setup.
			let startVertex = graph;

			let thismodule = startVertex.id;
			let moduleData = this.$store.modules["ensemble"][thismodule];

			startVertex.data = moduleData;

			vertexQueue.enqueue(startVertex);

			let startVertexData = true;

			let previousVertex = null;

			// Traverse all vertices from the queue.
			while (!vertexQueue.isEmpty()) {
				const currentVertex = vertexQueue.dequeue();

				let callsiteData = {};
				if (!startVertexData) {
					let callsite = currentVertex.id;
					callsiteData = this.$store.callsites["ensemble"][callsite];
				}
				else {
					let module = currentVertex.id;
					callsiteData = this.$store.modules["ensemble"][module];
					startVertexData = false;
				}

				currentVertex.data = callsiteData;
				currentVertex.data.count = vertexQueue.length;

				if (currentVertex.hasOwnProperty("children")) {
					// Add all neighbors to the queue for future traversals.
					currentVertex["children"].forEach((nextVertex) => {
						vertexQueue.enqueue(nextVertex);
					});
				}

				// Memorize current vertex before next loop.
				previousVertex = currentVertex;
			}
			return graph;
		},

		update_from_graph(json) {
			let hierarchy = this.bfs(json);
			this.drawIcicles(hierarchy);
		},

		trunc(str, n) {
			str = str.replace(/<unknown procedure>/g, "proc ");
			return (str.length > n) ? str.substr(0, n - 1) + "..." : str;
		},

		clear() {
			d3.selectAll(".icicleNode").remove();
			d3.selectAll(".icicleText").remove();
			d3.selectAll(".hierarchy-targetLines").remove();
			d3.selectAll(".linear-gradient").remove();
			// this.$refs.ToolTipModuleHierarchy.clear()
		},

		descendents(root) {
			let nodes = [];
			let queue = [];
			queue.push(root);
			nodes.push(root);
			while (queue.length != 0) {
				root = queue.pop();
				if (root.children == undefined) {
					continue;
				}
				root.children.forEach(function (node) {
					nodes.push(node);
					queue.push(node);
				});
			}
			return nodes;
		},

		partition(root) {
			var dx = this.width,
				dy = this.height,
				padding = 0,
				round = false;

			var n = root.height + 1;
			root.x0 = root.y0 = padding;
			root.x1 = dx;
			root.y1 = dy / n;
			root.eachBefore(this.positionNode(dy, n));
			if (round) root.eachBefore(this.roundNode);
			return root;
		},

		positionNode(dy, n) {
			let self = this;
			return function (node) {
				if (node.children) {
					if (self.$store.selectedHierarchyMode == "Exclusive") {
						self.diceByValue(node, node.x0, dy * (node.depth + 1) / n, node.x1, dy * (node.depth + 2) / n);
					}
					else if (self.$store.selectedHierarchyMode == "Uniform") {
						self.dice(node, node.x0, dy * (node.depth + 1) / n, node.x1, dy * (node.depth + 2) / n);
					}
				}
				var x0 = node.x0,
					y0 = node.y0,
					x1 = node.x1 - self.padding,
					y1 = node.y1 - self.padding;
				if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
				if (y1 < y0) y0 = y1 = (y0 + y1) / 2;

				node.x0 = x0;
				node.y0 = y0;
				node.x1 = x1;
				node.y1 = y1;
			};
		},

		roundNode(node) {
			node.x0 = Math.round(node.x0);
			node.y0 = Math.round(node.y0);
			node.x1 = Math.round(node.x1);
			node.y1 = Math.round(node.y1);
			return node;
		},

		dice(parent, x0, y0, x1, y1) {
			var nodes = parent.children,
				node,
				i = -1,
				n = nodes.length;

			let x_offset = 0;
			while (++i < n) {
				node = nodes[i];
				node.y0 = y0;
				node.y1 = y1;
				node.x0 = parent.x0 + x_offset;
				x_offset += (parent.x1 - parent.x0) / (n);
				node.x1 = parent.x0 + x_offset;
			}
		},

		diceByValue(parent, x0, y0, x1, y1) {
			let value = 1;
			if (parent.parent == null) {
				value = this.$store.modules["ensemble"][parent.data.id]["max_time"];
			}
			else {
				value = this.$store.callsites["ensemble"][parent.data.id][this.metric];
			}

			var nodes = parent.children,
				node,
				i = -1,
				n = nodes.length,
				k = value && (parent.x1 - parent.x0) / value;

			console.log(k, value, x1, x0, x1 - x0);

			while (++i < n) {
				node = nodes[i], node.y0 = y0, node.y1 = y1;
				node.x0 = x0;
				node.x1 = x0 += node.data.data[this.metric] * k;
				console.log(node.data.id, node.data);
				console.log("x0: ", node.x0);
				console.log("x1: ", node.x1);
			}
		},

		drawIcicles(json) {
			if (this.hierarchy != undefined) {
				this.clear();
			} else {
				this.setupSVG();
				this.hierarchy = this.hierarchySVG
					.attrs({
						"id": this.svgID
					});
			}
			// Setup the view components
			// this.initializeBreadcrumbTrail();
			//  drawLegend();
			d3.select("#togglelegend").on("click", this.toggleLegend);

			// Bounding rect underneath the chart, to make it easier to detect
			// when the mouse leaves the parent g.
			this.hierarchy.append("svg:rect")
				.attr("width", () => {
					if (this.selectedDirection == "LR") return this.icicleHeight;
					return this.width;
				})
				.attr("height", () => {
					if (this.selectedDirection == "LR") return this.width - 50;
					return this.height - 50;
				})
				.style("opacity", 0);

			// Total size of all segments; we set this later, after loading the data
			let root = d3.hierarchy(json);
			let partition = this.partition(root);

			// For efficiency, filter nodes to keep only those large enough to see.
			this.nodes = this.descendents(partition);

			this.setupModuleMeanGradients();
			this.setupCallsiteMeanGradients();
			this.addNodes();
			this.addText();
			if (this.$store.showTarget) {
				this.drawTargetLine();
			}

			// Add the mouseleave handler to the bounding rect.
			d3.select("#container").on("mouseleave", this.mouseleave);

			// Get total size of the tree = value of root node from partition.
			this.totalSize = root.value;
		},

		setupCallsiteMeanGradients() {
			let module = this.$store.selectedModule;
			let callsites = Object.keys(this.$store.callsites["ensemble"]);

			let method = "";
			let mode = "Horizontal";

			this.hist_min = 0;
			this.hist_max = 0;
			let callsiteStore = this.$store.callsites["ensemble"];
			for (let idx = 0; idx < callsites.length; idx += 1) {
				let callsite = callsites[idx];
				let data = callsiteStore[callsite];
				this.hist_min = Math.min(this.hist_min, data[this.$store.selectedMetric]["gradients"]["hist"]["y_min"]);
				this.hist_max = Math.max(this.hist_max, data[this.$store.selectedMetric]["gradients"]["hist"]["y_max"]);
			}

			this.$store.binColor.setColorScale(this.hist_min, this.hist_max, this.$store.selectedDistributionColorMap, this.$store.selectedColorPoint);

			for (let idx = 0; idx < callsites.length; idx += 1) {
				let callsite = callsites[idx];
				let data = callsiteStore[callsite];
				let id = data.id;
				var defs = d3.select("#module-hierarchy-svg")
					.append("defs");

				this.linearGradient = defs.append("linearGradient")
					.attr("id", "mean-callsite-gradient-" + data.id)
					.attr("class", "linear-gradient");

				if (mode == "Horizontal") {
					this.linearGradient
						.attr("x1", "0%")
						.attr("y1", "0%")
						.attr("x2", "100%")
						.attr("y2", "0%");
				}
				else {
					this.linearGradient
						.attr("x1", "0%")
						.attr("y1", "0%")
						.attr("x2", "0%")
						.attr("y2", "100%");
				}

				let grid = data[this.$store.selectedMetric]["gradients"]["hist"]["x"];
				let val = data[this.$store.selectedMetric]["gradients"]["hist"]["y"];

				for (let i = 0; i < grid.length; i += 1) {
					let x = (i + i + 1) / (2 * grid.length);
					let current_value = (val[i]);
					this.linearGradient.append("stop")
						.attr("offset", 100 * x + "%")
						.attr("stop-color", this.$store.binColor.getColorByValue(current_value));
				}
			}
		},

		setupModuleMeanGradients() {
			let modules = Object.keys(this.$store.modules["ensemble"]);

			let method = "";
			let mode = "Horizontal";

			this.hist_min = 0;
			this.hist_max = 0;
			let moduleStore = this.$store.modules["ensemble"];
			for (let idx = 0; idx < modules.length; idx += 1) {
				let thismodule = modules[idx];
				let data = moduleStore[thismodule];
				this.hist_min = Math.min(this.hist_min, data[this.$store.selectedMetric]["gradients"]["hist"]["y_min"]);
				this.hist_max = Math.max(this.hist_max, data[this.$store.selectedMetric]["gradients"]["hist"]["y_max"]);
			}

			this.$store.binColor.setColorScale(this.hist_min, this.hist_max, this.$store.selectedDistributionColorMap, this.$store.selectedColorPoint);

			for (let idx = 0; idx < modules.length; idx += 1) {
				let thismodule = modules[idx];
				let data = moduleStore[thismodule];
				let id = data.id;
				var defs = d3.select("#module-hierarchy-svg")
					.append("defs");

				this.linearGradient = defs.append("linearGradient")
					.attr("id", "mean-module-gradient-" + data.id)
					.attr("class", "linear-gradient");

				if (mode == "Horizontal") {
					this.linearGradient
						.attr("x1", "0%")
						.attr("y1", "0%")
						.attr("x2", "100%")
						.attr("y2", "0%");
				}
				else {
					this.linearGradient
						.attr("x1", "0%")
						.attr("y1", "0%")
						.attr("x2", "0%")
						.attr("y2", "100%");
				}

				let grid = data[this.$store.selectedMetric]["gradients"]["hist"]["x"];
				let val = data[this.$store.selectedMetric]["gradients"]["hist"]["y"];

				for (let i = 0; i < grid.length; i += 1) {
					let x = (i + i + 1) / (2 * grid.length);
					let current_value = (val[i]);
					this.linearGradient.append("stop")
						.attr("offset", 100 * x + "%")
						.attr("stop-color", this.$store.binColor.getColorByValue(current_value));
				}
			}
		},

		drawTargetLine() {
			let dataset = this.$store.selectedTargetDataset;

			for (let i = 0; i < this.nodes.length; i++) {
				let node_data = this.nodes[i].data;

				let mean = 0;
				let gradients = [];
				let targetPos = undefined;
				if (this.nodes[i].depth == 0 && this.$store.modules["ensemble"][node_data.id] != undefined) {
					let data = this.$store.modules["ensemble"][node_data.id][this.$store.selectedMetric]["gradients"];
					mean = data["dataset"]["mean"][dataset];
					gradients = data["hist"];
					targetPos = data["dataset"]["position"][dataset] + 1;
				}
				else {
					if (this.$store.callsites["ensemble"][node_data.id] != undefined) {
						let data = this.$store.callsites["ensemble"][node_data.id][this.$store.selectedMetric]["gradients"];
						mean = data["dataset"]["mean"][dataset];
						gradients = data["hist"];
						targetPos = data["dataset"]["position"][dataset] + 1;
					}
				}

				let grid = gradients.x;
				let vals = gradients.y;

				let binWidth = (this.nodes[i].x1 - this.nodes[i].x0) / (this.$store.selectedRunBinCount);

				let x = this.nodes[i].x0 + binWidth * targetPos - binWidth / 2;

				this.hierarchySVG
					.append("line")
					.attrs({
						"class": "hierarchy-targetLines",
						"x1": x,
						"y1": (this.nodes[i].y1 - this.nodes[i].y0) * (this.nodes[i].depth) + this.offset,
						"x2": x,
						"y2": (this.nodes[i].y1 - this.nodes[i].y0) * (this.nodes[i].depth + 1) - this.offset,
						"stroke-width": 5,
						"stroke": this.$store.color.target
					});
			}
		},

		clearGuides(d) {
			d3.selectAll(".hierarchy-guideLines").remove();
		},

		drawGuides(d) {
			let dataset = this.$store.selectedTargetDataset;

			let data = this.$store.modules;
			let node_data = d.data;

			let mean = 0;
			let gradients = [];
			if (d.depth == 0) {
				mean = this.$store.modules[dataset][node_data.id]["gradients"][this.$store.selectedMetric]["dataset"][dataset];
				gradients = this.$store.modules["ensemble"][node_data.id]["gradients"][this.$store.selectedMetric]["hist"];
			}
			else {
				mean = this.$store.callsites[dataset][node_data.id]["gradients"][this.$store.selectedMetric]["dataset"][dataset];
				gradients = this.$store.callsites["ensemble"][node_data.id]["gradients"][this.$store.selectedMetric]["hist"];
			}

			let grid = gradients.x;
			let vals = gradients.y;
			let binWidth = (d.x1 - d.x0) / (this.$store.selectedRunBinCount);

			for (let idx = 0; idx < grid.length; idx += 1) {
				let x = binWidth * (idx);

				this.hierarchySVG
					.append("line")
					.attrs({
						"class": "hierarchy-guideLines",
						"x1": x,
						"y1": (d.y1 - d.y0) * (d.depth),
						"x2": x,
						"y2": (d.y1 - d.y0) * (d.depth + 1),
						"stroke-width": 3,
						"stroke": "#202020"
					});


				// d3.selectAll('.ensemble-edge')
				// 	.style('opacity', 0.5)

				// // For drawing the guide lines that have the value.
				// d3.select('#ensemble-callsite-' + node_data.client_idx)
				// 	.append('line')
				// 	.attr("class", 'gradientGuides-' + type)
				// 	.attr("id", 'line-2-' + node_data['client_idx'])
				// 	.attr("x1", 0)
				// 	.attr("y1", y)
				// 	.attr("x2", this.nodeWidth)
				// 	.attr("y2", y)
				// 	.attr("stroke-width", 1.5)
				// 	.attr('opacity', 0.3)
				// 	.attr("stroke", '#202020')

				// let fontSize = 14
				// if (vals[idx] != 0) {
				// 	// For placing the run count values.
				// 	d3.select('#ensemble-callsite-' + node_data.client_idx)
				// 		.append('text')
				// 		.attr("class", 'gradientGuidesText-' + type)
				// 		.attr("id", 'line-2-' + node_data['client_idx'])
				// 		.attr("x", -50)
				// 		.attr("y", y + fontSize / 2 + binWidth / 2)
				// 		.attr('fill', 'black')
				// 		.style('z-index', 100)
				// 		.style('font-size', fontSize + 'px')
				// 		.text(this.formatRunCounts(vals[idx]))

				// 	// For placing the runtime values.
				// 	if (idx != 0 && idx != grid.length - 1) {
				// 		d3.select('#ensemble-callsite-' + node_data.client_idx)
				// 			.append('text')
				// 			.attr("class", 'gradientGuidesText-' + type)
				// 			.attr("id", 'line-2-' + node_data['client_idx'])
				// 			.attr("x", this.nodeWidth + 10)
				// 			.attr("y", y + fontSize / 2 + binWidth / 2)
				// 			.attr('fill', 'black')
				// 			.style('z-index', 100)
				// 			.style('font-size', '14px')
				// 			.text(this.formatRuntime(grid[idx]))
				// 	}
				// }

				// if (idx == 0) {
				// 	d3.select('#ensemble-callsite-' + node_data.client_idx)
				// 		.append('text')
				// 		.attr("class", 'gradientGuidesText-' + type)
				// 		.attr("id", 'line-2-' + node_data['client_idx'])
				// 		.attr("x", this.nodeWidth + 10)
				// 		.attr("y", y)
				// 		.attr('fill', 'black')
				// 		.style('z-index', 100)
				// 		.style('font-size', '14px')
				// 		.text('Min. = ' + this.formatRuntime(grid[idx]))
				// }
				// else if (idx == grid.length - 1) {
				// 	d3.select('#ensemble-callsite-' + node_data.client_idx)
				// 		.append('text')
				// 		.attr("class", 'gradientGuidesText-' + type)
				// 		.attr("id", 'line-2-' + node_data['client_idx'])
				// 		.attr("x", this.nodeWidth + 10)
				// 		.attr("y", y + binWidth / 2)
				// 		.attr('fill', 'black')
				// 		.style('z-index', 100)
				// 		.style('font-size', '14px')
				// 		.text('Max. = ' + this.formatRuntime(grid[idx]))
				// }
			}
		},

		addNodes() {
			let self = this;

			this.hierarchy
				.selectAll(".icicleNode")
				.data(this.nodes)
				.enter()
				.append("rect")
				.attr("class", "icicleNode")
				.attr("id", (d) => {
					return d.data.data.id;
				})
				.attr("x", (d) => {
					if (this.selectedDirection == "LR") {
						if (Number.isNaN(d.y0)) {
							return d.data.count * this.width / d.data.length;
						}
						return d.data.count * this.width / d.data.length;
					}
					return d.x0;
				})
				.attr("y", (d) => {
					if (this.selectedDirection == "LR") {
						return d.x0 + this.offset + this.stroke_width;
					}
					return d.y0 + this.offset; //+ this.stroke_width
				})
				.attr("width", (d) => {
					if (this.selectedDirection == "LR") {
						if (Number.isNaN(d.y1 - d.y0)) {
							return this.width / d.data.length - this.offset - this.stroke_width;
						}
						else {
							return d.y1 - d.y0 - this.offset - this.stroke_width;
						}
					}
					return d.x1 - d.x0 - this.offset - this.stroke_width;
				})
				.attr("height", (d) => {
					if (this.selectedDirection == "LR") {
						return d.x1 - d.x0 - this.offset;
					}
					return d.y1 - d.y0 - this.offset - this.stroke_width;
				})
				.style("fill", (d, i) => {
					let gradients = undefined;
					console.log(d.data.data.name);
					if (d.depth == 0 && this.$store.modules[this.$store.selectedTargetDataset][d.data.data.name] != undefined) {
						gradients = "url(#mean-module-gradient-" + d.data.data.id + ")";
					}
					else {
						if (this.$store.callsites[this.$store.selectedTargetDataset][d.data.data.name] != undefined) {
							gradients = "url(#mean-callsite-gradient-" + d.data.data.id + ")";
						}
						else {
							gradients = this.$store.color.ensemble;
						}
					}
					return gradients;
				})
				.style("stroke", (d) => {
					let runtime = d.data.data[this.$store.selectedMetric]["max_time"];
					return d3.rgb(this.$store.color.getColorByValue(runtime));
				})
				.style("stroke-width", this.stroke_width)
				.style("opacity", (d) => {
					if (d.exit) {
						return 0.5;
					}
					return 1;
				})
				.on("click", this.click)
				.on("mouseover", (d) => {
					const percentage = (100 * d.value / this.totalSize).toPrecision(3);
					this.percentageString = `${percentage}%`;
					if (percentage < 0.1) {
						this.percentageString = "< 0.1%";
					}

					const sequenceArray = this.getAncestors(d);
					// this.updateBreadcrumbs(sequenceArray, percentageString);

					// Fade all the segments.
					d3.selectAll(".icicleNode")
						.style("opacity", 0.1);

					// Then highlight only those that are an ancestor of the current segment.
					this.hierarchy.selectAll(".icicleNode")
						.filter(node => (sequenceArray.indexOf(node) >= 0))
						.style("opacity", 1);

					// this.drawGuides(d)
					this.$refs.ToolTip.render(d);
				})
				.on("mouseout", (d) => {// Fade all the segments.
					d3.selectAll(".icicleNode")
						.style("opacity", 1);
					// this.clearGuides()
					// this.$refs.ToolTip.clear()
				},
				);
		},

		addText() {
			this.hierarchy.selectAll(".icicleText")
				.data(this.nodes)
				.enter()
				.append("text")
				.attr("class", "icicleText")
				.attr("transform", (d) => {
					if (this.selectedDirection == "LR") {
						return "rotate(90)";
					}
					return "rotate(0)";
				})
				.attr("x", (d) => {
					if (this.selectedDirection == "LR") {
						if (Number.isNaN(d.y0)) {
							return d.data.count * this.width / d.data.length;
						}
						return d.data.count * this.width / d.data.length;
					}
					return d.x0 + this.offset * 2;
				})
				.attr("y", (d) => {
					if (this.selectedDirection == "LR") {
						return d.x0;
					}
					return d.y0 + 2.5 * (this.stroke_width + this.offset);
				})
				.attr("width", (d) => {
					if (this.selectedDirection == "LR") {
						if (Number.isNaN(d.y1 - d.y0)) {
							return this.width / d.data.length;
						}
						return this.width / d.data.length;
					}
					return this.width;
				})
				.style("fill", (d) => {
					let color = this.$store.color.setContrast(this.$store.color.getColor(d));
					return color;
				})
				.style("font-size", "14px")
				.text((d) => {
					if (d.y1 - d.y0 < 10 || d.x1 - d.x0 < 50) {
						return "";
					}
					let name = d.data.id;
					let textSize = utils.textSize(this.id, name)["width"];
					let fontSize = 14;

					let textThatFits = Math.floor((d.x1 - d.x0) / fontSize);
					name = utils.truncNames(name, textThatFits);
					return name;
				});
		},

		click(d) {
			let splitByOption = this.selectedSplitOption.name;

			// Fade all the segments.
			d3.selectAll(".icicleNode")
				.style("opacity", 0.3);

			let sequenceArray = this.getAncestors(d);
			// Then highlight only those that are an ancestor of the current segment.
			this.hierarchy.selectAll(".icicleNode")
				.filter(node => {
					return (sequenceArray.indexOf(node) >= 0);
				})
				.style("opacity", 1);

			this.$socket.emit(splitByOption, {
			});
		},

		// Restore everything to full opacity when moving off the visualization.
		mouseleave() {
			// Hide the breadcrumb trail
			d3.select("#trail")
				.style("visibility", "hidden");

			// Deactivate all segments during transition.
			d3.selectAll(".icicleNode").on("mouseover", null);

			// Transition each segment to full opacity and then reactivate it.
			d3.selectAll(".icicleNode")
				.transition()
				.duration(1000)
				.style("opacity", 1)
				.each("end", function () {
					// d3.select(this).on("mouseover", this.mouseover);
				});
		},

		// Fade all but the current sequence, and show it in the breadcrumb trail.
		mouseover(d) {
			// const percentage = (100 * d.value / this.totalSize).toPrecision(3);
			// let percentageString = `${percentage}%`;
			// if (percentage < 0.1) {
			// 	percentageString = '< 0.1%';
			// }

			// const sequenceArray = this.getAncestors(d);
			// this.updateBreadcrumbs(sequenceArray, percentageString);

			// Fade all the segments.
			// d3.selectAll('.icicleNode')
			// 	.style('opacity', 0.3);

			// Then highlight only those that are an ancestor of the current segment.
			// this.hierarchy.selectAll('.icicleNode')
			// 	.filter(node => (sequenceArray.indexOf(node) >= 0))
			// 	.style('opacity', 1)

			// this.drawGuides(d)
			this.$refs.ToolTip.render(d);
		},

		mouseout(d) {
			// this.clearGuides()
			this.$refs.ToolTip.clear();
		},

		// Given a node in a partition layout, return an array of all of its ancestor
		// nodes, highest first, but excluding the root.
		getAncestors(node) {
			const path = [];
			let current = node;
			while (current.parent) {
				path.unshift(current);
				current = current.parent;
			}
			path.unshift(current);
			return path;
		},

		initializeBreadcrumbTrail() {
			// Add the svg area.
			const width = document.getElementById(this.svgID).clientWidth;
			const trail = d3.select("#sequence").append("svg:svg")
				.attr("width", this.icicleWidth)
				.attr("height", 50)
				.attr("id", "trail");
			// Add the label at the end, for the percentage.
			trail.append("svg:text")
				.attr("id", "endlabel")
				.style("fill", "#000");
		},

		// Generate a string that describes the points of a breadcrumb polygon.
		breadcrumbPoints(i) {
			const points = [];
			points.push("0,0");
			points.push(`${this.b.w},0`);
			points.push(`${this.b.w + this.b.t},${this.b.h / 2}`);
			points.push(`${this.b.w},${this.b.h}`);
			points.push(`0,${this.b.h}`);
			if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
				points.push(`${this.b.t},${this.b.h / 2}`);
			}
			return points.join(" ");
		},

		// Update the breadcrumb trail to show the current sequence and percentage.
		updateBreadcrumbs(nodeArray, percentageString) {
			// Data join; key function combines name and depth (= position in sequence).
			const g = d3.select("#trail")
				.selectAll("g")
				.data(nodeArray, d => d.name + d.depth);

			// Add breadcrumb and label for entering nodes.
			const entering = g.enter().append("svg:g");

			entering.append("svg:polygon")
				.attr("points", this.breadcrumbPoints)
				.style("fill", () => "#f1f1f1");

			entering.append("svg:text")
				.attr("x", (this.b.w + this.b.t) / 2)
				.attr("y", this.b.h / 2)
				.attr("dy", "0.35em")
				.attr("text-anchor", "middle")
				.text(d => d.name);

			// Set position for entering and updating nodes.
			g.attr("transform", (d, i) => `translate(${i * (this.b.w + this.b.s)}, 0)`);

			// Remove exiting nodes.
			g.exit().remove();

			// Now move and update the percentage at the end.
			d3.select("#trail").select("#endlabel")
				.attr("x", (nodeArray.length + 0.5) * (this.b.w + this.b.s))
				.attr("y", this.b.h / 2)
				.attr("dy", "0.35em")
				.attr("text-anchor", "middle")
				.text(percentageString);

			// Make the breadcrumb trail visible, if it's hidden.
			d3.select("#trail")
				.style("visibility", "");
		},

		toggleLegend() {
			const legend = d3.select("#legend");
			if (legend.style("visibility") == "hidden") {
				legend.style("visibility", "");
			} else {
				legend.style("visibility", "hidden");
			}
		},
	}
};