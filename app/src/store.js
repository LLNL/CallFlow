import Vue from "vue";
import Vuex from "vuex";

import * as utils from "lib/utils";
import APIService from "lib/routing/APIService";
Vue.use(Vuex);


export default new Vuex.Store({
	state: {
		config: {},
		runs: [],
		targetColorMap: {
			Green: "#4EAF4A",
			Blue: "#4681B4",
			Brown: "#AF9B90",
			Red: "#A90400",
		},
		generalColors: {
			gainsboro: "#d9d9d9",
			silver: "#c0c0c0",
			darkGrey: "#3a3a3a",
			lightGrey: "#888888",
			blue: "#043060"
		},
		rankBinCount: 20,
		runBinCount: 20,
		summary: {},
		profiles: [],
		metricTimeMap: {},
		selectedTargetRun: "", // Set the current target run.
		selectedNode: "", // Set the current active node.
		selectedMetric: "time (inc)", // Set the current metric of interest.
		selectedMode: "", // Set the mode: can be CCT, SG, ESG
		timeline: {},
		CCT: {},
		SG: {},
		ESG: {},
		singleHistogram: {},
		singleScatterplot: {},
		singleBoxplots: [],
		ensembleHistogram: {},
		ensembleScatterplot: {},
		ensembleBoxplots: {},
		encoding: "",
		showTarget: true,
		parameterProjection: {},
		numOfClusters: 3,
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
		}
	},
	actions: {
		async fetchConfig({ commit }) {
			const config = await APIService.GETRequest("config");
			commit("setConfig", config);
		},

		async fetchSummary({ commit, state }, payload) {	
			const summary = await APIService.POSTRequest("summary");
			console.log("[Data] Summary :", summary);
			commit("setSummary", summary);
			commit("setProfiles", utils.swapKeysToArray(summary, ["ensemble"]));
			const metricTimeMap = utils.swapKeysToDict(summary, "meantime");
			commit("setMetricTimeMap", metricTimeMap);
			const selectedTargetRun = utils.getKeyWithMaxValue(metricTimeMap);
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

		async fetchSingleHistogram({ commit, state }, payload) {
			const hist = await APIService.POSTRequest("single_histogram", payload);
			console.log("[Data] Single Histogram: ", hist);
			commit("setSingleHistogram", hist);
		},
		
		async fetchSingleScatterplot({ commit, state }, payload) {
			const scat = await APIService.POSTRequest("single_scatterplot", payload);
			console.log("[Data] Single Scatterplot: ", scat);
			commit("setSingleScatterplot", scat["tgt"]);
		},

		async fetchSingleBoxplots({ commit, state }, payload) {
			const bps = await APIService.POSTRequest("single_boxplots", payload);
			console.log("[Data] Single boxplots: ", bps);
			commit("setSingleBoxplots", bps);
		},

		async fetchCCT({ commit, state }, payload) {
			const cct = await APIService.POSTRequest("cct", payload);
			console.log("[Data] CCT: ", cct);
			commit("setCCT", cct);
		},

		async fetchSG({ commit, state }, payload) {
			const sg = await APIService.POSTRequest("single_supergraph", payload);
			console.log("[Data] SG: ", sg);
			commit("setSG", sg);
		},

		async fetchESG({ commit, state }, payload) {
			const esg = await APIService.POSTRequest("ensemble_supergraph", payload);
			console.log("[Data] ESG: ", esg);
			commit("setESG", esg);
		},

		async fetchEnsembleHistogram({ commit, state }, payload) {
			const esh = await APIService.POSTRequest("ensemble_histogram", payload);
			console.log("[Data] ESG Histogram: ", esh);
			commit("setEnsembleHistogram", esh);
		},
		
		async fetchEnsembleScatterplot({ commit, state }, payload) {
			const ess = await APIService.POSTRequest("ensemble_scatterplot", payload);
			console.log("[Data] ESG Scatterplot: ", ess);
			commit("setEnsembleScatterplot", ess);
		},

		async fetchEnsembleBoxplots({ commit, state }, payload) {
			const esb = await APIService.POSTRequest("ensemble_boxplots", payload);
			console.log("[Data] ESG Boxplots: ", esb);
			commit("setEnsembleBoxplots", esb);
		},

		async fetchParameterProjection({commit, state}, payload) {
			const pp = await APIService.POSTRequest("projection", payload);
			console.log("[Data] ESG Projection: ", JSON.parse(pp));
			commit("setParameterProjection", JSON.parse(pp));
		}
	},
	modules: {

	},
	getters: {
		getConfig: state => state.config,
		getRuns: state => state.runs,
		getSummary: state => state.summary,
		getRankBinCount: state => state.getRankBinCount,
		getRunBinCount: state => state.getRunBinCount,
		getProfiles: state => state.profiles,
		getMetricTimeMap: state => state.metricTimeMap,
		getSelectedTargetRun: state => state.selectedTargetRun,
		getSelectedCompareRun: state => state.selectedCompareRun,
		getSelectedNode: state => state.selectedNode,
		getTimeline: state => state.timeline,
		getSelectedMetric: state => state.selectedMetric,
		getCCT: state => state.CCT,
		getSelectedMode: state => state.selectedMode,
		getSG: state => state.SG,
		getESG: state => state.ESG,
		getSingleHistogram: state => state.singleHistogram,
		getSingleScatterplot: state => state.singleScatterplot,
		getSingleBoxplots: state => state.singleBoxplots,
		getEnsembleHistogram: state => state.ensembleHistogram,
		getEnsembleScatterplot: state => state.ensembleScatterplot,
		getEnsembleBoxplots: state => state.ensembleBoxplots,
		getShowTarget: state => state.showTarget,
		getTargetColorMap: state => state.targetColorMap,
		getParameterProjection: state => state.parameterProjection,
		getNumOfClusters: state => state.numOfClusters,
		getGeneralColors: state => state.generalColors,
	}
});