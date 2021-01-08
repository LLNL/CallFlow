/** 
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
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
          label="Select a run (Sorted by inclusive runtime)"
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
              >Call site Information</v-subheader
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
        </v-layout>
      </v-card>
    </v-navigation-drawer>

    <v-content class="pt-auto" v-if="selectedMode == 'Single'">
      <v-layout v-show="selectedFormat == 'SuperGraph'">
        <splitpanes id="callgraph-dashboard" class="default-theme">
          <!-- Left column-->
          <splitpanes horizontal :splitpanes-size="25">
            <SingleHistogram ref="SingleHistogram" />
            <SingleScatterplot ref="SingleScatterplot" />
          </splitpanes>

          <!-- Center column-->
          <splitpanes horizontal :splitpanes-size="55">
            <SuperGraph ref="SingleSuperGraph" />
          </splitpanes>

          <!-- Right column-->
          <splitpanes horizontal :splitpanes-size="20">
			<CallsiteInformation ref="CallsiteInformation" />
          </splitpanes>
        </splitpanes>
      </v-layout>

      <v-layout v-show="selectedFormat == 'CCT'">
        <splitpanes id="single-cct-dashboard">
          <splitpanes horizontal :splitpanes-size="100">
			<CCT ref="SingleCCT" />
          </splitpanes>
        </splitpanes>
      </v-layout>
    </v-content>

    <v-footer id="footer" color="teal" app>
      Lawrence Livermore National Laboratory and VIDi Labs, University of
      California, Davis
      <v-spacer></v-spacer>
      <span>&copy; 2020</span>
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

// Single mode imports
import SingleScatterplot from "./singleScatterplot/singleScatterplot";
import SingleHistogram from "./singleHistogram/singleHistogram";
import CallsiteInformation from "./callsiteInformation/callsiteInformation";

import io from "socket.io-client";
import * as utils from "./utils";

export default {
	name: "SingleCallFlow",
	components: {
		Splitpanes,
		// Generic components
		SuperGraph,
		CCT,
		// Single supergraph components.
		SingleScatterplot,
		SingleHistogram,
		CallsiteInformation,
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
		metrics: ["Exclusive", "Inclusive"], //, 'Imbalance'],
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
		groupModes: ["include callbacks", "exclude callbacks"],
		selectedGroupMode: "include callbacks",
		scatterMode: ["mean", "all"],
		selectedScatterMode: "all",
		selectedFunctionsInCCT: 70,
		isCallgraphInitialized: false,
		isCCTInitialized: false,
		datas: ["Dataframe", "Graph"],
		selectedData: "Dataframe",
		firstRender: true,
		ranks: [],
		initLoad: true,
		comparisonMode: false,
		selectedCompareDataset: null,
		selectedOutlierBand: 4,
		defaultCallSite: "<program root>",
		modes: ["Ensemble", "Single"],
		selectedMode: "Single",
		// Presentation mode variables
		exhibitModes: ["Presentation", "Default"],
		selectedExhibitMode: "Default",
		selectedMPIBinCount: 20,
		selectedRuntimeSortBy: "Inclusive",
		sortByModes: ["Inclusive", "Exclusive", "Standard Deviation"],
		scales: ["Log", "Linear"],
		selectedScale: "Linear",
		props: ["name", "rank", "dataset", "all_ranks"],
		selectedProp: "rank",
		metricTimeMap: {}, // Stores the metric map for each dataset (sorted by inclusive/exclusive time),
		selectedRunBinCount: 20,
	}),

	mounted() {
		this.fetchData();

		EventHandler.$on("lasso_selection", () => {
			this.$store.resetTargetDataset = true;
			this.clearLocal();
			this.setTargetDataset();
			this.fetchData();
		});

		EventHandler.$on("show_target_auxiliary", () => {
			this.clearLocal();
			this.init();
		});
	},

	methods: {
		/**
     	* Fetch the super graph data.
     	*/
		async fetchData() {
			if(this.$store.selectedDatasets === undefined) {
				this.$router.push("/");
			}
			this.$store.auxiliarySortBy = this.auxiliarySortBy;
			this.$store.selectedMPIBinCount = this.selectedMPIBinCount;
			this.$store.selectedRunBinCount = this.selectedRunBinCount;

			console.debug("[/init]", this.$store.data);
			this.dataReady = true;
			this.setupStore(this.$store.data);
			this.init();
		},

		setupStore(data) {
			this.$store.modules = data["module"];
			this.$store.callsites = data["callsite"];
			this.$store.gradients = data["gradients"];
			this.$store.moduleCallsiteMap = data["moduleCallsiteMap"];
			this.$store.callsiteModuleMap = data["callsiteModuleMap"];

			this.datasets = this.$store.selectedDatasets;

			// Enable diff mode only if the number of datasets >= 2
			if (this.numOfRuns >= 2) {
				this.modes = ["Single", "Ensemble"];
				this.selectedMode = "Ensemble";
			} else if (this.numOfRuns == 1) {
				this.enableDist = false;
				this.modes = ["Single"];
				this.selectedMode = "Single";
			}

			this.$store.moduleCallsiteMap = data["module_callsite_map"];
			this.$store.callsiteModuleMap = data["callsite_module_map"];

			this.$store.selectedMPIBinCount = this.selectedMPIBinCount;
			this.$store.selectedRunBinCount = this.selectedRunBinCount;
		},

		init() {
			console.assert(this.selectedMode, "Single");
			
			this.setGlobalVariables(); // Set the variables that do not depend on data.
			this.setTargetDataset(); // Set target dataset.
			this.setupColors(); // Set up the colors.
			this.setViewDimensions(); // Set the view dimensions.
			this.setComponentMap(); // Set component mapping for easy component tracking.

			console.log("Mode : ", this.selectedMode);
			console.log("Number of runs :", this.$store.numOfRuns);
			console.log("Dataset : ", this.selectedTargetDataset);
			console.log("Format = ", this.selectedFormat);

			// Call the appropriate socket to query the server.
			if (this.selectedFormat == "SuperGraph") {
				this.setSelectedModule();
				this.initComponents(this.currentSingleSuperGraphComponents);
			} else if (this.selectedFormat == "CCT") {
				this.initComponents(this.currentSingleCCTComponents);
			}
			EventHandler.$emit("single-refresh-boxplot", {});
		},

		setGlobalVariables() {
			this.$store.selectedScatterMode = "mean";
			this.$store.nodeInfo = {};
			this.$store.selectedMode = this.selectedMode;
			this.$store.selectedFunctionsInCCT = this.selectedFunctionsInCCT;
			this.$store.selectedHierarchyMode = this.selectedHierarchyMode;
			if (this.$store.selectedMode == "Single") {
				this.$store.selectedProp = "rank";
			}

			this.$store.selectedScale = this.selectedScale;
			this.$store.selectedCompareMode = this.selectedCompareMode;
			this.$store.selectedIQRFactor = this.selectedIQRFactor;
			this.$store.selectedRuntimeSortBy = this.selectedRuntimeSortBy;
			this.$store.selectedNumOfClusters = this.selectedNumOfClusters;
			this.$store.selectedEdgeAlignment = "Top";

			this.$store.datasetMap = {};
			for (let i = 0; i < this.$store.selectedDatasets.length; i += 1) {
				this.$store.datasetMap[this.$store.selectedDatasets[i]] = "run-" + i;
			}

			this.$store.contextMenu = this.contextMenu;
			this.$store.encoding = "MEAN";
			this.$store.selectedSuperNodePositionMode = "Minimal edge crossing";

			this.$store.auxiliarySortBy = this.auxiliarySortBy;
			this.$store.reprocess = 0;
			this.$store.comparisonMode = this.comparisonMode;
			this.$store.fontSize = 14;
			this.$store.transitionDuration = 1000;
		},

		setTargetDataset() {
			if (this.firstRender) {
				this.$store.resetTargetDataset = true;
			}
			this.$store.selectedMetric = this.selectedMetric;
			this.datasets = this.sortDatasetsByAttr(
				this.$store.selectedDatasets,
				"Inclusive"
			);

			let max_dataset = "";
			let current_max_time = 0.0;

			let data = {};
			if (this.$store.selectedMetric == "Inclusive") {
				data = this.$store.maxIncTime;
			} else if (this.$store.selectedMetric == "Exclusive") {
				data = this.$store.maxExcTime;
			}

			for (let dataset of this.$store.selectedDatasets) {
				if (current_max_time < data[dataset]) {
					current_max_time = data[dataset];
					max_dataset = dataset;
				}
			}
			if (this.firstRender || this.$store.resetTargetDataset) {
				this.$store.selectedTargetDataset = max_dataset;
				this.selectedTargetDataset = max_dataset;
				this.firstRender = false;
				this.$store.resetTargetDataset = false;
			} else {
				this.$store.selectedTargetDataset = this.selectedTargetDataset;
			}
			this.selectedIncTime = (
				(this.selectedFilterPerc *
          this.$store.maxIncTime[this.selectedTargetDataset] *
          0.000001) /
        100
			).toFixed(3);

			console.log("Maximum among all runtimes: ", this.selectedTargetDataset);
		},

		setupColors() {
			// Create color object.
			this.$store.runtimeColor = new Color();
			this.runtimeColorMap = this.$store.runtimeColor.getAllColors();
			this.setRuntimeColorScale();

			// Set properties into store.
			this.$store.selectedRuntimeColorMap = this.selectedRuntimeColorMap;
			this.$store.selectedDistributionColorMap = this.selectedDistributionColorMap;
			this.$store.selectedColorPoint = this.selectedColorPoint;

			this.$store.runtimeColor.intermediate = "#d9d9d9";
			this.$store.runtimeColor.highlight = "#C0C0C0";
			this.$store.runtimeColor.textColor = "#3a3a3a";
			this.$store.runtimeColor.edgeStrokeColor = "#888888";
		},

		setViewDimensions() {
			this.$store.viewWidth = window.innerWidth;

			let toolbarHeight = 0;
			let footerHeight = 0;
			// Set toolbar height as 0 if undefined
			if (document.getElementById("toolbar") == null) {
				toolbarHeight = 0;
			} else {
				toolbarHeight = document.getElementById("toolbar").clientHeight;
			}
			if (document.getElementById("footer") == null) {
				footerHeight = 0;
			} else {
				footerHeight = document.getElementById("footer").clientHeight;
			}
			this.$store.viewHeight =
        window.innerHeight - toolbarHeight - footerHeight;
		},

		// Set the min and max and assign color variables from Settings.
		setRuntimeColorScale() {
			let colorMin = null;
			let colorMax = null;
			if (this.selectedMode == "Ensemble") {
				if (this.selectedMetric == "Inclusive") {
					colorMin = parseFloat(this.$store.minIncTime["ensemble"]);
					colorMax = parseFloat(this.$store.maxIncTime["ensemble"]);
				} else if (this.selectedMetric == "Exclusive") {
					colorMin = parseFloat(this.$store.minExcTime["ensemble"]);
					colorMax = parseFloat(this.$store.maxExcTime["ensemble"]);
				} else if (this.selectedMetric == "Imbalance") {
					colorMin = 0.0;
					colorMax = 1.0;
				}
			} else if (this.selectedMode == "Single") {
				if (this.selectedMetric == "Inclusive") {
					colorMin = parseFloat(
						this.$store.minIncTime[this.selectedTargetDataset]
					);
					colorMax = parseFloat(
						this.$store.maxIncTime[this.selectedTargetDataset]
					);
				} else if (this.selectedMetric == "Exclusive") {
					colorMin = parseFloat(
						this.$store.minExcTime[this.selectedTargetDataset]
					);
					colorMax = parseFloat(
						this.$store.maxExcTime[this.selectedTargetDataset]
					);
				} else if (this.selectedMetric == "Imbalance") {
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

			this.$store.selectedColorMin = this.colorMin;
			this.$store.selectedColorMax = this.colorMax;

			this.$store.runtimeColor.setColorScale(
				this.$store.selectedMetric,
				colorMin,
				colorMax,
				this.selectedRuntimeColorMap,
				this.selectedColorPoint
			);
		},

		setSelectedModule() {
			const modules_sorted_list_by_metric = this.sortModulesByMetric();
			this.selectedModule = modules_sorted_list_by_metric[0][0];
			this.$store.selectedModule = this.selectedModule;
		},

		setComponentMap() {
			this.currentSingleCCTComponents = [this.$refs.SingleCCT];
			this.currentSingleSuperGraphComponents = [
				this.$refs.SingleSuperGraph,
				this.$refs.SingleHistogram,
				this.$refs.SingleScatterplot,
				this.$refs.CallsiteInformation,
			];
		},

		clear() {
			if (this.selectedFormat == "CCT") {
				this.clearComponents(this.currentSingleCCTComponents);
			} else if (this.selectedFormat == "SuperGraph") {
				this.clearComponents(this.currentSingleSuperGraphComponents);
			}
		},

		clearLocal() {
			if (this.selectedFormat == "CCT") {
				this.clearComponents(this.currentSingleSuperGraphComponents);
			} else if (this.selectedFormat == "SuperGraph") {
				this.clearComponents(this.currentSingleCCTComponents);
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

		// Feature: the Supernode hierarchy is automatically selected from the mean metric runtime.
		sortModulesByMetric(attr) {
			let module_list = Object.keys(
				this.$store.modules[this.selectedTargetDataset]
			);

			// Create a map for each dataset mapping the respective mean times.
			let map = {};
			for (let module_name of module_list) {
				map[module_name] = this.$store.modules[this.selectedTargetDataset][
					module_name
				][this.$store.selectedMetric]["mean_time"];
			}

			// Create items array
			let items = Object.keys(map).map(function (key) {
				return [key, map[key]];
			});

			// Sort the array based on the second element
			items.sort(function (first, second) {
				return second[1] - first[1];
			});

			return items;
		},

		updateColors() {
			this.clearLocal();
			this.setupColors();
			this.init();
		},

		async updateFormat() {
			this.clearLocal();
			this.init();
		},

		updateTargetDataset() {
			this.clear();
			this.$store.selectedTargetDataset = this.selectedTargetDataset;
			console.debug("[Update] Target Dataset: ", this.selectedTargetDataset);
			d3.selectAll(".tick").remove();
			this.init();
		},

		updateMode() {
			this.clear();
			this.init();
		},

		updateMetric() {
			this.$store.selectedMetric = this.selectedMetric;
			this.clear();
			this.init();
		},

		updateScale() {
			this.$store.selectedScale = this.selectedScale;
			this.clear();
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