/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
  <v-app id="inspire">
    <v-toolbar id="toolbar" color="teal" dark fixed app clipped-right>
      <v-toolbar-side-icon @click.stop="left = !left">
        <v-icon>settings</v-icon>
      </v-toolbar-side-icon>
      <v-toolbar-title style="margin-right: 3em">{{ appName }}</v-toolbar-title>
      <v-flex xs3 class="ma-2">
        <v-select
          label="Select Target run (Sorted by inclusive runtime)"
          :items="datasets"
          v-model="selectedTargetDataset"
          :menu-props="{ maxHeight: '400' }"
          box
          v-on:change="updateTargetDataset()"
        >
          <template slot="selection" slot-scope="{ item }">
            {{ datasets.indexOf(item) + 1 }}. {{ item }} -
            {{ formatRuntimeWithoutUnits(metricTimeMap[item]) }}
          </template>
          <template slot="item" slot-scope="{ item }">
            {{ datasets.indexOf(item) + 1 }}. {{ item }} -
            {{ formatRuntimeWithoutUnits(metricTimeMap[item]) }}
          </template>
        </v-select>
      </v-flex>
      <v-flex xs3 class="ma-2">
        <v-select
          label="Select Compare run"
          :items="datasets"
          v-if="selectedFormat == 'SuperGraph'"
          v-model="selectedCompareDataset"
          :menu-props="{ maxHeight: '400' }"
          box
          v-on:change="updateCompareDataset()"
        >
          <template slot="selection" slot-scope="{ item }">
            {{ datasets.indexOf(item) + 1 }}. {{ item }} -
            {{ formatRuntimeWithoutUnits(metricTimeMap[item]) }}
          </template>
          <template slot="item" slot-scope="{ item }">
            <!-- HTML that describe how select should render items when the select is open -->
            {{ datasets.indexOf(item) + 1 }}. {{ item }} -
            {{ formatRuntimeWithoutUnits(metricTimeMap[item]) }}
          </template>
        </v-select>
      </v-flex>
      <v-spacer></v-spacer>

      <v-flex xs2 class="ma-1">
        <v-select
          label="Graph to visualize"
          :items="formats"
          v-model="selectedFormat"
          :menu-props="{ maxHeight: '400' }"
          box
          v-on:change="updateFormat()"
        >
        </v-select>
      </v-flex>
    </v-toolbar>

    <v-navigation-drawer v-model="left" temporary fixed>
      <v-btn slot="activator" color="primary" dark>Open Dialog</v-btn>
      <v-card flex fill-height id="control-panel">
        <v-layout row wrap>
          <v-btn icon>
            <v-icon v-on:click="reset()">refresh</v-icon>
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
                v-on:change="updateTargetColor()"
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
              v-on:change="updateMetric()"
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
          <v-flex xs12 class="ma-1" v-show="selectedFormat == 'SuperGraph'">
            <v-text-field
              label="Number of bins for Run Distribution"
              class="mt-0"
              type="number"
              v-model="selectedRunBinCount"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
              v-on:change="updateRunBinCount()"
            >
            </v-text-field>
          </v-flex>

          <!-- --------------------------- Hierarchy ----------------------------------->
          <!-- <v-flex xs12 class="ma-1">
					<v-subheader class="teal lighten-4">SuperNode Hierarchy</v-subheader>
				</v-flex>
				<v-flex xs12 class="ma-1" v-show="selectedFormat =='SuperGraph'">
					<v-select label="Assign width by" :items="hierarchyModes" v-model="selectedHierarchyMode"
						:menu-props="{ maxHeight: '200' }" persistent-hint v-on:change="updateHierarchyMode()">
					</v-select>
				</v-flex> -->
          <!-- <v-flex xs12 class="ma-1">
					<v-subheader class="teal lighten-4">Distribution</v-subheader>
				</v-flex> -->
          <v-flex xs12 class="ma-1" v-show="selectedFormat == 'SuperGraph'">
            <v-text-field
              label="Number of bins for MPI Distribution"
              class="mt-0"
              type="number"
              v-model="selectedMPIBinCount"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
              v-on:change="updateMPIBinCount()"
            >
            </v-text-field>
          </v-flex>
          <v-flex xs12 class="ma-1" v-show="selectedFormat == 'SuperGraph'">
            <v-select
              label="Scale"
              :items="scales"
              v-model="selectedScale"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
              v-on:change="updateScale()"
            >
            </v-select>
          </v-flex>
          <v-flex xs12 class="ma-1" v-show="selectedFormat == 'SuperGraph'">
            <v-select
              label="Bin by attribute"
              :items="props"
              v-model="selectedProp"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
              v-on:change="updateProp()"
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
              v-on:change="updateColors()"
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
              v-on:change="updateColors()"
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
              v-on:change="updateTargetColor()"
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
              v-on:change="updateColors()"
            >
            </v-text-field>
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-text-field
              label="Color minimum (in seconds)"
              class="mt-0"
              type="number"
              v-model="selectedColorMinText"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
              v-on:change="updateColors()"
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
              v-on:change="updateColors()"
            >
            </v-text-field>
          </v-flex>

          <!----------------------------- Callsite information ----------------------------------->
          <v-flex xs12 class="ma-1">
            <v-subheader class="teal lighten-4"
              >Call site Correspondence</v-subheader
            >
          </v-flex>
          <v-flex xs12 class="ma-1" v-show="selectedFormat == 'SuperGraph'">
            <v-select
              label="Sort by"
              :items="sortByModes"
              v-model="selectedRuntimeSortBy"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
              v-on:change="updateRuntimeSortBy()"
            >
            </v-select>
          </v-flex>
          <v-flex xs12 class="ma-1" v-show="selectedFormat == 'SuperGraph'">
            <v-text-field
              label="IQR Factor"
              class="mt-0"
              type="float"
              v-model="selectedIQRFactor"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
              v-on:change="updateIQRFactor()"
            >
            </v-text-field>
          </v-flex>
          <!-- <v-flex
					xs12
					class="ma-1"
				>
				<v-subheader class="teal lighten-4">Projection view</v-subheader>
				</v-flex>
				<v-flex
					xs12
					class="ma-1"
					v-show="selectedFormat =='SuperGraph'"
				>
					<v-text-field
						label="Number of clusters"
						class="mt-0"
						type="float"
						v-model="selectedNumOfClusters"
						:menu-props="{ maxHeight: '200' }"
						persistent-hint
						v-on:change="updateNumOfClusters()"
					>
					</v-text-field>
				</v-flex> -->
          <!-- <v-flex
					xs12
					class="ma-1"
					v-show="selectedFormat =='SuperGraph'"
				>
					<v-select
						label="PC1"
						:items="dimensions"
						v-model="selectedPC1"
						:menu-props="{ maxHeight: '200' }"
						persistent-hint
						v-on:change="updatePC1()"
					>
					</v-select>
				</v-flex>
				<v-flex
					xs12
					class="ma-1"
					v-show="selectedFormat =='SuperGraph'"
				>
					<v-select
						label="PC2"
						:items="dimensions"
						v-model="selectedPC2"
						:menu-props="{ maxHeight: '200' }"
						persistent-hint
						v-on:change="updatePC2()"
					>
					</v-select>
				</v-flex> -->
        </v-layout>
      </v-card>
    </v-navigation-drawer>

    <v-content class="pt-auto" v-if="selectedMode == 'Ensemble'">
      <v-layout v-show="selectedFormat == 'SuperGraph'">
        <splitpanes id="callgraph-dashboard" class="default-theme">
          <!-- Left column-->
          <splitpanes horizontal :splitpanes-size="25">
			<ModuleHierarchy ref="ModuleHierarchy" />
			<EnsembleScatterplot ref="EnsembleScatterplot" />
			<EnsembleHistogram ref="EnsembleHistogram" />
          </splitpanes>

          <!-- Center column-->
          <splitpanes horizontal :splitpanes-size="55">
			<SuperGraph ref="SuperGraph" />
          </splitpanes>

          <!-- Right column-->
          <splitpanes horizontal :splitpanes-size="20">
			<CallsiteCorrespondence ref="CallsiteCorrespondence" />
			<ParameterProjection ref="ParameterProjection" />
          </splitpanes>
        </splitpanes>
      </v-layout>

      <v-layout v-show="selectedFormat == 'CCT'">
        <splitpanes id=" ensemble-cct-dashboard">
          <splitpanes horizontal :splitpanes-size="100">
			<CCT ref="CCT" />
          </splitpanes>
        </splitpanes>
      </v-layout>

      <v-layout v-show="selectedFormat == 'CCT' && selectedMode == 'Compare'">
        <splitpanes id="compare-cct-dashboard">
          <splitpanes horizontal :splitpanes-size="50">
			<CCT ref="CCT1" />
          </splitpanes>
          <splitpanes horizontal :splitpanes-size="50">
			<CCT ref="CCT2" />
          </splitpanes>
        </splitpanes>
      </v-layout>
    </v-content>

    <v-footer id="footer" color="teal" app>
      Lawrence Livermore National Laboratory, and University of California, Davis
      <v-spacer></v-spacer>
      <span>&copy;2020</span>
    </v-footer>
  </v-app>
</template>

<script>
import * as d3 from "d3";

import Color from "../lib/color/color";
import Splitpanes from "splitpanes";
import "splitpanes/dist/splitpanes.css";

import EventHandler from "./EventHandler";
import APIService from "../lib/APIService";

import SuperGraph from "./supergraph/supergraph";
import CCT from "./cct/cct";

// Ensemble mode imports
import CallsiteCorrespondence from "./callsiteCorrespondence/callsiteCorrespondence";
import EnsembleHistogram from "./ensembleHistogram/ensembleHistogram";
import ModuleHierarchy from "./moduleHierarchy/moduleHierarchy";
import EnsembleScatterplot from "./ensembleScatterplot/ensembleScatterplot";
import ParameterProjection from "./parameterProjection/parameterProjection";

import * as utils from "./utils";

export default {
	name: "EnsembleCallFlow",
	components: {
		Splitpanes,
		// Generic components
		SuperGraph,
		CCT,
		// Ensemble supergraph components.
		EnsembleScatterplot,
		EnsembleHistogram,
		ModuleHierarchy,
		ParameterProjection,
		CallsiteCorrespondence,
	},

	watch: {
		showTarget: function (val) {
			EventHandler.$emit("show-target-auxiliary");
		},
	},

	data: () => ({
		appName: "CallFlow",
		left: false,
		formats: ["CCT", "SuperGraph"],
		selectedFormat: "SuperGraph",
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
		selectedProp: "rank",
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
	}),

	mounted() {
		// Push to '/' when `this.$store.selectedDatasets` is undefined.
		if(this.$store.selectedDatasets === undefined) {
			// TODO: Instead of pushing to /, we should populate the variables. 
			this.$router.push("/");
		}

		EventHandler.$on("lasso_selection", () => {
			this.$store.resetTargetDataset = true;
			this.clearLocal();
			this.setTargetDataset();
			this.requestEnsembleData();
		});

		this.init();
	},

	methods: {
		init() {
			this.setupStore();
			this.setComponentMap(); // Set component mapping for easy component tracking.
			this.selectedModule = utils.setSelectedModule(this.$store, "ensemble");
			this.$store.selectedModule = this.selectedModule;
			
			console.log("Mode : ", this.selectedMode);
			console.log("Number of runs :", this.$store.selectedDatasets.length);
			console.log("Datasets : ", this.$store.selectedDatasets);
			console.log("Format = ", this.selectedFormat);
			
			// Call the appropriate socket to query the server.
			if (this.selectedFormat == "SuperGraph") {
				this.initComponents(this.currentEnsembleSuperGraphComponents);
			} else if (this.selectedFormat == "CCT") {
				this.initComponents(this.currentEnsembleCCTComponents);
			}
			EventHandler.$emit("ensemble-refresh-boxplot", {});
		},

		setupStore(data) {
			// Set the mode. (Either single or ensemble).
			this.$store.selectedMode = this.selectedMode;

			// Set the number of callsites in the CCT
			this.$store.selectedFunctionsInCCT = this.selectedFunctionsInCCT;

			// Set the scale for information (log or linear)
			this.$store.selectedScale = this.selectedScale;
			
			// Comparison mode in histograms.
			this.$store.comparisonMode = this.comparisonMode;

			// Set the datasets
			this.datasets = this.$store.selectedDatasets;

			// Set this.selectedTargetDataset (need to remove)
			this.selectedTargetDataset = this.$store.selectedTargetDataset;

			// TODO: Need to clean this up.....
			// Too many repeated values....
			this.$store.selectedMPIBinCount = this.selectedMPIBinCount;
			this.$store.selectedRunBinCount = this.selectedRunBinCount;
			
			this.$store.auxiliarySortBy = this.auxiliarySortBy;
			this.$store.showTarget = this.showTarget;
			this.$store.encoding = "MEAN_GRADIENTS";
	
			this.$store.nodeInfo = {};
			this.$store.selectedHierarchyMode = this.selectedHierarchyMode;
			this.$store.selectedFormat = this.selectedFormat;

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
			this.currentEnsembleCCTComponents = [this.$refs.CCT];
			this.currentEnsembleSuperGraphComponents = [
				this.$refs.SuperGraph,
				this.$refs.EnsembleHistogram,
				this.$refs.EnsembleScatterplot,
				this.$refs.CallsiteCorrespondence,
				this.$refs.ParameterProjection,
				// this.$refs.ModuleHierarchy,
			];
		},

		clearLocal() {
			if (this.selectedFormat == "CCT") {
				this.clearComponents(this.currentEnsembleCCTComponents);
			} else if (this.selectedFormat == "SuperGraph") {
				this.clearComponents(this.currentEnsembleSuperGraphComponents);
			}
		},

		clear() {
			if (this.selectedFormat == "CCT") {
				this.clearComponents(this.currentEnsembleSuperGraphComponents);
			} else if (this.selectedFormat == "SuperGraph") {
				this.clearComponents(this.currentEnsembleCCTComponents);
			}
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

		// Feature: Sortby the datasets and show the time.
		formatRuntimeWithoutUnits(val) {
			let format = d3.format(".2");
			let ret = format(val);
			return ret;
		},

		sortDatasetsByAttr(datasets, attr) {
			if (datasets.length == 1) {
				this.metricTimeMap[datasets[0]] = this.$store.maxIncTime[datasets[0]];
				return datasets;
			}
			let ret = datasets.sort((a, b) => {
				let x = 0,
					y = 0;
				if (attr == "Inclusive") {
					x = this.$store.maxIncTime[a];
					y = this.$store.maxIncTime[b];
					this.metricTimeMap = this.$store.maxIncTime;
				} else if (attr == "Exclusive") {
					x = this.$store.maxExcTime[a];
					y = this.$store.maxExcTime[b];
					this.metricTimeMap = this.$store.maxExcTime;
				}
				return parseFloat(x) - parseFloat(y);
			});
			return ret;
		},


		updateColors() {
			this.clearLocal();
			this.setupColors();
			this.init();
		},

		updateFormat() {
			this.clearLocal();
			this.init();
		},

		updateMode() {
			this.clear();
			this.init();
		},

		updateMetric() {
			this.$store.selectedMetric = this.selectedMetric;
			this.clearLocal();
			this.init();
		},

		updateColor() {
			this.clear();
			this.init();
		},

		updateColorPoint() {
			this.clearLocal();
			this.init();
		},

		updateFunctionsInCCT() {
			APIService.POSTRequest("cct", {
				dataset: this.$store.selectedTargetDataset,
				functionInCCT: this.selectedFunctionsInCCT,
			});
		},

		updateDiffNodeAlignment() {
			console.log("Alignment mode: ", this.selectedDiffNodeAlignment);
			this.$store.selectedDiffNodeAlignment = this.selectedDiffNodeAlignment;
			EventHandler.$emit("update-diff-node-alignment");
		},

		updateAuxiliarySortBy() {
			this.$store.auxiliarySortBy = this.auxiliarySortBy;
			EventHandler.$emit("update-auxiliary-sort-by");
		},

		async updateCompareDataset() {
			this.summaryChip = "Diff SuperGraph";
			this.$store.selectedCompareDataset = this.selectedCompareDataset;
			this.$store.comparisonMode = true;
			this.$store.encoding = this.selectedCompareMode;
			const data = await APIService.POSTRequest("compare", {
				targetDataset: this.$store.selectedTargetDataset,
				compareDataset: this.$store.selectedCompareDataset,
				selectedMetric: this.$store.selectedMetric,
			});
			this.$refs.SuperGraph.activateCompareMode(data);
		},

		updateProp() {
			this.$store.selectedProp = this.selectedProp;
			this.clearLocal();
			this.init();
		},

		updateScale() {
			this.$store.selectedScale = this.selectedScale;
			this.clearLocal();
			this.init();
		},

		updateHierarchyMode() {
			this.$store.selectedHierarchyMode = this.selectedHierarchyMode;
			this.clearLocal();
			this.init();
		},

		updateIQRFactor() {
			this.$store.selectedIQRFactor = this.selectedIQRFactor;
			this.clearLocal();
			this.init();
		},

		updateRuntimeSortBy() {
			this.$store.selectedRuntimeSortBy = this.selectedRuntimeSortBy;
			EventHandler.$emit("callsite-information-sort");
		},

		updateNumOfClusters() {
			this.$store.selectedNumOfClusters = this.selectedNumOfClusters;
			EventHandler.$emit("update-number-of-clusters");
		},

		updateTargetColor() {
			this.$store.showTarget = this.showTarget;
			this.clear();
			this.init();
			EventHandler.$emit("ensemble-auxiliary", {});
		},

		updateRunBinCount() {
			this.$store.selectedRunBinCount = this.selectedRunBinCount;
			this.requestEnsembleData();
			this.clearLocal();
			this.init();
		},

		updateMPIBinCount() {
			this.$store.selectedMPIBinCount = this.selectedMPIBinCount;
			this.$store.reprocess = 1;
			this.requestEnsembleData();
			this.clearLocal();
			this.init();
		},
	},
};
</script>
