<template>
  <v-flex>
    <v-row id="top-half">
      <v-col cols="5">
        <ConfigInformation />
      </v-col>
      <v-col cols="7">
        <ProfileInformation />
      </v-col>
    </v-row>
    <v-row>
      <TimeSeries />
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

	computed: {
		...mapGetters({ 
			summary: "getSummary",
			runs: "getRuns",
			profiles: "getProfiles",
		}),
	},

	beforeCreate() {
		this.$store.dispatch("fetchSummary");
	},
};
</script>