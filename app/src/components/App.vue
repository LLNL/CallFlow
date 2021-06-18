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
			<v-btn class="mr-md-4">
				<router-link to="/ensemble_super_graph" replace>Ensemble Super Graph</router-link>
			</v-btn>
		</v-app-bar>
		<v-main>
			<router-view></router-view>
		</v-main>
		<Footer ref="Footer" :text="footerText" :year="year"></Footer>
	</v-app>
</template>

<script>
// Local library imports
import Color from "lib/color/";

// Local components
import Footer from "./general/footer";

export default {
	name: "App",
	components: {
		Footer,
	},
	data: () => ({
		run_counts: 0,
		footerText: "Lawrence Livermore National Laboratory and VIDi Labs, University of California, Davis",
		year: "2021",
		isDataReady: false,
	}),

	mounted() {
		document.title = "CallFlow";

		this.setGlobalVariables(); // Set the general variables in the store.
		this.setViewDimensions(); // Set the view dimensions.	
	},

	methods: {
		setGlobalVariables() {
			console.log("[App] Set global variables.");
			this.$store.selectedProp = "rank";

			this.$store.selectedIQRFactor = 0.15;
			// this.$store.selectedRunBinCount = 20;
			// this.$store.selectedMPIBinCount = 20;
			// this.$store.selectedEdgeAlignment = "Top";

			// Used in sankey.js
			// TODO: Sankey should not have any store related properties. 
			// this.$store.selectedSuperNodePositionMode = "Minimal edge crossing";

			this.$store.auxiliarySortBy = "time (inc)";
			// this.$store.selectedMetric = "time (inc)";
		
			// Shoud be specified in the CSS, not here.
			this.$store.fontSize = 14;
			this.$store.transitionDuration = 1000;
	
			// Set the selected mode (Single or Ensemble)
			// this.$store.selectedMode = this.run_counts > 1 ? "Ensemble": "Single";
			
			// Set the metric to sort the call site information
			// this.$store.selectedRuntimeSortBy = "time (inc)";
			// this.$store.selectedMetric = "time (inc)";
			
			// Histogram properties
			this.$store.selectedScale = "Linear";

			// Color properties
			// this.$store.selectedRuntimeColorMap = "OrRd";
			// this.$store.selectedColorPoint = 9;
			this.$store.runtimeColor = new Color("OrRd");
			// this.$store.runtimeColor.intermediate = "#d9d9d9";
			// this.$store.runtimeColor.highlight = "#C0C0C0";
			// this.$store.runtimeColor.textColor = "#3a3a3a";
			// this.$store.runtimeColor.edgeStrokeColor = "#888888";

			// // Ensemble color properites
			this.$store.distributionColor = new Color("Greens");
			// this.$store.distributionColor.ensemble = "#C0C0C0";
			// this.$store.distributionColor.compare = "#043060";
		},

		// setupColors(selectedRuntimeColorMap, selectedDistributionColorMap) {
		// 	this.$store.runtimeColor = new Color();
		// 	this.$store.runtimeColorMap = this.$store.runtimeColor.getAllColors();
			
		// 	this.setRuntimeColorScale(selectedRuntimeColorMap, this.$store.selectedMetric);

		// 	if(this.$store.numOfRuns > 1 && this.$store.selectedFormat == "EnsembleSuperGraph") {
		// 		// Create distribution color object
		// 		this.$store.distributionColor = new Color();
		// 		this.$store.distributionColorMap = this.$store.distributionColor.getAllColors();
				
		// 		this.setDistributionColorScale(selectedDistributionColorMap);

		// 		this.selectedTargetColor = "Green";
		// 		this.$store.distributionColor.target = this.targetColorMap[
		// 			this.selectedTargetColor
		// 		];
		// 		this.$store.distributionColor.ensemble = "#C0C0C0";
		// 		this.$store.distributionColor.compare = "#043060";

		// 		// Create difference color object
		// 		this.$store.diffColor = new Color();
		// 		this.$store.selectedDistributionColorMap = selectedDistributionColorMap;
		// 	}

		// },

		// setDistributionColorScale(selectedDistributionColorMap) {
		// 	let hist_min = 0;
		// 	let hist_max = 0;
		// 	for (let module in this.$store.data_mod[this.$store.selectedTargetDataset]) {
		// 		let node = this.$store.data_mod[this.$store.selectedTargetDataset][module];
		// 		const vals = node[this.$store.selectedMetric]["gradients"]["hist"]["h"];
		// 		hist_min = Math.min(
		// 			hist_min,
		// 			Math.min(...vals)
		// 		);
		// 		hist_max = Math.max(
		// 			hist_max,
		// 			Math.max(...vals)
		// 		);
		// 	}
		// 	this.$store.distributionColor.setColorScale(
		// 		"MeanGradients",
		// 		hist_min,
		// 		hist_max,
		// 		selectedDistributionColorMap,
		// 		this.$store.selectedColorPoint
		// 	);
		// },

		setViewDimensions() {
			console.log("[App] Set view dimensions.");

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
			this.$store.viewHeight = window.innerHeight - toolbarHeight - footerHeight;
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
	font-size: 1em;
}


.selected {
	stroke: #343838;
	stroke-width: 1px;
}

.unselected {
	stroke: #dbdbdb;
	stroke-width: 3px;
}

/* .big_text {
	font-size: 32px;
} */

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
	font-size: 1.25em;
}

.scroll {
	overflow-y: auto;
}

.tooltip {
	padding-left: 10px;
	font-size: 0.75em;
	font-weight: 500;
}

.setting-button {
	border: 0px solid !important;
	right: 0px !important;
	color: #009688 !important;
	font-size: 2em !important;
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