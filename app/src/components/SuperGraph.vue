/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
  <div id="inspire">
    <Toolbar ref="ToolBar" :isSettingsOpen.sync="isSettingsOpen" />
    <v-navigation-drawer v-model.lazy="isSettingsOpen" fixed>
      <v-btn slot="activator" color="primary" dark>Open Dialog</v-btn>
      <v-card flex fill-height id="control-panel">
        <v-layout row wrap>
          <v-btn icon>
            <v-icon v-on:click="reset()">refresh</v-icon>
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn icon>
            <v-icon v-on:click="closeSettings()">close</v-icon>
          </v-btn>

          <!-- --------------------------- Visual Encoding ----------------------------------->
          <v-flex xs12 class="ma-1">
            <v-subheader class="teal lighten-4">Visual Encoding</v-subheader>
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-select
              label="Metric"
              :items="metrics"
              v-model="selectedMetric"
              :menu-props="{maxHeight: '200'}"
              persistent-hint
            >
            </v-select>
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-text-field
              label="Number of bins for MPI Distribution"
              class="mt-0"
              type="number"
              v-model="selectedMPIBinCount"
              :menu-props="{maxHeight: '200'}"
              persistent-hint
            >
            </v-text-field>
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-select
              label="Scale"
              :items="scales"
              v-model="selectedScale"
              :menu-props="{maxHeight: '200'}"
              persistent-hint
            >
            </v-select>
          </v-flex>

          <!-- --------------------------- Encoding ----------------------------------->
          <v-flex xs12 class="ma-1">
            <v-subheader class="teal lighten-4">Colors</v-subheader>
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-select
              label="Runtime Color Map"
              :items="runtimeColorMap"
              v-model="selectedRuntimeColorMap"
              :menu-props="{maxHeight: '200'}"
              persistent-hint
            >
            </v-select>
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-text-field
              label="Color points (3-9)"
              class="mt-0"
              type="number"
              v-model="selectedColorPoint"
              :menu-props="{maxHeight: '200'}"
              persistent-hint
            >
            </v-text-field>
          </v-flex>

          <!----------------------------- Callsite information ----------------------------------->
          <v-flex xs12 class="ma-1">
            <v-subheader class="teal lighten-4"
              >Call site Information</v-subheader
            >
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-select
              label="Sort by"
              :items="sortByModes"
              v-model="selectedRuntimeSortBy"
              :menu-props="{maxHeight: '200'}"
              persistent-hint
            >
            </v-select>
          </v-flex>
        </v-layout>
      </v-card>
    </v-navigation-drawer>

    <v-main class="pt-0">
      <splitpanes id="callgraph-dashboard" class="default-theme">
        <!-- Left column-->
        <splitpanes horizontal :splitpanes-size="25">
          <SingleHistogram ref="SingleHistogram" />
          <SingleScatterplot ref="SingleScatterplot" />
        </splitpanes>

        <!-- Center column-->
        <splitpanes horizontal :splitpanes-size="55">
          <Sankey ref="Sankey" />
        </splitpanes>

        <!-- Right column-->
        <splitpanes horizontal :splitpanes-size="20">
          <CallsiteInformation ref="CallsiteInformation" />
        </splitpanes>
      </splitpanes>
    </v-main>
  </div>
</template>

<script>
// Library imports
import Splitpanes from "splitpanes";
import "splitpanes/dist/splitpanes.css";

// Local library imports
import EventHandler from "lib/routing/EventHandler";

// Super graph dashboard imports
import SingleScatterplot from "./singleScatterplot/index_ss";
import SingleHistogram from "./singleHistogram/index_sh";
import CallsiteInformation from "./callsiteInformation/index_ci";
import Sankey from "./sankey/index_sg";
import Toolbar from "./general/toolbar";

export default {
	name: "SuperGraph",
	components: {
		Splitpanes,
		Toolbar,
		// Generic components
		Sankey,
		// Single supergraph components.
		SingleScatterplot,
		SingleHistogram,
		CallsiteInformation,
	},

	props: {
		aux_data: Object,
	},

	data: () => ({
		isSettingsOpen: false,
		groupBy: ["Name", "Module", "File"],
		selectedGroupBy: "Module",
		filterBy: ["Inclusive", "Exclusive"],
		filterRange: [0, 100],
		selectedFilterBy: "Inclusive",
		selectedIncTime: 0,
		filterPercRange: [0, 100],
		selectedFilterPerc: 5,
		metrics: ["Exclusive", "Inclusive"],
		selectedMetric: "Inclusive",
		runtimeColorMap: [],
		distributionColorMap: [],
		selectedRuntimeColorMap: "OrRd",
		colorPoints: [3, 4, 5, 6, 7, 8, 9],
		selectedColorPoint: 9,
		selectedColorMin: null,
		selectedColorMax: null,
		selectedColorMinText: "",
		selectedColorMaxText: "",
		scatterMode: ["mean", "all"],
		selectedScatterMode: "all",
		isCallgraphInitialized: false,
		isCCTInitialized: false,
		ranks: [],
		initLoad: true,
		comparisonMode: false,
		selectedOutlierBand: 4,
		defaultCallSite: "<program root>",
		modes: ["Ensemble", "Single"],
		selectedMode: "Single",
		selectedMPIBinCount: 20,
		selectedRuntimeSortBy: "Inclusive",
		sortByModes: ["Inclusive", "Exclusive", "Standard Deviation"],
		scales: ["Log", "Linear"],
		selectedScale: "Linear",
		props: ["name", "rank", "dataset", "all_ranks"],
		selectedProp: "rank",
		metricTimeMap: {}, // Stores the metric map for each dataset (sorted by inclusive/exclusive time),
		selectedRunBinCount: 20,
		summary: "Super Graph View"
	}),

	watch: {
		showTarget: function (val) {
			EventHandler.$emit("show-target-auxiliary");
		},

		isSettingsOpen: function (val) {
			this.$emit("update:isSettingsOpen", val);
		},

		selectedMetric: function (val) {
			this.$store.selectedMetric = val;
			EventHandler.$emit("setup-colors");
			this.reset();
		},

		selectedRuntimeColorMap(val) {
			this.$parent.$parent.setupColors(val);
			this.reset();
		},

		selectedRuntimeSortBy(val) {
			this.$store.selectedRuntimeSortBy = val;
			EventHandler.$emit("callsite-information-sort");
		},

		// NOTE: This functionality is broken!!!
		// The request times out because the auxiliary processing
		// exceeds the threshold set by the APIService.
		// TODO: CAL-88: Fix the time out error and use events
		// instead of a this.reset()
		async selectedMPIBinCount(val) {
			this.$store.selectedMPIBinCount = val;
			const data = await this.requestAuxData();

			// TODO: CAL-88 Fix the timeout error.
			// EventHandler.$emit("update-rank-bin-size", {
			// 	node: this.$store.selectedNode,
			// 	dataset: this.$store.selectedTargetDataset
			// });
			this.reset();
		},

		selectedScale(val) {
			this.$store.selectedScale = val;
			this.reset();
		},

		selectedIQRFactor(val) {
			this.$store.selectedIQRFactor = val;
			this.reset();
		},

		selectedTargetDataset(val) {
			this.$store.selectedTargetDataset = val;
			this.reset();
		},

		selectedColorPoint(val) {
			this.$store.selectedColorPoint = val;
			EventHandler.$emit("setup-colors");
			this.$parent.$parent.setupColors(this.selectedRuntimeColorMap);
			this.reset();
		},
	},

	mounted() {
		this.setupStore();

		// Push to '/' when `this.$store.selectedDatasets` is undefined.
		if (this.$store.selectedDatasets === undefined) {
			// this.requestAuxData();  // TODO: Fix the bug here.
			this.$router.push("/");
		} else {
			this.init();
		}

		EventHandler.$on("lasso_selection", () => {
			this.$store.resetTargetDataset = true;
			this.clear();
			this.setTargetDataset();
			this.fetchData();
		});
	},

	methods: {
		init() {
			this.setComponentMap(); // Set component mapping for easy component tracking.

			console.log("Mode : ", this.$store.selectedMode);
			console.log("Number of runs :", this.$store.numOfRuns);
			console.log("Target Dataset : ", this.$store.selectedTargetDataset);
			console.log("Node: ", this.$store.selectedNode);
			console.log("Run Bin size", this.$store.selectedRunBinCount);
			console.log("MPI Bin size", this.$store.selectedMPIBinCount);

			// Call the appropriate socket to query the server.
			this.initComponents(this.currentSingleSuperGraphComponents);
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

			// Set the metricTimeMap, used by the dropdown to select the dataset.
			this.metricTimeMap = this.$store.metricTimeMap;

			// Set the runtimeColorMap.
			this.runtimeColorMap = this.$store.runtimeColorMap;

			// Set encoding method.
			this.$store.encoding = "MEAN";

			this.$store.selectedNode = "ApplyMaterialPropertiesForElems";
		},

		// ----------------------------------------------------------------
		// Initialize the relevant modules for respective Modes.
		// ----------------------------------------------------------------
		setComponentMap() {
			this.currentSingleSuperGraphComponents = [
				this.$refs.SingleHistogram,
				this.$refs.SingleScatterplot,
				this.$refs.Sankey,
				this.$refs.CallsiteInformation,
			];
		},

		clear() {
			this.clearComponents(this.currentSingleSuperGraphComponents);
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

		async requestAuxData() {
			const payload = {
				datasets: this.$store.selectedDatasets,
				rankBinCount: this.$store.selectedMPIBinCount,
				runBinCount: this.$store.selectedRunBinCount,
				reProcess: true,
			};
			return await this.$parent.$parent.fetchData(payload);
		},
	},
};
</script>