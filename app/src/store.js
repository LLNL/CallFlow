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
		selectedTargetRun: "",
		selectedNode: "",
		selectedMetric: "time (inc)",
		selectedTopCallsiteCount: 10, 
		timeline: {},
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
		}
	},
	actions: {
		async fetchConfig({ commit }) {
			const config = await APIService.GETRequest("config");
			const runs = config.runs.map((_) => _["name"]);
			commit("setRuns", runs);
			commit("setConfig", config);
		},

		async fetchSummary({ commit, state }) {	
			const summary = await APIService.POSTRequest("summary", {
				datasets: state.runs,
			});
			commit("setSummary", summary);
			commit("setProfiles", utils.swapKeysToArray(summary, ["ensemble"]));
			const metricTimeMap = utils.swapKeysToDict(summary, "meantime");
			commit("setMetricTimeMap", metricTimeMap);
			const selectedTargetRun = utils.getKeyWithMaxValue(metricTimeMap);
			commit("setSelectedTargetRun", selectedTargetRun);
			commit("setSelectedNode", summary[selectedTargetRun]["roots"][0]);
		},

		async fetchTimeline({ commit, state }, payload) {
			const timeline = await APIService.POSTRequest("timeline", payload);
			console.log(timeline);
			commit("setTimeline", timeline);
		},

		async fetchSingleHistogram({ commit, state }, payload) {
			const hist = await APIService.POSTRequest("single_histogram", {
				dataset: state.selectedTargetDataset,
				node: payload.node,
				ntype: payload.ntype,
				nbins: state.rankBinCount,
			});
			commit("setSingleHistogram", hist);
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
		getSelectedNode: state => state.selectedNode,
		getTimeline: state => state.timeline,
	}
});