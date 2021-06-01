/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
  <div id="inspire">
    <Toolbar ref="ToolBar" :isSettingsOpen.sync="isSettingsOpen" />
    <v-navigation-drawer v-model.lazy="isSettingsOpen" fixed>
      <v-card fill-height>
        <v-col>
			<v-row>
				<v-icon color="teal">settings</v-icon>
				<v-col cols="9" class="center teal--text">SETTINGS</v-col>
				<v-btn icon>
					<v-icon v-on:click="closeSettings()">close</v-icon>
				</v-btn>
			</v-row>
			<v-row align="center" justify="space-around">
				<v-btn class="mx-0" icon>
					Reload
					<v-icon v-on:click="reset()">refresh</v-icon>
				</v-btn>
			</v-row>
		</v-col>
      </v-card>
	<VisualEncoding ref="VisualEncoding"/>
    </v-navigation-drawer>

    <v-row class="pa-0 ma-0">
      <splitpanes id="callgraph-dashboard" class="default-theme">
        <!-- Left column-->
        <splitpanes horizontal :splitpanes-size="25">
          <SingleHistogram ref="SingleHistogram" />
          <SingleScatterplot ref="SingleScatterplot" />
        </splitpanes>

        <!-- Center column-->
        <splitpanes horizontal :splitpanes-size="55">
          <Sankey ref="Sankey" />
        </splitpanes>

        <!-- Right column-->
        <splitpanes horizontal :splitpanes-size="20">
          <CallsiteInformation ref="CallsiteInformation" />
        </splitpanes>
      </splitpanes>
    </v-row>
  </div>
</template>

<script>
// Library imports
import Splitpanes from "splitpanes";
import "splitpanes/dist/splitpanes.css";

// Local library imports
import EventHandler from "lib/routing/EventHandler";

// Super graph dashboard imports
import SingleScatterplot from "./singleScatterplot/index_ss";
import SingleHistogram from "./singleHistogram/index_sh";
import CallsiteInformation from "./callsiteInformation/index_ci";
import Sankey from "./sankey/index_sg";
import Toolbar from "./general/toolbar";

import VisualEncoding from "./settings/visualEncoding";

export default {
	name: "SuperGraph",
	components: {
		Splitpanes,
		Toolbar,
		// Generic components
		Sankey,
		// Single supergraph components.
		SingleScatterplot,
		SingleHistogram,
		CallsiteInformation,
		VisualEncoding,
	},

	// Not used currently. 
	props: {
		aux_data: Object,
	},

	data: () => ({
		isSettingsOpen: false,
		groupBy: ["Name", "Module", "File"],
		selectedGroupBy: "Module",
		filterBy: ["Inclusive", "Exclusive"],
		filterRange: [0, 100],
		selectedFilterBy: "Inclusive",
		selectedIncTime: 0,
		filterPercRange: [0, 100],
		selectedFilterPerc: 5,
		selectedColorMin: null,
		selectedColorMax: null,
		selectedColorMinText: "",
		selectedColorMaxText: "",
		scatterMode: ["mean", "all"],
		selectedScatterMode: "all",
		comparisonMode: false,
		selectedOutlierBand: 4,
		metricTimeMap: {}, // Stores the metric map for each dataset (sorted by inclusive/exclusive time),
		summary: "Super Graph View",
		info: "",
		selectedMode: "Single",
	}),

	watch: {
		showTarget: function (val) {
			EventHandler.$emit("show-target-auxiliary");
		},

		isSettingsOpen: function (val) {
			this.$emit("update:isSettingsOpen", val);
		},
	},

	mounted() {
		this.setupStore();

		// Push to '/' when `this.$store.selectedDatasets` is undefined.
		if (this.$store.selectedDatasets === undefined) {
			// this.requestAuxData();  // TODO: Fix the bug here.
			this.$router.push("/");
		} else {
			this.init();
		}

		let self = this;
		EventHandler.$on("supergraph-reset", () => {
			self.reset();
		});

	},

	methods: {
		init() {
			this.currentComponents = this.setComponentMap(); // Set component mapping for easy component tracking.
			EventHandler.$emit("setup-colors");
			this.initComponents(this.currentComponents);
		},

		setupStore() {
			// Set the mode. (Either single or ensemble).
			this.$store.selectedMode = this.selectedMode;

			// Comparison mode in histograms.
			this.$store.comparisonMode = this.comparisonMode;

			// Set this.selectedTargetDataset (need to remove)
			this.selectedTargetDataset = this.$store.selectedTargetDataset;

			// Set the datasets
			this.datasets = this.$store.selectedDatasets;

			// Set encoding method.
			this.$store.encoding = "MEAN";
		
			this.$store.selectedFormat = "SuperGraph";
		},

		// ----------------------------------------------------------------
		// Initialize the relevant modules for respective Modes.
		// ----------------------------------------------------------------
		setComponentMap() {
			return [
				this.$refs.SingleHistogram,
				this.$refs.SingleScatterplot,
				this.$refs.Sankey,
				this.$refs.CallsiteInformation,
				this.$refs.VisualEncoding,
			];
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

		async requestAuxData() {
			const payload = {
				datasets: this.$store.selectedDatasets,
				rankBinCount: this.$store.selectedMPIBinCount,
				runBinCount: this.$store.selectedRunBinCount,
				reProcess: true,
			};
			return await this.$parent.$parent.fetchData(payload);
		},
	},
};
</script>