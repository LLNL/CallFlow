/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
  <div id="inspire">
    <Toolbar ref="Toolbar" :isSettingsOpen.sync="isSettingsOpen" />
    <v-navigation-drawer v-model.lazy="isSettingsOpen" fixed>
      <v-card fill-height>
		<!-- TODO: Replace with Header component -->
		<!-- <Header ref="Header" :reset="reset" :closeSettings="isSettingsOpen= !isSettingsOpen" /> -->
		<v-flex xs12 class="ml-4 mt-4 mb-6">
			<v-row align="center" justify="space-around">
			<v-btn class="mx-10" icon>
				<span> Reload </span>
				<v-icon v-on:click="reset()">refresh</v-icon>
			</v-btn>
			<v-spacer></v-spacer>
			<v-btn class="mx-4" icon>
				<v-icon v-on:click="closeSettings()">close</v-icon>
			</v-btn>
			</v-row>
		</v-flex>

		<VisualEncoding ref="VisualEncoding" /> 

      </v-card>
    </v-navigation-drawer>

    <v-main class="pt-0">
        <splitpanes id="cct-dashboard">
          <!-- Left column-->
          <splitpanes horizontal :splitpanes-size="100">
            <NodeLink ref="CCT1" />
          </splitpanes>

			<!-- Right column
			<splitpanes horizontal :splitpanes-size="50" :v-show="{isComparisonMode}">
				<NodeLink ref="CCT1" />
			</splitpanes> -->
        </splitpanes>
    </v-main>
  </div>
</template>

<script>
import Splitpanes from "splitpanes";
import "splitpanes/dist/splitpanes.css";

// Library imports.
import EventHandler from "lib/routing/EventHandler";

// Local components
import NodeLink from "./nodeLink/index_nl";

// General components
import Toolbar from "./general/toolbar";

// Settings components
// import Header from "./settings/header";
import VisualEncoding from "./settings/visualEncoding";

export default {
	name: "CCT",
	components: {
		Splitpanes,
		NodeLink,
		Toolbar,
		VisualEncoding
	},

	data: () => ({
		id: "cct-overview",
		selectedFunctionsInCCT: 70,
		isComparisonMode: false,
		isSettingsOpen: false,
		selectedComponents: [],
	}),

	mounted() {
		this.setupStore();

		// Push to '/' when `this.$store.selectedDatasets` is undefined.
		if (this.$store.selectedDatasets === undefined) {
			this.$router.push("/");
		}

		let self = this;
		EventHandler.$on("cct-reset", () => {
			self.reset();
		});

		this.init();
	},

	watch: {
		isSettingsOpen: function (val) {
			this.$emit("update:isSettingsOpen", val);
		},

		
		selectedTargetDataset: function (val) {
			this.$store.selectedTargetDataset = val;
			this.reset();
		},
	},

	methods: {
		init() {
			this.setComponentMap(); // Set component mapping for easy component tracking.

			console.log("Components: ", this.selectedComponents);
			console.log("Mode : ", this.selectedMode);
			console.log("Number of runs :", this.$store.numOfRuns);
			console.log("Dataset : ", this.$store.selectedTargetDataset);

			this.initComponents(this.currentComponents);
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
			// TODO: Move this to viewSelection component 
			this.metricTimeMap = this.$store.metricTimeMap;

			// Set encoding method.
			this.$store.encoding = "MEAN";

			this.isComparisonMode = this.$store.isComparisonMode;

			// TODO: Move this to viewSelection component
			this.$store.selectedFormat = this.$route.name;
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
			this.currentComponents = [this.$refs.CCT1, this.$refs.VisualEncoding];
		},

		clear() {
			this.clearComponents(this.currentComponents);
		},

		initComponents(componentList) {
			for (let i = 0; i < componentList.length; i++) {
				componentList[i].init();
			}
		},

		clearComponents(componentList) {
			console.log(componentList);
			for (let i = 0; i < componentList.length; i++) {
				componentList[i].clear();
			}
		},

		reset() {
			this.clear();
			this.init();
		},

		closeSettings() {
			this.isSettingsOpen = !this.isSettingsOpen;
		},
	},
};
</script>