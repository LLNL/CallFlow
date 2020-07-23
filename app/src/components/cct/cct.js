/*******************************************************************************
 * Copyright (c) 2020, Lawrence Livermore National Security, LLC.
 * Produced at the Lawrence Livermore National Laboratory.
 *
 * Written by Suraj Kesavan <spkesavan@ucdavis.edu>.
 *
 * LLNL-CODE-740862. All rights reserved.
 *
 * This file is part of CallFlow. For details, see:
 * https://github.com/LLNL/CallFlow
 * Please also read the LICENSE file for the MIT License notice.
 ******************************************************************************/
import tpl from "../../html/cct.html";
import '../../css/cct.css'
import ColorMap from "../../lib/colormap";

import * as d3 from "d3";
import dagreD3 from "dagre-d3/dist/dagre-d3";

export default {
	name: "CCT",
	template: tpl,
	components: {
		ColorMap
	},

	data: () => ({
		id: "cct-overview",
		margin: {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0
		},
		width: null,
		height: null,
		zoom: null,
		HAS_DATA_COLUMNS: ['module'], // Array of keys in incoming data to check for.
		has_data_map: {}, // stores if the required data points are present in the incoming data. 

	}),

	sockets: {
		/**
		 * Socket event listener for /single_cct endpoint
		 * 
		 * @param {JSON} data 
		 */
		single_cct(data) {
			console.debug("Single CCT data: ", data);
			this.render(data);
		},


		/**
		 * Socket event listener for /ensemble_cct endpoint
		 * 
		 * @param {JSON} data  
		 */
		ensemble_cct(data) {
			console.debug("Ensemble CCT data: ", data);
			this.render(data);
		},
	},

	methods: {
		/**
		 * Calls the socket to fetch data.
		 */
		init() {
			if (this.$store.selectedMode === 'Single') {
				this.$socket.emit("single_cct", {
					dataset: this.$store.selectedTargetDataset,
					functionsInCCT: this.$store.selectedFunctionsInCCT,
				});
			}
			else if (this.$store.selectedMode === 'Ensemble') {
				this.$socket.emit("ensemble_cct", {
					datasets: this.$store.selectedTargetDataset,
					functionsInCCT: this.$store.selectedFunctionsInCCT,
				});
			}

			this.width = this.$store.viewWidth - this.margin.left - this.margin.right;
			this.height = this.$store.viewHeight - this.margin.bottom - this.margin.top;

			this.svg = d3.select("#" + this.id)
				.attrs({
					"width": this.width,
					"height": this.height,
				});

			this.g = this.createGraph();
		},

		/**
		 * Create a dagre-d3 instance.
		 * 
		 * @return {dagreD3 Graph}
		 */
		createGraph() {
			const g = new dagreD3.graphlib.Graph({
				directed: true,
				multigraph: false,
				compound: true
			});

			g.setGraph({
				rankDir: 'TD',
				rankSep: 50,
				marginx: 30,
				marginy: 30
			});

			return g;
		},


		/**
		 * Sets callsite's name. 
		 * if key "name" is present, then use it, else use nxg node's id. 
		 * 
		 * @param {Object} callsite 
		 * @return {String} callsite's name
		 */
		setCallsiteName(callsite) {
			if (callsite["name"] == undefined) {
				return callsite["id"];
			}
			return callsite["name"];
		},

		/**
		 * Set callsite's text and fill color.
		 *
		 * @param {Object} callsite 
		 * @return {JSON<{'node': Color, 'text': Color}>} 'node': fill color, 'text': text color
		 */
		setCallsiteColor(callsite) {
			// Set node fill color.
			let color = "";
			if (this.$store.selectedMetric == "Inclusive") {
				color = this.$store.runtimeColor.getColor(callsite, "time (inc)");
			}
			else if (this.$store.selectedMetric == "Exclusive") {
				color = this.$store.runtimeColor.getColor(callsite, "time");
			}

			// Set node text color.
			const fillColor = this.$store.runtimeColor.rgbArrayToHex(color);
			const textColor = this.$store.runtimeColor.setContrast(fillColor);

			return {
				'node': fillColor,
				'text': textColor
			}
		},

		/**
		 * Sets the html content for rendering inside a node.
		 * 
		 * @param {String} callsite 
		 * @param {JSON<{'node': Color, 'text': Color}>} callsite_color
		 * @return {HTML} html for rendering. 
		 */
		setCallsiteHTML(callsite, callsite_color) {
			let name = callsite["name"];

			let html = (callsite_color['text'] === "#fff")
				? '<div class="white-text"><span>' + name + '</span>'
				: '<div class="black-text"><span>' + name + '</span>';
			
			if (this.has_data_map["module"]) {
				module = callsite["module"];
				html = html + '<br/><span class="description"><b>Module :</b> ' + module + '</span> </div>';
			}
			return html;
		},

		/**
		 * Renders the nodes in the dagre d3 graph.
		 * 
		 * @param {JSON} data - networkX graph. 
		 */
		nodes(data) {
			data.forEach((node, i) => {
				const callsite_name = this.setCallsiteName(node);
				const callsite_color = this.setCallsiteColor(node);
				const label = this.setCallsiteHTML(node, callsite_color);
				
				const payload = {
					...node,
					class: 'cct-node',
					labelType: 'html',
					label: label,
					fillColor: callsite_color['node']
				};

				this.g.setNode(callsite_name, payload);
			});

			let self = this;
			// set styles.
			this.g.nodes().forEach(function (v) {
				let node = self.g.node(v);
				if (node != undefined) {
					node.style = "fill:" + node.fillColor;
					node.rx = node.ry = 4;
					node.id = node.name;
				}
			});
		},

		/**
		 * Renders the edges in the dagre D3 graph.
		 * 
		 * @param {JSON} links - nxGraph edges.
		 */
		edges(links) {
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
					label: edge_label,
					arrowhead: "vee",
				});
			}

			let self = this;
			this.g.edges().forEach((e) => {
				var edge = self.g.edge(e);
				edge.id = "cct-edge";
				// g.edge(e).style = "stroke: 1.5px "
			});
		},

		/**
		 * Node click action. 
		 * On click, the inbound and outbound paths are highlighted.
		 * 
		 * @param {dagreD3's ID} id 
		 */
		node_click_action(id) {
			console.debug('click node : ' + id);
			const default_dagreD3e_style = "fill: rgba(255,255,255, 0); stroke: #d5d5d5; stroke-width: 1.5px;";
			const default_dagreD3arrowhead_style = "fill: #c5c5c5; stroke: #c5c5c5; stroke-width:4px;";

			const outbound_edge_style = "fill: rgba(255,255,255, 0); stroke: #800080; stroke-width: 4px;";
			const outbound_arrowhead_style = "fill: #800080; stroke: #800080; stroke-width:1.5px;";

			const inbound_edge_style = "fill: rgba(255,255,255, 0); stroke: #32CD32; stroke-width: 4px;";
			const inbound_arrowhead_style = "fill: #32CD32; stroke: #32CD32; stroke-width:1.5px;";

			let nodeClass = this.g.node(id).class;

			let self = this
			if (nodeClass.indexOf('highLight') != -1) {
				this.g.node(id).class = nodeClass.toString().replace('highLight', ' ').trim();

				this.g.edges().forEach(function (e, v, w) {
					let edge = self.g.edge(e);
					edge.style = default_dagreD3e_style;
					edge.arrowhead = "vee";
					edge.arrowheadStyle = default_dagreD3arrowhead_style;
				});
			}
			else {
				this.g.nodes().forEach(function (v) {
					let node = self.g.node(v);
					nodeClass = node.class;
					if (nodeClass !== 'cct-node') node.class = nodeClass.replace('highLight', ' ').trim();
				});

				this.g.edges().forEach(function (e, v, w) {
					let edge = self.g.edge(e);
					edge.style = default_dagreD3e_style;
					edge.arrowhead = "vee";
					edge.arrowheadStyle = default_dagreD3arrowhead_style;
					// Attach style for the callee callsites.
					if (e.v == id) {
						edge.style = outbound_edge_style;
						edge.arrowhead = "vee";
						edge.arrowheadStyle = outbound_arrowhead_style;
					}
					// Attach style for the caller callsites. 
					else if (e.w == id) {
						edge.style = inbound_edge_style;
						edge.arrowhead = "vee";
						edge.arrowheadStyle = inbound_arrowhead_style;
					}
				});
				this.g.node(id).class += ' highLight';
			}
		},

		/**
		 * Translate and zoom to fit the graph to the entire SVG's context.
		 * 
		 */
		zoomTranslate() {
			const graphWidth = this.g.graph().width + 80;
			const graphHeight = this.g.graph().height + 40;
			
			const width = parseInt(this.svg.style("width").replace(/px/, ""));
			const height = parseInt(this.svg.style("height").replace(/px/, ""));

			// Set the zoom scale
			let zoomScale = Math.min(width / graphWidth, height / graphHeight);
			if (zoomScale > 1.4) zoomScale -= 0.1;

			// Set the translate
			const translate = [(width - (graphWidth * zoomScale)) * 0.5, (height - (graphHeight * zoomScale)) * 0.5 ];

			// Move the svg based on translate.
			this.svg.call(this.zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(zoomScale));
		},

		/**
		 *  Set the has data map.
		 */
		setHasDataMap() {
			this.has_data_map = {}
			for (let i = 0; i < this.HAS_DATA_COLUMNS.length; i += 1) {
				let currentColumn = this.HAS_DATA_COLUMNS[i];
				if (Object.keys(this.data['nodes'][0]).includes(currentColumn)) {
					this.has_data_map[currentColumn] = true;
				}
				else {
					this.has_data_map[currentColumn] = false
				}
			}
		},

		/**
		 * Render method for the component.
		 */
		render(data) {
			this.data = data;
			this.setHasDataMap()

			this.nodes(this.data.nodes);
			this.edges(this.data.links);

			const inner = this.svg.select("#container");

			// Create the renderer
			const dagreRender = new dagreD3.render();

			// Set up zoom support
			this.zoom = d3.zoom().on("zoom", function () {
				inner.attr("transform", d3.event.transform);
			});
			this.svg.call(this.zoom);

			// Run the renderer. This is what draws the final graph.
			dagreRender(inner, this.g);


			this.zoomTranslate();

			// node click event (highlight)
			let self = this;
			this.svg.selectAll("g.node").on("click", function (id) {
				self.node_click_action(id);
				dagreRender(inner, self.g);
				self.zoomTranslate();
			});

			// Add tooltip
			// inner.selectAll("g.node")
			// 	.attr("title", function (v) { return this.tooltip(v, g.node(v).description) })
			// 	.each(function (v) { $(this).tipsy({ gravity: "w", opacity: 1, html: true }); });

			this.$refs.ColorMap.init(this.$store.runtimeColor);
		},

		/**
		 * Clear method for the component.
		 */
		clear() {
			d3.selectAll("#cct-node").remove();
			d3.selectAll("#cct-edge").remove();
			this.$refs.ColorMap.clear();
		},
	}
};