<template>
	<v-btn color="white" dark ripple>
		<v-select
			dense
			color="white"
			:items="viewFormats"
			:v-model="selectedFormat"
			:menu-props="{maxHeight: '400'}"
		>
			<template slot="selection" slot-scope="{item}">
				<router-link :to="formatRouteMapping[item]" replace>
					<div style="color: teal;">{{item}}</div>
				</router-link>
			</template>
			<template slot="item" slot-scope="{item}">
				<router-link :to="formatRouteMapping[item]" replace>
					<div style="color: teal;"> {{item}} </div>
				</router-link>
			</template>
		</v-select>
	</v-btn>
</template>

<script>
export default {
	data: () => ({
		name: "ViewSelection",
		viewFormats: ["CCT", "SuperGraph", "EnsembleSuperGraph"],
		formatRouteMapping: {
			"CCT": "/cct",
			"SuperGraph": "/super_graph",
			"EnsembleSuperGraph": "/ensemble_super_graph"
		},
		selectedFormat: "",
	}),

	mounted() {
		this.selectedFormat = this.$route.name;
		this.$store.selectedFormat = this.$route.name
	},

	methods: {
		updateViewFormat() {
			
		}
	}
};
</script>