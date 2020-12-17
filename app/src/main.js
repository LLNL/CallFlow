/** 
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

import Vue from "vue";
import * as Vuex from "vuex";
import Router from "vue-router";
import Vuetify from "vuetify";
import BootstrapVue from "bootstrap-vue";
import VueMaterial from "vue-material";
import "vue-material/dist/vue-material.min.css";
import "vue-material/dist/theme/default.css";
import "vuetify/dist/vuetify.min.css";
import "material-design-icons-iconfont/dist/material-design-icons.css";

import App from "./components/App";
import SingleCallFlow from "./components/callflowSingle";
import EnsembleCallFlow from "./components/callflowEnsemble";
import ExperimentalCallFlow from "./components/callflowExperimental";

Vue.use(Vuex);
const store = new Vuex.Store();

const router = new Router({
	routes: [
		{
			path: "/single",
			name: "SingleCallFlow",
			component: SingleCallFlow,
			props: true
		},
		{
			path: "/ensemble",
			name: "EnsembleCallFlow",
			component: EnsembleCallFlow,
			props: true
		},
		{
			path: "/experimental",
			name: "ExperimentalCallFlow",
			component: ExperimentalCallFlow
		}
	]
});

Vue.config.productionTip = false;
Vue.use(BootstrapVue);
Vue.use(Router);
Vue.use(Vuetify);
Vue.use(VueMaterial);

new Vue({
	store,
	render: h => h(App),
	el: "#app",
	router,
	components: { App },
	template: "<App/>"
});
Vue.config.devtools = true;

export default router;
