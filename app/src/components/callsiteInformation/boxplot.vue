/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
	<svg :id="id" :width="containerWidth" :height="containerHeight" class='boxplot'>
		<Box ref="Box" :nid="nid" :tq="q" :xScale="xScale" v-if="dataReady"
		:tColor="color" :idPrefix="idPrefix" />
		<Markers ref="Markers" :nid="nid" :tq="q" :xScale="xScale"
		v-if="dataReady" :tColor="color" :idPrefix="idPrefix"/>
		<Outliers ref="Outliers" :nid="nid" :tOutliers="outliers"
		:xScale="xScale" v-if="dataReady" :tColor="color" :idPrefix="idPrefix"/>
		<ToolTip ref="ToolTip" />
	</svg>
</template>

<script>
// Library imports
import * as d3 from "d3";
import { mapGetters } from "vuex";

// Local library imports
import EventHandler from "lib/routing/EventHandler";

// Local component imports
import Box from "../boxplot/box";
import Markers from "../boxplot/markers";
import Outliers from "../boxplot/outlier";
import ToolTip from "../boxplot/tooltip";

export default {
	name: "BoxPlot",
	props: [
		"data",
		"showTarget"
	],
	data: () => ({
		id: "ci-boxplot",
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
		boxWidth: 0,
		dataReady: false,
		idPrefix: "boxplot-",
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
		EventHandler.$emit("clear-boxplot", function () {
			self.clear();
		});
	},

	watch: {
		data: {
			immediate: true,
			deep: true,
			handler(newValue, oldValue) {
				if (this.dataReady) {
					this.clear();
				}
				else {
					this.init();
				}
			}
		}
	},

	computed: {
		...mapGetters({
			generalColors: "getGeneralColors",
		})
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

			this.q = this.qFormat(this.data["q"]);
			this.outliers = this.data["outliers"];
			this.nid = this.data["nid"];
			this.id = this.idPrefix + this.nid; // Set the id for the boxplot view.
			this.color = this.generalColors.intermediate;

			this.svg = d3.select(this.id)
				.attrs({
					"class": "boxplot",
					"width": this.containerWidth,
					"height": this.containerHeight
				});

			this.xScale = d3.scaleLinear()
				.domain([this.q.min, this.q.max])
				.range([0.05 * this.containerWidth, this.containerWidth - 0.05 * this.containerWidth]);

			this.dataReady = true;
		},

		/**
		 * Clear the components.
		 */
		clear() {
			this.dataReady = false;
			// this.$refs.Box.clear();
			// this.$refs.Markers.clear();
			// this.$refs.Outliers.clear();
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