/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
	<g class="marker"></g>	
</template>

<script>
import * as d3 from "d3";
import * as utils from "../utils";

export default {
	name: "Markers",
	data: () => ({
		paddingTop: 10,
		textOffset: 40,
		fontSize: 10,
		topPosition: -0.2,
		bottomPosition: 0.7
	}),

	methods: {
		/**
		 * Init function, sets up the svg for rendering.
		 * @param {*} callsite 
		 * @param {*} q 
		 * @param {*} targetq 
		 * @param {*} xScale 
		 * @param {*} showTarget 
		 */
		init(callsite, q, targetq, xScale, showTarget) {
			this.$store.selectedMarker = "target";
			this.q = q;
			this.targetq = targetq;
			this.xScale = xScale;

			// Get the SVG belonging to this callsite.
			this.svg = d3.select("#boxplot-" + callsite.id);

			this.g = this.svg
				.select(".marker")
				.attrs({
					"transform": "translate(0, " + this.$parent.boxPosition + ")"
				});

			this.markery1 = this.$parent.centerLinePosition - this.$parent.rectHeight / 2;
			this.markery2 = this.$parent.centerLinePosition + this.$parent.rectHeight / 2;

			this.medianMarker();
			this.extremeMarkers();
			// this.qTexts()
		},

		/**
		 * Draws marker for the median value.
		 */
		medianMarker() {
			this.medianMarkery1 = this.$parent.centerLinePosition - this.$parent.rectHeight;
			this.medianMarkery2 = this.$parent.centerLinePosition + this.$parent.rectHeight;
			this.medianLine = this.g
				.append("line")
				.attrs({
					"class": "median",
					"y1": this.medianMarkery1,
					"x1": this.xScale(this.targetq.q2),
					"y2": this.medianMarkery2,
					"x2": this.xScale(this.targetq.q2),
					"stroke": "black"
				})
				.style("stroke-width", "2")
				.style("z-index", 10);
		},

		/**
		 * Draw markers for min and max, median for ensemble 
		 */
		extremeMarkers() {
			this.targetData = this.targetq;
			this.data = this.q;

			this.minMaxTargetMarker();
			// this.minText();
			// this.maxText();
			// this.medianText();
		},


		minMaxTargetMarker() {
			this.g.append("line")
				.attrs({
					"class": "whisker",
					"y1": this.markery1,
					"x1": this.xScale(this.targetData.min),
					"y2": this.markery2,
					"x2": this.xScale(this.targetData.min),
					"stroke": this.$store.runtimeColor.intermediate
				})
				.style("stroke-width", "1.5");

			this.g.append("line")
				.attrs({
					"class": "whisker",
					"y1": this.markery1,
					"x1": this.xScale(this.targetData.max),
					"y2": this.markery2,
					"x2": this.xScale(this.targetData.max),
					"stroke": this.$store.runtimeColor.intermediate
				})
				.style("stroke-width", "1.5");
		},

		/**
		 * Min text
		 */
		minText() {
			let min_target_val = this.targetData.min;
			this.g.append("text")
				.attrs({
					"class": "whiskerText body-1",
					"x": 0.5 * this.fontSize,
					"y": this.$parent.containerHeight * this.topPosition,
					"fill": d3.rgb(this.$store.runtimeColor.intermediate).darker(1)
				})
				.style("stroke-width", "1")
				.text("Min: " + utils.formatRuntimeWithoutUnits(min_target_val));


		},

		/**
		 * Max text.
		 */
		maxText() {
			let max_target_val = this.targetData.max;
			this.g.append("text")
				.attrs({
					"class": "whiskerText body-1",
					"x": this.$parent.containerWidth - 9 * this.fontSize,
					"y": this.$parent.containerHeight * this.topPosition,
					"fill": d3.rgb(this.$store.runtimeColor.intermediate).darker(1)
				})
				.style("stroke-width", "1")
				.text("Max:" + utils.formatRuntimeWithoutUnits(max_target_val));
		},

		/**
		 * Median text.
		 */
		medianText() {
			let median_target_val = this.targetData.q2;
			this.g.append("text")
				.attrs({
					"class": "whiskerText body-1",
					"x": this.$parent.containerWidth / 2 - 4.5 * this.fontSize,
					"y": this.$parent.containerHeight * this.topPosition,
					"fill": d3.rgb(this.$store.runtimeColor.intermediate).darker(1)
				})
				.style("stroke-width", "1")
				.text("Med.:" + utils.formatRuntimeWithoutUnits(median_target_val));
		},

		/**
		 * Fetch the results of quaritles (q1 and q3 specifically.)
		 */
		qTexts() {
			this.q1Text();
			this.q3Text();
		},

		/**
		 * Writes out the q1.
		 */
		q1Text() {
			this.g.append("text")
				.attrs({
					"class": "whiskerText",
					"x": this.$parent.containerWidth / 3,
					"y": (this.informationHeight) * this.topPosition,
					"fill": d3.rgb(this.fill).darker(1)
				})
				.style("stroke-width", "2")
				.text("q1: " + utils.formatRuntimeWithoutUnits(this.q.q1));
		},

		/**
		 * Writes out the q3.
		 */
		q3Text() {
			this.g.append("text")
				.attrs({
					"class": "whiskerText",
					"x": ((this.$parent.boxWidth / 3) * 2),
					"y": this.informationHeight * this.topPosition,
					"fill": d3.rgb(this.fill).darker(1)
				})
				.style("stroke-width", "1")
				.text("q3: " + utils.formatRuntimeWithoutUnits(this.q.q3));
		},

		/**
		 * Format the name by truncating. 
		 * TODO: move to utils.
		 * @param {*} name 
		 */
		formatName(name) {
			if (name.length < 20) {
				return name;
			}
			let ret = this.trunc(name, 20);
			return ret;
		},

		/**
		 * Clear the context.
		 */
		clear() {
			this.g.selectAll(".whiskerText").remove();
			this.g.selectAll(".whisker").remove();
			this.g.selectAll(".median").remove();
		}
	}
};
</script>