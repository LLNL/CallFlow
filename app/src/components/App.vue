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
				<v-toolbar-title style="margin-right: 3em; color: white">
					CallFlow
				</v-toolbar-title>
				<v-btn outlined>
					<router-link to="/single" replace>Single</router-link>
				</v-btn>

				<v-btn outlined v-if="runCounts > 1">
					<router-link to="/ensemble" replace>Ensemble</router-link>
				</v-btn>
			</v-toolbar>
			<router-view></router-view>
			<v-content>
				<v-layout>
					<v-container fluid>
						<v-card tile>
							<v-card-title>
								General Information
							</v-card-title>
						</v-card>
						<v-card tile>
							<v-card-title>
								Experiment: {{ data.experiment }}
							</v-card-title>
						</v-card>
						<v-card tile>
							<v-card-title>
								Data path: {{ data.data_path }}
							</v-card-title>
						</v-card>
						<v-card tile>
							<v-card-title>
								.callflow save path: {{ data.save_path }}
							</v-card-title>
						</v-card>
						<v-card tile>
							<v-card-title>
								Filter by attribute: {{ data.filter_by }}
							</v-card-title>
						</v-card>
						<v-card tile>
							<v-card-title>
								Filter percentage: {{ data.filter_perc }}
							</v-card-title>
						</v-card>
						<v-card tile>
							<v-card-title>
								Group by attribute: {{ data.group_by }}
							</v-card-title>
						</v-card>
					</v-container>
					<v-container>
						<v-card tile>
							<v-card-title>Runtime Information</v-card-title>
							<v-data-table
								dense
								:headers="runtimeHeaders"
								:items="runtime"
								:items-per-page="5"
								class="elevation-1"
							>
								<template slot="items" slot-scope="props">
									<tr>
										<td nowrap="true">{{ props.item.run }}</td>
										<td nowrap="true">
											{{ props.item.min_inclusive_runtime }}
										</td>
										<td nowrap="true">
											{{ props.item.max_inclusive_runtime }}
										</td>
										<td nowrap="true">
											{{ props.item.min_exclusive_runtime }}
										</td>
										<td nowrap="true">
											{{ props.item.max_exclusive_runtime }}
										</td>
									</tr>
								</template>
							</v-data-table>
						</v-card>
						<!-- <v-card tile>
						<v-card-title>Module Callsite Mapping</v-card-title>
						<v-data-table
						dense
						:headers="moduleHeaders"
						:items="modules"
						:items-per-page="5"
						:single-expand="singleExpand"
						:expanded.sync="expanded"
						item-key="name"
						show-expand
						class="elevation-1"
						>
						<template slot="items" slot-scope="props">
							<tr>
							<td nowrap="true">{{ props.item.module }}</td>
							<td nowrap="true">{{ props.item.inclusive_runtime }}</td>
							<td nowrap="true">{{ props.item.exclusive_runtime }}</td>
							<td nowrap="true">{{ props.item.imbalance_perc }}</td>
							<td nowrap="true">{{ props.item.number_of_callsites }}</td>
							<td nowrap="true">
								<v-icon @click="expand(!isExpanded)">keyboard_arrow_down</v-icon>
							</td>
							</tr>
						</template>

						<template v-slot:expanded-item="{ headers, item }">
							<td :colspan="headers.length">More info about {{ item.name }}</td>
						</template>
						</v-data-table>
					</v-card>-->
					</v-container>
				</v-layout>
			</v-content>
		</div>
	</v-app>
</template>

<script>
import APIService from "../lib/APIService";

export default {
	name: "App",
	data: () => ({
		data: {},
		runCounts: 0,
		runtimeHeaders: [
			{ text: "Run", value: "run" },
			{
				text: "Min. Inclusive runtime (\u03BCs)",
				value: "min_inclusive_runtime",
			},
			{
				text: "Max. Inclusive runtime (\u03BCs)",
				value: "max_inclusive_runtime",
				sortable: true,
			},
			{
				text: "Min. Exclusive runtime (\u03BCs)",
				value: "min_exclusive_runtime",
			},
			{
				text: "Max. Exclusive runtime (\u03BCs)",
				value: "max_exclusive_runtime",
			},
		],
		runtime: [],
		expanded: [],
		singleExpand: false,
		moduleHeaders: [
			{ text: "Module", value: "module" },
			{
				text: "Inclusive runtime (\u03BCs)",
				value: "inclusive_runtime",
				sortable: true,
			},
			{ text: "Exclusive runtime (\u03BCs)", value: "exclusive_runtime" },
			{ text: "Imbalance perc (%)", value: "imbalance_perc" },
			{ text: "Number of Callsites", value: "number_of_callsites" },
			{ text: "", value: "data-table-expand" },
		],
		modules: [],
		auxiliarySortBy: "time (inc)",
		selectedRunBinCount: 20,
		selectedMPIBinCount: 20,
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
			this.data = await APIService.GETRequest("init", {"dataset_path": ""});
			this.runs = Object.keys(this.data.parameter_props.data_path);
			this.runCounts = this.runs.length;
			this.runtime_props = this.data.runtime_props;
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

			this.$store.maxExcTime = this.data.runtime_props.maxExcTime;
			this.$store.minExcTime = this.data.runtime_props.minExcTime;
			this.$store.maxIncTime = this.data.runtime_props.maxIncTime;
			this.$store.minIncTime = this.data.runtime_props.minIncTime;
			this.$store.numOfRanks = this.data.runtime_props.numOfRanks;
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
				this.modules.push({
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
	top: -10px !important;
	font-family: "Open Sans", sans-serif;
	margin-bottom: 0px;
	height: 99%;
	font-size: 16px;
}

#toolbar {
	padding: 0px 0px 0px;
}

#toolbar > .v-toolbar__content {
	height: 54px !important;
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

.chip {
	font-weight: 500 !important;
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