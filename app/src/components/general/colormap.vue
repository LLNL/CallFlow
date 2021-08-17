/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
	<svg :id="id" :width="containerWidth" :height="containerHeight" >
	</svg>
</template>

<script>
import * as d3 from "d3";
import "d3-selection-multi";
import { mapGetters } from "vuex";

import * as utils from "lib/utils";

export default {
	name: "ColorMap",
	components: {},
	data: () => ({
		id: "ensemble-supergraph-panel",
		transitionDuration: 1000,
		width: 230,
		containerWidth: 660,
		height: 20,
		containerHeight: 100,
		colorMin: 0,
		colorMax: 0,
		offset: 30,
		padding: {
			top: 0,
			bottom: 30,
			right: 0,
		},
	}),

	computed: {
		...mapGetters({
			showTarget: "getShowTarget",
			comparisonMode: "getComparisonMode",
			generalColors: "getGeneralColors",
			selectedColorPoint: "getColorPoint",
			selectedMetric: "getSelectedMetric"
		})
	},

	methods: {
		init(color) {
			this.color = color;
			this.colorMin = this.color.getDomain()[0];
			this.colorMax = this.color.getDomain()[1];

			this.svg = d3.select("#" + this.id)
				.append("g")
				.attrs({
					"id": "Colormap",
				});
			this.render();
		},

		render() {
			this._legends();
			this._color_map();
		},

		_legends() {
			this.clearLegends();
			if (this.selectedMode == "ESG") {
				if (this.showTarget && !this.comparisonMode) {
					this.drawLegend("Target run", this.padding.right, 4 * this.padding.bottom, this.generalColors.target);
				}
				this.drawLegend("Ensemble of runs", this.padding.right, 3 * this.padding.bottom, this.generalColors.intermediate);
			}
		},

		_color_map() {
			this.clearColorMap();
			let text = "";
			let yOffsetCount = 1;

			if (this.selectedMetric == "time") {
				text = "Exclusive runtime";
			}
			else if (this.selectedMetric == "time (inc)") {
				text = "Inclusive runtime";
			}
			
			if (this.color.metric == "MeanGradients") {
				text = "Distribution colormap";
				yOffsetCount = 2;
			}
			else if (this.color.metric == "MeanDiff") {
				text = "Mean Difference colormap";
				yOffsetCount = 2;
			}
			else if (this.color.metric == "RankDiff") {
				text = "Rank Difference colormap";
				yOffsetCount = 2;
			}

			if (this.color.metric !== "MeanGradients") {
				this.colorMinText = utils.formatRuntimeWithUnits(this.colorMin);
				this.colorMaxText = utils.formatRuntimeWithUnits(this.colorMax);
			}
			else {
				this.colorMinText = this.colorMin;
				this.colorMaxText = this.colorMax;
			}
			this.drawColorMap(text, this.containerWidth/2 - this.padding.right, this.padding.bottom * yOffsetCount);
		},

		drawLegend(text, x, y, color) {
			this.svg.append("circle")
				.attrs({
					"r": 10,
					"cx": 10,
					"cy": 10,
					"class": "legend",
					"transform": `translate(${x}, ${y})`,
					"fill": color
				});

			this.svg.append("text")
				.attrs({
					"x": 30,
					"y": 15,
					"class": "legend-text",
					"transform": `translate(${x}, ${y})`,
				})
				.text(text)
				.style("font-size", 14)
				.style("fill", "#444444");
		},

		drawColorMap(text, x, y) {
			let splits = this.selectedColorPoint;
			let dcolor = (this.colorMax - this.colorMin) / (splits - 1);
			for (let i = 0; i < splits; i += 1) {
				let splitColor = this.colorMin + dcolor * (splits - 1 - i);
				this.svg.append("rect")
					.attrs({
						"width": this.width / splits,
						"height": this.height,
						"x": (splits - i - 1) * (this.width / splits),
						"class": "colormap",
						"transform": `translate(${x}, ${y})`,
						"fill": this.color.getColorByValue(splitColor)
					});
			}

			this.svg.append("text")
				.style("fill", "black")
				.style("font-size", "14px")
				.attrs({
					"dy": ".35em",
					"y": 10,
					"x": -165,
					"text-anchor": "middle",
					"class": "colormap-text",
					"transform": `translate(${x}, ${y})`,
				})
				.text(text);

			// draw the element
			this.svg.append("text")
				.style("fill", "black")
				.style("font-size", "14px")
				.attrs({
					"dy": ".35em",
					"text-anchor": "middle",
					"y": 10,
					"x": -40,
					"class": "colormap-text",
					"transform": `translate(${x}, ${y})`,
				})
				.text(this.colorMinText);

			this.svg.append("text")
				.style("fill", "black")
				.style("font-size", "14px")
				.attrs({
					"dy": ".35em",
					"text-anchor": "middle",
					"y": 10,
					"x": 40,
					"class": "colormap-text",
					"transform": `translate(${x + this.width}, ${y})`,
				})
				.text(this.colorMaxText);
		},

		clearColorMap() {
			d3.selectAll("#colormap").remove();
		},

		clear() {
			d3.selectAll(".colormap-text").remove();
			d3.selectAll(".colormap").remove();
		},


		clearTargetLegends() {
			d3.selectAll(".target-circle-legend").remove();
			d3.selectAll(".target-circle-legend-text").remove();
		},

		clearLegends() {
			d3.selectAll(".legend").remove();
			d3.selectAll(".legend-text").remove();
		},

		update(mode, color, min, max) {
			this.clear();
			this.colorMin = min;
			this.colorMax = max;
			if (mode == "MeanDiff" || mode == "RankDiff") {
				this.colorMin = -1 * Math.max(Math.abs(min), Math.abs(max));
				this.colorMax = 1 * Math.max(Math.abs(min), Math.abs(max));
			}
			this.color = color;
			this.render();
		}
	}
};

</script>