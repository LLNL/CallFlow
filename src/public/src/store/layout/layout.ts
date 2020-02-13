import isScreen from '../../core/screenHelper';
import { ActionContext, Store } from "vuex";
import { getStoreAccessors } from "vuex-typescript";
import { GlobalState } from "../state-types";


export interface LayoutState {
	sidebarClose: Boolean,
	sidebarStatic: Boolean,
	sidebarActiveElement: null,
	scatterPlotCreate: Boolean
}

type LayoutContext = ActionContext<LayoutState, GlobalState>;

export const LayoutModule = {
	namespaced: true,
	state: {
		sidebarClose: false,
		sidebarStatic: false,
		sidebarActiveElement: null,
		scatterPlotCreate: true
	},

	getters: {
        getSidebarClose(state: LayoutState) {
            return state.sidebarClose;
        },

        getSidebarStatic(state: LayoutState) {
            return state.sidebarStatic;
        },

        getSidebarActiveElement(state:LayoutState){
            return state.sidebarActiveElement;
        }
	},

	mutations: {
		initApp(state) {
			setTimeout(() => {
				state.chatNotificationIcon = true;
				state.chatNotificationPopover = true;
				setTimeout(() => {
					state.chatNotificationPopover = false;
				}, 1000 * 6);
			}, 1000 * 4);
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

		handleSwipe(state, e) {
			if ('ontouchstart' in window) {
				if (e.direction === 4) {
					state.sidebarClose = false;
				}

				if (e.direction === 2 && !state.sidebarClose) {
					state.sidebarClose = true;
					return;
				}

				state.chatOpen = e.direction === 2;
			}
		},

		changeSidebarActive(state, index) {
			state.sidebarActiveElement = index;
		},
	},
	actions: {
		initApp({ commit }) {
			commit('initApp');
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
		handleSwipe({ commit }, e) {
			commit('handleSwipe', e);
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
    getSidebarActiveElement: read(LayoutModule.getters.getSidebarActiveElement),
}

export default LayoutAccessor;
