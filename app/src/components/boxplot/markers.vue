/** * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other *
CallFlow Project Developers. See the top-level LICENSE file for details. * *
SPDX-License-Identifier: MIT */
<template>
  <g class="marker"></g>
</template>

<script>
import * as d3 from "d3";
import * as utils from "lib/utils";
import { mapGetters } from "vuex";

export default {
	name: "Markers",
	data: () => ({
		paddingTop: 10,
		textOffset: 40,
		fontSize: 10,
		topPosition: -0.2,
		bottomPosition: 0.7,
		markerColor: "",
		textColor: "",
	}),

	props: ["tq", "bq", "xScale", "nid", "idPrefix"],

	computed: {
		...mapGetters({
			generalColors: "getGeneralColors",
		})
	},

	mounted() {
		// Get the SVG belonging to this callsite.
		this.svg = d3.select("#" + this.idPrefix + this.nid);

		this.g = this.svg.select(".marker").attrs({
			transform: "translate(0, " + this.$parent.boxPosition + ")",
		});

		this.markery1 = this.$parent.centerLinePosition - this.$parent.rectHeight / 2;
		this.markery2 = this.$parent.centerLinePosition + this.$parent.rectHeight / 2;
		this.markerColor = this.generalColors.darkGrey;
		this.textColor = this.generalColors.text;

		this.medianMarker(this.tq);
		this.extremeMarkers(this.tq);

		if (this.bq) {
			this.medianMarker(this.bq);
			this.extremeMarkers(this.bq);
		}

		// this.qTexts()
	},

	methods: {
		/**
		 * Draws marker for the median value.
		 */
		medianMarker(q) {
			const medianMarkery1 = this.$parent.centerLinePosition - this.$parent.rectHeight;
			const medianMarkery2 = this.$parent.centerLinePosition + this.$parent.rectHeight;
			this.medianLine = this.g
				.append("line")
				.attrs({
					class: "median",
					y1: medianMarkery1,
					x1: this.xScale(q.q2),
					y2: medianMarkery2,
					x2: this.xScale(q.q2),
					stroke: "black",
				})
				.style("stroke-width", "2")
				.style("z-index", 10);
		},

		/**
     * Draw markers for min and max, median for ensemble
     */
		extremeMarkers(q) {
			this.minMaxTargetMarker(q);
			// this.minText(q);
			// this.maxText(q);
			// this.medianText(q);
		},

		minMaxTargetMarker(q) {
			this.g
				.append("line")
				.attrs({
					class: "whisker",
					y1: this.markery1,
					x1: this.xScale(q.min),
					y2: this.markery2,
					x2: this.xScale(q.min),
					stroke: this.markerColor,
				})
				.style("stroke-width", "1.5");

			this.g
				.append("line")
				.attrs({
					class: "whisker",
					y1: this.markery1,
					x1: this.xScale(q.max),
					y2: this.markery2,
					x2: this.xScale(q.max),
					stroke: this.markerColor,
				})
				.style("stroke-width", "1.5");
		},

		/**
     * Min text
     */
		minText(q) {
			this.g
				.append("text")
				.attrs({
					class: "whiskerText body-1",
					x: 0.5 * this.fontSize,
					y: this.$parent.containerHeight * this.topPosition,
					fill: d3.rgb(this.markerColor).darker(1),
				})
				.style("stroke-width", "1")
				.text("Min: " + utils.formatRuntimeWithoutUnits(q.min));
		},

		/**
     * Max text.
     */
		maxText(q) {
			this.g
				.append("text")
				.attrs({
					class: "whiskerText body-1",
					x: this.$parent.containerWidth - 9 * this.fontSize,
					y: this.$parent.containerHeight * this.topPosition,
					fill: d3.rgb(this.markerColor).darker(1),
				})
				.style("stroke-width", "1")
				.text("Max:" + utils.formatRuntimeWithoutUnits(q.max));
		},

		/**
     * Median text.
     */
		medianText(q) {
			this.g
				.append("text")
				.attrs({
					class: "whiskerText body-1",
					x: this.$parent.containerWidth / 2 - 4.5 * this.fontSize,
					y: this.$parent.containerHeight * this.topPosition,
					fill: d3.rgb(this.markerColor).darker(1),
				})
				.style("stroke-width", "1")
				.text("Med.:" + utils.formatRuntimeWithoutUnits(q.q2));
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
		q1Text(q) {
			this.g
				.append("text")
				.attrs({
					class: "whiskerText",
					x: this.$parent.containerWidth / 3,
					y: this.informationHeight * this.topPosition,
					fill: d3.rgb(this.fill).darker(1),
				})
				.style("stroke-width", "2")
				.text("q1: " + utils.formatRuntimeWithoutUnits(q.q1));
		},

		/**
     * Writes out the q3.
     */
		q3Text(q) {
			this.g
				.append("text")
				.attrs({
					class: "whiskerText",
					x: (this.$parent.boxWidth / 3) * 2,
					y: this.informationHeight * this.topPosition,
					fill: d3.rgb(this.fill).darker(1),
				})
				.style("stroke-width", "1")
				.text("q3: " + utils.formatRuntimeWithoutUnits(q.q3));
		},

		/**
     * Clear the context.
     */
		clear() {
			this.g.selectAll(".whiskerText").remove();
			this.g.selectAll(".whisker").remove();
			this.g.selectAll(".median").remove();
		},
	},
};
</script>
