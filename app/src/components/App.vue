/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
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

				<v-btn outlined v-if="runCounts > 1">
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
						<BasicInformation :data="basicInformation" />
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
		runCounts: 0,
		basicInformation: {},
		runtime: [],
		moduleMapping: [],
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
			this.data = await APIService.POSTRequest("init", {"dataset_path": ""});
			this.basicInformation = this.data.config;
			this.runs = this.data.config.parameter_props.runs;
			this.runCounts = this.runs.length;
			this.runtime_props = this.data.config.runtime_props;
			this.module_callsite_map = this.data.module_callsite_map;
			this.setStore();
			this.init();
		},

		init() {
			this.runtimePropsTable();
			this.moduleCallsiteTable();
		},

		setStore() {
			this.$store.selectedDatasets = this.runs;
			this.$store.numOfRuns = this.runs.length;
			this.$store.data = this.data;
			this.$store.maxExcTime = this.data.config.runtime_props.maxExcTime;
			this.$store.minExcTime = this.data.config.runtime_props.minExcTime;
			this.$store.maxIncTime = this.data.config.runtime_props.maxIncTime;
			this.$store.minIncTime = this.data.config.runtime_props.minIncTime;
			this.$store.numOfRanks = this.data.config.runtime_props.numOfRanks;			this.$store.numOfRanks = 1;
		},

		/**
		 * Set the data for runtime.
		 */
		runtimePropsTable() {
			for (let run of this.runs) {
				this.runtime.push({
					run,
					min_inclusive_runtime: this.runtime_props.minIncTime[run],
					max_inclusive_runtime: this.runtime_props.maxIncTime[run],
					min_exclusive_runtime: this.runtime_props.minExcTime[run],
					max_exclusive_runtime: this.runtime_props.maxExcTime[run],
				});
			}
		},

		moduleCallsiteTable() {
			for (let module in this.module_callsite_map) {
				this.moduleMapping.push({
					module: module,
					number_of_callsites: this.data.module_callsite_map[module].length,
				});
			}
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