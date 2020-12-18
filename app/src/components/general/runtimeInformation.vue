<template>
    <v-card tile>
        <v-card-title>Runtime Information</v-card-title>
        <v-data-table
            dense
            :headers="runtimeHeaders"
            :items="data"
            :items-per-page="5"
            class="elevation-1"
        >
            <template slot="items" slot-scope="props">
                <tr>
                    <td nowrap="true">{{ props.item.run }}</td>
                    <td nowrap="true">
                        {{ props.item.min_inclusive_runtime }}
                    </td>
                    <td nowrap="true">
                        {{ props.item.max_inclusive_runtime }}
                    </td>
                    <td nowrap="true">
                        {{ props.item.min_exclusive_runtime }}
                    </td>
                    <td nowrap="true">
                        {{ props.item.max_exclusive_runtime }}
                    </td>
                </tr>
            </template>
        </v-data-table>
    </v-card>
</template>

<script>
export default {
	name: "RuntimeInformation",
	props: ["data"],
	data: () => ({
		runtimeHeaders: [
			{ text: "Run", value: "run" },
			{
				text: "Min. Inclusive runtime (\u03BCs)",
				value: "min_inclusive_runtime",
			},
			{
				text: "Max. Inclusive runtime (\u03BCs)",
				value: "max_inclusive_runtime",
				sortable: true,
			},
			{
				text: "Min. Exclusive runtime (\u03BCs)",
				value: "min_exclusive_runtime",
			},
			{
				text: "Max. Exclusive runtime (\u03BCs)",
				value: "max_exclusive_runtime",
			},
		],
	}),    
};
</script>