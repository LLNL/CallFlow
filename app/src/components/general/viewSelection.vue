<template>
	<v-btn color="white" dark ripple>
		<v-select
			dense
			color="white"
			:items="modes"
			:v-model="selectedMode"
			:menu-props="{maxHeight: '400'}"
		>
			<template slot="selection" slot-scope="{item}">
				<router-link :to="modeRouteMapping[item]" replace>
					<div style="color: teal;">{{item}}</div>
				</router-link>
			</template>
			<template slot="item" slot-scope="{item}">
				<router-link :to="modeRouteMapping[item]" replace>
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
		modes: ["CCT", "SG", "ESG"],
		modeRouteMapping: {
			"CCT": "/cct",
			"SG": "/super_graph",
			"ESG": "/ensemble_super_graph"
		},
	}),

	mounted() {
	},

	methods: {
		updateViewFormat() {
			
		}
	}
};
</script>