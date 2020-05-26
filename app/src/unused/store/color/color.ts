import { ActionContext, Store } from "vuex";
import { getStoreAccessors } from "vuex-typescript";
import { GlobalState } from "../state-types";


export interface ColorState {
	color: Object
}

type ColorContext = ActionContext<ColorState, GlobalState>;

export const ColorModule = {
	namespaced: true,
	state: {
		color: {}
	},

	getters: {
        getColor(state: ColorState) {
            return state.color
        },
	},

	mutations: {
		initApp(state: ColorState) {
            console.log('Fetch the state')
		},
	},

	actions: {
		initApp({ commit }) {
			commit('initApp');
		}
	},
};

const { commit, read, dispatch } = getStoreAccessors<ColorState, GlobalState>("");

const ColorAccessor = {
    getColor: read(ColorModule.getters.getColor),
}

export default ColorAccessor;
