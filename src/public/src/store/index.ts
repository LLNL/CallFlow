import * as Vuex from "vuex";
import Vue from "vue";
import { CallFlowModule } from "./callflow";
import { LayoutModule } from "./layout";
import { ColorModule } from "./color";
import { GlobalState } from "./state-types";

Vue.use(Vuex);

const store = new Vuex.Store<GlobalState>({
    modules: {
        CallFlowModule,
        LayoutModule,
        ColorModule
    },
});

export default store;