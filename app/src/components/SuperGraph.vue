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
	<Settings ref="Settings"/>
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
import { mapGetters } from "vuex";
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
import Settings from "./general/settings/";

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
		Settings,
	},

	data: () => ({
		isSettingsOpen: false,
		info: "",
	}),

	computed: {
		...mapGetters({ 
			summary: "getSummary",
			metricTimeMap: "getMetricTimeMap",
		})
	},

	beforeCreate() {
		this.$store.dispatch("fetchSummary");
	},

	mounted() {
		let self = this;
		EventHandler.$on("reset-sg", () => {
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

		selectedMode: function (val) {
			this.selectedMode = val;
		}
	},

	methods: {
		init() {
			this.$store.commit("setSelectedMode", "SG");

			this.currentComponents = this.setComponentMap(); // Set component mapping for easy component tracking.
			this.initComponents(this.currentComponents);
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
				this.$refs.Settings,
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