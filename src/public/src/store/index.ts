import * as Vuex from "vuex";
import Vue from "vue";
import { CallGraphModule } from "./callgraph/callgraph";
import { LayoutModule } from "./layout";
import { GlobalState } from "./state-types";

Vue.use(Vuex);

const store = new Vuex.Store<GlobalState>({
    modules: {
        CallGraphModule,
        LayoutModule
    },
});

export default store;