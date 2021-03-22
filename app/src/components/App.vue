/**
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 *
 * SPDX-License-Identifier: MIT
 */

<template>
	<v-app>
		<v-app-bar color="teal" id="toolbar" app>
			<div class="toolbar-title">
				CallFlow
			</div>
			<v-btn class="mr-md-4">
				<router-link to="/cct" replace>CCT</router-link>
			</v-btn>
			<v-btn class="mr-md-4">
				<router-link to="/super_graph" replace>Super Graph</router-link>
			</v-btn>
			<v-btn class="mr-md-4" v-if="run_counts > 1">
				<router-link to="/ensemble_super_graph" replace>Ensemble Super Graph</router-link>
			</v-btn>
			<!-- <v-btn v-if="run_counts > 1">
				<router-link to="/timeline_super_graph" replace>Timeline</router-link>
			</v-btn> -->
		</v-app-bar>
		<v-main>
			<Loader ref="Loader" :isDataReady="isDataReady" />
			<router-view></router-view>
			<Summary ref="Summary" v-if="$route.path == '/'" :config="config"
			:profiles="profiles" :moduleCallsiteMap="moduleCallsiteMap" />
		</v-main>
		<Footer ref="Footer" :text="footerText" :year="year"></Footer>
	</v-app>
</template>

<script>
// Local library imports
import * as utils from "lib/utils";
import Color from "lib/color/";
import APIService from "lib/routing/APIService";
import EventHandler from "lib/routing/EventHandler";
import moment from "moment";

// Local components
import Footer from "./general/footer";
import Loader from "./general/loader";

// General components
import Summary from "./Summary";

export default {
	name: "App",
	components: {
		Summary,
		Footer,
		Loader,
	},
	data: () => ({
		data: {},
		runs: {},
		config: {},
		profiles: [],
		moduleMap: [],
		run_counts: 0,
		rankBinCount: 20,
		runBinCount: 20,
		selectedIQRFactor: 0.15,
		targetColorMap: {
			Green: "#4EAF4A",
			Blue: "#4681B4",
			Brown: "#AF9B90",
			Red: "#A90400",
		},
		footerText: "Lawrence Livermore National Laboratory and VIDi Labs, University of California, Davis",
		year: "2021",
		isDataReady: false,
		moduleCallsiteMap: {},
	}),

	mounted() {
		document.title = "CallFlow - ";
		this.init();

		let self = this;
		EventHandler.$on("setup-colors", () => {
			self.setupColors(this.$store.selectedRuntimeColorMap, this.$store.selectedDistributionColorMap);
		});

		EventHandler.$on("aux-data", (payload) => {
			this.fetchData(payload);
		});
	},

	methods: {
		async init() {
			this.config = await APIService.GETRequest("config");
			this.$store.config = this.config;

			document.title = "CallFlow - " + this.$store.config.experiment;

			this.runs = this.$store.config.runs.map((_) => _["name"]);
			this.run_counts = this.runs.length;

			await this.fetchData();
			this.isDataReady = true;
			// this.initStore(data);
		},

		/**
		 * Send the request to /init endpoint
		 * Parameters: {datasetPath: "path/to/dataset"}
		*/ 
		async fetchData(payload) {
			if(!payload) {
				payload = {
					datasets: this.runs,
					rankBinCount: this.rankBinCount,
					runBinCount: this.runBinCount,
					reProcess: false,
				};
			}
			const aux_data = await APIService.POSTRequest("aux_data", payload);
			this.initStore(aux_data);
			// TODO: Remove this shortcut.
			this.$refs.Summary.init(this.moduleCallsiteMap);
			return;
		},

		initStore(data) {
			this.setAuxVariables(data); // Set the variables that are affected by auxiliary data.
			this.setGlobalVariables(); // Set the general variables in the store.
			this.setLocalVariables(data); // Set the local variables (i.e., in this component).
			this.setViewDimensions(); // Set the view dimensions.
		},

		/**
		 * Attaches properties to central storage based on the data from `this.auxiliary_data`.
		 */
		setAuxVariables(data) {
			this.$store.summary = utils.swapKeysToDict(data, "summary");
			this.$store.data_mod = utils.swapKeysToDict(data, "data_mod");
			this.$store.data_cs = utils.swapKeysToDict(data, "data_cs");
			this.$store.m2c = utils.swapKeysToDict(data, "m2c");
			this.$store.c2m = utils.swapKeysToDict(data, "c2m");
			this.$store.modules = utils.swapKeysToDict(data, "modules");
		},

		/**
     	 * Per dataset information.
     	 */
		setModuleWiseInfo(data, module_idx, metric_type, info_type, sort_by, include_modules) {
			let ret = [];
			for (let [dataset, d] of Object.entries(data)) {
				let _r = {};
				_r["name"] = dataset;
				let total = 0;
				for (let [elem, _d] of Object.entries(d)) {
					const module_name = module_idx[dataset][elem];
					if(include_modules.includes(module_name)) {
						_r[module_idx[dataset][elem]] = _d[metric_type][info_type];
					}
					total += _d[metric_type][info_type];
				}
				_r["time"] = moment(new Date(+(new Date()) - Math.floor(Math.random()*10000000000)));
				_r["total"] = total;
				ret.push(_r);
			}
			return ret.sort((a, b) => b[sort_by] - a[sort_by]);
		},

		sortByAttribute(callsites, metric_type, info_type, top_n, module_idx) {
			let items = Object.keys(callsites).map( (key) => {
				return [key, callsites[key]];
			});
 
			items = items.sort( (first, second) => {
				return second[1][metric_type][info_type] - first[1][metric_type][info_type];
			});

			if(top_n < items.length) {
				items = items.slice(items.length - top_n);
			}

			callsites = items.reduce((lst, obj) => { lst.push(module_idx[obj[1]["name"]]); return lst; }, []);

			return callsites;
		},

		setLocalVariables(data) {
			// Render the tables in the view
			this.profiles = utils.swapKeysToArray(data, "summary");


			// Restrict to top n modules from the ensemble, if n < 10 then we would
			// default to n modules.
			const top_n_modules = this.sortByAttribute(this.$store.data_mod["ensemble"], "time", "mean", 10, this.$store.modules["ensemble"]);
			
			const objectMap = (obj, fn) => Object.fromEntries(Object.entries(obj).map(([k, v], i) => [k, fn(v, k, i)]));

			const remove_ensemble = objectMap(this.$store.data_mod, (_, x) => { if(x != "ensemble") return _; else return {};});
			delete remove_ensemble["ensemble"]; // Bring this back if we need to.

			// Formulate the data for the module-wise summary information.
			this.moduleCallsiteMap = this.setModuleWiseInfo(
				remove_ensemble,
				this.$store.modules,
				"time (inc)",
				"mean",
				"total",
				top_n_modules
			);

			this.$store.metricTimeMap = Object.keys(data).reduce((res, item, idx) => { 
				if(item != "ensemble"){
					res[item] = data[item]["summary"][this.$store.selectedMetric][1];
				}
				return res;
			}, {});

			this.$store.selectedTargetDataset = utils.getKeyWithMaxValue(this.$store.metricTimeMap);
			this.$store.selectedNode = this.$store.summary[this.$store.selectedTargetDataset]["roots"][0];
		},

		setGlobalVariables() {
			this.$store.selectedScatterMode = "mean";
			this.$store.selectedProp = "rank";

			this.$store.selectedIQRFactor = 0.15;
			this.$store.selectedRunBinCount = 20;
			this.$store.selectedMPIBinCount = 20;
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

			this.$store.numOfRuns = this.runs.length;
			this.$store.selectedDatasets = this.runs;
		},

		setupColors(selectedRuntimeColorMap, selectedDistributionColorMap) {
			this.$store.runtimeColor = new Color();
			this.$store.runtimeColorMap = this.$store.runtimeColor.getAllColors();
			
			this.setRuntimeColorScale(selectedRuntimeColorMap, this.$store.selectedMetric);


			if(this.$store.numOfRuns > 1 && this.$store.selectedFormat == "EnsembleSuperGraph") {
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
			for (let module in this.$store.data_mod[this.$store.selectedTargetDataset]) {
				let node = this.$store.data_mod[this.$store.selectedTargetDataset][module];
				const vals = node[this.$store.selectedMetric]["gradients"]["hist"]["h"];
				hist_min = Math.min(
					hist_min,
					Math.min(...vals)
				);
				hist_max = Math.max(
					hist_max,
					Math.max(...vals)
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

			this.$store.viewHeight = window.innerHeight;/// - 2 * toolbarHeight - footerHeight;
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
	margin: 1em; 
	font-size: 22px;
	font-weight: 400;
	color: white;
}

body {
	font-family: "Open Sans", sans-serif;
	font-size: 16px;
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

/** start Lasso CSS */
.drawn {
	fill: rgba(255, 255, 255, 0.5);
	stroke: #009688;
	stroke-width: 1.5px;
}

.origin {
	fill: #009688;
	opacity: 0.5;
}
/** end Lasso CSS */
</style>