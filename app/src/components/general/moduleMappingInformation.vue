/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
    <v-card tile>
        <v-card-title>Module Callsite Mapping</v-card-title>
        <v-data-table
        dense
        :headers="headers"
        :items="data"
        :items-per-page="5"
        :single-expand="singleExpand"
        :expanded.sync="expanded"
        item-key="name"
        show-expand
        class="elevation-1"
        >
        <template slot="items" slot-scope="props">
            <tr>
            <td nowrap="true">{{ props.item.module }}</td>
            <td nowrap="true">{{ props.item.inclusive_runtime }}</td>
            <td nowrap="true">{{ props.item.exclusive_runtime }}</td>
            <td nowrap="true">{{ props.item.imbalance_perc }}</td>
            <td nowrap="true">{{ props.item.number_of_callsites }}</td>
            <td nowrap="true">
                <v-icon @click="expand(!isExpanded)">keyboard_arrow_down</v-icon>
            </td>
            </tr>
        </template>

        <template v-slot:expanded-item="{ headers, item }">
            <td :colspan="headers.length">More info about {{ item.name }}</td>
        </template>
        </v-data-table>
    </v-card>
</template>

<script>
export default {
	name: "ModuleMappingInformation",
	props: ["data"],
	data: () => ({
		headers: [
			{ text: "Module", value: "module" },
			{ text: "Callsites", value: "callsites" },
			{
				text: "Inclusive runtime (\u03BCs)",
				value: "inclusive_runtime",
				sortable: true,
			},
			{ text: "Imbalance perc (%)", value: "imbalance_perc" },
			{ text: "Number of Callsites", value: "number_of_callsites" },
		],
	})
};
</script>