/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
  <v-select
    label="Select Target run (Sorted by inclusive runtime)"
    :items="datasets"
    v-model="selectedTargetDataset"
    :menu-props="{ maxHeight: '400' }"
    box
    v-on:change="updateTargetDataset()"
  >
    <template slot="selection" slot-scope="{ item }">
      {{ datasets.indexOf(item) + 1 }}. {{ item }} -
      {{ formatRuntimeWithoutUnits(metricTimeMap[item]) }}
    </template>
    <template slot="item" slot-scope="{ item }">
      {{ datasets.indexOf(item) + 1 }}. {{ item }} -
      {{ formatRuntimeWithoutUnits(metricTimeMap[item]) }}
    </template>
  </v-select>
</template>


<script>
import * as d3 from "d3";

export default {
	name: "SelectTargetRun",
	data: () => ({
		metricTimeMap: {}
	}),
	props: ["datasets", "targetDataset"],
	mounted() {
		this.sortedDatasets = this.sortDatasetsByAttr(
			this.$store.selectedDatasets,
			"Inclusive"
		);
	},
	methods: {
		formatRuntimeWithoutUnits(val) {
			let format = d3.format(".2");
			let ret = format(val);
			return ret;
		},

		sortDatasetsByAttr(datasets, attr) {
			let ret = datasets.sort((a, b) => {
				let x = 0,
					y = 0;
				if (attr == "Inclusive") {
					x = this.$store.maxIncTime[a];
					y = this.$store.maxIncTime[b];
					this.metricTimeMap = this.$store.maxIncTime;
				} else if (attr == "Exclusive") {
					x = this.$store.maxExcTime[a];
					y = this.$store.maxExcTime[b];
					this.metricTimeMap = this.$store.maxExcTime;
				}
				return parseFloat(x) - parseFloat(y);
			});
			return ret;
		},
        
		updateTargetDataset() {
			this.$store.selectedTargetDataset = this.selectedTargetDataset;
			this.$store.compareDataset = "";
			this.$store.encoding = "MEAN_GRADIENTS";
			console.info("[Update] Target Dataset: ", this.selectedTargetDataset);
			this.clearLocal();
			this.init();
		},
	}
};
</script>