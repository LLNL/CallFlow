/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
  <div id="inspire">
	<Toolbar ref="ToolBar" :isSettingsOpen.sync="isSettingsOpen" />
    <v-navigation-drawer v-model.lazy="isSettingsOpen" temporary fixed>
      <v-card fill-height>
        <v-col>
			<v-row>
				<v-icon color="teal">settings</v-icon>
				<v-col cols="9" class="center teal--text">SETTINGS</v-col>
				<v-btn icon>
					<v-icon v-on:click="closeSettings()">close</v-icon>
				</v-btn>
			</v-row>
			<v-row align="center" justify="space-around">
				<v-btn class="mx-0" icon>
					Reload
					<v-icon v-on:click="reset()">refresh</v-icon>
				</v-btn>
			</v-row>
		</v-col>
      </v-card>
	<VisualEncoding ref="VisualEncoding"/>
    </v-navigation-drawer>

    <v-main class="pt-0">
		<splitpanes id="callgraph-dashboard" class="default-theme">
			<!-- Left column-->
			<splitpanes horizontal :splitpanes-size="25">
			<!-- <ModuleHierarchy ref="ModuleHierarchy" /> -->
			<EnsembleScatterplot ref="EnsembleScatterplot" />
			<EnsembleHistogram ref="EnsembleHistogram" />
			</splitpanes>

			<!-- Center column-->
			<splitpanes horizontal :splitpanes-size="55">
			<Sankey ref="Sankey" />
			</splitpanes>

			<!-- Right column-->
			<splitpanes horizontal :splitpanes-size="20">
			<CallsiteCorrespondence ref="CallsiteCorrespondence" />
			<ParameterProjection ref="ParameterProjection" />
			</splitpanes>
		</splitpanes>
    </v-main>
  </div>
</template>

<script>
// Library imports
import { mapGetters } from "vuex";
import Splitpanes from "splitpanes";
import "splitpanes/dist/splitpanes.css";

// Local library imports
import EventHandler from "lib/routing/EventHandler";
import Color from "lib/color/";

// Ensemble super graph dashboard imports
import CallsiteCorrespondence from "./callsiteCorrespondence/index_cc";
import EnsembleHistogram from "./ensembleHistogram/index_eh";
import ModuleHierarchy from "./moduleHierarchy/";
import EnsembleScatterplot from "./ensembleScatterplot/index_es";
import ParameterProjection from "./parameterProjection/index_pp";
import Sankey from "./sankey/index_sg";
import Toolbar from "./general/toolbar";
import VisualEncoding from "./settings/visualEncoding";

export default {
	name: "EnsembleSuperGraph",
	components: {
		Splitpanes,
		Toolbar,
		// Generic components
		Sankey,
		// Ensemble supergraph components.
		EnsembleScatterplot,
		EnsembleHistogram,
		// ModuleHierarchy,
		ParameterProjection,
		CallsiteCorrespondence,
		VisualEncoding,
	},

	// Not used currently. 
	props: {
		aux_data: Object
	},

	data: () => ({
		summaryChip: "Ensemble Super Graph",
		info:"",
		// comparisonMode: false,
		isSettingsOpen: false,
	}),

	computed: {
		...mapGetters({
			runs: "getRuns",
			summary: "getSummary",
			selectedTargetRun: "getSelectedTargetRun",
			selectedCompareRun: "getSelectedCompareRun",
			selectedMetric: "getSelectedMetric",
			metricTimeMap: "getMetricTimeMap",
			targetColorMap: "getTargetColorMap",
		})
	},

	beforeCreate() {
		this.$store.dispatch("fetchSummary");
	},

	watch: {
		showTarget: function (val) {
			EventHandler.$emit("show-target-auxiliary");
		},

		isSettingsOpen: function (val) {
			this.$emit("update:isSettingsOpen", val);
		},

		summary: function (val) {
			this.isDataReady = true;
			this.init();
		},
	},

	mounted() {
		this.setupStore();

		EventHandler.$on("lasso-selection", (selectedDatasets) => {
			this.$store.resetTargetDataset = true;
			this.$store.selectedDatasets = selectedDatasets;
			EventHandler.$emit("aux-data", {
				datasets: this.$store.selectedDatasets,
				rankBinCount: this.$store.selectedMPIBinCount,
				runBinCount: this.$store.selectedRunBinCount,
				reProcess: true,
			});
			this.reset();
		});

		EventHandler.$on("reset-esg", () => {
			self.reset();
		});
	},

	methods: {
		init() {
			this.$store.commit("setSelectedMode", "CCT");
			this.$store.commit("setEncoding", "MEAN");

			console.log("[ESG] Selected Run: ", this.selectedTargetRun);
			console.log("[ESG] Selected Mode: ", this.selectedMode);
			console.log("[ESG] Selected Metric: ", this.selectedMetric);

			this.currentComponents = this.setComponentMap(); // Set component mapping for easy component tracking.
			this.setupColors();

			// // TODO: need to rework on this.
			// this.$store.datasetMap = {};
			// for (let i = 0; i < this.$store.selectedDatasets.length; i += 1) {
			// 	this.$store.datasetMap[this.$store.selectedDatasets[i]] = "run-" + i;
			// }

			// Call the appropriate socket to query the server.
			this.initComponents(this.currentComponents);
		},

		setupColors(selectedDistributionColorMap) {
			// Create distribution color object
			this.$store.distributionColor = new Color();
			this.$store.distributionColorMap = this.$store.distributionColor.getAllColors();
			
			// this.setDistributionColorScale(selectedDistributionColorMap);

			this.selectedTargetColor = "Green";
			this.$store.distributionColor.target = this.targetColorMap[
				this.selectedTargetColor
			];
			this.$store.distributionColor.ensemble = "#C0C0C0";
			this.$store.distributionColor.compare = "#043060";

			// Create difference color object
			this.$store.diffColor = new Color();
			this.$store.selectedDistributionColorMap = selectedDistributionColorMap;
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

		setupStore() {
			// Set the mode. (Either single or ensemble).
			this.$store.selectedMode = this.selectedMode;

			// Set the scale for information (log or linear)
			this.$store.selectedScale = this.selectedScale;
			
			// Comparison mode in histograms.
			this.$store.comparisonMode = this.comparisonMode;

			// Set this.selectedTargetDataset (need to remove)
			this.selectedTargetDataset = this.$store.selectedTargetDataset;

			// Set the datasets
			this.datasets = this.$store.selectedDatasets;

			this.$store.encoding = "MEAN_GRADIENTS";
			
			// TODO: Need to clean this up.....
			// Too many repeated values....
			this.$store.selectedMPIBinCount = 20;
			this.$store.selectedRunBinCount = 20;
			
			this.$store.auxiliarySortBy = this.auxiliarySortBy;
			this.$store.showTarget = this.showTarget;
	
			this.$store.nodeInfo = {};
			this.$store.selectedHierarchyMode = this.selectedHierarchyMode;

			this.$store.selectedScale = "Linear";
			this.$store.selectedIQRFactor = this.selectedIQRFactor;
			this.$store.selectedRuntimeSortBy = this.selectedRuntimeSortBy;
			this.$store.selectedNumOfClusters = this.selectedNumOfClusters;
			this.$store.selectedEdgeAlignment = "Top";

			this.$store.selectedFormat = "EnsembleSuperGraph";
		},

		setComponentMap() {
			return [
				// this.$refs.Sankey,
				this.$refs.EnsembleHistogram,
				this.$refs.EnsembleScatterplot,
				// this.$refs.CallsiteCorrespondence,
				// this.$refs.ParameterProjection,
				// this.$refs.ModuleHierarchy,
				// this.$refs.VisualEncoding
			];
		},

		clear() {
			this.clearComponents(this.currentComponents);
		},

		initComponents(componentList) {
			for (let i = 0; i < componentList.length; i++) {
				componentList[i].init();
			}
		},

		clearComponents(componentList) {
			for (let i = 0; i < componentList.length; i++) {
				componentList[i].clear();
			}
		},
		
		reset() {
			this.clear();
			this.init();
		},

		closeSettings() {
			this.isSettingsOpen = !this.isSettingsOpen;
		},
	},
};
</script>
