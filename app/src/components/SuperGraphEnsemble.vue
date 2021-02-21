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
            <v-subheader>
              {{ targetInfo }}
              <v-spacer></v-spacer>
              <v-spacer></v-spacer>
              <v-switch
                v-model="showTarget"
                v-on:change="reset()"
                color="#009687"
              >
              </v-switch>
            </v-subheader>
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-select
              label="Metric"
              :items="metrics"
              v-model="selectedMetric"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
            >
            </v-select>
          </v-flex>

          <!-- <v-flex
					xs12
					class="ma-1"
				>
					<v-select
						label="Difference mode"
						:items="compareModes"
						v-model="selectedCompareMode"
						:menu-props="{ maxHeight: '200' }"
						persistent-hint
						v-on:change="updateCompareMode()"
					>
					</v-select>
				</v-flex> -->
          <v-flex xs12 class="ma-1">
            <v-text-field
              label="Number of bins for Run Distribution"
              class="mt-0"
              type="number"
              v-model="selectedRunBinCount"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
            >
            </v-text-field>
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-text-field
              label="Number of bins for MPI Distribution"
              class="mt-0"
              type="number"
              v-model="selectedMPIBinCount"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
            >
            </v-text-field>
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-select
              label="Scale"
              :items="scales"
              v-model="selectedScale"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
            >
            </v-select>
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-select
              label="Bin by attribute"
              :items="props"
              v-model="selectedProp"
              :menu-props="{ maxHeight: '200' }"
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
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
            >
            </v-select>
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-select
              label="Distribution Color Map"
              :items="distributionColorMap"
              v-model="selectedDistributionColorMap"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
            >
            </v-select>
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-select
              label="Target Color"
              :items="targetColors"
              v-model="selectedTargetColor"
              :menu-props="{ maxHeight: '200' }"
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
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
            >
            </v-text-field>
          </v-flex>
          <!-- <v-flex xs12 class="ma-1">
            <v-text-field
              label="Color minimum (in seconds)"
              class="mt-0"
              type="number"
              v-model="selectedColorMinText"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
            >
            </v-text-field>
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-text-field
              label="Color maximum (in seconds)"
              class="mt-0"
              type="number"
              v-model="selectedColorMaxText"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
            >
            </v-text-field>
          </v-flex> -->

          <!----------------------------- Callsite information ----------------------------------->
          <v-flex xs12 class="ma-1">
            <v-subheader class="teal lighten-4"
              >Call site Correspondence</v-subheader
            >
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-select
              label="Sort by"
              :items="sortByModes"
              v-model="selectedRuntimeSortBy"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
            >
            </v-select>
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-text-field
              label="IQR Factor"
              class="mt-0"
              type="float"
              v-model="selectedIQRFactor"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
            >
            </v-text-field>
          </v-flex>
        </v-layout>
      </v-card>
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
import Splitpanes from "splitpanes";
import "splitpanes/dist/splitpanes.css";

// Local library imports
import EventHandler from "lib/routing/EventHandler";
import APIService from "lib/routing/APIService";

// Ensemble super graph dashboard imports
import CallsiteCorrespondence from "./callsiteCorrespondence/index_cc";
import EnsembleHistogram from "./ensembleHistogram/index_eh";
import ModuleHierarchy from "./moduleHierarchy/";
import EnsembleScatterplot from "./ensembleScatterplot/index_es";
import ParameterProjection from "./parameterProjection/index_pp";
import Sankey from "./sankey/index_sg";
import Toolbar from "./general/toolbar";

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
	},

	// Not used currently. 
	props: {
		aux_data: Object
	},

	data: () => ({
		appName: "CallFlow",
		left: false,
		datasets: [],
		selectedTargetDataset: "",
		selectedDataset2: "",
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
		selectedRuntimeColorMap: "Blues",
		selectedDistributionColorMap: "Reds",
		colorPoints: [3, 4, 5, 6, 7, 8, 9],
		selectedColorPoint: 9,
		selectedColorMin: null,
		selectedColorMax: null,
		selectedColorMinText: "",
		selectedColorMaxText: "",
		groupModes: ["include callbacks", "exclude callbacks"],
		selectedGroupMode: "include callbacks",
		scatterMode: ["mean", "all"],
		selectedScatterMode: "all",
		selectedFunctionsInCCT: 70,
		selectedDiffNodeAlignment: "Top",
		diffNodeAlignment: ["Middle", "Top"],
		isCallgraphInitialized: false,
		isCCTInitialized: false,
		datas: ["Dataframe", "Graph"],
		selectedData: "Dataframe",
		firstRender: true,
		summaryChip: "Ensemble Super Graph",
		auxiliarySortBy: "time (inc)",
		ranks: [],
		initLoad: true,
		comparisonMode: false,
		selectedCompareDataset: null,
		compareModes: ["MEAN_DIFF", "RANK_DIFF"],
		selectedCompareMode: "MEAN_DIFF",
		selectedOutlierBand: 4,
		modes: ["Ensemble", "Single"],
		selectedMode: "Ensemble",
		// Presentation mode variables
		exhibitModes: ["Presentation", "Default"],
		selectedExhibitMode: "Default",
		presentationPage: 0,
		presentationOrder: [
			"run_information",
			"ensemble_supergraph",
			"ensemble_gradients",
			"ensemble_mini_histogram",
			"module_hierarchy",
			"ensemble_auxiliary",
			"ensemble_similarity",
			"ensemble_projection",
		],
		parameter_analysis: true,
		selectedRunBinCount: 20,
		selectedMPIBinCount: 20,
		selectedHierarchyMode: "Uniform",
		hierarchyModes: ["Uniform", "Exclusive"],
		selectedRuntimeSortBy: "Inclusive",
		sortByModes: ["Inclusive", "Exclusive", "Standard Deviation"],
		scales: ["Log", "Linear"],
		selectedScale: "Linear",
		props: ["name", "rank", "dataset", "all_ranks"],
		selectedProp: "dataset",
		dimensions: ["max_inclusive_time", "max_exclusive_time", "rank_count"],
		selectedPC1: "max_inclusive_time",
		selectedPC2: "max_exclusive_time",
		selectedIQRFactor: 0.15,
		selectedNumOfClusters: 3,
		targetColorMap: {
			Green: "#4EAF4A",
			Blue: "#4681B4",
			Brown: "#AF9B90",
			Red: "#A90400",
		},
		targetColors: ["Green", "Blue", "Brown"],
		selectedTargetColor: "Green",
		showTarget: true,
		targetInfo: "Target Guides",
		metricTimeMap: {}, // Stores the metric map for each dataset (sorted by inclusive/exclusive time),
		isSettingsOpen: false,
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
			this.$parent.$parent.setupColors(this.selectedRuntimeColorMap);
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
			this.$parent.$parent.setupColors(this.selectedRuntimeColorMap);
			this.reset();
		},

		selectedTargetColor(val) {
			this.$store.selectedTargetColor = val;
			this.reset();
		},

		auxiliarySortBy(val) {
			this.$store.auxiliarySortBy = val;
			EventHandler.$emit("update-auxiliary-sort-by");
		},

		async selectedRunBinCount(val) {
			this.$store.selectedRunBinCount = val;
			// TODO: Need to do something here.
			const data = await this.requestAuxData();
			this.reset();
		},

		async selectedMPIBinCount(val) {
			this.$store.selectedRunBinCount = val;
			const data = await this.requestAuxData();
			this.reset();
		},

		selectedProp(val) {
			this.$store.selectedProp = val;
			this.reset();
		},

		selectedDistributionColorMap(val) {
			this.$store.selectedDistributionColorMap = val;
			this.$parent.$parent.setupColors(this.selectedDistributionColorMap);
			this.reset();
		},

		async selectedCompareDataset(val) {
			this.summaryChip = "Diff SuperGraph";
			this.$store.selectedCompareDataset = val;
			this.$store.comparisonMode = true;
			this.$store.encoding = this.selectedCompareMode;
			const data = await APIService.POSTRequest("compare", {
				targetDataset: this.$store.selectedTargetDataset,
				compareDataset: this.$store.selectedCompareDataset,
				selectedMetric: this.$store.selectedMetric,
			});
			this.$refs.SuperGraph.activateCompareMode(data);
		},

		selectedNumOfClusters(val) {
			this.$store.selectedNumOfClusters = val;
			EventHandler.$emit("update-number-of-clusters");
		},
	},

	mounted() {
		this.setupStore();

		// Push to '/' when `this.$store.selectedDatasets` is undefined.
		if (this.$store.selectedDatasets === undefined) {
			// TODO: Instead of pushing to /, we should populate the variables. 
			this.$router.push("/");
		}
		else {
			this.init();
		}

		EventHandler.$on("lasso_selection", () => {
			this.$store.resetTargetDataset = true;
			this.clearLocal();
			this.setTargetDataset();
			this.requestEnsembleData();
		});
	},

	methods: {
		init() {
			this.setComponentMap(); // Set component mapping for easy component tracking.
			
			console.log("Mode : ", this.selectedMode);
			console.log("Number of runs :", this.$store.selectedDatasets.length);
			console.log("Datasets : ", this.$store.selectedDatasets);
			console.log("Node: ", this.$store.selectedNode);
			console.log("Run Bin size", this.$store.selectedRunBinCount);
			console.log("MPI Bin size", this.$store.selectedMPIBinCount);

			// Call the appropriate socket to query the server.
			this.initComponents(this.currentEnsembleSuperGraphComponents);

			// EventHandler.$emit("ensemble-refresh-boxplot", {});
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
			
			// Set the metricTimeMap, used by the dropdown to select the dataset.
			this.metricTimeMap = this.$store.metricTimeMap;

			// Set the datasets
			this.datasets = this.$store.selectedDatasets;

			this.$store.encoding = "MEAN_GRADIENTS";

			this.$store.selectedNode = "ApplyMaterialPropertiesForElems";
			
			// TODO: Need to clean this up.....
			// Too many repeated values....
			this.$store.selectedMPIBinCount = this.selectedMPIBinCount;
			this.$store.selectedRunBinCount = this.selectedRunBinCount;
			
			this.$store.auxiliarySortBy = this.auxiliarySortBy;
			this.$store.showTarget = this.showTarget;
	
			this.$store.nodeInfo = {};
			this.$store.selectedHierarchyMode = this.selectedHierarchyMode;

			this.$store.selectedProp = this.selectedProp;
			this.$store.selectedIQRFactor = this.selectedIQRFactor;
			this.$store.selectedRuntimeSortBy = this.selectedRuntimeSortBy;
			this.$store.selectedNumOfClusters = this.selectedNumOfClusters;
			this.$store.selectedEdgeAlignment = "Top";

			this.$store.datasetMap = {};
			for (let i = 0; i < this.run_counts; i += 1) {
				this.$store.datasetMap[this.runs[i]] = "run-" + i;
			}
		},

		setComponentMap() {
			this.currentEnsembleSuperGraphComponents = [
				this.$refs.Sankey,
				this.$refs.EnsembleHistogram,
				this.$refs.EnsembleScatterplot,
				this.$refs.CallsiteCorrespondence,
				// this.$refs.ParameterProjection,
				// this.$refs.ModuleHierarchy,
			];
		},

		clear() {
			this.clearComponents(this.currentEnsembleSuperGraphComponents);
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
