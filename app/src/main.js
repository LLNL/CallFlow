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
import VueSocketIO from "vue-socket.io";
import VueMaterial from "vue-material";
import "vue-material/dist/vue-material.min.css";
import "vue-material/dist/theme/default.css";
import "vuetify/dist/vuetify.min.css";
import "material-design-icons-iconfont/dist/material-design-icons.css";

import App from "./components/App";
import SingleCallFlow from "./components/callflowSingle";
import EnsembleCallFlow from "./components/callflowEnsemble";

Vue.use(Vuex);
const store = new Vuex.Store();

const socket = new VueSocketIO({
	debug: false,
	connection: "http://localhost:5000",
	vuex: {
		store,
		actionPrefix: "SOCKET_",
		mutationPrefix: "SOCKET_"
	},
	pingTimeout: 5000000
});

const router = new Router({
	routes: [
		{
			path: "/single",
			name: "SingleCallFlow",
			component: SingleCallFlow
		},
		{
			path: "/ensemble",
			name: "EnsembleCallFlow",
			component: EnsembleCallFlow
		},
	]
});

Vue.config.productionTip = false;
Vue.use(BootstrapVue);
Vue.use(socket);
Vue.use(Router);
Vue.use(Vuetify);
Vue.use(VueMaterial);

/* eslint-disable no-new */
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