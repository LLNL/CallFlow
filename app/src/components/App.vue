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
			<Summary ref="Summary" v-if="$route.path == '/'" :config="config" />
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
		config: {},
		moduleMap: [],
		run_counts: 0,
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
	},

	methods: {
		async init() {
			this.config = await APIService.GETRequest("config");
			this.run_counts = this.config.runs.map((_) => _["name"]).length;
			this.$store.config = this.config;

			document.title = "CallFlow - " + this.$store.config.experiment;

			this.setGlobalVariables(); // Set the general variables in the store.
			this.setViewDimensions(); // Set the view dimensions.

			this.$refs.Summary.init();
			this.isDataReady = true;
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

			this.$store.viewWidth = window.innerWidth;
			this.$store.viewHeight = window.innerHeight - footerHeight;
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