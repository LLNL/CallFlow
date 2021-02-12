/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
	<v-app id="inspire">
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

import APIService from "lib/routing/APIService";

import NodeLink from "./nodeLink/";

export default {
	name: "CCT",
	components: {
		Splitpanes,
		NodeLink
	},

	data: () => ({
		id: "cct-overview",
		selectedFunctionsInCCT: 70,
		isComparisonMode: false,
	}),

	mounted() {
		this.setupStore();

		// Push to '/' when `this.$store.selectedDatasets` is undefined.
		if(this.$store.selectedDatasets === undefined) {
			this.$router.push("/");
		}

		this.init();
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
			this.$store.selectedMode = this.selectedMode;

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
	}
};
</script>

<style scoped>

</style>