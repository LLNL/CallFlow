<template>
	<v-row no-gutters>
		<v-col cols="4">
			<v-select
				class="pt-8 pl-2"
				dark
				label="Select Target run (Sorted by inclusive runtime)"
				:items="datasets"
				v-model="selectedTargetDataset"
				:menu-props="{maxHeight: '400'}"
				v-on:change="updateTargetDataset()"
			>
				<template slot="selection" slot-scope="{item}">
					{{ datasets.indexOf(item) + 1 }}. {{ item }}
				</template>
				<template slot="item" slot-scope="{item}">
					{{ datasets.indexOf(item) + 1 }}. {{ item }} -
					{{ formatRuntimeWithoutUnits(metricTimeMap[item]) }}
				</template>
			</v-select>
		</v-col>

		<v-col cols="4">
			<v-select
				class="pt-8 pl-2"
				label="Select Compare run"
				:items="datasets"
				v-model="selectedCompareDataset"
				:menu-props="{maxHeight: '400'}"
				v-show="isComparisonMode"
				v-on:change="updateCompareDataset()"
			>
				<template slot="selection" slot-scope="{item}">
					{{ datasets.indexOf(item) + 1 }}. {{ item }} -
					{{ formatRuntimeWithoutUnits(metricTimeMap[item]) }}
				</template>
				<template slot="item" slot-scope="{item}">
					<!-- HTML that describe how select should render items when the select is open -->
					{{ datasets.indexOf(item) + 1 }}. {{ item }} -
					{{ formatRuntimeWithoutUnits(metricTimeMap[item]) }}
				</template>
			</v-select>
		</v-col>
	</v-row>
</template>

<script>
import * as d3 from "d3";

// local library imports
import EventHandler from "lib/routing/EventHandler";

export default {
	data: () => ({
		name: "RunSelection",
		metricTimeMap: {},
		datasets: [],
		selectedTargetDataset: "",
		selectedCompareDataset: "",
		isComparisonMode: false,
		selectedMode: "",	
		emitMapper: {
			"CCT": "fetch-cct",
			"SuperGraph": "fetch-super-graph",
			"EnsembleSuperGraph": "fetch-ensemble-super-graph",
		}
	}),

	mounted() {
		// Set the metricTimeMap, used by the dropdown to select the dataset.
		this.metricTimeMap = this.$store.metricTimeMap;
		this.datasets = this.$store.selectedDatasets;
		this.selectedTargetDataset = this.$store.selectedTargetDataset;
		this.isComparisonMode = this.$store.isComparisonMode;

		if (this.isComparisonMode) {
			this.selectedCompareDataset = this.$store.selectedCompareDataset;
		}

		this.selectedMode = this.$store.selectedMode;	
	},

	methods: {
		formatRuntimeWithoutUnits(val) {
			let format = d3.format(".2");
			let ret = format(val);
			return ret;
		},

		updateTargetDataset() {
			this.$store.selectedTargetDataset = this.selectedTargetDataset;
			this.$store.selectedFormat = this.$route.name;
			EventHandler.$emit("setup-colors");
			EventHandler.$emit(this.emitMapper[this.$store.selectedFormat]);
		},

		updateCompareDataset() {
			this.$store.isComparisonMode = true;
			this.$store.selectedCompareDataset = this.selectedCompareDataset;
			EventHandler.$emit("setup-colors");
			EventHandler.$emit("reset");
		},
	},
};
</script>
