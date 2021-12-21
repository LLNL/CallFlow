/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
	<v-col>
		<v-row>
			<v-col cols="4">
				<InfoChip ref="InfoChip" :title="title" :summary="infoSummary" :info="info" />
			</v-col>
			<v-col cols="8">
				<ColorMap ref="ColorMap" />
			</v-col>
			<Loader :isDataReady="isDataReady" />
			<svg :id="id" :width="width" :height="height" :left="margin.left" :top="margin.top">
				<g id="container"></g>
				<ToolTip ref="ToolTip" />
			</svg>
		</v-row>
	</v-col>
</template>

<script>
import * as d3 from "d3";
import dagreD3 from "dagre-d3/dist/dagre-d3";
import { mapGetters } from "vuex";

import EventHandler from "lib/routing/EventHandler";

import InfoChip from "../general/infoChip";
import Loader from "../general/loader";
import ColorMap from "../general/colormap";
import ToolTip from "./tooltip";

import adjacencyMatrixLayout from './d3-adjacency-matrix-layout'

export default {
	name: "Matrix",
	components: {
		InfoChip,
		Loader,
		ColorMap, 
		ToolTip,
	},

	data: () => ({
		id: "matrix-overview",
		margin: {
			top: 20,
			right: 20,
			bottom: 20,
			left: 20,
		},
		width: 0,
		height: 0,
		zoom: null,
		title: "Matrix view",
		infoSummary: "",
		info: "",
		isDataReady: false,
	}),

	mounted() {
		let self = this;
		EventHandler.$on("reset-matrix", () => {
			console.log("[Matrix view] Resetting dataset to :", this.selectedTargetRun);
			self.clear();
			self.isDataReady = false;
			self.$store.dispatch("fetchMatrix", {
				dataset: this.selectedTargetRun
			});
		});
	},

	computed: {
		...mapGetters({ 
			selectedMetric: "getSelectedMetric", 
			data: "getMatrix",
		})
	},

	watch: {
		data: function () {
			this.visualize();
		}
	},

	methods: {
		init(run) {
			this.$store.dispatch("fetchMatrix", {
				dataset: run
			});
		},

		visualize() {
			this.isDataReady = true;
			this.width = this.$store.viewWidth - this.margin.right;
			this.height = this.$store.viewHeight - this.margin.bottom;

			this.svg = d3.select("#" + this.id);

			this.info = "Selected metric : " + this.selectedMetric;
			this.$refs.ColorMap.init(this.$store.runtimeColor);

			this.adjacencyMatrix = adjacencyMatrixLayout()
                .size([this.matrixWidth, this.matrixHeight])
                .useadj(true)
                .adj(this.matrix);
		},

		/**
		 * Clear method for the component.
		 */
		clear() {
			this.$refs.ColorMap.clear();
		},
	},
};
</script>

<style>
.cct-node {
  cursor: pointer;
}

.white-text {
  color: white !important;
  text-align: center;
  font-size: 12px;
}

.black-text {
  color: black !important;
  text-align: center;
  font-size: 12px;
}

.description {
  display: block;
}

.highLight > rect,
.highLight > circle {
  stroke: black;
  stroke-width: 2px;
}

.white-text > .description {
  color: rgb(200, 195, 195);
  font-size: 10px;
}

.black-text > .description {
  color: rgb(26, 26, 49);
  font-size: 10px;
}

.cct-edge {
  fill: gray;
}

.inputbox rect {
  fill: #FFFFFF;
  stroke: #348B6D; 
  stroke-width: 2px;
}

.inputbox rect.active {
  fill: #D9F0E3;
}

.inputbox text {
  font-family: 'Open Sans', sans-serif;
  font-size: 12px;
  letter-spacing: 3px;
  fill: #494949;
  pointer-events: none;
  text-anchor: start;
  -moz-user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
    
}

.inputbox text.value {  
  text-anchor: end;
}

</style>