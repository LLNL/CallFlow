/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
	<v-container>
	<v-card tile>
		<v-card-title>Dataset Information</v-card-title>
		<v-data-table
			dense
			:headers="headers"
			:items="data"
			:items-per-page="5"
			class="elevation-1"
			:loading="isLoading"
			loading-text="Loading... Please wait"
		>
			<template slot="items" slot-scope="props">
				<tr>
					<td nowrap="true">{{ props.item.run }}</td>
					<td nowrap="true">{{ props.item.run_time }}</td>
					<td nowrap="true">{{ props.item.num_ranks }}</td>
					<td nowrap="true">{{ props.item.num_callsites }}</td>
					<td nowrap="true">{{ props.item.num_edges }}</td>
				</tr>
			</template>
		</v-data-table>
	</v-card>
	</v-container>
</template>

<script>
export default {
	name: "RuntimeInformation",
	props: ["data"],
	data: () => ({
		headers: [
			{ text: "Run", value: "run" },
			{ text: "Total runtime", value: "run_time", sortable: true},
			{ text: "Number of ranks", value: "num_ranks"},
			{ text: "Number of call sites", value: "num_callsites"},
			{ text: "Number of calls", value: "num_edges"}
		],
		// TODO: Fix the isLoading, it does not show since data lookup is fast.
		isLoading: false
	}),
};
</script>