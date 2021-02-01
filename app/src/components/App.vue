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
					<router-link to="/single" replace>Single</router-link>
				</v-btn>

				<v-btn outlined v-if="run_counts > 1">
					<router-link to="/ensemble" replace>Ensemble</router-link>
				</v-btn>

				<!-- <v-btn outlined>
					<router-link to="/experimental" replace>Experimental</router-link>
				</v-btn> -->
			</v-toolbar>
			<router-view></router-view>
			<v-content class="content">
				<v-layout>
					<v-container>
						<BasicInformation :data="config" />
					</v-container>
					<v-container>
						<RuntimeInformation :data="runtime" />					
					</v-container>
				</v-layout>
				<v-container>
					<!-- <ModuleMappingInformation :data="moduleMapping" /> -->
				</v-container>
			</v-content>
		</div>
	</v-app>
</template>

<script>
import APIService from "../lib/APIService";
import BasicInformation from "./general/basicInformation";
import RuntimeInformation from "./general/runtimeInformation";
import ModuleMappingInformation from "./general/moduleMappingInformation";

import * as utils from "./utils";
import Color from "../lib/color/color";

export default {
	name: "App",
	components: {
		BasicInformation,
		RuntimeInformation,
		// ModuleMappingInformation
	},
	data: () => ({
		data: {},
		config: {},
		runs: {},
		run_counts: 0,
		runtime: [],
		moduleMapping: [],
		rankBinCount: 20,
		runBinCount: 20,
		selectedIQRFactor: 0.15,
		targetColorMap: {
			Green: "#4EAF4A",
			Blue: "#4681B4",
			Brown: "#AF9B90",
			Red: "#A90400",
		},
	}),
	mounted() {
		document.title = "CallFlow - ";
		this.fetchData();
	},
	methods: {
		/**
		 * Send the request to /init endpoint
		 * Parameters: {datasetPath: "path/to/dataset"}
		*/ 
		async fetchData() {
			this.config = await APIService.GETRequest("config");

			document.title = "CallFlow - " + this.config.experiment;

			this.data = await APIService.POSTRequest("aux_data", {
				datasets: this.config.runs,
				rankBinCount: this.rankBinCount,
				runBinCount: this.runBinCount,
			});

			console.debug("[/aux_data] data: ", this.data);

			this.runs = this.data.runs;
			this.run_counts = this.runs.length;

			// Render the tables in the view
			const dataset_props = this.data.dataset;
			this.runtime = Object.keys(dataset_props).map((_) =>  { return {"run": _, ...dataset_props[_]};});
			const module_fct_list = this.data.moduleFctList;
			// TODO: Does not work as the format is weird.
			this.module_callsite_map = Object.keys(this.data.moduleCallsiteMap["ensemble"]).map((_) => { return {"module": module_fct_list[_], ...this.data.moduleCallsiteMap[_]};});
			
			this.setStore();
			this.setGlobalVariables(); // Set the variables that do not depend on data.
			this.setTargetDataset(); // Set target dataset.
			this.setupColors(); // Set up the colors.
			this.setViewDimensions(); // Set the view dimensions.
		},

		/**
		 * Attaches properties to central storage based on the data from .
		 */
		setStore() {
			this.$store.selectedDatasets = this.runs;
			this.$store.numOfRuns = this.runs.length;
			this.$store.modules = this.data.module;
			this.$store.callsites = this.data.callsite;
			this.$store.moduleCallsiteMap = this.data.moduleCallsiteMap;
			this.$store.callsiteModuleMap = this.data.callsiteModuleMap;
			this.$store.moduleFctList = this.data.moduleFctList;
			this.$store.selectedDatasets = this.data.runs;
			this.$store.runtimeProps = this.data.runtimeProps;
		},

		setGlobalVariables() {
			this.$store.selectedScatterMode = "mean";
			this.$store.selectedProp = "rank";

			this.$store.selectedIQRFactor = 0.15;
			this.$store.selectedRuntimeSortBy = this.selectedRuntimeSortBy;
			this.$store.selectedEdgeAlignment = "Top";

			// Used in sankey.js
			// TODO: Sankey should not have any store related properties. 
			this.$store.selectedSuperNodePositionMode = "Minimal edge crossing";

			// this.$store.auxiliarySortBy = this.auxiliarySortBy;
			this.$store.auxiliarySortBy = "time (inc)";
			this.$store.selectedMetric = "Inclusive";
		
			// Shoud be specified in the CSS, not here.
			this.$store.fontSize = 14;
			this.$store.transitionDuration = 1000;
	
			// Set the selected mode (Single or Ensemble)
			this.$store.selectedMode = this.run_counts > 1 ? "Ensemble": "Single";
			
			// Set the metric to sort the call site information
			this.$store.selectedRuntimeSortBy = "Inclusive";
		},

		sortDatasetsByAttr(datasets, attr) {
			let metricTimeMap = {};
			if (datasets.length == 1) {
				metricTimeMap[datasets[0]] = this.$store.runtimeProps.maxIncTime[datasets[0]];
				return datasets;
			}
			let ret = datasets.sort((a, b) => {
				let x = 0,
					y = 0;
				if (attr == "Inclusive") {
					x = this.$store.runtimeProps.maxIncTime[a];
					y = this.$store.runtimeProps.maxIncTime[b];
					metricTimeMap = this.$store.runtimeProps.maxIncTime;
				} else if (attr == "Exclusive") {
					x = this.$store.runtimeProps.maxExcTime[a];
					y = this.$store.runtimeProps.maxExcTime[b];
					metricTimeMap = this.$store.runtimeProps.maxExcTime;
				}
				return parseFloat(x) - parseFloat(y);
			});
			return ret, metricTimeMap;
		},

		setTargetDataset() {
			this.datasets, this.$store.metricTimeMap = this.sortDatasetsByAttr(
				this.runs,
				this.$store.selectedMetric
			);

			let max_dataset = "";
			let current_max_time = 0.0;

			let data = {};
			if (this.$store.selectedMetric == "Inclusive") {
				data = this.$store.runtimeProps.maxIncTime;
			} else if (this.$store.selectedMetric == "Exclusive") {
				data = this.$store.runtimeProps.maxExcTime;
			}

			for (let run_idx=0; run_idx < this.run_counts; run_idx += 1) {
				if (current_max_time < data[this.runs[run_idx]]) {
					current_max_time = data[this.runs[run_idx]];
					max_dataset = this.runs[run_idx];
				}
			}
			this.$store.selectedTargetDataset = max_dataset;

			console.log("Dataset with most runtimes: ", this.$store.selectedTargetDataset);
		},

		setupColors(selectedRuntimeColorMap, selectedDistributionColorMap) {
			// Create color object.
			this.$store.runtimeColor = new Color();
			this.$store.runtimeColorMap = this.$store.runtimeColor.getAllColors();
			
			if (selectedRuntimeColorMap) {
				this.setRuntimeColorScale(selectedRuntimeColorMap);
			}
			else {
				this.setRuntimeColorScale("OrRd");
			}

			if(this.$store.numOfRuns > 1) {
				// Create distribution color object
				this.$store.distributionColor = new Color();
				this.$store.distributionColorMap = this.$store.distributionColor.getAllColors();
				
				if(selectedDistributionColorMap) {
					this.setDistributionColorScale(selectedDistributionColorMap);
				} else {
					this.setDistributionColorScale("Reds");
				}

				this.selectedTargetColor = "Green";
				this.$store.distributionColor.target = this.targetColorMap[
					this.selectedTargetColor
				];
				this.$store.distributionColor.ensemble = "#C0C0C0";
				this.$store.distributionColor.compare = "#043060";

				// Create difference color object
				this.$store.diffColor = new Color();

				if(selectedDistributionColorMap) { 
					this.$store.selectedDistributionColorMap = selectedDistributionColorMap;
				}
				else{
					this.$store.selectedDistributionColorMap = "Reds";
				}
			}

			// Set properties into store.
			this.$store.selectedColorPoint = 9;
			this.$store.runtimeColor.intermediate = "#d9d9d9";
			this.$store.runtimeColor.highlight = "#C0C0C0";
			this.$store.runtimeColor.textColor = "#3a3a3a";
			this.$store.runtimeColor.edgeStrokeColor = "#888888";
		},

		// Set the min and max and assign color variables from Settings.
		setRuntimeColorScale(selectedRuntimeColorMap) {
			let colorMin = null;
			let colorMax = null;
			const runtimeProps = this.$store.runtimeProps;
			if (this.$store.numOfRuns > 1) {
				if (this.$store.selectedMetric == "Inclusive") {
					colorMin = parseFloat(runtimeProps.minIncTime["ensemble"]);
					colorMax = parseFloat(runtimeProps.maxIncTime["ensemble"]);
				} else if (this.$store.selectedMetric == "Exclusive") {
					colorMin = parseFloat(runtimeProps.minExcTime["ensemble"]);
					colorMax = parseFloat(runtimeProps.maxExcTime["ensemble"]);
				} else if (this.$store.selectedMetric == "Imbalance") {
					colorMin = 0.0;
					colorMax = 1.0;
				}
			} else {
				if (this.$store.selectedMetric == "Inclusive") {
					colorMin = parseFloat(
						runtimeProps.minIncTime[this.$store.selectedTargetDataset]
					);
					colorMax = parseFloat(
						runtimeProps.maxIncTime[this.$store.selectedTargetDataset]
					);
				} else if (this.$store.selectedMetric == "Exclusive") {
					colorMin = parseFloat(
						runtimeProps.minExcTime[this.$store.selectedTargetDataset]
					);
					colorMax = parseFloat(
						runtimeProps.maxExcTime[this.$store.selectedTargetDataset]
					);
				} else if (this.$store.selectedMetric == "Imbalance") {
					colorMin = 0.0;
					colorMax = 1.0;
				}
			}

			this.selectedColorMinText = utils.formatRuntimeWithoutUnits(
				parseFloat(colorMin)
			);
			this.selectedColorMaxText = utils.formatRuntimeWithoutUnits(
				parseFloat(colorMax)
			);

			this.$store.selectedColorMin = colorMin;
			this.$store.selectedColorMax = colorMax;

			this.$store.runtimeColor.setColorScale(
				this.$store.selectedMetric,
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

body {
	font-family: "Open Sans", sans-serif;
	font-size: 16px;
}

.toolbar {
	padding: 0px 0px 0px;
}

.toolbar > .v-toolbar__content {
	height: 54px !important;
}

.toolbar-title {
	margin-right: 3em; 
	font-size: 26px;
	font-weight: 400;
	color: white;
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

#footer {
	color: #fff;
}

/* Over write the primary text to avoid blue color change on selection*/
.my-app.v-application .primary--text {
	color: #fff !important;
	caret-color: #fff !important;
}
</style>