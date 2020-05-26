import isScreen from '../../core/screenHelper';
import { ActionContext, Store } from "vuex";
import { getStoreAccessors } from "vuex-typescript";
import { GlobalState } from "../state-types";


export interface LayoutState {
	sidebarClose: Boolean,
	sidebarStatic: Boolean,
	scatterPlotCreate: Boolean,
	isSocketConnected: Boolean,
}

type LayoutContext = ActionContext<LayoutState, GlobalState>;

export const LayoutModule = {
	namespace: true,
	state: {
		sidebarClose: false,
		sidebarStatic: false,
		scatterPlotCreate: true,
		isSocketConnected: false,
	},

	getters: {
        getSidebarClose(state: LayoutState) {
            return state.sidebarClose;
        },

        getSidebarStatic(state: LayoutState) {
            return state.sidebarStatic;
        },
		
		getSocketConnection(state:LayoutState){
			return state.isSocketConnected
		}
	},

	mutations: {
		initLayout(state) {
			
		},

		toggleSidebar(state) {
			const nextState = !state.sidebarStatic;

			localStorage.sidebarStatic = nextState;
			state.sidebarStatic = nextState;

			if (!nextState && (isScreen('lg') || isScreen('xl'))) {
				state.sidebarClose = true;
			}
		},

		switchSidebar(state, value) {
			if (value) {
				state.sidebarClose = value;
			} else {
				state.sidebarClose = !state.sidebarClose;
			}
		},

		changeSidebarActive(state, index) {
			state.sidebarActiveElement = index;
		},

		switchSocketConnection(state) {
			const nextState = !state.isSocketConnected;

			state.isSocketConnected = nextState;

			if (!nextState && (isScreen('lg') || isScreen('xl'))) {
				state.sidebarClose = true;
			}
		},
	},
	actions: {
		initLayout({ commit }) {
			commit('initLayout');
		},
		readMessage({ commit }) {
			commit('readMessage');
		},
		toggleSidebar({ commit }) {
			commit('toggleSidebar');
		},
		switchSidebar({ commit }, value) {
			commit('switchSidebar', value);
		},
		
		changeSidebarActive({ commit }, index) {
			commit('changeSidebarActive', index);
		},
	},
};

const { commit, read, dispatch } = getStoreAccessors<LayoutState, GlobalState>("");

const LayoutAccessor = {
    getSidebarClose: read(LayoutModule.getters.getSidebarClose),
    getSidebarStatic: read(LayoutModule.getters.getSidebarStatic),

}

export default LayoutAccessor;
