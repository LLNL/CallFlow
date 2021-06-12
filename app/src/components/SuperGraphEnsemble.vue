/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
  <div id="inspire">
	<Toolbar ref="ToolBar" :isSettingsOpen.sync="isSettingsOpen" />
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
	<VisualEncoding ref="VisualEncoding"/>
    </v-navigation-drawer>

    <v-main class="pt-0">
		<splitpanes id="callgraph-dashboard" class="default-theme">
			<!-- Left column-->
			<splitpanes horizontal :splitpanes-size="25">
			<!-- <ModuleHierarchy ref="ModuleHierarchy" /> -->
			<EnsembleScatterplot ref="EnsembleScatterplot" />
			<EnsembleHistogram ref="EnsembleHistogram" />
			</splitpanes>

			<!-- Center column-->
			<splitpanes horizontal :splitpanes-size="55">
			<Sankey ref="Sankey" />
			</splitpanes>

			<!-- Right column-->
			<splitpanes horizontal :splitpanes-size="20">
			<CallsiteCorrespondence ref="CallsiteCorrespondence" />
			<ParameterProjection ref="ParameterProjection" />
			</splitpanes>
		</splitpanes>
    </v-main>
  </div>
</template>

<script>
// Library imports
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
import VisualEncoding from "./settings/visualEncoding";

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
		// ModuleHierarchy,
		ParameterProjection,
		CallsiteCorrespondence,
		VisualEncoding,
	},

	// Not used currently. 
	props: {
		aux_data: Object
	},

	data: () => ({
		left: false,
		datasets: [],
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
		groupModes: ["include callbacks", "exclude callbacks"],
		selectedGroupMode: "include callbacks",
		selectedDiffNodeAlignment: "Top",
		diffNodeAlignment: ["Middle", "Top"],
		summaryChip: "Ensemble Super Graph",
		info:"",
		// comparisonMode: false,
		selectedOutlierBand: 4,
		parameter_analysis: true,		
		showTarget: true,
		targetInfo: "Target Guides",
		metricTimeMap: {}, // Stores the metric map for each dataset (sorted by inclusive/exclusive time),
		isSettingsOpen: false,
		selectedMode: "Ensemble",
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
			// TODO: Instead of pushing to /, we should populate the variables. 
			this.$router.push("/");
		}
		else {
			this.init();
		}

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
	},

	methods: {
		init() {
			this.currentComponents = this.setComponentMap(); // Set component mapping for easy component tracking.
			EventHandler.$emit("setup-colors");

			// TODO: need to rework on this.
			this.$store.datasetMap = {};
			for (let i = 0; i < this.$store.selectedDatasets.length; i += 1) {
				this.$store.datasetMap[this.$store.selectedDatasets[i]] = "run-" + i;
			}
			
			console.log("Mode : ", this.selectedMode);
			console.log("Number of runs :", this.$store.selectedDatasets.length);
			console.log("Datasets : ", this.$store.selectedDatasets);
			console.log("Node: ", this.$store.selectedNode);
			console.log("Run Bin size", this.$store.selectedRunBinCount);
			console.log("MPI Bin size", this.$store.selectedMPIBinCount);

			// Call the appropriate socket to query the server.
			this.initComponents(this.currentComponents);
		},

		setupStore() {
			// Set the mode. (Either single or ensemble).
			this.$store.selectedMode = this.selectedMode;

			// Set the scale for information (log or linear)
			this.$store.selectedScale = this.selectedScale;
			
			// Comparison mode in histograms.
			this.$store.comparisonMode = this.comparisonMode;

			// Set this.selectedTargetDataset (need to remove)
			this.selectedTargetDataset = this.$store.selectedTargetDataset;

			// Set the datasets
			this.datasets = this.$store.selectedDatasets;

			this.$store.encoding = "MEAN_GRADIENTS";
			
			// TODO: Need to clean this up.....
			// Too many repeated values....
			this.$store.selectedMPIBinCount = 20;
			this.$store.selectedRunBinCount = 20;
			
			this.$store.auxiliarySortBy = this.auxiliarySortBy;
			this.$store.showTarget = this.showTarget;
	
			this.$store.nodeInfo = {};
			this.$store.selectedHierarchyMode = this.selectedHierarchyMode;

			this.$store.selectedScale = "Linear";
			this.$store.selectedIQRFactor = this.selectedIQRFactor;
			this.$store.selectedRuntimeSortBy = this.selectedRuntimeSortBy;
			this.$store.selectedNumOfClusters = this.selectedNumOfClusters;
			this.$store.selectedEdgeAlignment = "Top";

			this.$store.selectedFormat = "EnsembleSuperGraph";
		},

		setComponentMap() {
			return [
				// this.$refs.Sankey,
				this.$refs.EnsembleHistogram,
				this.$refs.EnsembleScatterplot,
				this.$refs.CallsiteCorrespondence,
				this.$refs.ParameterProjection,
				// this.$refs.ModuleHierarchy,
				this.$refs.VisualEncoding
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
