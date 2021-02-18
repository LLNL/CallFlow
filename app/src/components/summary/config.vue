/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
	<v-container>
		<v-card tile>
			<v-card-title class="pa-4 pb-0"> General Information </v-card-title>
			<v-row class="ma-4 pa-1"> <b>Experiment: </b> {{ data.experiment }} </v-row>
			<v-row class="ma-4 pa-1"> <b>Data path: </b> {{ data.data_path }} </v-row>
			<v-row class="ma-4 pa-1"> <b>.callflow save path: </b> {{ data.save_path }} </v-row>
			<v-row class="ma-4 pa-1"> <b>Filter by attribute: </b> {{ data.filter_by }} </v-row>
			<v-row class="ma-4 pa-1"> <b>Filter percentage: </b> {{ data.filter_perc }} </v-row>
			<v-row class="ma-4 pa-1"> <b>Group by attribute: </b> {{ data.group_by }} </v-row>
		</v-card>
	</v-container>
</template>


<script>
export default {
	name: "ConfigInformation",
	props: ["data"],
};
</script>