<template>
	<v-row no-gutters>
		<v-col cols="4">
			<v-select
				class="pt-8 pl-2"
				dark
				:label="targetLabel"
				:items="datasets"
				v-model="targetRun"
				:menu-props="{maxHeight: '400'}"
				@input="updateTargetRun"
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
				:disabled="!(selectedMode === 'ESG')"
				class="pt-8 pl-2"
				dark
				:label="compareLabel"
				:items="datasetsWNoRun"
				v-model="compareRun"
				:menu-props="{maxHeight: '400'}"
				@input="updateCompareRun"
			>
				<template slot="selection" slot-scope="{item}">
					{{ datasets.indexOf(item) + 1 }}. {{ item }} -
					{{ formatRuntimeWithoutUnits(metricTimeMap[item]) }}
				</template>
				<template slot="item" slot-scope="{item}">
					{{ datasets.indexOf(item) + 1 }}. {{ item }} -
					{{ formatRuntimeWithoutUnits(metricTimeMap[item]) }}
				</template>
			</v-select>
		</v-col>
	</v-row>
</template>

<script>
import * as d3 from "d3";
import { mapGetters } from "vuex";

export default {
	data: () => ({
		name: "RunSelection",
		datasets: [],
		datasetsWNoRun: [],
		targetLabel: "",
		compareLabel: "",
	}),

	mounted() {
		this.datasets = Object.keys(this.metricTimeMap);
		this.datasetsWNoRun = [ ...this.datasets, NaN];
		this.targetLabel = "Select Target run (Sorted by " + this.selectedMetric + ")";
		this.compareLabel = "Select Compare run (Sorted by " + this.selectedMetric + ")";
	},

	computed: {
		...mapGetters({
			runs: "getRuns",
			metricTimeMap: "getMetricTimeMap",
			targetRun: "getSelectedTargetRun",
			compareRun: "getSelectedCompareRun",
			selectedMetric: "getSelectedMetric",
			selectedMode: "getSelectedMode",
			isComparisonMode: "getComparisonMode",
		})
	},

	methods: {
		formatRuntimeWithoutUnits(val) {
			if (val == undefined) {
				return "";
			}
			let format = d3.format(".2");
			let ret = format(val);
			return ret;
		},

		updateTargetRun(data) {
			this.$store.commit("setSelectedTargetRun", data);
			this.$store.dispatch("reset");
		},

		updateCompareRun(data) {
			if (data.length == 0) {
				console.log("Disable comparison");
				this.$store.commit("setComparisonMode", false);
				this.$store.commit("setSelectedCompareRun", "");
				this.$store.dispatch("reset");
			}
			else {
				// TODO: Move this to the store.js
				// TODO: reduce the number of dependents on commit operation. 
				console.log("Enable comparison");
				this.$store.commit("setComparisonMode", true);
				this.$store.commit("setSelectedCompareRun", data);
				this.$store.dispatch("updateNodeEncoding");
			}
		},
	},
};
</script>
