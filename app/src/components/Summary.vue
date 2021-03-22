<template>
  <v-flex>
    <v-row>
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
    <!-- <v-row> -->
    <!-- <ModuleMappingInformation v-if="moduleCallsiteMap.length > 0" :data="moduleCallsiteMap" /> -->
    <!-- </v-row> -->
    <v-row>
      <TimeSeries ref="TimeSeries" :data="moduleCallsiteMap" />
    </v-row>
  </v-flex>
</template>

<script>
import ConfigInformation from "./summary/config";
import ProfileInformation from "./summary/profile";
// import ModuleMappingInformation from './summary/moduleMap';
import TimeSeries from "./summary/timeSeries";

export default {
	name: "Summary",
	components: {
		ConfigInformation,
		ProfileInformation,
		// ModuleMappingInformation,
		TimeSeries,
	},
	props: ["config", "profiles", "moduleCallsiteMap"],

	mounted() {
		document.title = "CallFlow - ";
	},

	methods: {
		init(moduleCallsiteMap) {
			this.$refs.TimeSeries.init(moduleCallsiteMap);
		},
	},
};
</script>