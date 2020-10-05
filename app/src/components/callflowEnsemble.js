/** 
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

import * as d3 from "d3";

import Color from "../lib/color/color";
import Splitpanes from "splitpanes";
import "splitpanes/dist/splitpanes.css";

import EventHandler from "./EventHandler";

// Template import
import tpl from "../html/callflowEnsemble.html";

import SuperGraph from "./supergraph/supergraph";
import CCT from "./cct/cct";

// Ensemble mode imports
import CallsiteCorrespondence from "./callsiteCorrespondence/callsiteCorrespondence";
import EnsembleHistogram from "./ensembleHistogram/ensembleHistogram";
import ModuleHierarchy from "./moduleHierarchy/moduleHierarchy";
import EnsembleScatterplot from "./ensembleScatterplot/ensembleScatterplot";
import ParameterProjection from "./parameterProjection/parameterProjection";

import io from "socket.io-client";
import * as utils from "./utils";

export default {
	name: "EnsembleCallFlow",
	template: tpl,
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
		showTarget: (val) => {
			EventHandler.$emit("show-target-auxiliary");
		}
	},

	data: () => ({
		appName: "CallFlow",
		server: "localhost:5000",
		config: {
			headers: {
				"Access-Control-Allow-Origin": "*"
			}
		},
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
		metrics: ["Exclusive", "Inclusive"],//, 'Imbalance'],
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
			"Green": "#4EAF4A",
			"Blue": "#4681B4",
			"Brown": "#AF9B90",
			"Red": "#A90400"
		},
		targetColors: ["Green", "Blue", "Brown"],
		selectedTargetColor: "Green",
		showTarget: true,
		targetInfo: "Target Guides",
		metricTimeMap: {}, // Stores the metric map for each dataset (sorted by inclusive/exclusive time),
	}),

	mounted() {
		var socket = io.connect(this.server, { reconnect: false });
		this.$socket.emit("init", {
			mode: this.selectedMode,
		});

		EventHandler.$on("lasso_selection", () => {
			this.$store.resetTargetDataset = true;

			this.clearLocal();
			this.setTargetDataset();
			this.$socket.emit("ensemble_callsite_data", {
				datasets: this.$store.selectedDatasets,
				sortBy: this.$store.auxiliarySortBy,
				MPIBinCount: this.$store.selectedMPIBinCount,
				RunBinCount: this.$store.selectedRunBinCount,
				module: "all",
				"re_process": 1
			});
		});
	},

	beforeDestroy() {
		//Unsubscribe on destroy
		this.$socket.emit("disconnect");
	},

	sockets: {
		// Assign variables for the store and Callflow ui component.
		// Assign colors and min, max inclusive and exclusive times.
		init(data) {
			this.setupStore(data);
			this.setTargetDataset();
			this.setComponentMap();

			if (this.selectedFormat == "SuperGraph") {
				this.$socket.emit("ensemble_callsite_data", {
					datasets: this.$store.selectedDatasets,
					sortBy: this.$store.auxiliarySortBy,
					MPIBinCount: this.$store.selectedMPIBinCount,
					RunBinCount: this.$store.selectedRunBinCount,
					module: "all",
					re_process: this.$store.reprocess
				});
			}
			else if (this.selectedFormat == "CCT") {
				this.init();
			}
		},

		ensemble_callsite_data(data) {
			console.log("Auxiliary Data: ", data);
			this.dataReady = true;

			this.$store.modules = data["module"];
			this.$store.callsites = data["callsite"];
			this.$store.gradients = data["gradients"];
			this.$store.moduleCallsiteMap = data["moduleCallsiteMap"];
			this.$store.callsiteModuleMap = data["callsiteModuleMap"];
			this.init();
		},

		// Reset to the init() function.
		reset(data) {
			console.log("Data for", this.selectedFormat, ": ", data);
			this.init();
		},

		disconnect() {
			console.log("Disconnected.");
		}
	},

	methods: {
		// Feature: Sortby the datasets and show the time.
		formatRuntimeWithoutUnits(val) {
			let format = d3.format(".2");
			let ret = format(val);
			return ret;
		},

		// Feature: Sortby the datasets and show the time.
		sortDatasetsByAttr(datasets, attr) {
			let ret = datasets.sort((a, b) => {
				let x = 0, y = 0;
				if (attr == "Inclusive") {
					x = this.$store.maxIncTime[a];
					y = this.$store.maxIncTime[b];
					this.metricTimeMap = this.$store.maxIncTime;
				}
				else if (attr == "Exclusive") {
					x = this.$store.maxExcTime[a];
					y = this.$store.maxExcTime[b];
					this.metricTimeMap = this.$store.maxExcTime;
				}
				return parseFloat(x) - parseFloat(y);
			});
			return ret;
		},

		setViewDimensions() {
			this.$store.viewWidth = window.innerWidth;

			let toolbarHeight = 0;
			let footerHeight = 0;
			// Set toolbar height as 0 if undefined
			if (document.getElementById("toolbar") == null) {
				toolbarHeight = 0;
			}
			else {
				toolbarHeight = document.getElementById("toolbar").clientHeight;
			}
			if (document.getElementById("footer") == null) {
				footerHeight = 0;
			}
			else {
				footerHeight = document.getElementById("footer").clientHeight;
			}
			this.$store.viewHeight = window.innerHeight - toolbarHeight - footerHeight;
		},

		setupStore(data) {
			data = JSON.parse(data);
			console.log("Config file: ", data);
			this.$store.numOfRuns = data["properties"]["runs"].length;
			this.$store.selectedDatasets = data["properties"]["runs"];
			this.selectedCaseStudy = data["runName"];
			this.datasets = this.$store.selectedDatasets;

			// Enable diff mode only if the number of datasets >= 2
			if (this.numOfRuns >= 2) {
				this.modes = ["Single", "Ensemble"];
				this.selectedMode = "Ensemble";
			}
			else if (this.numOfRuns == 1) {
				this.enableDist = false;
				this.modes = ["Single"];
				this.selectedMode = "Single";
			}

			this.$store.maxExcTime = data["maxExcTime"];
			this.$store.minExcTime = data["minExcTime"];
			this.$store.maxIncTime = data["maxIncTime"];
			this.$store.minIncTime = data["minIncTime"];

			this.$store.numOfRanks = data["numOfRanks"];
			this.$store.moduleCallsiteMap = data["module_callsite_map"];
			this.$store.callsiteModuleMap = data["callsite_module_map"];

			this.$store.selectedMPIBinCount = this.selectedMPIBinCount;
			this.$store.selectedRunBinCount = this.selectedRunBinCount;

			this.setViewDimensions();

			this.$store.auxiliarySortBy = this.auxiliarySortBy;
			this.$store.reprocess = 0;
			this.$store.comparisonMode = this.comparisonMode;
			this.$store.fontSize = 14;
			this.$store.transitionDuration = 1000;
			this.$store.showTarget = this.showTarget;
			this.$store.encoding = "MEAN_GRADIENTS";
		},

		setOtherData() {
			this.$store.selectedScatterMode = "mean";
			this.$store.nodeInfo = {};
			this.$store.selectedMode = this.selectedMode;
			this.$store.selectedFunctionsInCCT = this.selectedFunctionsInCCT;
			this.$store.selectedHierarchyMode = this.selectedHierarchyMode;
			this.$store.selectedFormat = this.selectedFormat;
			
			this.$store.selectedProp = this.selectedProp;
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
			this.$store.selectedSuperNodePositionMode = "Minimal edge crossing";
		},

		setTargetDataset() {
			if (this.firstRender) {
				this.$store.resetTargetDataset = true;
			}
			this.$store.selectedMetric = this.selectedMetric;
			this.datasets = this.sortDatasetsByAttr(this.$store.selectedDatasets, "Inclusive");

			let max_dataset = "";
			let current_max_time = 0.0;

			let data = {};
			if (this.$store.selectedMetric == "Inclusive") {
				data = this.$store.maxIncTime;
			}
			else if (this.$store.selectedMetric == "Exclusive") {
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
			}
			else {
				this.$store.selectedTargetDataset = this.selectedTargetDataset;
			}
			this.selectedIncTime = ((this.selectedFilterPerc * this.$store.maxIncTime[this.selectedTargetDataset] * 0.000001) / 100).toFixed(3);

			console.log("Maximum among all runtimes: ", this.selectedTargetDataset);
		},

		setComponentMap() {
			this.currentEnsembleCCTComponents = [this.$refs.CCT];
			this.currentEnsembleSuperGraphComponents = [
				this.$refs.EnsembleSuperGraph,
				this.$refs.EnsembleHistogram,
				this.$refs.EnsembleScatterplot,
				this.$refs.CallsiteCorrespondence,
				// this.$refs.ParameterProjection,
				this.$refs.ModuleHierarchy,
			];
		},

		// Set the min and max and assign color variables from Settings.
		setRuntimeColorScale() {
			let colorMin = null;
			let colorMax = null;
			if (this.selectedMetric == "Inclusive") {
				colorMin = parseFloat(this.$store.minIncTime["ensemble"]);
				colorMax = parseFloat(this.$store.maxIncTime["ensemble"]);
			}
			else if (this.selectedMetric == "Exclusive") {
				colorMin = parseFloat(this.$store.minExcTime["ensemble"]);
				colorMax = parseFloat(this.$store.maxExcTime["ensemble"]);
			}
			else if (this.selectedMetric == "Imbalance") {
				colorMin = 0.0;
				colorMax = 1.0;
			}

			this.selectedColorMinText = utils.formatRuntimeWithoutUnits(parseFloat(colorMin));
			this.selectedColorMaxText = utils.formatRuntimeWithoutUnits(parseFloat(colorMax));

			this.$store.selectedColorMin = this.colorMin;
			this.$store.selectedColorMax = this.colorMax;

			this.$store.runtimeColor.setColorScale(this.$store.selectedMetric, colorMin, colorMax, this.selectedRuntimeColorMap, this.selectedColorPoint);
		},

		setDistributionColorScale() {
			let hist_min = 0;
			let hist_max = 0;
			for (let module in this.$store.modules["ensemble"]) {
				let node = this.$store.modules["ensemble"][module];
				// if (node.type == "super-node") {
				hist_min = Math.min(hist_min, node[this.$store.selectedMetric]["gradients"]["hist"]["y_min"]);
				hist_max = Math.max(hist_max, node[this.$store.selectedMetric]["gradients"]["hist"]["y_max"]);
				// }
				// else if (node.type == "component-node") {
				// hist_min = Math.min(hist_min, this.$store.callsites["ensemble"][node.name][this.$store.selectedMetric]["gradients"]["hist"]["y_min"]);
				// hist_max = Math.max(hist_max, this.$store.callsites["ensemble"][node.name][this.$store.selectedMetric]["gradients"]["hist"]["y_max"]);
				// }
			}
			this.$store.distributionColor.setColorScale("MeanGradients", hist_min, hist_max, this.selectedDistributionColorMap, this.selectedColorPoint);
		},

		setupColors() {
			// Create runtime color object.
			this.$store.runtimeColor = new Color();
			this.runtimeColorMap = this.$store.runtimeColor.getAllColors();
			this.setRuntimeColorScale();

			// Create distribution color object
			this.$store.distributionColor = new Color();
			this.distributionColorMap = this.$store.distributionColor.getAllColors();
			this.setDistributionColorScale();
			this.selectedTargetColor = "Green";
			this.$store.distributionColor.target = this.targetColorMap[this.selectedTargetColor];
			this.$store.distributionColor.ensemble = "#C0C0C0";
			this.$store.distributionColor.compare = "#043060";

			// Create difference color object
			this.$store.diffColor = new Color();

			// Set properties into store.
			this.$store.selectedRuntimeColorMap = this.selectedRuntimeColorMap;
			this.$store.selectedDistributionColorMap = this.selectedDistributionColorMap;
			this.$store.selectedColorPoint = this.selectedColorPoint;

			this.selectedTargetColor = this.targetColorMap[this.selectedTargetColorText];
			this.targetColors = Object.keys(this.targetColorMap);


			this.$store.runtimeColor.intermediate = "#d9d9d9";
			this.$store.runtimeColor.highlight = "#C0C0C0";
			this.$store.runtimeColor.textColor = "#3a3a3a";
			this.$store.runtimeColor.edgeStrokeColor = "#888888";

		},

		// Feature: the Supernode hierarchy is automatically selected from the mean metric runtime.
		sortModulesByMetric(attr) {
			let module_list = Object.keys(this.$store.modules["ensemble"]);

			// Create a map for each dataset mapping the respective mean times.
			let map = {};
			for (let module_name of module_list) {
				map[module_name] = this.$store.modules["ensemble"][module_name][this.$store.selectedMetric]["mean_time"];
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

		setSelectedModule() {
			let modules_sorted_list_by_metric = this.sortModulesByMetric();
			this.selectedModule = modules_sorted_list_by_metric[0][0];
			this.$store.selectedModule = this.selectedModule;
		},

		clearLocal() {
			if (this.selectedFormat == "CCT") {
				this.clearComponents(this.currentEnsembleCCTComponents);
			}
			else if (this.selectedFormat == "SuperGraph") {
				this.clearComponents(this.currentEnsembleSuperGraphComponents);
			}
		},

		clear() {
			if (this.selectedFormat == "CCT") {
				this.clearComponents(this.currentEnsembleSuperGraphComponents);
			}
			else if (this.selectedFormat == "SuperGraph") {
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

		init() {
			if (this.selectedExhibitMode == "Presentation") {
				this.enablePresentationMode();
			}

			// Initialize colors
			this.setupColors();
			this.setOtherData();
			this.setTargetDataset();
			if (this.selectedFormat == "SuperGraph") {
				this.setSelectedModule();
			}

			console.info("Mode : ", this.selectedMode);
			console.info("Number of runs :", this.$store.numOfRuns);
			console.info("Dataset : ", this.selectedTargetDataset);
			console.info("Format = ", this.selectedFormat);

			if (this.selectedFormat == "SuperGraph") {
				this.initComponents(this.currentEnsembleSuperGraphComponents);
			}
			else if (this.selectedFormat == "CCT") {
				this.initComponents(this.currentEnsembleCCTComponents);
			}
			EventHandler.$emit("ensemble-refresh-boxplot", {});
		},

		reset() {
			this.$socket.emit("init", {
				mode: this.selectedMode,
				dataset: this.$store.selectedTargetDataset
			});
		},

		processJSON(json) {
			let d = json.data;
			let index = json.index;
			let columns = json.columns;

			let columnMap = {};
			let idx = 0;
			for (let column of columns) {
				columnMap[column] = idx;
				idx += 1;
			}
			return {
				d: d,
				index: index,
				columns: columns,
				columnMap: columnMap
			};
		},

		processCallsite(data) {
			let callsites = {};
			for (let i = 0; i < data.index.length; i += 1) {
				let callsite = {};
				let callsite_name = data.d[i][data.columnMap["name"]];
				for (let column of data.columns) {
					callsite[column] = data.d[i][data.columnMap[column]];
				}
				callsites[callsite_name] = callsite;
			}
			return callsites;
		},

		processModule(data) {
			let modules = {};
			for (let i = 0; i < data.index.length; i += 1) {
				let module_dict = {};
				let module_name = data.d[i][data.columnMap["module"]];
				for (let column of data.columns) {
					module_dict[column] = data.d[i][data.columnMap[column]];
				}
				modules[module_name] = module_dict;
			}
			return modules;
		},

		updateColors() {
			this.clearLocal();
			this.setupColors();
			this.init();
		},

		updateFormat() {
			this.clearLocal();
			this.$socket.emit("init", {
				mode: this.selectedMode,
				dataset: this.$store.selectedTargetDataset
			});
			this.init();
		},

		updateTargetDataset() {
			this.$store.selectedTargetDataset = this.selectedTargetDataset;
			this.$store.compareDataset = "";
			this.$store.encoding = "MEAN_GRADIENTS";
			console.info("[Update] Target Dataset: ", this.selectedTargetDataset);
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
			this.$socket.emit("cct", {
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

		updateCompareDataset() {
			this.summaryChip = "Diff SuperGraph";
			this.$store.selectedCompareDataset = this.selectedCompareDataset;
			this.$store.comparisonMode = true;
			this.$store.encoding = this.selectedCompareMode;
			this.$socket.emit("compare", {
				targetDataset: this.$store.selectedTargetDataset,
				compareDataset: this.$store.selectedCompareDataset,
				selectedMetric: this.$store.selectedMetric
			});
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

		updateColorMin() {
		},

		updateRunBinCount() {
			this.$store.selectedRunBinCount = this.selectedRunBinCount;
			this.$socket.emit("ensemble_callsite_data", {
				datasets: this.$store.selectedDatasets,
				sortBy: this.$store.auxiliarySortBy,
				MPIBinCount: this.$store.selectedMPIBinCount,
				RunBinCount: this.$store.selectedRunBinCount,
				module: "all",
				re_process: 1
			});
			this.clearLocal();
			this.init();
		},

		updateMPIBinCount() {
			this.$store.selectedMPIBinCount = this.selectedMPIBinCount;
			this.$store.reprocess = 1;
			this.$socket.emit("ensemble_callsite_data", {
				datasets: this.$store.selectedDatasets,
				sortBy: this.$store.auxiliarySortBy,
				MPIBinCount: this.$store.selectedMPIBinCount,
				RunBinCount: this.$store.selectedRunBinCount,
				module: "all",
				re_process: 1
			});
			this.clearLocal();
			this.init();
		}
	}
};