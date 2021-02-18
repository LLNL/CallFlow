/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
	<v-container>
	<v-card tile>
		<v-card-title>Summary</v-card-title>
		<v-data-table
			dense
			:headers="headers"
			:items="data"
			class="elevation-1"
			:loading="isLoading"
			loading-text="Loading... Please wait"
			:sort-by="sortBy"
		>
			<template slot="items" slot-scope="props">
				<tr>
					<td nowrap="true">{{ props.item.run }}</td>
					<td nowrap="true">{{ props.item.meantime }}</td>
					<td nowrap="true">{{ props.item.nranks }}</td>
					<td nowrap="true">{{ props.item.ncallsites }}</td>
					<td nowrap="true">{{ props.item.nedges }}</td>
				</tr>
			</template>
		</v-data-table>
	</v-card>
	</v-container>
</template>

<script>
export default {
	name: "Summary",
	props: ["data"],
	data: () => ({
		headers: [
			{ text: "Run", value: "run" },
			{ text: "Mean runtime", value: "meantime"},
			{ text: "Number of ranks", value: "nranks"},
			{ text: "Number of call sites", value: "ncallsites"},
			{ text: "Number of calls", value: "nedges"}
		],
		// TODO: Fix the isLoading, it does not show since data lookup is fast.
		isLoading: false,
		sortBy: "run_time",
		sortDesc: false,
	}),
};
</script>