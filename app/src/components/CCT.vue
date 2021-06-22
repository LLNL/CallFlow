/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
  <div id="inspire">
    <Toolbar :isSettingsOpen.sync="isSettingsOpen"
    v-if="Object.keys(metricTimeMap).length > 0" />
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
		<Settings ref="Settings" /> 
    </v-navigation-drawer>

    <v-main class="pt-0">
		<splitpanes class="default-theme">
			<pane>
				<NodeLink ref="CCT1" />
			</pane>
			<!-- Surprise & delight -->
			<!-- <pane :v-if="!isComparisonMode">
				<NodeLink ref="CCT2"  />
			</pane> -->
        </splitpanes>
    </v-main>
  </div>
</template>

<script>
import { Splitpanes, Pane } from "splitpanes";
import { mapGetters } from "vuex";
import "splitpanes/dist/splitpanes.css";

// Local components
import NodeLink from "./nodeLink/index_nl";

// General components
import Toolbar from "./general/toolbar";
import Color from "lib/color/";
import * as utils from "lib/utils";

// Settings components
import Settings from "./general/settings/";
import EventHandler from "lib/routing/EventHandler";

export default {
	name: "CCT",
	components: {
		Splitpanes,
		Pane,
		NodeLink,
		Toolbar,
		Settings
	},

	data: () => ({
		id: "cct-overview",
		selectedFunctionsInCCT: 70,
		isSettingsOpen: false,
		selectedComponents: [],
	}),

	computed: {
		...mapGetters({ 
			runs: "getRuns", 
			summary: "getSummary",
			selectedTargetRun: "getSelectedTargetRun",
			selectedMetric: "getSelectedMetric",
			metricTimeMap: "getMetricTimeMap",
			runtimeColorMap: "getRuntimeColorMap",
			colorPoint: "getSelectedColorPoint",
			isComparisonMode: "getComparisonMode",
			selectedCompareRun: "getSelectedCompareRun",
			selectedMode: "getSelectedMode",
		})
	},

	beforeCreate() {
		this.$store.dispatch("fetchSummary");
		this.$store.commit("setSelectedMode", "CCT");
		this.$store.commit("setEncoding", "MEAN");
	},

	mounted() {
		console.log(this.isComparisonMode);
		let self = this;
		EventHandler.$on("reset-cct", () => {
			self.reset();
		});
	},

	watch: {
		isSettingsOpen: function (val) {
			this.$emit("update:isSettingsOpen", val);
		},

		summary: function (val) {
			this.isDataReady = true;
			this.init();
		},

		isComparisonMode: function(val) {
			console.log(val);
		},

	},

	methods: {
		init() {
			console.log("[CCT] Selected Target Run: ", this.selectedTargetRun);
			if (this.isComparisonMode) {
				console.log("[CCT] Selected Compare Run: ", this.selectedCompareRun);
			}

			console.log("[CCT] Selected Mode: ", this.selectedMode);
			console.log("[CCT] Selected Metric: ", this.selectedMetric);

			this.currentComponents = this.setComponentMap(); // Set component mapping for easy component tracking.
			this.setupColors();
			this.initComponents(this.currentComponents);
		}, 

		setupColors() {
			this.$store.runtimeColor = new Color();
			this.$store.runtimeColorMap = this.$store.runtimeColor.getAllColors();

			const _d = this.summary[this.selectedTargetRun][this.selectedMetric];
			const colorMin = parseFloat(_d[0]);
			const colorMax = parseFloat(_d[1]);

			this.selectedColorMinText = utils.formatRuntimeWithoutUnits(
				parseFloat(colorMin)
			);
			this.selectedColorMaxText = utils.formatRuntimeWithoutUnits(
				parseFloat(colorMax)
			);

			this.$store.runtimeColor.setColorScale(
				this.selectedMetric,
				colorMin,
				colorMax,
				this.runtimeColorMap,
				this.colorPoint
			);
		},

		// ----------------------------------------------------------------
		// Initialize the relevant modules for respective Modes.
		// ----------------------------------------------------------------
		setComponentMap() {
			let components = [
				this.$refs.CCT1, 
				this.$refs.Settings
			];
			
			if (this.isComparisonMode) {
				components.push(this.$refs.CCT2);
			}
			return components;
		},

		clear() {
			console.log(this.currentComponents);
			this.clearComponents(this.currentComponents);
		},

		reset() {
			this.clear();
			this.init();
		},

		initComponents(componentList) {
			this.$refs.CCT1.init(this.selectedTargetRun);
			if (this.isComparisonMode) {
				this.$refs.CCT2.init(this.selectedCompareRun);
			}
			this.$refs.Settings.init();
			// for (let i = 0; i < componentList.length; i++) {
			// 	componentList[i].init();
			// }
		},

		clearComponents(componentList) {
			for (let i = 0; i < componentList.length; i++) {
				componentList[i].clear();
			}
		},

		closeSettings() {
			this.isSettingsOpen = !this.isSettingsOpen;
		},
	},
};
</script>