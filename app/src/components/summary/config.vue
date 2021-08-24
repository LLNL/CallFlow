/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
	<v-container fluid :v-if="data">
		<v-card tile class="mx-auto">
			<v-card-title class="pa-4 pb-2"> Configuration </v-card-title>
			<v-row class="ma-0 pa-0 pb-0 mb-0"> 
				<v-col cols="5"><b>Experiment: </b></v-col> 
				<v-col cols="7">{{ data.experiment }} </v-col> 	
			</v-row>
			<v-divider></v-divider>
			<v-row class="ma-0 pa-0 pb-0 mb-0"> 
				<v-col cols="5"><b>Number of Runs: </b></v-col> 
				<v-col cols="7">{{ runs.length }} </v-col> 	
			</v-row>
			<v-divider></v-divider>
			<v-row class="ma-0 pa-0 pb-0 mb-0">
				<v-col cols="5"><b>Profile format: </b></v-col>
				<v-col cols="7">{{ data.profile_format_summary }}</v-col> 
			</v-row>
			<v-divider></v-divider>
			<v-row class="ma-0 pa-0 pb-0 mb-0"> 
				<v-col cols="5"><b>Number of nodes: </b></v-col> 
				<v-col cols="7">{{ (Object.keys(data.module_callsite_map).length
				- 1)
				+ " modules, " +  Object.keys(data.callsite_module_map).length +
				" callsites"}} </v-col> 	
			</v-row>
			<v-divider></v-divider>
			<v-row class="ma-0 pa-0 pb-0 mb-0">
				<v-col cols="5"> <b>Data path: </b></v-col>
				<v-col cols="7">{{ data.data_path }}</v-col>
			</v-row>
			<v-divider></v-divider>
			<v-row class="ma-0 pa-0 pb-0 mb-0"> 
				<v-col cols="5"><b>.callflow save path: </b></v-col> 
				<v-col cols="7">{{ data.save_path }}</v-col>
			</v-row>
			<v-divider></v-divider>
			<v-row class="ma-0 pa-0 pb-0 mb-0"> 
				<v-col cols="5"><b>Metric columns: </b></v-col> 
				<v-col cols="7">{{ data.time_columns }}</v-col> 
			</v-row>
		</v-card>
	</v-container>
</template>


<script>
import { mapGetters } from "vuex";

export default {
	name: "ConfigInformation",
	beforeCreate() {
		this.$store.dispatch("fetchConfig");
	},

	computed: {
		...mapGetters({ data: "getConfig", runs: "getRuns"}),
	},

};
</script>

<style scoped>
.col {
	font-size: 0.9em;
}
</style>