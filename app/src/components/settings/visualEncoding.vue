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
	},

	methods: {
		init() {
			this.selectedMetric = this.$store.selectedMetric;
			this.selectedColorPoint = this.$store.selectedColorPoint;
			this.runtimeColorMap = this.$store.runtimeColorMap;
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