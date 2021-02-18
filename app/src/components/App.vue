/**
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 *
 * SPDX-License-Identifier: MIT
 */

<template>
	<v-app>
		<div id="app">
			<v-toolbar id="toolbar" color="teal" fixed app clipped-right>
				<v-toolbar-title class="toolbar-title">
					CallFlow
				</v-toolbar-title>
				<v-btn outlined>
					<router-link to="/cct" replace>CCT</router-link>
				</v-btn>
				<v-btn outlined>
					<router-link to="/super_graph" replace>Super Graph</router-link>
				</v-btn>

				<v-btn outlined v-if="run_counts > 1">
					<router-link to="/ensemble_super_graph" replace>Ensemble Super Graph</router-link>
				</v-btn>
				<!-- <v-btn outlined v-if="run_counts > 1">
					<router-link to="/timeline_super_graph" replace>Timeline</router-link>
				</v-btn> -->
			</v-toolbar>
			<router-view></router-view>
			<v-content class="content">
				<v-layout>
					<v-container>
						<BasicInformation :data="config" />
					</v-container>
					<v-container>
						<RuntimeInformation :data="summary" />					
					</v-container>
				</v-layout>
				<v-container>
					<!-- <ModuleMappingInformation :data="moduleMapping" /> -->
				</v-container>
			</v-content>
		</div>
		<Footer ref="Footer" :text="footerText" :year="year"></Footer>
	</v-app>
</template>

<script>
// Local library imports
import * as utils from "lib/utils";
import Color from "lib/color/";
import APIService from "lib/routing/APIService";

// Local components
import BasicInformation from "./general/basicInformation";
import RuntimeInformation from "./general/runtimeInformation";
import ModuleMappingInformation from "./general/moduleMappingInformation";
import Footer from "./general/footer";

export default {
	name: "App",
	components: {
		BasicInformation,
		RuntimeInformation,
		Footer,
		// ModuleMappingInformation
	},
	data: () => ({
		data: {},
		config: {},
		runs: {},
		run_counts: 0,
		summary: [],
		moduleMapping: [],
		rankBinCount: 20,
		runBinCount: 20,
		selectedIQRFactor: 0.15,
		selectedDistributionColorMap: "Reds",
		targetColorMap: {
			Green: "#4EAF4A",
			Blue: "#4681B4",
			Brown: "#AF9B90",
			Red: "#A90400",
		},
		footerText: "Lawrence Livermore National Laboratory and VIDi Labs, University of California, Davis",
		year: "2021",
	}),

	mounted() {
		document.title = "CallFlow - ";
		this.init();
	},

	methods: {
		async init() {
			const data = await this.fetchData();
			console.log("Aux data", data);
			this.initStore(data);
		},

		/**
		 * Send the request to /init endpoint
		 * Parameters: {datasetPath: "path/to/dataset"}
		*/ 
		async fetchData(payload) {
			if (!this.$store.config) {
				this.config = await APIService.GETRequest("config");
				this.$store.config = this.config;
			}

			document.title = "CallFlow - " + this.$store.config.experiment;

			this.runs = this.$store.config.runs.map((_) => _["name"]);
			this.run_counts = this.runs.length;
			
			if(!payload) {
				payload = {
					datasets: this.runs,
					rankBinCount: this.rankBinCount,
					runBinCount: this.runBinCount,
					reProcess: false,
				};
			}
			return await APIService.POSTRequest("aux_data", payload);
		},

		initStore(data) {
			this.setGlobalVariables(); // Set the general variables in the store.
			this.setLocalVariables(data); // Set the local variables (i.e., in this component).
			this.setAuxVariables(data); // Set the variables that are affected by auxiliary data.
			this.setViewDimensions(); // Set the view dimensions.
		},

		/**
		 * Attaches properties to central storage based on the data from `this.auxiliary_data`.
		 */
		setAuxVariables(data) {
			this.$store.summary = data.summary;
			// this.$store.modules = data.module;
			// this.$store.callsites = data.callsite;
			// this.$store.moduleCallsiteMap = data.moduleCallsiteMap;
			// this.$store.callsiteModuleMap = data.callsiteModuleMap;
			this.$store.moduleFctList = data.modules;
			this.$store.selectedDatasets = data.runs;

			this.$store.metricTimeMap = Object.keys(data.summary).reduce((res, item, idx) => { 
				console.log(res, item, idx);
				res[item] = data.summary[item][this.$store.selectedMetric][1];
				return res;
			}, {});
			this.$store.selectedTargetDataset = utils.getKeyWithMaxValue(this.$store.metricTimeMap);
			this.setupColors(this.selectedRuntimeColorMap, this.selectedDistributionColorMap); // Set up the colors.
		},

		setLocalVariables(data) {
			// Render the tables in the view
			this.summary = Object.keys(data.summary).map((_) =>  { return {"run": _, ...data.summary[_]};});
			const module_fct_list = data.moduleFctList;
			// TODO: Does not work as the format is weird.
			// this.module_callsite_map = Object.keys(data.moduleCallsiteMap["ensemble"]).map((_) => { return {"module": module_fct_list[_], ...data.moduleCallsiteMap[_]};});
		},

		setGlobalVariables() {
			this.$store.selectedScatterMode = "mean";
			this.$store.selectedProp = "rank";

			this.$store.selectedIQRFactor = 0.15;
			this.$store.selectedRunBinCount = 20;
			this.$store.selectedEdgeAlignment = "Top";

			// Used in sankey.js
			// TODO: Sankey should not have any store related properties. 
			this.$store.selectedSuperNodePositionMode = "Minimal edge crossing";

			this.$store.auxiliarySortBy = "time (inc)";
			this.$store.selectedMetric = "time (inc)";
		
			// Shoud be specified in the CSS, not here.
			this.$store.fontSize = 14;
			this.$store.transitionDuration = 1000;
	
			// Set the selected mode (Single or Ensemble)
			this.$store.selectedMode = this.run_counts > 1 ? "Ensemble": "Single";
			
			// Set the metric to sort the call site information
			this.$store.selectedRuntimeSortBy = "time (inc)";
			this.$store.selectedMetric = "time (inc)";

			this.$store.numOfRuns = this.runs;
		},

		setupColors(selectedRuntimeColorMap, selectedDistributionColorMap) {
			this.$store.runtimeColor = new Color();
			this.$store.runtimeColorMap = this.$store.runtimeColor.getAllColors();
			
			this.setRuntimeColorScale(selectedRuntimeColorMap, this.$store.selectedMetric);

			if(this.$store.numOfRuns > 1) {
				// Create distribution color object
				this.$store.distributionColor = new Color();
				this.$store.distributionColorMap = this.$store.distributionColor.getAllColors();
				
				this.setDistributionColorScale(selectedDistributionColorMap);

				this.selectedTargetColor = "Green";
				this.$store.distributionColor.target = this.targetColorMap[
					this.selectedTargetColor
				];
				this.$store.distributionColor.ensemble = "#C0C0C0";
				this.$store.distributionColor.compare = "#043060";

				// Create difference color object
				this.$store.diffColor = new Color();
				this.$store.selectedDistributionColorMap = selectedDistributionColorMap;
			}

			// Set properties into store.
			this.$store.selectedColorPoint = 9;
			this.$store.runtimeColor.intermediate = "#d9d9d9";
			this.$store.runtimeColor.highlight = "#C0C0C0";
			this.$store.runtimeColor.textColor = "#3a3a3a";
			this.$store.runtimeColor.edgeStrokeColor = "#888888";
		},

		// Set the min and max and assign color variables from Settings.
		setRuntimeColorScale(selectedRuntimeColorMap, metric) {
			const _d = this.$store.summary[this.$store.selectedTargetDataset][metric];
			const colorMin = parseFloat(_d[0]);
			const colorMax = parseFloat(_d[1]);

			this.selectedColorMinText = utils.formatRuntimeWithoutUnits(
				parseFloat(colorMin)
			);
			this.selectedColorMaxText = utils.formatRuntimeWithoutUnits(
				parseFloat(colorMax)
			);

			this.$store.selectedColorMin = colorMin;
			this.$store.selectedColorMax = colorMax;

			this.$store.runtimeColor.setColorScale(
				metric,
				colorMin,
				colorMax,
				selectedRuntimeColorMap,
				this.$store.selectedColorPoint
			);
		},

		setDistributionColorScale(selectedDistributionColorMap) {
			let hist_min = 0;
			let hist_max = 0;
			for (let module in this.$store.modules["ensemble"]) {
				let node = this.$store.modules["ensemble"][module];
				hist_min = Math.min(
					hist_min,
					node[this.$store.selectedMetric]["gradients"]["hist"]["y_min"]
				);
				hist_max = Math.max(
					hist_max,
					node[this.$store.selectedMetric]["gradients"]["hist"]["y_max"]
				);
			}
			this.$store.distributionColor.setColorScale(
				"MeanGradients",
				hist_min,
				hist_max,
				selectedDistributionColorMap,
				this.$store.selectedColorPoint
			);
		},

		setViewDimensions() {
			this.$store.viewWidth = window.innerWidth;

			// Set toolbar height 
			let toolbarHeight = 0;
			if (document.getElementById("toolbar") != null) {
				toolbarHeight = document.getElementById("toolbar").clientHeight;
			}

			// Set footer height
			let footerHeight = 0;
			if (document.getElementById("footer") != null) {
				footerHeight = document.getElementById("footer").clientHeight;
			}

			this.$store.viewHeight = window.innerHeight - 2 * toolbarHeight - footerHeight;
		},
	},
};
</script>

<style>
* {
	margin: 0;
	padding: 0;
}

.toolbar-title {
	margin: 3em; 
	font-size: 22px;
	font-weight: 400;
	color: white;
}

body {
	font-family: "Open Sans", sans-serif;
	font-size: 16px;
}
.content {
	padding-top: 54px !important;
}

.selected {
	stroke: #343838;
	stroke-width: 1px;
}

.unselected {
	stroke: #dbdbdb;
	stroke-width: 3px;
}

.big_text {
	font-size: 32px;
}

.ui.vis {
	height: 98% !important;
}

.tight {
	margin-left: -1em;
}

.ui.segment.vis_container {
	margin-right: -1em;
}

.v-chip__content {
	color: white;
	font-size: 125%;
}

.scroll {
	overflow-y: auto;
}

.tooltip {
	padding-left: 10px;
	font-size: 14px;
	font-weight: 500;
}

.setting-button {
	border: 0px solid !important;
	right: 0px !important;
	color: #009688 !important;
	font-size: 36px !important;
	background-color: white !important;
}

.v-list {
	padding: 8px;
}

.splitpanes.default-theme .splitpanes__pane {
	background: #f7f7f7 !important;
}

.md-theme-default a:not(.md-button) {
	color: #009687 !important;
}

.valueText {
	font-weight: 700 !important;
}

/* Over write the primary text to avoid blue color change on selection*/
.my-app.v-application .primary--text {
	color: #fff !important;
	caret-color: #fff !important;
}
</style>