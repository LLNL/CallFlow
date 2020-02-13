import { ActionContext, Store } from "vuex";
import { getStoreAccessors } from "vuex-typescript";
import { GlobalState } from "../state-types";


export interface CallGraphState {
	sidebarClose: Boolean,
	sidebarStatic: Boolean,
	sidebarActiveElement: null,
	scatterPlotCreate: Boolean
}

type CallGraphContext = ActionContext<CallGraphState, GlobalState>;

export const CallGraphModule = {
	namespaced: true,
	state: {
		sidebarClose: false,
	},

	getters: {
        getSidebarClose(state: CallGraphState) {
            return state.sidebarClose;
        },
	},

	mutations: {
		initApp(state) {
            console.log('Fetch the state')
        },
	},
	actions: {
		initApp({ commit }) {
			commit('initApp');
		}
	},
};

const { commit, read, dispatch } = getStoreAccessors<CallGraphState, GlobalState>("");

const CallGraphAccessor = {
    getSidebarClose: read(CallGraphModule.getters.getSidebarClose),
}

export default CallGraphAccessor;
