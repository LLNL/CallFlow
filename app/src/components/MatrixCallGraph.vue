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
        <splitpanes id="cct-dashboard">
          <!-- Left column-->
		<splitpanes horizontal :splitpanes-size="isComparisonMode ? 50 : 100">
            <Matrix ref="Matrix"/>
		</splitpanes>
        </splitpanes>
    </v-main>
  </div>
</template>

<script>
import Splitpanes from "splitpanes";
import { mapGetters } from "vuex";
import "splitpanes/dist/splitpanes.css";

// Local components
import Matrix from "./matrix/index_mat";

// General components
import Toolbar from "./general/toolbar";
import Color from "lib/color/";
import * as utils from "lib/utils";

// Settings components
import Settings from "./general/settings/";
import EventHandler from "lib/routing/EventHandler";

export default {
	name: "MatrixCallGraph",
	components: {
		Splitpanes,
		Matrix,
		Toolbar,
		Settings
	},

	data: () => ({
		id: "matrix-callgraph-overview",
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
			colorPoint: "getColorPoint",
			isComparisonMode: "getComparisonMode",
			selectedCompareRun: "getSelectedCompareRun",
			selectedMode: "getSelectedMode",
		})
	},

	beforeCreate() {
		this.$store.dispatch("fetchSummary");
		this.$store.commit("setSelectedMode", "MATRIX");
	},

	mounted() {
		let self = this;
		EventHandler.$on("reset-matrix", () => {
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
		}
	},

	methods: {
		init() {
			console.log("[Matrix] Selected Target Run: ", this.selectedTargetRun);
			if (this.isComparisonMode) {
				console.log("[Matrix] Selected Compare Run: ", this.selectedCompareRun);
			}

			console.log("[Matrix] Selected Mode: ", this.selectedMode);
			console.log("[Matrix] Selected Metric: ", this.selectedMetric);

			this.currentComponents = this.setComponentMap(); // Set component mapping for easy component tracking.
			this.setupColors();
			this.initComponents(this.currentComponents);
		}, 

		setupColors() {
			if(this.selectedMetric !== "module") {
				const data = this.summary[this.selectedTargetRun][this.selectedMetric];
				const [ colorMin, colorMax ]  = utils.getMinMax(data);
				this.$store.runtimeColor = new Color(this.metric, colorMin, colorMax, this.runtimeColorMap, this.selectedColorPoint);
			}
			else {
				this.$store.moduleColor = new Color("Module", Number.MIN_VALUE, Number.MAX_VALUE, "OrRd", this.selectedColorPoint);
			}

		},

		// ----------------------------------------------------------------
		// Initialize the relevant modules for respective Modes.
		// ----------------------------------------------------------------
		setComponentMap() {
			let components = [
				this.$refs.Matrix, 
				this.$refs.Settings
			];
			
			return components;
		},

		clear() {
			this.clearComponents(this.currentComponents);
		},

		reset() {
			this.clear();
			this.init();
		},

		initComponents() {
			this.$refs.Matrix.init(this.selectedTargetRun);
			this.$refs.Settings.init();
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