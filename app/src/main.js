/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

import Vue from "vue";
import Router from "vue-router";
import BootstrapVue from "bootstrap-vue";
import VueMaterial from "vue-material";
import "vue-material/dist/vue-material.min.css";
import "vue-material/dist/theme/default.css";
import "vuetify/dist/vuetify.min.css";
import "material-design-icons-iconfont/dist/material-design-icons.css";

import App from "./components/App";
import Summary from "./components/Summary";
import CCT from "./components/CCT";
import SuperGraph from "./components/SuperGraph";
import EnsembleSuperGraph from "./components/SuperGraphEnsemble";

// Setup vuetify.
import Vuetify from "vuetify/lib/framework";
Vue.use(Vuetify);
const vuetify = new Vuetify({
	icons: {
		iconfont: "mdiSvg"
	}
});

import store from "./store";

const router = new Router({
	routes: [
		{
			path: "/",
			name: "Summary",
			component: Summary,
			props: true,
		},
		{
			path: "/cct",
			name: "CCT",
			component: CCT,
			props: true
		},
		{
			path: "/super_graph",
			name: "SuperGraph",
			component: SuperGraph,
			props: true
		},
		{
			path: "/ensemble_super_graph",
			name: "EnsembleSuperGraph",
			component: EnsembleSuperGraph,
			props: true
		},
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
	vuetify,
	template: "<App/>"
});
Vue.config.devtools = true;

export default router;
