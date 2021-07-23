/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
	<svg :id="id" :width="containerWidth" :height="containerHeight">
		<Box ref="Box" :nid="nid" :tq="tq" :bq="bq" :xScale="xScale"
		v-if="dataReady" :idPrefix="idPrefix" :tColor="tColor" :bColor="bColor" />
		<Markers ref="Markers" :nid="nid" :tq="tq" :bq="bq" :xScale="xScale"
		v-if="dataReady" :idPrefix="idPrefix" tColor="tColor" :bColor="bColor" />
		<Outliers ref="Outliers" :nid="nid" :tOutliers="tOutliers" :bOutliers="bOutliers"
		:xScale="xScale" v-if="dataReady" :idPrefix="idPrefix" tColor="tColor" :bColor="bColor" />
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
		"tData",
		"bData",
		"width",
		"height",
		"showTarget"
	],
	data: () => ({
		id: "cc-boxplot",
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
		informationHeight: 70,
		outlierHeight: 20,
		rectHeight: 0,
		centerLinePosition: 0,
		boxHeight: 0,
		boxWidth: 0,
		dataReady: false,
		idPrefix: "ensemble-boxplot-",
	}),
	
	computed: {
		...mapGetters({
			generalColors: "getGeneralColors",
			targetColor: "getTargetColor"
		})
	},
	components: {
		Box,
		Outliers,
		Markers,
		ToolTip
	},

	mounted() {
		this.init();
		let self = this;
		EventHandler.$on("ensemble-refresh-boxplot", (data) => {
			self.clear();
			self.init();
		});
	},

	methods: {
		init() {
			this.containerHeight = 150;
			this.containerWidth = this.$parent.boxplotWidth - 2 * this.padding.right - 1 * this.padding.left;
			this.boxHeight = this.containerHeight - this.informationHeight;
			this.boxWidth = this.containerWidth;

			this.boxPosition = this.informationHeight / 2 + this.outlierHeight / 2;
			this.centerLinePosition = (this.boxHeight - this.informationHeight / 4) / 2;
			this.rectHeight = this.boxHeight - this.informationHeight / 4 - this.outlierHeight / 4;

			this.bq = this.qFormat(this.bData.q);
			this.tq = this.qFormat(this.tData.q);

			this.tOutliers = this.tData["outliers"];
			this.bOutliers = this.bData["outliers"];

			this.tColor = this.targetColor;
			this.bColor = this.generalColors.ensemble;

			this.nid = this.tData["nid"];
			this.id = this.idPrefix + this.nid;

			this.svg = d3.select("#" + this.idPrefix + this.bData.nid)
				.attrs({
					"width": this.containerWidth,
					"height": this.containerHeight
				});

			let min_x = Math.min(this.bq.min, this.tq.min);
			let max_x = Math.max(this.bq.max, this.tq.max);

			this.xScale = d3.scaleLinear()
				.domain([min_x, max_x])
				.range([0.05 * this.containerWidth, this.containerWidth - 0.05 * this.containerWidth]);

			this.dataReady = true;
			// this.visualize();
		},

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

		// visualize() {
		// 	this.$refs.Box.init(this.tData.nid, this.bq, this.tq, this.xScale, this.showTarget);
		// 	this.$refs.Markers.init(this.tData.nid, this.q, this.tq, this.xScale, this.showTarget);
		// 	this.$refs.Outliers.init(this.bq, this.tq, this.ensembleWhiskerIndices, this.targetWhiskerIndices, this.d, this.targetd, this.xScale, this.callsite, this.showTarget);
		// },

		clear() {
			this.$refs.Box.clear();
			this.$refs.Markers.clear();
			this.$refs.Outliers.clear();
		}
	}
};
</script>