import { ActionContext, Store } from "vuex";
import { getStoreAccessors } from "vuex-typescript";
import { GlobalState } from "../state-types";

export interface CallFlowState {
	config: Object,
	callsites: Object,
	numOfRuns: Number,
	runNames: Array<String>,
	minIncTime: Number,
	minExcTime: Number,
	maxIncTime: Number,
	maxExcTime: Number,
	numOfRanks: Array<Number>
	moduleCallsiteMap: Object,
	callsiteModuleMap: Object
	scheme: Object,
	selectedTargetDataset: String,
	selectedMode: String,
	selectedMetric: String,
}

type CallFlowContext = ActionContext<CallFlowState, GlobalState>;

export const CallFlowModule = {
	namespace: true,
	state: {
		config: {},
		numOfRuns: 0,
		runNames: [],
		minIncTime: 0.0,
		minExcTime: 0.0,
		maxIncTime: 0.0,
		maxExcTime: 0.0,
		numOfRanks: [],
		moduleCallsiteMap: {},
		callsiteModuleMap: {},
		scheme: {},
		selectedTargetDataset: '',
		selectedMode: 'Single',
		selectedMetric: 'Inclusive',

	},

	getters: {
		getConfig(state: CallFlowState) {
			return state.config;
		},
	},

	mutations: {
		initApp(state: CallFlowState) {
			console.log('Fetch the state')
		},

		// SOCKET_config(state: CallFlowState, message) {
		// 	let data = JSON.parse(message)
		// 	console.log("[Socket] Config: ", data)
		// 	state.numOfRuns = data['datasets'].length
		// 	state.runNames = data['names']
		// 	state.maxExcTime = data['max_excTime']
		// 	state.minExcTime = data['min_excTime']
		// 	state.maxIncTime = data['max_incTime']
		// 	state.minIncTime = data['min_incTime']
		// 	state.numOfRanks = data['numbOfRanks']
		// 	// TODO: Make it the slowest or fastest. 
		// 	state.selectedTargetDataset = data['names'][0]

		// 	if (state.numOfRuns >= 2) {
		// 		state.selectedMode = 'Ensemble'
		// 	}
		// 	console.log(state)
		// },

		// SOCKET_ensemble_supergraph(state: CallFlowState, message) {
		// 	let data = JSON.parse(message)
		// 	console.log(data)
		// }
	},

	actions: {
		initApp({ commit }) {
			commit('initApp');
		},

		// SOCKET_config: ({ state }) => {
			
		// }
	},
};

const { commit, read, dispatch } = getStoreAccessors<CallFlowState, GlobalState>("");

const CallFlowAccessor = {
	getConfig: read(CallFlowModule.getters.getConfig),
	initApp: dispatch(CallFlowModule.actions.initApp)
}

export default CallFlowAccessor;
