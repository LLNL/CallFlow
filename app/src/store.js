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
	},
	actions: {
		async fetchConfig({ commit }) {
			const config = await APIService.GETRequest("config");
			const runs = config.runs.map((_) => _["name"]);
			commit("setRuns", runs);
			commit("setConfig", config);
		},

		async fetchSummary({ commit, state }, payload) {	
			const summary = await APIService.POSTRequest("summary");
			console.log("[Fetch] Summary :", summary);
			commit("setSummary", summary);
			commit("setProfiles", utils.swapKeysToArray(summary, ["ensemble"]));
			const metricTimeMap = utils.swapKeysToDict(summary, "meantime");
			commit("setMetricTimeMap", metricTimeMap);
			const selectedTargetRun = utils.getKeyWithMaxValue(metricTimeMap);
			commit("setSelectedTargetRun", selectedTargetRun);
			commit("setSelectedNode", summary[selectedTargetRun]["roots"][0]);
		},

		async fetchTimeline({ commit }, payload) {
			const timeline = await APIService.POSTRequest("timeline", payload);
			commit("setTimeline", timeline);
		},

		async fetchSingleHistogram({ commit, state }, payload) {
			const hist = await APIService.POSTRequest("single_histogram", {
				dataset: state.selectedTargetRun,
				node: payload.node,
				ntype: payload.ntype,
				nbins: state.rankBinCount,
			});
			commit("setSingleHistogram", hist);
		},

		async fetchCCT({ commit, state }, payload) {
			const cct = await APIService.POSTRequest("cct", payload);
			commit("setCCT", cct);
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
	}
});