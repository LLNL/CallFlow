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
		<v-select
			label="Distribution Color Map"
			:items="distributionColorMap"
			v-model="selectedDistributionColorMap"
			:menu-props="{ maxHeight: '200' }"
			persistent-hint
		>
		</v-select>
	</v-flex>
		
	<v-flex xs12 class="ma-1">
		<v-select
			label="Target Color"
			:items="targetColors"
			v-model="selectedTargetColor"
			:menu-props="{ maxHeight: '200' }"
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

	<!-- <v-flex xs12 class="ma-1">
            <v-text-field
              label="Color minimum (in seconds)"
              class="mt-0"
              type="number"
              v-model="selectedColorMinText"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
            >
            </v-text-field>
          </v-flex>
          <v-flex xs12 class="ma-1">
            <v-text-field
              label="Color maximum (in seconds)"
              class="mt-0"
              type="number"
              v-model="selectedColorMaxText"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
            >
            </v-text-field>
          </v-flex> -->

	<template :v-if="selectedFormat=='SuperGraph'">
		<v-flex xs12 class="ma-1">
			<v-subheader class="teal lighten-4">Histograms</v-subheader>
		</v-flex>

		<v-flex xs12 class="ma-1" :v-show="selectedFormat=='SuperGraph'">
			<v-text-field
				label="Number of bins for MPI Distribution"
				class="mt-0"
				type="number"
				v-model="selectedMPIBinCount"
				:menu-props="{maxHeight: '200'}"
				persistent-hint
				disabled
			>
			</v-text-field>
		</v-flex>

		<v-flex xs12 class="ma-1">
            <v-text-field
              label="Number of bins for Run Distribution"
              class="mt-0"
              type="number"
              v-model="selectedRunBinCount"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
			disabled
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

		<v-flex xs12 class="ma-1">
            <v-select
              label="Bin by attribute"
              :items="props"
              v-model="selectedProp"
              :menu-props="{ maxHeight: '200' }"
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

		<v-flex xs12 class="ma-1">
            <v-text-field
              label="IQR Factor"
              class="mt-0"
              type="float"
              v-model="selectedIQRFactor"
              :menu-props="{ maxHeight: '200' }"
              persistent-hint
            >
            </v-text-field>
          </v-flex>
	</template>
  </v-col>
</template>


<script>
import EventHandler from "lib/routing/EventHandler";
import APIService from "lib/routing/APIService";

export default {
	name: "VisualEncoding",

	data: () => ({
		colorPoints: [3, 4, 5, 6, 7, 8, 9],
		selectedColorPoint: 9,
		metrics: ["time", "time (inc)"],
		selectedMetric: "time (inc)",
		selectedRuntimeColorMap: "OrRd",
		runtimeColorMap: [],
		distributionColorMap: [],
		selectedRunBinCount: 20,
		selectedMPIBinCount: 20,
		selectedRuntimeSortBy: "mean",
		sortByModes: ["min", "mean", "max", "imb", "var", "kert", "skew"],
		scales: ["Log", "Linear"],
		selectedScale: "Linear",
		selectedFormat: "",
		selectedDistributionColorMap: "Blues",
		compareModes: ["MEAN_DIFF", "RANK_DIFF"],
		selectedCompareMode: "MEAN_DIFF",
		props: ["name", "rank", "dataset", "all_ranks"],
		selectedProp: "dataset",
		dimensions: ["max_inclusive_time", "max_exclusive_time", "rank_count"],
		selectedPC1: "max_inclusive_time",
		selectedPC2: "max_exclusive_time",
		selectedIQRFactor: 0.15,
		selectedNumOfClusters: 3,
		targetColorMap: {
			Green: "#4EAF4A",
			Blue: "#4681B4",
			Brown: "#AF9B90",
			Red: "#A90400",
		},
		targetColors: ["Green", "Blue", "Brown"],
		selectedTargetColor: "Green",
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
			if (this.$store.selectedFormat == "EnsembleSuperGraph") {
				EventHandler.$emit("callsite-correspondence-sort", val);
			}
			else if(this.$store.selectedFormat == "SuperGraph"){
				EventHandler.$emit("callsite-information-sort", val);
			}
		},

		selectedTargetColor(val) {
			this.$store.selectedTargetColor = val;
			this.reset();
		},

		auxiliarySortBy(val) {
			this.$store.auxiliarySortBy = val;
			EventHandler.$emit("update-auxiliary-sort-by");
		},

		async selectedRunBinCount(val) {
			this.$store.selectedRunBinCount = val;
			// TODO: Need to do something here.
			const data = await this.requestAuxData();
			this.reset();
		},

		selectedProp(val) {
			this.$store.selectedProp = val;
			this.reset();
		},

		selectedDistributionColorMap(val) {
			this.$store.selectedDistributionColorMap = val;
			EventHandler.$emit("setup-colors");
			this.reset();
		},

		async selectedCompareDataset(val) {
			this.summaryChip = "Diff SuperGraph";
			this.$store.selectedCompareDataset = val;
			this.$store.comparisonMode = true;
			this.$store.encoding = this.selectedCompareMode;
			const data = await APIService.POSTRequest("compare", {
				targetDataset: this.$store.selectedTargetDataset,
				compareDataset: this.$store.selectedCompareDataset,
				selectedMetric: this.$store.selectedMetric,
			});
			this.$refs.SuperGraph.activateCompareMode(data);
		},

		selectedNumOfClusters(val) {
			this.$store.selectedNumOfClusters = val;
			EventHandler.$emit("update-number-of-clusters");
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
			this.distributionColorMap = this.$store.runtimeColorMap;
			this.selectedFormat = this.$store.selectedFormat;

			if (this.$store.selectedFormat == "SuperGraph") {
				this.selectedMPIBinCount = this.$store.selectedMPIBinCount;
	
				// Set the scale for information (log or linear)
				this.$store.selectedScale = this.selectedScale;
			} 

			else if (this.$store.selectedFormat == "EnsembleSuperGraph") {
				this.selectedRunBinCount = this.$store.selectedRunBinCount;
				this.selectedProp = this.$store.selectedProp;

				this.selectedDistributionColorMap = this.$store.selectedDistributionColorMap;
				this.selectedRuntimeColorMap = "Blues";
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
			else if (this.$store.selectedFormat == "SuperGraph") {
				EventHandler.$emit("supergraph-reset");
			}
			else if (this.$store.selectedFormat == "EnsembleSuperGraph") {
				EventHandler.$emit("ensemble-supergraph-reset");
			}
		},

		clear() {
			// This should always be empty.
		},
	}
};
</script>