/*******************************************************************************
 * Copyright (c) 2020, Lawrence Livermore National Security, LLC.
 * Produced at the Lawrence Livermore National Laboratory.
 *
 * Written by Suraj Kesavan <spkesavan@ucdavis.edu>.
 *
 * LLNL-CODE-740862. All rights reserved.
 *
 * This file is part of CallFlow. For details, see:
 * https://github.com/LLNL/CallFlow
 * Please also read the LICENSE file for the MIT License notice.
 ******************************************************************************/
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

import App from "./App";
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
	pingTimeout: 500000
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
	el: "#app",
	router,
	components: { App },
	template: "<App/>"
});
Vue.config.devtools = true;

export default router;
