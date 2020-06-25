/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import * as d3 from "d3";
import "d3-selection-multi";
import * as utils from "../utils";
import EventHandler from "../EventHandler";
import { render } from "dagre-d3";
import { color } from "dagre-d3/dist/dagre-d3";

export default {
	template: "<g :id=\"id\"></g>",
	name: "EnsembleColorMap",
	components: {},

	props: [],

	data: () => ({
		transitionDuration: 1000,
		width: 230,
		height: 20,
		colorMin: 0,
		colorMax: 0,
		offset: 30,
		padding: {
			bottom: 30,
			right: 400,
		},
		id: "ensemble-colormap"
	}),

	mounted() {
		EventHandler.$on("show_target_auxiliary", (data) => {
			this.init();
		});
	},

	methods: {
		init(colorScale) {
			this.colorScale = colorScale
			this.colorMin = colorScale.colorMin;
			this.colorMax = colorScale.colorMax;

			this.containerWidth = this.$store.viewWidth / 2;
			this.containerHeight = this.$store.viewHeight - this.$parent.margin.top - this.$parent.margin.bottom;

			this.svg = d3.select("#" + this.$parent.id)
				.append("g")
				.attrs({
					"id": "dist-colormap",
				});
			this.render()
		},

		render() {
			this._legends()
			this._color_map()
		},

		_legends() {
			this.clearTargetLegends();
			if (this.$store.showTarget == true) {
				this.drawLegend("Target run", this.containerWidth - this.padding.right, this.containerHeight - 4 * this.padding.bottom, this.$store.distributionColor.target)
			}
			if (this.$store.selectedMode == 'Ensemble') {
				this.clearEnsembleLegends();
				this.drawLegend("Ensemble of runs", this.containerWidth - this.padding.right, this.containerHeight - 3 * this.padding.bottom, this.$store.distributionColor.ensemble)
			}
		},

		_color_map() {
			this.clearColorMap();
			let text = ""
			let offsetCount = 1

			if (this.colorScale.type == "Exclusive") {
				text = "Exc. Runtime colormap";
			}
			else if (this.colorScale.type == "Inclusive") {
				text = "Inc. Runtime colormap";
			}
			else if (this.colorScale.type == "MeanGradients") {
				text = "Distribution colormap";
				offsetCount = 2
			}
			else if (this.colorScale.type == "MeanDiff") {
				text = "Mean Difference colormap";
				offsetCount = 2
			}
			else if (this.colorScale.type == "RankDiff") {
				text = "Rank Difference colormap";
				offsetCount = 2
			}
			this.drawColorMap(text, this.containerWidth - this.padding.right, this.containerHeight - this.padding.bottom * offsetCount);
		},

		drawLegend(text, x, y, color) {
			this.svg.append("circle")
				.attrs({
					"r": 10,
					"cx": 10,
					"cy": 10,
					"class": "ensemble-circle-legend",
					"transform": `translate(${x}, ${y})`,
					"fill": color
				});

			this.svg.append("text")
				.attrs({
					"x": 30,
					"y": 15,
					"class": "ensemble-circle-legend-text",
					"transform": `translate(${x}, ${y})`,
				})
				.text(text)
				.style("font-size", 14)
				.style("fill", "#444444");
		},

		drawColorMap(text, x, y) {
			let splits = this.$store.selectedColorPoint;
			for (let i = 0; i < splits; i += 1) {
				let splitColor = this.colorMin + ((i * this.colorMax) / (splits));
				this.svg.append("rect")
					.attrs({
						"width": this.width / splits,
						"height": this.height,
						"x": i * (this.width / splits),
						"class": "dist-colormap-rect-metric",
						"transform": `translate(${x}, ${y})`,
						"fill": this.colorScale.getColorByValue(splitColor)
					});
			}

			this.svg.append("text")
				.style("fill", "black")
				.style("font-size", "14px")
				.attrs({
					"dy": ".35em",
					"y": 10,
					"x": -125,
					"text-anchor": "middle",
					"class": "dist-colormap-text-metric",
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
					"class": "dist-colormap-text-metric",
					"transform": `translate(${x}, ${y})`,
				})
				.text(utils.formatRuntimeWithUnits(this.colorMin));

			this.svg.append("text")
				.style("fill", "black")
				.style("font-size", "14px")
				.attrs({
					"dy": ".35em",
					"text-anchor": "middle",
					"y": 10,
					"x": 40,
					"class": "dist-colormap-text-metric",
					"transform": `translate(${x + this.width}, ${y})`,
				})
				.text(utils.formatRuntimeWithUnits(this.colorMax));
		},

		clearColorMap() {
			d3.selectAll(".dist-colormap").remove();
		},

		clear() {
			d3.selectAll(".dist-colormap-text").remove();
			d3.selectAll(".dist-colormap-rect").remove();
		},

		clearMetric() {
			d3.selectAll(".dist-colormap-text-metric").remove();
			d3.selectAll(".dist-colormap-rect-metric").remove();
		},

		clearTargetLegends() {
			d3.selectAll(".target-circle-legend").remove();
			d3.selectAll(".target-circle-legend-text").remove();
		},

		clearEnsembleLegends() {
			d3.selectAll(".ensemble-circle-legend").remove();
			d3.selectAll(".ensemble-circle-legend-text").remove();
		},

		update(mode, min, max) {
			this.clear();
			this.colorMin = min;
			this.colorMax = max;
			if (mode == "mean-difference" || mode == "rank-difference") {
				this.colorMin = -1 * Math.max(Math.abs(min), Math.abs(max));
				this.colorMax = 1 * Math.max(Math.abs(min), Math.abs(max));
			}
			this.render()
		}
	}
};