<template>
	<div>
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
	</div>
</template>


<script>
export default {
	name: "BasicInformation",
	props: ["data"],
};
</script>