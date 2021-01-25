/**
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 *
 * SPDX-License-Identifier: MIT
 */

<template>
	<v-app>
		<div id="app">
			<v-toolbar id="toolbar" color="teal" fixed app clipped-right>
				<v-toolbar-title class="toolbar-title">
					CallFlow
				</v-toolbar-title>
				<v-btn outlined>
					<router-link to="/single" replace>Single</router-link>
				</v-btn>

				<v-btn outlined v-if="run_counts > 1">
					<router-link to="/ensemble" replace>Ensemble</router-link>
				</v-btn>

				<v-btn outlined>
					<router-link to="/experimental" replace>Experimental</router-link>
				</v-btn>
			</v-toolbar>
			<router-view></router-view>
			<v-content class="content">
				<v-layout>
					<v-container>
						<BasicInformation :data="config" />
					</v-container>
					<v-container>
						<RuntimeInformation :data="runtime" />					
					</v-container>
				</v-layout>
				<v-container>
					<!-- <ModuleMappingInformation :data="moduleMapping" /> -->
				</v-container>
			</v-content>
		</div>
	</v-app>
</template>

<script>
import APIService from "../lib/APIService";
import BasicInformation from "./general/basicInformation";
import RuntimeInformation from "./general/runtimeInformation";
import ModuleMappingInformation from "./general/moduleMappingInformation";

export default {
	name: "App",
	components: {
		BasicInformation,
		RuntimeInformation,
		// ModuleMappingInformation
	},
	data: () => ({
		data: {},
		config: {},
		runtime: [],
		run_counts: 0,
		moduleMapping: [],
		rankBinCount: 20,
		runBinCount: 20,
	}),
	mounted() {
		this.fetchData();
	},
	methods: {
		/**
		 * Send the request to /init endpoint
		 * Parameters: {datasetPath: "path/to/dataset"}
		*/ 
		async fetchData() {
			this.config = await APIService.GETRequest("init");

			this.data = await APIService.POSTRequest("supergraph_data", {
				datasets: this.config.runs,
				rankBinCount: this.rankBinCount,
				runBinCount: this.runBinCount,
			});

			this.runs = this.data.runs;
			this.run_counts = this.runs.length;
			this.dataset_props = this.data.dataset;
			this.runtime = Object.keys(this.dataset_props).map((_) =>  { return {"run": _, ...this.dataset_props[_]};});
			const module_index_map = this.data.moduleIndexMap;
			this.module_callsite_map = Object.keys(this.data.moduleCallsiteMap["ensemble"]).map((_) => { return {"module": module_index_map[_], ...this.data.moduleCallsiteMap[_]};});

			console.log(this.module_callsite_map);
			this.setStore();
		},

		setStore() {
			this.$store.selectedDatasets = this.runs;
			this.$store.numOfRuns = this.runs.length;
		},
	},
};
</script>

<style>
* {
	margin: 0;
	padding: 0;
}

body {
	font-family: "Open Sans", sans-serif;
	font-size: 16px;
}

.toolbar {
	padding: 0px 0px 0px;
}

.toolbar > .v-toolbar__content {
	height: 54px !important;
}

.toolbar-title {
	margin-right: 3em; 
	font-size: 26px;
	font-weight: 400;
	color: white;
}

.content {
	padding-top: 54px !important;
}

.selected {
	stroke: #343838;
	stroke-width: 1px;
}

.unselected {
	stroke: #dbdbdb;
	stroke-width: 3px;
}

.big_text {
	font-size: 32px;
}

.ui.vis {
	height: 98% !important;
}

.tight {
	margin-left: -1em;
}

.ui.segment.vis_container {
	margin-right: -1em;
}

.v-chip__content {
	color: white;
	font-size: 125%;
}

.scroll {
	overflow-y: auto;
}

.tooltip {
	padding-left: 10px;
	font-size: 14px;
	font-weight: 500;
}

.setting-button {
	border: 0px solid !important;
	right: 0px !important;
	color: #009688 !important;
	font-size: 36px !important;
	background-color: white !important;
}

.v-list {
	padding: 8px;
}

.splitpanes.default-theme .splitpanes__pane {
	background: #f7f7f7 !important;
}

.md-theme-default a:not(.md-button) {
	color: #009687 !important;
}

.valueText {
	font-weight: 700 !important;
}

#footer {
	color: #fff;
}

/* Over write the primary text to avoid blue color change on selection*/
.my-app.v-application .primary--text {
	color: #fff !important;
	caret-color: #fff !important;
}
</style>