<template>
  <v-col class="pa-0">
    <v-flex xs12 class="ma-1">
      <v-subheader class="teal lighten-4">Visual Encoding</v-subheader>
    </v-flex>
    <v-flex xs12 class="ma-1">
      <v-select
        label="Metric"
        :items="metrics"
        v-model="selectedMetric"
        :menu-props="{maxHeight: '200'}"
        persistent-hint
      >
      </v-select>
    </v-flex>

    <v-flex xs12 class="ma-1">
      <v-select
        label="Runtime Color Map"
        :items="runtimeColorMap"
        v-model="selectedRuntimeColorMap"
        :menu-props="{maxHeight: '200'}"
        persistent-hint
      >
      </v-select>
    </v-flex>
	
    <v-flex xs12 class="ma-1">
      <v-text-field
        label="Color points (3-9)"
        class="mt-0"
        type="number"
        v-model="selectedColorPoint"
        :menu-props="{maxHeight: '200'}"
        persistent-hint
      >
      </v-text-field>
    </v-flex>

	<template :v-if="selectedFormat=='SuperGraph'">
		<v-flex xs12 class="ma-1">
			<v-subheader class="teal lighten-4">MPI Histograms</v-subheader>
		</v-flex>
		<v-flex xs12 class="ma-1" :v-show="selectedFormat=='SuperGraph'">
			<v-text-field
				label="Number of bins for MPI Distribution"
				class="mt-0"
				type="number"
				v-model="selectedMPIBinCount"
				:menu-props="{maxHeight: '200'}"
				persistent-hint
			>
			</v-text-field>
		</v-flex>

		<v-flex xs12 class="ma-1">
			<v-select
				label="Distribution Scale"
				:items="scales"
				v-model="selectedScale"
				:menu-props="{maxHeight: '200'}"
				persistent-hint
			>
			</v-select>
		</v-flex>
	</template>

	<template :v-if="selectedFormat=='SuperGraph'">
		<v-flex xs12 class="ma-1">
			<v-subheader class="teal lighten-4">Call site Information</v-subheader>
		</v-flex>
		<v-flex xs12 class="ma-1">
			<v-select
				label="Sort by"
				:items="sortByModes"
				v-model="selectedRuntimeSortBy"
				:menu-props="{maxHeight: '200'}"
				persistent-hint
			/>
		</v-flex>
	</template>
  </v-col>
</template>


<script>
import EventHandler from "lib/routing/EventHandler";

export default {
	name: "VisualEncoding",

	data: () => ({
		colorPoints: [3, 4, 5, 6, 7, 8, 9],
		selectedColorPoint: 9,
		metrics: ["time", "time (inc)"],
		selectedMetric: "time (inc)",
		selectedRuntimeColorMap: "OrRd",
		runtimeColorMap: [],
		selectedRunBinCount: 20,
		selectedMPIBinCount: 20,
		selectedRuntimeSortBy: "Inclusive",
		sortByModes: ["Inclusive", "Exclusive", "Standard Deviation"],
		scales: ["Log", "Linear"],
		selectedScale: "Linear",
		selectedFormat: "",
	}),
  
	watch: {
		selectedRuntimeColorMap: function (val) {
			this.$store.selectedRuntimeColorMap = val;
			EventHandler.$emit("setup-colors");
			this.reset();
		},

		selectedMetric: function (val) {
			this.$store.selectedMetric = val;
			this.reset();
		},

		selectedColorPoint: function (val) {
			this.$store.selectedColorPoint = val;
			EventHandler.$emit("setup-colors");
			this.reset();
		},

		// NOTE: This functionality is broken!!!
		// The request times out because the auxiliary processing
		// exceeds the threshold set by the APIService.
		// TODO: CAL-88: Fix the time out error and use events
		// instead of a this.reset()
		async selectedMPIBinCount(val) {
			this.$store.selectedMPIBinCount = val;
			const data = await this.requestAuxData();

			// TODO: CAL-88 Fix the timeout error.
			// EventHandler.$emit("update-rank-bin-size", {
			// 	node: this.$store.selectedNode,
			// 	dataset: this.$store.selectedTargetDataset
			// });
			this.reset();
		},

		selectedScale(val) {
			this.$store.selectedScale = val;
			this.reset();
		},

		selectedIQRFactor(val) {
			this.$store.selectedIQRFactor = val;
			this.reset();
		},

		selectedRuntimeSortBy(val) {
			this.$store.selectedRuntimeSortBy = val;
			EventHandler.$emit("callsite-information-sort");
		},
	},

	mounted() {
		this.selectedFormat = this.$store.selectedFormat;
		console.log("Format: ", this.selectedFormat);
	},

	methods: {
		init() {
			this.selectedMetric = this.$store.selectedMetric;
			this.selectedColorPoint = this.$store.selectedColorPoint;
			this.runtimeColorMap = this.$store.runtimeColorMap;
			this.selectedFormat = this.$store.selectedFormat;

			if (this.$store.selectedFormat == "SuperGraph") {
				this.selectedMPIBinCount = this.$store.selectedMPIBinCount;
	
				// Set the scale for information (log or linear)
				this.$store.selectedScale = this.selectedScale;
			} 

			console.log("Mode : ", this.$store.selectedMode);
			console.log("Number of runs :", this.$store.numOfRuns);
			console.log("Target Dataset : ", this.$store.selectedTargetDataset);
			console.log("Node: ", this.$store.selectedNode);
			console.log("Run Bin size", this.$store.selectedRunBinCount);
			console.log("MPI Bin size", this.$store.selectedMPIBinCount);
		},

		reset() {
			if (this.$store.selectedFormat == "CCT") {
				EventHandler.$emit("cct-reset");
			}
		},

		clear() {
			// This should always be empty.
		},

	}
  
};
</script>