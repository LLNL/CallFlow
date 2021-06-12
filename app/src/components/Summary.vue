<template>
  <v-flex>
    <v-row id="top-half">
      <v-col cols="5">
        <ConfigInformation
          v-if="Object.keys(config).length > 0"
          :data="config"
        />
      </v-col>
      <v-col cols="7">
        <ProfileInformation v-if="profiles.length > 0" :data="profiles" />
      </v-col>
    </v-row>
    <v-row>
      <TimeSeries ref="TimeSeries" />
    </v-row>
  </v-flex>
</template>

<script>
import { mapGetters } from "vuex";

import ConfigInformation from "./summary/config";
import ProfileInformation from "./summary/profile";
import TimeSeries from "./summary/timeSeries";

export default {
	name: "Summary",

	components: {
		ConfigInformation,
		ProfileInformation,
		TimeSeries,
	},

	props: ["config"],

	computed: {
		...mapGetters({ 
			summary: "getSummary",
			runs: "getRuns",
			profiles: "getProfiles",
		}),
	},

	methods: {
		init() {
			this.$store.dispatch("fetchSummary");
			this.$refs.TimeSeries.init();
		},

		// /**
		//  * Attaches properties to central storage based on the data from `this.auxiliary_data`.
		//  */
		// setSummaryGlobalVariables() { 
		// 	this.$store.summary = this.summary;
		// 	this.$store.metricTimeMap = utils.swapKeysToDict(this.summary, "meantime");

		// 	this.$store.selectedTargetDataset = utils.getKeyWithMaxValue(this.$store.metricTimeMap);
		// 	this.$store.selectedNode = this.$store.summary[this.$store.selectedTargetDataset]["roots"][0];

		// 	this.$store.numOfRuns = this.runs.length;
		// 	this.$store.selectedDatasets = this.runs;
		// },
	},
};
</script>