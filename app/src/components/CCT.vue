/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
	<v-app id="inspire">
		<Toolbar ref="Toolbar" :isSettingsOpen.sync="isSettingsOpen" />
		<v-navigation-drawer v-model.lazy="isSettingsOpen" fixed>
			<v-btn slot="activator" color="primary" dark>Open Dialog</v-btn>
			<v-card flex fill-height id="control-panel">
				<v-layout row wrap>
					<v-btn icon>
						<v-icon v-on:click="reset()">refresh</v-icon>
					</v-btn>
					<v-spacer></v-spacer>
					<v-btn icon>
						<v-icon v-on:click="closeSettings()">close</v-icon>
					</v-btn>
				</v-layout>
	
				<v-flex xs12 class="ma-1">
					<v-subheader class="teal lighten-4">Visual Encoding</v-subheader>
				</v-flex>
				<v-flex xs12 class="ma-1">
					<v-select
					label="Metric"
					:items="metrics"
					v-model="selectedMetric"
					:menu-props="{ maxHeight: '200' }"
					persistent-hint
					v-on:change="reset()"
					>
					</v-select>
				</v-flex>

				<v-flex xs12 class="ma-1">
					<v-subheader class="teal lighten-4">Colors</v-subheader>
				</v-flex>
				<v-flex xs12 class="ma-1">
					<v-select
					label="Runtime Color Map"
					:items="runtimeColorMap"
					v-model="selectedRuntimeColorMap"
					:menu-props="{ maxHeight: '200' }"
					persistent-hint
					>
					</v-select>
				</v-flex>
				<v-flex xs12 class="ma-1">
					<v-text-field
					label="Color points (3-9)"
					class="mt-0"
					type="number"
					v-model="selectedColorPoint"
					:menu-props="{ maxHeight: '200' }"
					persistent-hint
					v-on:change="reset()"
					>
					</v-text-field>
				</v-flex>
          
			</v-card>
		</v-navigation-drawer>
		<v-content class="pt-auto">
			<v-layout>
				<splitpanes id="cct-dashboard" class="default-theme">
					<!-- Left column-->
					<splitpanes horizontal :splitpanes-size="100">
						<NodeLink ref="CCT1" />
					</splitpanes>

					<!-- Right column
					<splitpanes horizontal :splitpanes-size="50" :v-show="{isComparisonMode}">
						<NodeLink ref="CCT1" />
					</splitpanes> -->
				</splitpanes>
			</v-layout>
		</v-content>
	</v-app>
</template>

<script>
import Splitpanes from "splitpanes";
import "splitpanes/dist/splitpanes.css";

import NodeLink from "./nodeLink/";
import Toolbar from "./general/toolbar";

export default {
	name: "CCT",
	components: {
		Splitpanes,
		NodeLink,
		Toolbar
	},

	data: () => ({
		id: "cct-overview",
		selectedFunctionsInCCT: 70,
		isComparisonMode: false,
		isSettingsOpen: false,
		metrics: ["Exclusive", "Inclusive"],
		selectedMetric: "Inclusive",
		runtimeColorMap: [],
		selectedRuntimeColorMap: "OrRd",
		colorPoints: [3, 4, 5, 6, 7, 8, 9],
		selectedColorPoint: 9,
	}),

	mounted() {
		this.setupStore();

		// Push to '/' when `this.$store.selectedDatasets` is undefined.
		if(this.$store.selectedDatasets === undefined) {
			this.$router.push("/");
		}

		this.init();
	},

	watch: {
		isSettingsOpen: function (val) {
			this.$emit("update:isSettingsOpen", val);
		},

		selectedRuntimeColorMap: function (val) {
			this.$store.selectedRuntimeColorMap = val;
			this.$parent.$parent.setupColors(this.$store.selectedRuntimeColorMap);
			this.reset();
		},

		selectedMetric: function (val) {
			this.$store.selectedMetric = val;
			this.reset();
		},

		selectedColorPoint: function (val) {
			this.$store.selectedColorPoint = val;
			this.$parent.$parent.setupColors(this.$store.selectedRuntimeColorMap);
			this.reset();
		},

		selectedTargetDataset: function (val) {
			this.$store.selectedTargetDataset = val;
			this.reset();
		}
	},
	
	methods: {
		init() {
			this.setComponentMap(); // Set component mapping for easy component tracking.

			console.log("Mode : ", this.selectedMode);
			console.log("Number of runs :", this.$store.numOfRuns);
			console.log("Dataset : ", this.$store.selectedTargetDataset);

			// Call the appropriate socket to query the server.
			this.initComponents(this.currentSingleSuperGraphComponents);
		},

		setupStore() {
			// Set the mode. (Either single or ensemble).
			this.selectedMode = this.$store.selectedMode;

			// Set the number of callsites in the CCT
			this.$store.selectedFunctionsInCCT = this.selectedFunctionsInCCT;
		
			// Set this.selectedTargetDataset (need to remove)
			this.selectedTargetDataset = this.$store.selectedTargetDataset;

			// Set the datasets
			this.datasets = this.$store.selectedDatasets;

			// Set the metricTimeMap, used by the dropdown to select the dataset.
			this.metricTimeMap = this.$store.metricTimeMap;

			// Set the runtimeColorMap.
			this.runtimeColorMap = this.$store.runtimeColorMap;
		
			// Set encoding method.
			this.$store.encoding = "MEAN";

			this.isComparisonMode = this.$store.isComparisonMode;

			// TODO: Move this to viewSelection component
			this.$store.selectedFormat = this.$route.name;

			this.selectedColorPoint = this.$store.selectedColorPoint;
		},

		updateStore() {
			// TODO: Update only if there is a change in variable.
			this.$store.selectedTargetDataset = this.selectedTargetDataset;

			this.$store.runtimeColorMap = this.runtimeColorMap;

			this.$store.selectedColorPoint = this.selectedColorPoint;

			this.$store.selectedMetric = this.selectedMetric;

		},

		// ----------------------------------------------------------------
		// Initialize the relevant modules for respective Modes. 
		// ----------------------------------------------------------------
		setComponentMap() {
			this.currentSingleSuperGraphComponents = [
				this.$refs.CCT1,
			];
		},

		clear() {
			this.clearComponents(this.currentSingleSuperGraphComponents);
		},

		initComponents(componentList) {
			for (let i = 0; i < componentList.length; i++) {
				componentList[i].init();
			}
		},

		clearComponents(componentList) {
			for (let i = 0; i < componentList.length; i++) {
				componentList[i].clear();
			}
		},

		reset() {
			this.clear();
			// this.updateStore();
			this.init();
		},

		closeSettings () {
			this.isSettingsOpen = ! this.isSettingsOpen;
		}
	}
};
</script>

<style scoped>

</style>