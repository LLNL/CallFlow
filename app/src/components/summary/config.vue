/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
	<v-container>
		<v-card tile>
			<v-card-title class="pa-4 pb-0"> Configuration </v-card-title>
			<v-row class="ma-1 pa-1 pb-0 mb-0"> 
				<v-col cols="5"><b>Experiment: </b></v-col> 
				<v-col cols="7">{{ data.experiment }} </v-col> 	
			</v-row>
			<v-divider></v-divider>
			<v-row class="ma-1 pa-1 pb-0 mb-0">
				<v-col cols="5"> <b>Data path: </b></v-col>
				<v-col cols="7">{{ data.data_path }}</v-col>
			</v-row>
			<v-divider></v-divider>
			<v-row class="ma-1 pa-1 pb-0 mb-0"> 
				<v-col cols="5"><b>.callflow save path: </b></v-col> 
				<v-col cols="7">{{ data.save_path }}</v-col>
			</v-row>
			<v-divider></v-divider>
			<v-row class="ma-1 pa-1 pb-0 mb-0"> 
				<v-col cols="5"><b>Filter by attribute: </b></v-col> 
				<v-col cols="7">{{ data.filter_by }}</v-col> 
			</v-row>
			<v-divider></v-divider>
			<v-row class="ma-1 pa-1 pb-0 mb-0">
				<v-col cols="5"><b>Filter percentage: </b></v-col>
				<v-col cols="7">{{ data.filter_perc }}</v-col> 
			</v-row>
			<v-divider></v-divider>
			<v-row class="ma-1 pa-1 pb-0 mb-0"> 
				<v-col cols="5"><b>Group by attribute: </b></v-col>
				<v-col cols="7"> {{ data.group_by }} </v-col>
			</v-row>
		</v-card>
	</v-container>
</template>


<script>
export default {
	name: "ConfigInformation",
	props: ["data"],
};
</script>