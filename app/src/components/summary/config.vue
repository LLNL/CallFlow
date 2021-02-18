/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
	<v-container>
		<v-card tile>
			<v-card-title> General Information </v-card-title>
		</v-card>
		<v-card tile>
			<v-card-title> Experiment: {{ data.experiment }} </v-card-title>
		</v-card>
		<v-card tile>
			<v-card-title> Data path: {{ data.data_path }} </v-card-title>
		</v-card>
		<v-card tile>
			<v-card-title> .callflow save path: {{ data.save_path }} </v-card-title>
		</v-card>
		<v-card tile>
			<v-card-title> Filter by attribute: {{ data.filter_by }} </v-card-title>
		</v-card>
		<v-card tile>
			<v-card-title> Filter percentage: {{ data.filter_perc }} </v-card-title>
		</v-card>
		<v-card tile>
			<v-card-title> Group by attribute: {{ data.group_by }} </v-card-title>
		</v-card>
	</v-container>
</template>


<script>
export default {
	name: "ConfigInformation",
	props: ["data"],
};
</script>