/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
	<svg :id="id" :width="containerWidth" :height="containerHeight" class='boxplot'>
		<Box ref="Box" />
		<Markers ref="Markers" />
		<Outliers ref="Outliers" />
		<ToolTip ref="ToolTip" />
	</svg>
</template>

<script>
// Library imports
import * as d3 from "d3";

// Local library imports
import EventHandler from "lib/routing/EventHandler";

// Local component imports
import Box from "./box";
import Markers from "./markers";
import Outliers from "./outlier";
import ToolTip from "./tooltip";

export default {
	name: "BoxPlot",
	props: [
		"callsite",
		"width",
		"height",
		"showTarget"
	],
	data: () => ({
		id: "",
		boxContainerID: "",
		markerContainerID: "",
		outlierContainerID: "",
		padding: {
			top: 10,
			bottom: 10,
			left: 10,
			right: 10,
		},
		targetBoxWidth: 0,
		targetBoxHeight: 0,
		targetBoxFill: "",
		targetBoxX: 0,
		targetBoxY: 0,
		containerHeight: 150,
		containerWidth: 0,
		parentID: "",
		informationHeight: 80,
		outlierHeight: 20,
		rectHeight: 0,
		centerLinePosition: 0,
		boxHeight: 0,
		boxWidth: 0
	}),
	components: {
		Box,
		Outliers,
		Markers,
		ToolTip
	},

	mounted() {
		this.init();
		let self = this;

		EventHandler.$on("single-refresh-boxplot", (data) => {
			self.clear();
			self.init();
		});
	},

	created() {
		this.id = "boxplot-" + this.callsite.id;
	},

	methods: {
		/**
		 * Init function, Sets up the width, height and etc.
		 */
		init() {
			this.containerHeight = 150;
			this.containerWidth = this.$parent.boxplotWidth - 2 * this.padding.right - 1 * this.padding.left;
			this.boxHeight = this.containerHeight - this.informationHeight;
			this.boxWidth = this.containerWidth;

			this.boxPosition = this.informationHeight / 2 + this.outlierHeight / 2;
			this.centerLinePosition = (this.boxHeight - this.informationHeight / 4) / 2;
			this.rectHeight = this.boxHeight - this.informationHeight / 4 - this.outlierHeight / 4;

			this.process(this.callsite);

			this.svg = d3.select("#boxplot-" + this.callsite.id)
				.attrs({
					"class": "boxplot",
					"width": this.containerWidth,
					"height": this.containerHeight
				});

			this.xScale = d3.scaleLinear()
				.domain([this.targetq.min, this.targetq.max])
				.range([0.05 * this.containerWidth, this.containerWidth - 0.05 * this.containerWidth]);

			this.visualize(this.callsite);
		},

		/**
		 * Visualize the boxplot for the callsites.
		 * @param {*} callsite 
		 */
		visualize(callsite) {
			this.$refs.Box.init(callsite, this.q, this.targetq, this.xScale, this.showTarget);
			this.$refs.Markers.init(callsite, this.q, this.targetq, this.xScale, this.showTarget);
			this.$refs.Outliers.init(this.q, this.targetq, this.ensembleWhiskerIndices, this.targetWhiskerIndices, this.d, this.targetd, this.xScale, this.callsite, this.showTarget);
		},

		/**
		 * Clear the components.
		 */
		clear() {
			this.$refs.Box.clear();
			this.$refs.Markers.clear();
			this.$refs.Outliers.clear();
		},

		/**
		 * 
		 * @param {*} callsite 
		 */
		process(callsite) {
			if (this.$store.callsites[this.$store.selectedTargetDataset][callsite.name] != undefined) {
				this.target_data = callsite[this.$store.selectedMetric]["boxplots"]["q"];
			}
			else {
				this.target_data = [0, 0, 0, 0, 0];
			}
			this.targetq = this.qFormat(this.target_data);
		},

		/**
		 * 
		 * @param {*} arr 
		 */
		qFormat(arr) {
			let result = {
				"min": arr[0],
				"q1": arr[1],
				"q2": arr[2],
				"q3": arr[3],
				"max": arr[4]
			};
			return result;
		},
	}
};
</script>