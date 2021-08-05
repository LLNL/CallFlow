/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
	<v-container fluid>
		<v-card tile>
			<v-card-title>Summary</v-card-title>
			<v-data-table
				dense
				:headers="headers"
				:items="data"
				:loading="isLoading"
				:footer-props="footerProps"
				loading-text="Loading... Please wait"
				:items-per-page.sync="itemsPerPage"
				:sort-by.sync="sortBy"
				:sort-desc.sync="sortDesc"
			>
				<template slot="items" slot-scope="props">
					<tr>
						<td nowrap="true">{{ props.run }}</td>
						<td nowrap="true">{{ props.timestamp }}</td>
						<td nowrap="true">{{ props.meantime }}</td>
						<td nowrap="true">{{ props.nranks }}</td>
						<td nowrap="true">{{ props.ncallsites }}</td>
						<td nowrap="true">{{ props.nedges }}</td>
					</tr>
				</template>
			</v-data-table>
		</v-card>
	</v-container>
</template>

<script>
import { mapGetters } from "vuex";
import moment from "moment";

export default {
	name: "Summary",
	data: () => ({
		headers: [
			{ text: "Run", value: "run" },
			{ text: "Timestamp", value: "timestamp"},
			{ text: "Mean runtime", value: "meantime"},
			{ text: "Number of ranks", value: "nranks"},
			{ text: "Number of call sites", value: "ncallsites"},
			{ text: "Number of calls", value: "nedges"}
		],
		isLoading: false,
		sortBy: "meantime",
		sortDesc: true,
		footerProps: {"items-per-page-options": [5, 10, 20, 50, -1]},
		itemsPerPage: 7
	}),
	computed: {
		...mapGetters({ data: "getProfiles"})
	},
	methods: {
		formatTimestamp(timestamp) {
			
			return moment(timestamp).format("YYYY/MM/DD HH::mm::ss");
		}
	},
};
</script>

<style scoped>
.text-start {
	font-size: 0.4em;
}
</style>