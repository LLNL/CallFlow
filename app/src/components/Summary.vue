<template>
  <v-row>
    <v-col cols="3">
      <ConfigInformation v-if="Object.keys(config).length > 0" :data="config" />
    </v-col>
    <v-col cols="9">
      <ProfileInformation v-if="profiles.length > 0" :data="profiles" />
    </v-col>
  </v-row>
  <!-- <v-row> -->
    <!-- <ModuleMappingInformation v-if="moduleCallsiteMap.length > 0" :data="moduleCallsiteMap" /> -->
  <!-- </v-row> -->
</template>

<script>
import ConfigInformation from "./summary/config";
import ProfileInformation from "./summary/profile";
// import ModuleMappingInformation from './summary/moduleMap';

export default {
	name: "Summary",
	components: {
		ConfigInformation,
		ProfileInformation,
		// ModuleMappingInformation,
	},
	props: ["config", "profiles", "moduleCallsiteMap"],

	mounted() {
		document.title = "CallFlow - ";
	},
};
</script>