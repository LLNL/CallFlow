/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
	<v-col>
		<v-row>
			<v-col cols="4">
				<InfoChip ref="InfoChip" :title="title" :summary="infoSummary" :info="info" />
			</v-col>
			<v-col cols="8">
				<ColorMap ref="ColorMap" />
			</v-col>
			<Loader :isDataReady="isDataReady" />
			<svg :id="id" :width="width" :height="height" :left="margin.left" :top="margin.top">
				<g id="container"></g>
				<ToolTip ref="ToolTip" />
			</svg>
		</v-row>
	</v-col>
</template>

<script>
import * as d3 from "d3";
import dagreD3 from "dagre-d3/dist/dagre-d3";
import { mapGetters } from "vuex";

import EventHandler from "lib/routing/EventHandler";

import InfoChip from "../general/infoChip";
import Loader from "../general/loader";
import ColorMap from "../general/colormap";
import ToolTip from "./tooltip";
import d3InputBox from "./d3-inputbox";

import * as utils from "lib/utils";

export default {
	name: "NodeLink",
	components: {
		InfoChip,
		Loader,
		ColorMap, 
		ToolTip
	},

	data: () => ({
		id: "cct-overview",
		margin: {
			top: 20,
			right: 20,
			bottom: 20,
			left: 20,
		},
		width: 0,
		height: 0,
		zoom: null,
		HAS_DATA_COLUMNS: ["module"], // Array of keys in incoming data to check for.
		has_data_map: {}, // stores if the required data points are present in the incoming data.
		title: "CCT view",
		infoSummary:
      "CCT view visualizes the unique call paths of a sampled profile. Each call site is colored based on the selected metric (use settings to change the metric). On click, each node's callers (green) and callees (purple) are highlighted using the links.",
		info: "",
		b_node_height: 50,
		s_node_height: 30,
		isDataReady: false,
		firstRender: true,
	}),

	mounted() {
		let self = this;
		EventHandler.$on("reset-cct", () => {
			console.log("[CCT] Resetting dataset to :", this.selectedTargetRun);
			self.clear();
			self.isDataReady = false;
			self.$store.dispatch("fetchCCT", {
				dataset: this.selectedTargetRun
			});
		});
	},

	computed: {
		...mapGetters({ 
			selectedMetric: "getSelectedMetric", 
			data: "getCCT",
		})
	},

	watch: {
		data: function () {
			this.visualize();
		}
	},

	methods: {
		init(run) {
			this.$store.dispatch("fetchCCT", {
				dataset: run
			});
		},

		visualize() {
			this.isDataReady = true;
			this.width = this.$store.viewWidth - this.margin.right;
			this.height = this.$store.viewHeight - this.margin.bottom;

			this.svg = d3.select("#" + this.id);

			this.info = "Selected metric : " + this.selectedMetric;

			this.g = this.createGraph();
			this.setHasDataMap();

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

			// TODO: Zoom translate is not working well.
			this.zoomTranslate();

			let self = this;
			this.svg.selectAll("g.node").on("click", function (v) {
				self.node_click_action(v);
				dagreRender(inner, self.g);
				// self.zoomTranslate();
			});

			if(this.selectedMetric !== "module") {
				this.$refs.ColorMap.init(this.$store.runtimeColor);
			}

			this.$refs.ToolTip.init(this.id);
			this.svg.selectAll(".cct-node").on("mouseover", function (v, d) {
				self.$refs.ToolTip.visualize(self.data.nodes[d]);
			});

			this.svg.selectAll("g.node").on("click", function (v) {
				// var inputbox = d3InputBox();
				// var inputboxes = self.svg.selectAll(".inputbox")
				// 	.data([{label: "module: ", x: 20, width: 200, height: 36.5, supernode: "aaa" }])
				// 	.enter()
				// 	.append("g")
				// 	.attr("class", "inputbox")
				// 	.call(inputbox);	
			});

			// Add tooltip
			inner.selectAll("g.node")
				.attr("title", function (v) { return v; });
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
				compound: true,
			});

			g.setGraph({
				rankDir: "TD",
				rankSep: 50,
				marginx: 30,
				marginy: 30,
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
			if (callsite.name == undefined) {
				return callsite.id;
			}
			return callsite.name;
		},

		/**
		 * Set callsite's text and fill color.
		 *
		 * @param {Object} callsite
		 * @return {JSON<{'node': Color, 'text': Color}>} 'node': fill color, 'text': text color
		 */
		setCallsiteColor(callsite) {
			const colorBy = this.selectedMetric;

			let colorMap;
			if(colorBy == "module") {
				colorMap = this.$store.moduleColor;
			}
			else {
				colorMap = this.$store.runtimeColor;
			}

			let fillColor = colorMap.getColor(callsite, colorBy);
			if(typeof(fillColor) !== "string") {
				fillColor = colorMap.rgbArrayToHex(fillColor);			
			}
			
			// Set text color (contrast to the fill color).
			const textColor = colorMap.setContrast(fillColor);

			return {
				node: fillColor,
				text: textColor,
			};
		},

		/**
		 * Sets the html content for rendering inside a node.
		 *
		 * @param {String} callsite
		 * @param {JSON<{'node': Color, 'text': Color}>} callsite_color
		 * @return {HTML} html for rendering.
		 */
		setCallsiteHTML(callsite, callsite_color) {
			let name = callsite.name;
			name = utils.formatName(name.replace("<", "").replace(">", ""));

			const class_name =
        callsite_color["text"] === "#fff" ? "white-text" : "black-text";

			let html = `<div><span class=${class_name} > ${name} </span> </div>`;
			if (this.has_data_map["module"] && callsite.id != callsite.name) {
				let thismodule = utils.getModuleName(this.$store, callsite.module);
				html += `<br/><span class= ${class_name}><b>Module :</b>` + thismodule + "</span> </div>";
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
					class: "cct-node",
					labelType: "html",
					label,
					fillColor: callsite_color["node"],
				};

				this.g.setNode(callsite_name, payload);
			});

			let self = this;
			// set styles.
			this.g.nodes().forEach(function (v) {
				let node = self.g.node(v);
				if (node != undefined) {
					node.style = `fill: ${node.fillColor}; color: "#f00";`;
					node.rx = node.ry = 8;
					node.id = node.name;
					// node.height = self.b_node_height;
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
				} else {
					edge_label = "";
				}
				this.g.setEdge(links[i]["source"], links[i]["target"], {
					label: edge_label,
					arrowhead: "vee",
				});
			}

			let self = this;
			this.g.edges().forEach((e) => {
				const edge = self.g.edge(e);
				edge.class = "cct-edge";
				self.g.edge(e).style =
          "fill: rgba(255,255,255, 0); stroke: #686868; stroke-width: 2.5px;";
			});
		},

		/**
		 * Node click action.
		 * On click, the inbound and outbound paths are highlighted.
		 *
		 * @param {dagreD3's ID} id
		 */
		node_click_action(id) {
			const default_dagreD3e_style =
        "fill: rgba(255,255,255, 0); stroke: #d5d5d5; stroke-width: 1.5px;";
			const default_dagreD3arrowhead_style =
        "fill: #c5c5c5; stroke: #c5c5c5; stroke-width:4px;";

			const outbound_edge_style =
        "fill: rgba(255,255,255, 0); stroke: #800080; stroke-width: 4px;";
			const outbound_arrowhead_style =
        "fill: #800080; stroke: #800080; stroke-width:1.5px;";

			const inbound_edge_style =
        "fill: rgba(255,255,255, 0); stroke: #32CD32; stroke-width: 4px;";
			const inbound_arrowhead_style =
        "fill: #32CD32; stroke: #32CD32; stroke-width:1.5px;";

			let nodeClass = this.g.node(id).class;

			let self = this;
			if (nodeClass.indexOf("highLight") != -1) {
				this.g.node(id).class = nodeClass
					.toString()
					.replace("highLight", " ")
					.trim();

				this.g.edges().forEach(function (e, v, w) {
					let edge = self.g.edge(e);
					edge.style = default_dagreD3e_style;
					edge.arrowhead = "vee";
					edge.arrowheadStyle = default_dagreD3arrowhead_style;
				});
			} else {
				this.g.nodes().forEach(function (v) {
					let node = self.g.node(v);
					nodeClass = node.class;
					if (nodeClass !== "cct-node")
						node.class = nodeClass.replace("highLight", " ").trim();
					// node.height = self.b_node_height;
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
				this.g.node(id).class += " highLight";
			}

			// this.zoomTranslate();
		},

		/**
		 * Translate and zoom to fit the graph to the entire SVG's context.
		 *
		 */
		zoomTranslate() {
			const graphWidth = this.g.graph().width;
			const graphHeight = this.g.graph().height ;

			// Set the zoom scale
			let zoomScale = Math.min(
				this.width / graphWidth,
				this.height / graphHeight,
			);
			if (zoomScale > 1.4) zoomScale -= 0.1;

			// Set the translate
			const translate = [
				(this.width - graphWidth * zoomScale) * 0.5,
				(this.height - graphHeight * zoomScale) * 0.5,
			];

			// Move the svg based on translate.
			this.svg.call(
				this.zoom.transform,
				d3.zoomIdentity.translate(translate[0], translate[1]).scale(zoomScale),
			);
		},

		/**
		 *  Set the has data map.
		 */
		setHasDataMap() {
			this.has_data_map = {};
			for (let i = 0; i < this.HAS_DATA_COLUMNS.length; i += 1) {
				let currentColumn = this.HAS_DATA_COLUMNS[i];
				if (Object.keys(this.data["nodes"][0]).includes(currentColumn)) {
					this.has_data_map[currentColumn] = true;
				} else {
					this.has_data_map[currentColumn] = false;
				}
			}
		},

		/**
		 * Clear method for the component.
		 */
		clear() {
			d3.selectAll(".cct-node").remove();
			d3.selectAll(".cct-edge").remove();
			this.$refs.ColorMap.clear();
		},
	},
};
</script>

<style>
.cct-node {
  cursor: pointer;
}

.white-text {
  color: white !important;
  text-align: center;
  font-size: 12px;
}

.black-text {
  color: black !important;
  text-align: center;
  font-size: 12px;
}

.description {
  display: block;
}

.highLight > rect,
.highLight > circle {
  stroke: black;
  stroke-width: 2px;
}

.white-text > .description {
  color: rgb(200, 195, 195);
  font-size: 10px;
}

.black-text > .description {
  color: rgb(26, 26, 49);
  font-size: 10px;
}

.cct-edge {
  fill: gray;
}

.inputbox rect {
  fill: #FFFFFF;
  stroke: #348B6D; 
  stroke-width: 2px;
}

.inputbox rect.active {
  fill: #D9F0E3;
}

.inputbox text {
  font-family: 'Open Sans', sans-serif;
  font-size: 12px;
  letter-spacing: 3px;
  fill: #494949;
  pointer-events: none;
  text-anchor: start;
  -moz-user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
    
}

.inputbox text.value {  
  text-anchor: end;
}

</style>