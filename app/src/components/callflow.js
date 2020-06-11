import * as d3 from "d3";

import Color from "./color/color";
import Splitpanes from "splitpanes";
import "splitpanes/dist/splitpanes.css";

import EventHandler from "./EventHandler";

// Template import
import tpl from "../html/callflow.html";

// Single mode imports
import SuperGraph from "./supergraph/supergraph";
import SingleCCT from "./cct/cct";
import RuntimeScatterplot from "./runtimeScatterplot/runtimeScatterplot";
import SingleHistogram from "./histogram/histogram";
import Function from "./function/function";

// Ensemble mode imports
import EnsembleSuperGraph from "./ensembleSupergraph/ensembleSupergraph";
import EnsembleCCT from "./ensembleCCT/ensembleCCT";
import AuxiliaryFunction from "./auxiliaryFunction/auxiliaryFunction";
import EnsembleHistogram from "./ensembleHistogram/ensembleHistogram";
import ModuleHierarchy from "./moduleHierarchy/moduleHierarchy";
import EnsembleScatterplot from "./ensembleScatterplot/ensembleScatterplot";
// import EnsembleDistribution from './ensembleDistribution/ensembleDistribution'
import ParameterProjection from "./parameterProjection/parameterProjection";
// import SimilarityMatrix from './similarityMatrix/similarityMatrix'

import io from "socket.io-client";
import * as utils from "./utils";

export default {
	name: "CallFlow",
	template: tpl,
	components: {
		Splitpanes,
		SuperGraph,
		SingleCCT,
		RuntimeScatterplot,
		Function,
		SingleHistogram,
		ModuleHierarchy,
		EnsembleSuperGraph,
		EnsembleCCT,
		// SimilarityMatrix,
		ParameterProjection,
		AuxiliaryFunction,
		EnsembleHistogram,
		EnsembleScatterplot,
		// EnsembleDistribution
	},

	watch: {
		showTarget: (val) => {
			EventHandler.$emit("show_target_auxiliary");
		}
	},

	data: () => ({
		appName: "CallFlow",
		// server: '169.237.6.49:5000',
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
		selectedMetric: "Exclusive",
		runtimeColorMap: [],
		distributionColorMap: [],
		selectedRuntimeColorMap: "Default",
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
		summaryChip: "Ensemble SuperGraph",
		auxiliarySortBy: "time (inc)",
		ranks: [],
		initLoad: true,
		comparisonMode: false,
		selectedCompareDataset: null,
		compareModes: ["mean-diff", "rank-diff"],
		selectedCompareMode: "mean-diff",
		selectedOutlierBand: 4,
		defaultCallSite: "<program root>",
		modes: ["Ensemble", "Single"],
		selectedMode: "Single",
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
		caseStudy: ["Lulesh-Scaling-3-runs", "Lulesh-Scaling-8-runs", "Kripke-MPI", "OSU-Bcast", "Kripke-Scaling"],
		selectedCaseStudy: "",
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
		selectedTargetColor: "",
		selectedTargetColorText: "Green",
		showTarget: true,
		targetInfo: "Target Guides",
		metricTimeMap: {}, // Stores the metric map for each dataset (sorted by inclusive/exclusive time)
	}),

	mounted() {
		var socket = io.connect(this.server, { reconnect: false });
		console.log(this.selectedMode)
		this.$socket.emit("init", {
			mode: this.selectedMode
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

		EventHandler.$on("show_target_auxiliary", (data) => {
			this.clearLocal();
			this.init();
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

			console.log(this.selectedFormat.length, this.selectedMode)
			if (this.selectedFormat == "SuperGraph") {
				if (this.selectedMode == "Single") {
					this.$socket.emit("single_callsite_data", {
						dataset: this.$store.selectedTargetDataset,
						sortBy: this.$store.auxiliarySortBy,
						binCount: this.$store.selectedMPIBinCount,
						module: "all"
					});
				}
				else if (this.selectedMode == "Ensemble") {
					this.$socket.emit("ensemble_callsite_data", {
						datasets: this.$store.selectedDatasets,
						sortBy: this.$store.auxiliarySortBy,
						MPIBinCount: this.$store.selectedMPIBinCount,
						RunBinCount: this.$store.selectedRunBinCount,
						module: "all",
						re_process: this.$store.reprocess
					});
				}
			}
			else if (this.selectedFormat == "CCT") {
				this.init();
			}

		},

		single_callsite_data(data) {
			console.log("Auxiliary Data: ", data);
			this.dataReady = true;

			this.$store.modules = data["module"];
			this.$store.callsites = data["callsite"];
			this.$store.gradients = data["gradients"];
			this.$store.moduleCallsiteMap = data["moduleCallsiteMap"];
			this.$store.callsiteModuleMap = data["callsiteModuleMap"];
			console.log("[Socket] Single Callsite data processing done.");
			this.init();
		},

		ensemble_callsite_data(data) {
			console.log("Auxiliary Data: ", data);
			this.dataReady = true;

			this.$store.modules = data["module"];
			this.$store.callsites = data["callsite"];
			this.$store.gradients = data["gradients"];
			this.$store.moduleCallsiteMap = data["moduleCallsiteMap"];
			this.$store.callsiteModuleMap = data["callsiteModuleMap"];
			console.log("[Socket] Ensemble Callsite data processing done.");
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
			console.log("Config file contains: 	", data);
			this.$store.numOfRuns = data["datasets"].length;
			this.$store.selectedDatasets = data["names"];
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
			this.selectedCaseStudy = data["runName"];
			this.$store.comparisonMode = this.comparisonMode;
			this.$store.fontSize = 14;
			this.$store.transitionDuration = 1000;
		},

		setOtherData() {
			this.$store.selectedScatterMode = "mean";
			this.$store.nodeInfo = {};
			this.$store.selectedFunctionsInCCT = this.selectedFunctionsInCCT;
			this.$store.selectedHierarchyMode = this.selectedHierarchyMode;
			this.$store.selectedProp = this.selectedProp;
			this.$store.selectedScale = this.selectedScale;
			this.$store.selectedCompareMode = this.selectedCompareMode;
			this.$store.selectedIQRFactor = this.selectedIQRFactor;
			this.$store.selectedRuntimeSortBy = this.selectedRuntimeSortBy;
			this.$store.selectedNumOfClusters = this.selectedNumOfClusters;


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
			console.log(this.$store.selectedDatasets)
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
			this.currentSingleCCTComponents = [this.$refs.SingleCCT];
			this.currentSingleCallGraphComponents = [];
			this.currentSingleSuperGraphComponents = [
				this.$refs.SuperGraph,
				this.$refs.SingleHistogram,
				this.$refs.RuntimeScatterplot,
				this.$refs.Function
			];

			this.currentEnsembleCCTComponents = [this.$refs.EnsembleCCT];
			this.currentEnsembleCallGraphComponents = [];
			this.currentEnsembleSuperGraphComponents = [
				this.$refs.EnsembleSuperGraph,
				this.$refs.EnsembleHistogram,
				this.$refs.EnsembleScatterplot,
				this.$refs.AuxiliaryFunction,
				this.$refs.ParameterProjection,
				this.$refs.ModuleHierarchy,
			];
		},

		setupColors() {
			this.$store.color = new Color(this.selectedMetric);
			this.$store.zeroToOneColor = new Color(this.selectedMetric);
			this.$store.binColor = new Color("Bin");
			this.$store.rankDiffColor = new Color("RankDiff");
			this.$store.meanDiffColor = new Color("MeanDiff");

			this.runtimeColorMap = this.$store.color.getAllColors();
			this.distributionColorMap = this.$store.color.getAllColors();
			if (this.selectedMode == "Ensemble") {
				if (this.selectedMetric == "Inclusive") {
					this.selectedColorMin = utils.formatRuntimeWithoutUnits(parseFloat(this.$store.minIncTime["ensemble"]));
					this.selectedColorMax = utils.formatRuntimeWithoutUnits(parseFloat(this.$store.maxIncTime["ensemble"]));
				}
				else if (this.selectedMetric == "Exclusive") {
					this.selectedColorMin = utils.formatRuntimeWithoutUnits(parseFloat(this.$store.minExcTime["ensemble"]));
					this.selectedColorMax = utils.formatRuntimeWithoutUnits(parseFloat(this.$store.maxExcTime["ensemble"]));
				}
				this.selectedColorMin = 0.0;
			}
			else if (this.selectedMode == "Single") {
				if (this.selectedMetric == "Inclusive") {
					this.selectedColorMin = this.$store.minIncTime[this.selectedTargetDataset];
					this.selectedColorMax = this.$store.maxIncTime[this.selectedTargetDataset];
				}
				else if (this.selectedMetric == "Exclusive") {
					this.selectedColorMin = this.$store.minExcTime[this.selectedTargetDataset];
					this.selectedColorMax = this.$store.maxExcTime[this.selectedTargetDataset];
				}
				else if (this.selectedMetric == "Imbalance") {
					this.selectedColorMin = 0.0;
					this.selectedColorMax = 1.0;
				}
			}

			this.$store.color.setColorScale(this.selectedColorMin, this.selectedColorMax, this.selectedRuntimeColorMap, this.selectedColorPoint);
			this.$store.zeroToOneColor.setColorScale(0, 1, this.selectedRuntimeColorMap, this.selectedColorPoint);

			this.$store.colorPoint = this.selectedColorPoint;
			this.$store.selectedColorMin = this.selectedColorMin;
			this.$store.selectedColorMax = this.selectedColorMax;
			this.$store.selectedRuntimeColorMap = this.selectedRuntimeColorMap;
			this.$store.selectedDistributionColorMap = this.selectedDistributionColorMap;
			this.$store.selectedColorPoint = this.selectedColorPoint;
			this.selectedColorMinText = this.selectedColorMin;
			this.selectedColorMaxText = this.selectedColorMax;
			this.$store.color.highlight = "#AF9B90";//'#4681B4'
			this.selectedTargetColor = this.targetColorMap[this.selectedTargetColorText];
			this.$store.color.target = this.selectedTargetColor;
			this.$store.color.ensemble = "#C0C0C0";//'#4681B4'
			this.$store.color.compare = "#043060";
			this.$store.color.edgeStrokeColor = "#888888";
			this.$store.intermediateColor = "#d9d9d9";
			this.$store.showTarget = this.showTarget;

			this.targetColors = Object.keys(this.targetColorMap);
		},

		// Feature: the Supernode hierarchy is automatically selected from the mean metric runtime. 
		sortModulesByMetric(attr) {
			console.log(this.$store.modules)
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

		clear() {
			if (this.selectedMode == "Ensemble") {
				if (this.selectedFormat == "CCT") {
					this.clearComponents(this.currentSingleCCTComponents);
				}
				else if (this.selectedFormat == "Callgraph") {
					this.clearComponents(this.currentSingleCallGraphComponents);
				}
				else if (this.selectedFormat == "SuperGraph") {
					this.clearComponents(this.currentSingleSuperGraphComponents);
				}
			}
			else if (this.selectedMode == "Single") {
				if (this.selectedFormat == "CCT") {
					this.clearComponents(this.currentEnsembleCCTComponents);
				}
				else if (this.selectedFormat == "CallGraph") {
					this.clearComponents(this.currentEnsembleCallGraphComponents);
				}
				else if (this.selectedFormat == "SuperGraph") {
					this.clearComponents(this.currentEnsembleSuperGraphComponents);
				}
			}
		},

		clearLocal() {
			if (this.selectedMode == "Ensemble") {
				if (this.selectedFormat == "CCT") {
					this.clearComponents(this.currentEnsembleCCTComponents);
				}
				else if (this.selectedFormat == "CallGraph") {
					this.clearComponents(this.currentEnsembleCallGraphComponents);
				}
				else if (this.selectedFormat == "SuperGraph") {
					this.clearComponents(this.currentEnsembleSuperGraphComponents);
				}
			}
			else if (this.selectedMode == "Single") {
				if (this.selectedFormat == "CCT") {
					this.clearComponents(this.currentSingleCCTComponents);
				}
				else if (this.selectedFormat == "CallGraph") {
					this.clearComponents(this.currentSingleCallGraphComponents);
				}
				else if (this.selectedFormat == "SuperGraph") {
					this.clearComponents(this.currentSingleSuperGraphComponents);
				}
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
			if(this.selectedFormat == 'SuperGraph' && this.selectedMode == 'Ensemble'){
				this.setSelectedModule();
			}

			console.log("Mode : ", this.selectedMode);
			console.log("Number of runs :", this.$store.numOfRuns);
			console.log("Dataset : ", this.selectedTargetDataset);
			console.log("Format = ", this.selectedFormat);

			// Call the appropriate socket to query the server.
			if (this.selectedMode == "Single") {

				if (this.selectedFormat == "SuperGraph") {
					this.initComponents(this.currentSingleSuperGraphComponents);
				}
				else if (this.selectedFormat == "CallGraph") {
					this.initComponents(this.currentSingleCallGraphComponents);
				}
				else if (this.selectedFormat == "CCT") {
					this.initComponents(this.currentSingleCCTComponents);
				}
			}
			else if (this.selectedMode == "Ensemble") {
				if (this.selectedFormat == "SuperGraph") {
					this.initComponents(this.currentEnsembleSuperGraphComponents);
				}
				else if (this.selectedFormat == "CallGraph") {
					this.loadComponents(this.currentEnsembleCallGraphComponents);
				}
				else if (this.selectedFormat == "CCT") {
					console.log(this.currentEnsembleCCTComponents)
					this.initComponents(this.currentEnsembleCCTComponents);
				}
			}
		},

		reset() {
			this.$socket.emit("init", {
				caseStudy: this.selectedCaseStudy
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

		updateCaseStudy() {
			this.clearLocal();
			console.log("[Update] Case study: ", this.selectedCaseStudy);
			this.$socket.emit("init", {
				caseStudy: this.selectedCaseStudy
			});

			this.init();
		},

		updateColors() {
			this.clearLocal();
			this.setupColors();
			this.init();
		},

		updateFormat() {
			this.clearLocal();
			this.$socket.emit("init", {
				caseStudy: this.selectedCaseStudy
			});
			this.init();
		},

		updateTargetDataset() {
			this.clearLocal();
			this.$store.selectedTargetDataset = this.selectedTargetDataset;
			console.log("[Update] Target Dataset: ", this.selectedTargetDataset);
			this.init();
			EventHandler.$emit("show_target_auxiliary", {
			});
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
			this.clearLocal();
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
			EventHandler.$emit("update_diff_node_alignment");
		},

		updateAuxiliarySortBy() {
			this.$store.auxiliarySortBy = this.auxiliarySortBy;
			EventHandler.$emit("update_auxiliary_sortBy");
		},

		updateCompareDataset() {
			this.summaryChip = "Diff SuperGraph";
			this.$store.selectedCompareDataset = this.selectedCompareDataset;
			this.$store.compareAnalysisMode = true;
			this.$socket.emit("compare", {
				targetDataset: this.$store.selectedTargetDataset,
				compareDataset: this.$store.selectedCompareDataset,
				selectedMetric: this.$store.selectedMetric
			});
		},

		updateCompareMode() {
			this.$store.selectedCompareMode = this.selectedCompareMode;
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
			EventHandler.$emit("callsite_information_sort");
		},

		updateNumOfClusters() {
			this.$store.selectedNumOfClusters = this.selectedNumOfClusters;
			EventHandler.$emit("update_number_of_clusters");
		},

		updateTargetColor() {
			this.clearLocal();
			this.init();
			EventHandler.$emit("show_target_auxiliary", {
			});
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