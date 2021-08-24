import Vue from "vue";
import Vuex from "vuex";

import APIService from "lib/routing/APIService";
import EventHandler from "lib/routing/EventHandler";

Vue.use(Vuex);

function swapKeysToArray(data, skipElements) {
	return Object.keys(data).filter((_) => !skipElements.includes(_)).map((_) =>  { return {"run": _, ...data[_]};});
}

function swapKeysToDict(data, key, skipElements) {
	return Object.keys(data)
		.filter((_) => !skipElements.includes(_))
		.reduce((acc, post) => {
			return {...acc, [post]: data[post][key]};	
		}, {});
}

function getKeyWithMaxValue(obj) {
	return Object.keys(obj).reduce((a, b) => obj[a] > obj[b] ? a : b);
}

export default new Vuex.Store({
	state: {
		// CallFlow config.
		config: {},

		// State properties (/summary)
		summary: {},
		profiles: [],
		metricTimeMap: {},
		selectedTargetRun: "", // Set the current target run.
		selectedNode: "", // Set the current active node.
		runs: [],

		// Color
		targetColorMap: {
			Green: "#4DAF4A",
			Blue: "#3366CC",
			Brown: "#AF9B90",
			Red: "#A90400",
			Vermillion: "#dc3912",
			Yellow: "#ff9900",
			Majenta: "#990099",
			Pink: "#dd4477"
		},
		generalColors: {
			silver: "#c0c0c0",
			darkGrey: "#3a3a3a",
			lightGrey: "#888888",
			blue: "#043060", 
			target: "#4DAF4A",
			intermediate: "#d9d9d9",
			ensemble: "#d9d9d9",
			text: "#888888",
		},
		runtimeColorMap: "OrRd",
		distributionColorMap: "Reds",
		targetColor: "Green",
		colorPoint: 9,

		// General properties
		selectedMetric: "time (inc)", // Set the current metric of interest.
		selectedMode: "", // Set the mode: (i.e., CCT, SG, ESG)

		// Single SuperGraph 
		SG: {}, // stores the supergraph (sankey) data
		rankBinCount: 20, // stores the nbins in the histogram
		singleHistogram: {}, // stores histogram data
		singleScatterplot: {}, // stores scatterplot data
		singleBoxplots: [], // // stores scatterplot data

		// Ensemble 
		ESG: {}, // stores the supergraph (sankey) data
		runBinCount: 20, // Ensemble histogram nbin count
		ensembleHistogram: {}, // stores histogram data
		ensembleScatterplot: {}, // stores scatterplot data
		ensembleBoxplots: {}, // stores scatterplot data
		showTarget: true, // show target in the view
		ensembleGradients: {}, // stores the gradient data

		// Timeline state
		timeline: {},

		// CCT states
		CCT: {},

		// Projection State
		parameterProjection: {},
		numOfClusters: 3,

		runtimeSortBy: "mean",
		hierarchy: {},
		prop: "rank",

		// Compare mode
		comparisonMode: false,
		selectedCompareRun: "",
		compareData: {},

		encoding: "MEAN",
		IQRFactor: 1.5,

		gradients: {}
	},

	mutations: {
		setConfig(state, payload) {
			state.config = payload;
		},

		setRuns(state, payload) {
			state.runs = payload;
		},

		setSummary(state, payload) {
			state.summary = payload;
		},

		setProfiles(state, payload) {
			state.profiles = payload;
		},

		setMetricTimeMap(state, payload) {
			state.metricTimeMap = payload;
		},

		setSelectedTargetRun(state, payload) {
			state.selectedTargetRun = payload;
		},

		setSelectedNode(state, payload) {
			state.selectedNode = payload;
		},

		setTimeline(state, payload) {
			state.timeline = payload;
		},
		
		setCCT(state, payload) {
			state.CCT = payload;
		},

		setSelectedMode(state, payload) {
			console.log("Payload for selectedMode: ", payload);
			state.selectedMode = payload;
		},

		setSG(state, payload) {
			state.SG = payload;
		},

		setESG(state, payload) {
			state.ESG = payload;
		},

		setSingleHistogram(state, payload) {
			state.singleHistogram = payload;
		},

		setSingleScatterplot(state, payload) {
			state.singleScatterplot = payload;
		},

		setSingleBoxplots(state, payload) {
			state.singleBoxplots = payload;
		},

		setEnsembleHistogram(state, payload) {
			state.ensembleHistogram = payload;
		},

		setEnsembleScatterplot(state, payload) {
			state.ensembleScatterplot = payload;
		},

		setEnsembleBoxplots(state, payload) {
			state.ensembleBoxplots = payload;
		},

		setEncoding(state, payload) {
			state.encoding = payload;
		},

		setShowTarget(state, payload) {
			state.showTarget = payload;
		},

		setParameterProjection(state, payload) {
			state.parameterProjection = payload;
		},

		setNumOfClusters(state, payload) {
			state.numOfClusters = payload;
		},

		setSelectedColorPoint(state, payload) {
			state.colorPoint = payload;
		}, 

		setHierarchy(state, payload) {
			state.hierarchy = payload;
		},

		setSelectedProp(state, payload) {
			state.prop = payload;
		},

		setComparisonMode(state, payload) {
			console.log("Setting comparison mode to :", payload);
			state.comparisonMode = payload;
		},

		setSelectedCompareRun(state, payload) {
			console.log("Setting comparison run to :", payload);
			state.selectedCompareRun = payload;
		},
		
		setCompareData(state, payload) {
			state.compareData = payload;
		},

		setIQRFactor(state, payload) {
			state.IQRFactor = payload;
		},

		setTargetColor(state, payload) {
			state.targetColor = payload;
		},

		setGradients(state, payload) {
			state.gradients = payload;
		},

		setRuntimeColorMap(state, payload) {
			state.runtimeColorMap = payload;
		},

		setDistributionColorMap(state, payload) {
			state.distributionColorMap = payload;
		}
	},
	
	actions: {
		async fetchConfig({ commit }) {
			const config = await APIService.GETRequest("config");
			console.log("[Data] Config :", config);
			commit("setConfig", config);
		},

		async fetchSummary({ commit, state }, payload) {	
			const summary = await APIService.POSTRequest("summary");
			console.log("[Data] Summary :", summary);
			commit("setSummary", summary);
			commit("setProfiles", swapKeysToArray(summary, ["ensemble"]));
			const metricTimeMap = swapKeysToDict(summary, "meantime", ["ensemble"]);
			commit("setMetricTimeMap", metricTimeMap);
			const selectedTargetRun = getKeyWithMaxValue(metricTimeMap);
			commit("setSelectedTargetRun", selectedTargetRun);
			commit("setSelectedNode", { 
				"name": summary[selectedTargetRun]["maxmodule"],
				"type": "module"
			});
			const runs = Object.keys(summary).filter((item) => item !== "ensemble");
			commit("setRuns", runs);
		},

		async fetchTimeline({ commit }, payload) {
			const timeline = await APIService.POSTRequest("timeline", payload);
			commit("setTimeline", timeline);
		},

		async fetchSingleHistogram({ commit }, payload) {
			const hist = await APIService.POSTRequest("single_histogram", payload);
			console.log("[Data] Single Histogram: ", hist);
			commit("setSingleHistogram", hist);
		},
		
		async fetchSingleScatterplot({ commit }, payload) {
			const scat = await APIService.POSTRequest("single_scatterplot", payload);
			console.log("[Data] Single Scatterplot: ", scat);
			commit("setSingleScatterplot", scat["tgt"]);
		},

		async fetchSingleBoxplots({ commit }, payload) {
			const bps = await APIService.POSTRequest("single_boxplots", payload);
			console.log("[Data] Single boxplots: ", bps);
			commit("setSingleBoxplots", bps);
		},

		async fetchCCT({ commit }, payload) {
			const cct = await APIService.POSTRequest("cct", payload);
			console.log("[Data] CCT for", payload.dataset, "is :", cct);
			commit("setCCT", cct);
		},

		async fetchSG({ commit }, payload) {
			const sg = await APIService.POSTRequest("single_supergraph", payload);
			console.log("[Data] SG: ", sg);
			commit("setSG", sg);
		},

		async fetchESG({ commit }, payload) {
			const esg = await APIService.POSTRequest("ensemble_supergraph", payload);
			console.log("[Data] ESG: ", esg);
			commit("setESG", esg);
		},

		async fetchEnsembleHistogram({ commit }, payload) {
			const esh = await APIService.POSTRequest("ensemble_histogram", payload);
			console.log("[Data] ESG Histogram: ", esh);
			commit("setEnsembleHistogram", esh);
		},
		
		async fetchEnsembleScatterplot({ commit }, payload) {
			const ess = await APIService.POSTRequest("ensemble_scatterplot", payload);
			console.log("[Data] ESG Scatterplot: ", ess);
			commit("setEnsembleScatterplot", ess);
		},

		async fetchEnsembleBoxplots({ commit }, payload) {
			const esb = await APIService.POSTRequest("ensemble_boxplots", payload);
			console.log("[Data] ESG Boxplots: ", esb);
			commit("setEnsembleBoxplots", esb);
		},

		async fetchParameterProjection({ commit }, payload) {
			const pp = await APIService.POSTRequest("projection", payload);
			console.log("[Data] ESG Projection: ", JSON.parse(pp));
			commit("setParameterProjection", JSON.parse(pp));
		},

		async fetchGradients({ commit }, payload) {
			const grad = await APIService.POSTRequest("gradients", payload);
			console.log("[Data] ESG Gradients: ", grad);
			commit("setGradients", grad);
		},

		async fetchHierarchy({ commit }, payload) {
			const hierarchy = await APIService.POSTRequest("module_hierarchy", payload);
			console.log("[Data] ESG Hierarchy: ", hierarchy);
			commit("setHierarchy", hierarchy);
		},

		async fetchCompare({ commit, state }, payload) {
			const comp = await APIService.POSTRequest("compare", {
				targetRun: state.selectedTargetRun,
				compareRun: state.selectedCompareRun,
				selectedMetric: state.selectedMetric,
			});
			console.log("[Data] ESG Comparison: ", comp);
			commit("setCompareData", comp);
		},

		updateSelectedMetric({ state, dispatch }, payload) {
			state.selectedMetric = payload;
			dispatch("reset");
		},

		updateRuntimeColorMap({ state, dispatch }, payload) {
			state.runtimeColorMap = payload;
			dispatch("reset");
		},

		updateDistributionColorMap({ state }, payload) {
			state.distributionColorMap = payload;
			EventHandler.$emit("update-node-encoding");
		},

		updateSelectedColorPoint({ state, dispatch }, payload) {
			state.colorPoint = payload;
			dispatch("reset");
		},

		updateRankBinCount({ state }, payload) {
			state.rankBinCount = payload;
			EventHandler.$emit("reset-single-histogram");
		},

		updateRunBinCount({ state, dispatch }, payload) {
			state.runBinCount = payload;
			dispatch("reset");
		},

		updateRuntimeSortBy({ state, dispatch }, payload) {
			state.runtimeSortBy = payload;
			if (state.selectedMode === "SG") {
				EventHandler.$emit("callsite-information-sort");
			} else if (state.selectedMode === "ESG") {
				EventHandler.$emit("callsite-correspondence-sort");
			}
		},

		updateCompareRun({ commit }, payload) {
			commit("setCompareRun", payload);
			commit("setComparisonMode", payload);
			EventHandler.$emit("update-ensemble-colors");
		},

		updateNodeEncoding() {
			EventHandler.$emit("update-node-encoding");
		},

		updateIQRFactor({state, commit}, payload) {
			commit("setIQRFactor", payload);
			console.log("[Interaction] Updating IQR Factor: ", payload);
			if (state.selectedMode == "SG") {
				EventHandler.$emit("reset-single-boxplots");
			}
			else if(state.selectedMode == "ESG") {
				EventHandler.$emit("reset-ensemble-boxplots");
			}
		},

		updateTargetColor({commit, dispatch}, payload) {
			console.log("[Interaction] Updating Target color: ", payload);
			commit("setTargetColor", payload);
			dispatch("reset");
		},

		reset({state}) {
			console.debug("Reset triggered");
			if (state.selectedMode == "CCT") {
				EventHandler.$emit("reset-cct");
			}
			else if (state.selectedMode == "SG") {
				EventHandler.$emit("reset-sg");
			}
			else if (state.selectedMode == "ESG") {
				EventHandler.$emit("reset-esg");
			}
		},
	},
	modules: {

	},
	getters: {
		getConfig: state => state.config,

		getRuns: state => state.runs,
		getSummary: state => state.summary,
		getProfiles: state => state.profiles,
		getMetricTimeMap: state => state.metricTimeMap,
		getSelectedTargetRun: state => state.selectedTargetRun,
		getSelectedNode: state => state.selectedNode,

		getTimeline: state => state.timeline,

		getCCT: state => state.CCT,

		getRankBinCount: state => state.rankBinCount,
		getRunBinCount: state => state.runBinCount,

		getSelectedCompareRun: state => state.selectedCompareRun,
		getSelectedMetric: state => state.selectedMetric,
		getSelectedMode: state => state.selectedMode,
		getComparisonMode: state => state.comparisonMode,


		getSG: state => state.SG,
		getSingleHistogram: state => state.singleHistogram,
		getSingleScatterplot: state => state.singleScatterplot,
		getSingleBoxplots: state => state.singleBoxplots,
		getRuntimeColorMap: state => state.runtimeColorMap,

		getESG: state => state.ESG,
		getDSG: state => state.DSG,
		getEnsembleHistogram: state => state.ensembleHistogram,
		getEnsembleScatterplot: state => state.ensembleScatterplot,
		getEnsembleBoxplots: state => state.ensembleBoxplots,
		getShowTarget: state => state.showTarget,
		getTargetColorMap: state => state.targetColorMap,
		getDistributionColorMap: state => state.distributionColorMap,
		getTargetColor: state => state.targetColor,

		getParameterProjection: state => state.parameterProjection,
		getNumOfClusters: state => state.numOfClusters,

		getGeneralColors: state => state.generalColors,
		getEncoding: state => state.encoding,
		getColorPoint: state => state.colorPoint,	
		getRuntimeSortBy: state => state.runtimeSortBy,
		getIQRFactor: state => state.IQRFactor,
		getHierarchy: state => state.hierarchy,
		getProp: state => state.prop,
		
		getCompareData: state => state.compareData,
		getGradients: state => state.gradients,
	}
});