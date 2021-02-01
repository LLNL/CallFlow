import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

const ensemble_state = {
	selectedMode: "Ensemble",
	selectedFunctionsInCCT: 50,
	selectedScale: "Linear",
	comparisonMode: "MEAN_DIFF",
	selectedMPIBinCount: 20,
	selectedRunBinCount: 20,
	auxiliarySortBy: "time (inc)",
	showTarget: true,
	encoding: "MEAN_GRADIENTS",
	nodeInfo: {},
	selectedHierarchyMode: "Uniform",
	selectedProp: "rank",
	selectedIQRFactor: 0.15,
	selectedRuntimeSortBy: "time (inc)",
	selectedNumOfClusters: 3,
	selectedEdgeAlignment: "Top",
	datasetMap: {}
};

export default new Vuex.Store({
	ensemble_state
});