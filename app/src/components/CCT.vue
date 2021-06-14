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
		<VisualEncoding ref="VisualEncoding" /> 
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
import { mapGetters } from "vuex";
import "splitpanes/dist/splitpanes.css";

// Library imports.
import EventHandler from "lib/routing/EventHandler";

// Local components
import NodeLink from "./nodeLink/index_nl";

// General components
import Toolbar from "./general/toolbar";
import Color from "lib/color/";
import * as utils from "lib/utils";

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

	computed: {
		...mapGetters({ 
			runs: "getRuns", 
			summary: "getSummary",
			selectedTargetRun: "getSelectedTargetRun",
			selectedMetric: "getSelectedMetric",
		})
	},

	beforeCreate() {
		this.$store.dispatch("fetchSummary");
	},

	mounted() {
		this.setupStore();

		let self = this;
		EventHandler.$on("cct-reset", () => {
			self.reset();
		});

		// this.init();
	},

	watch: {
		isSettingsOpen: function (val) {
			this.$emit("update:isSettingsOpen", val);
		},

		selectedTargetDataset: function (val) {
			this.$store.selectedTargetDataset = val;
			this.reset();
		},

		summary:  function (val) {
			this.init();
		}
	},

	methods: {
		init() {
			this.setComponentMap(); // Set component mapping for easy component tracking.
			this.setupColors();
			this.initComponents(this.currentComponents);
		}, 

		setupColors() {
			this.$store.runtimeColor = new Color();
			this.$store.runtimeColorMap = this.$store.runtimeColor.getAllColors();

			console.log(this.summary);
			const _d = this.summary[this.selectedTargetRun][this.selectedMetric];
			const colorMin = parseFloat(_d[0]);
			const colorMax = parseFloat(_d[1]);

			this.selectedColorMinText = utils.formatRuntimeWithoutUnits(
				parseFloat(colorMin)
			);
			this.selectedColorMaxText = utils.formatRuntimeWithoutUnits(
				parseFloat(colorMax)
			);

			this.$store.selectedColorMin = colorMin;
			this.$store.selectedColorMax = colorMax;

			this.$store.runtimeColor.setColorScale(
				this.selectedMetric,
				colorMin,
				colorMax,
				this.$store.selectedRuntimeColorMap,
				this.$store.selectedColorPoint
			);

			
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
			this.currentComponents = [
				this.$refs.CCT1, 
				// this.$refs.VisualEncoding
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