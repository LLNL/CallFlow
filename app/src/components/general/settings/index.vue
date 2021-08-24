<template>
  <v-col class="pa-0">
    <v-flex xs12 class="ma-1">
      <v-subheader class="teal lighten-4">SuperGraph Encoding</v-subheader>
    </v-flex>
    <v-flex xs12 class="ma-1">
      <v-select
        label="Metric"
        :items="metrics"
        :value="selectedMetric"
        :menu-props="{maxHeight: '200'}"
        persistent-hint
        @change="updateSelectedMetric"
      >
      </v-select>
    </v-flex>

    <v-flex xs12 class="ma-1">
      <v-select
        label="Runtime Color Map"
        :items="runtimeColorMap"
        :value="selectedRuntimeColorMap"
        :menu-props="{maxHeight: '200'}"
        persistent-hint
        @change="updateRuntimeColorMap"
      >
      </v-select>
    </v-flex>

    <v-flex xs12 class="ma-1">
      <v-select
        label="Distribution Color Map"
        :items="distributionColorMap"
        :value="selectedDistributionColorMap"
        :menu-props="{maxHeight: '200'}"
        persistent-hint
        :disabled="selectedMode === 'ESG' ? false : true"
        @change="updateDistributionColorMap"
      >
      </v-select>
    </v-flex>

    <!-- <v-flex xs12 class="ma-1">
      <v-select
        label="Target Color"
        :items="targetColors"
        :value="selectedTargetColor"
        :menu-props="{maxHeight: '200'}"
        persistent-hint
        :disabled="selectedMode === 'ESG' ? false : true"
        @change="updateTargetColor"
      >
      </v-select>
    </v-flex> -->

    <v-flex xs12 class="ma-1">
      <v-text-field
        label="Color points (3-9)"
        class="mt-0"
        type="number"
        :value="selectedColorPoint"
        :menu-props="{maxHeight: '200'}"
        persistent-hint
        @change="updateSelectedColorPoint"
      >
      </v-text-field>
    </v-flex>

    <template :v-if="selectedMode == 'SG'">
      <v-flex xs12 class="ma-1">
        <v-subheader class="teal lighten-4">Runtime Encoding</v-subheader>
      </v-flex>

      <v-flex xs12 class="ma-1" :v-show="selectedMode == 'SG'">
        <v-text-field
          label="Number of bins for MPI Distribution"
          class="mt-0"
          type="number"
          :value="selectedRankBinCount"
          :menu-props="{maxHeight: '200'}"
          persistent-hint
          :disabled="
            selectedMode == 'SG' ? false : true
          "
		@change="updateRankBinCount"

        >
        </v-text-field>
      </v-flex>

      <v-flex xs12 class="ma-1">
        <v-text-field
          label="Number of bins for Run Distribution"
          class="mt-0"
          type="number"
          :value="selectedRunBinCount"
          :menu-props="{maxHeight: '200'}"
          persistent-hint
          :disabled="selectedMode === 'ESG' ? false : true"
		@change="updateRunBinCount"

        >
        </v-text-field>
      </v-flex>

      <!-- <v-flex xs12 class="ma-1">
        <v-select
          label="Distribution Scale"
          :items="scales"
          :value="selectedScale"
          :menu-props="{maxHeight: '200'}"
          persistent-hint
          :disabled="selectedMode === 'ESG' ? false : true"
        >
        </v-select>
      </v-flex> -->

      <v-flex xs12 class="ma-1">
        <v-select
          label="Bin by attribute"
          :items="props"
          :value="selectedProp"
          :menu-props="{maxHeight: '200'}"
          persistent-hint
          :disabled="true"
          @change="updateProp"
        >
        </v-select>
      </v-flex>
    </template>

    <template>
      <v-flex xs12 class="ma-1">
        <v-subheader class="teal lighten-4">Call site Variability</v-subheader>
      </v-flex>
      <v-flex xs12 class="ma-1">
        <v-select
          label="Sort by"
          :items="sortByModes"
          :value="selectedRuntimeSortBy"
          :menu-props="{maxHeight: '200'}"
          persistent-hint
          :disabled="
            selectedMode === 'ESG' || selectedMode == 'SG' ? false : true
          "
          @change="updateRuntimeSortBy"
        />
      </v-flex>

      <v-flex xs12 class="ma-1">
        <v-text-field
          label="IQR Factor"
          class="mt-0"
          type="float"
          :value="selectedIQRFactor"
          :menu-props="{maxHeight: '200'}"
          persistent-hint
          :disabled="
            selectedMode === 'ESG' || selectedMode == 'SG' ? false : true
          "
          @change="updateIQRFactor"
        >
        </v-text-field>
      </v-flex>
    </template>
  </v-col>
</template>


<script>
import Color from "lib/color/index";
import {mapActions, mapGetters} from "vuex";

export default {
	name: "Settings",

	data: () => ({
		colorPoints: [3, 4, 5, 6, 7, 8, 9],
		metrics: ["time", "time (inc)", "module"],
		runtimeColorMap: new Color().getAllColors(),
		distributionColorMap: new Color().getAllColors(),
		sortByModes: ["min", "mean", "max", "imb", "var", "kert", "skew"],
		compareModes: ["MEAN_DIFF", "RANK_DIFF"],
		selectedCompareMode: "MEAN_DIFF",
		props: ["name", "rank", "dataset"],
	}),

	computed: {
		...mapGetters({
			selectedMetric: "getSelectedMetric",
			selectedRuntimeColorMap: "getRuntimeColorMap",
			selectedDistributionColorMap: "getDistributionColorMap",
			selectedColorPoint: "getColorPoint",
			selectedMode: "getSelectedMode",
			selectedRunBinCount: "getRunBinCount",
			selectedRankBinCount: "getRankBinCount",
			selectedRuntimeSortBy: "getRuntimeSortBy",
			selectedTargetColor: "getTargetColor",
			selectedIQRFactor: "getIQRFactor",
			selectedCompareRun: "getCompareRun",
			selectedProp: "getProp",
			targetColorMap: "getTargetColorMap"
		}),
		targetColors: function () {
			return Object.keys(this.targetColorMap);
		}
	},

	methods: {
		...mapActions([
			"updateSelectedMetric",
			"updateRuntimeColorMap",
			"updateSelectedColorPoint",
			"updateDistributionColorMap",
			"updateTargetColor",
			"updateRankBinCount",
			"updateRunBinCount",
			"updateRuntimeSortBy",
			"updateCompareRun",
			"updateProp",
			"updateIQRFactor"
		]),

		init() {
			this.runtimeColorMap = new Color().getAllColors();
			this.distributionColorMap = new Color().getAllColors();
		},

		clear() {},
	},
};
</script>