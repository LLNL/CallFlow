/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
  <div id="inspire">
	<Toolbar ref="ToolBar" :isSettingsOpen.sync="isSettingsOpen"
	v-if="Object.keys(metricTimeMap).length > 0" />
    <v-navigation-drawer v-model.lazy="isSettingsOpen" temporary fixed>
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
	<Settings ref="Settings"/>
    </v-navigation-drawer>

    <v-main class="pa-0 ma-0">
		<splitpanes id="callgraph-dashboard-2" class="default-theme">
			<!-- Left column-->
			<splitpanes horizontal splitpanes-size="25">
				<ModuleHierarchy ref="ModuleHierarchy" />
				<EnsembleScatterplot ref="EnsembleScatterplot" />
				<EnsembleHistogram ref="EnsembleHistogram" />
			</splitpanes>

			<!-- Center column-->
			<splitpanes horizontal splitpanes-size="55">
				<Sankey ref="Sankey" />
			</splitpanes>

			<!-- Right column-->
			<splitpanes horizontal splitpanes-size="20">					
				<GradientView ref="GradientView" />
				<CallsiteCorrespondence ref="CallsiteCorrespondence" />
				<ParameterProjection ref="ParameterProjection" />
			</splitpanes>
		</splitpanes>
    </v-main>
  </div>
</template>

<script>
// Library imports
import { mapGetters } from "vuex";
import Splitpanes from "splitpanes";
import "splitpanes/dist/splitpanes.css";

// Local library imports
import EventHandler from "lib/routing/EventHandler";

// Ensemble super graph dashboard imports
import CallsiteCorrespondence from "./callsiteCorrespondence/index_cc";
import EnsembleHistogram from "./ensembleHistogram/index_eh";
import ModuleHierarchy from "./moduleHierarchy/";
import EnsembleScatterplot from "./ensembleScatterplot/index_es";
import ParameterProjection from "./parameterProjection/index_pp";
import Sankey from "./sankey/index_sg";
import Toolbar from "./general/toolbar";
import Settings from "./general/settings";
import GradientView from "./gradientView/index_gv";

export default {
	name: "EnsembleSuperGraph",
	components: {
		Splitpanes,
		Toolbar,
		// Generic components
		Sankey,
		// Ensemble supergraph components.
		EnsembleScatterplot,
		EnsembleHistogram,
		ModuleHierarchy,
		ParameterProjection,
		CallsiteCorrespondence,
		Settings,
		GradientView,
	},

	// Not used currently. 
	props: {
		aux_data: Object
	},

	data: () => ({
		summaryChip: "Ensemble Super Graph",
		info:"",
		isSettingsOpen: false,
	}),

	computed: {
		...mapGetters({
			runs: "getRuns",
			summary: "getSummary",
			selectedTargetRun: "getSelectedTargetRun",
			selectedCompareRun: "getSelectedCompareRun",
			selectedMetric: "getSelectedMetric",
			metricTimeMap: "getMetricTimeMap",
			targetColorMap: "getTargetColorMap",
		})
	},

	beforeCreate() {
		this.$store.dispatch("fetchSummary");
	},

	watch: {
		showTarget: function (val) {
			EventHandler.$emit("show-target-auxiliary");
		},

		isSettingsOpen: function (val) {
			this.$emit("update:isSettingsOpen", val);
		},

		summary: function (val) {
			this.isDataReady = true;
			this.init();
		},
	},

	mounted() {
		let self = this;
		EventHandler.$on("lasso-selection", (selectedDatasets) => {
			this.$store.resetTargetDataset = true;
			this.$store.selectedDatasets = selectedDatasets;
			EventHandler.$emit("aux-data", {
				datasets: this.$store.selectedDatasets,
				rankBinCount: this.$store.selectedMPIBinCount,
				runBinCount: this.$store.selectedRunBinCount,
				reProcess: true,
			});
			this.reset();
		});

		EventHandler.$on("reset-esg", () => {
			self.reset();
		});
	},

	methods: {
		init() {
			this.$store.commit("setSelectedMode", "ESG");
			this.$store.commit("setEncoding", "MEAN_GRADIENTS");

			console.log("[ESG] Selected Run: ", this.selectedTargetRun);
			console.log("[ESG] Selected Metric: ", this.selectedMetric);

			this.currentComponents = this.setComponentMap(); // Set component mapping for easy component tracking.

			// Call the appropriate socket to query the server.
			this.initComponents(this.currentComponents);
		},

		setComponentMap() {
			return [
				this.$refs.Sankey,
				this.$refs.EnsembleHistogram,
				this.$refs.EnsembleScatterplot,
				this.$refs.CallsiteCorrespondence,
				this.$refs.ParameterProjection,
				this.$refs.ModuleHierarchy,
				this.$refs.Settings,
				this.$refs.GradientView,
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
	},
};
</script>
