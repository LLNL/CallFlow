/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import * as d3 from "d3";
import "d3-selection-multi";
import * as utils from "../components/utils";


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

	},

	methods: {
		init(color) {
			this.color = color;
			this.colorMin = color.getScale().domain()[0];
			this.colorMax = color.getScale().domain()[1];

			this.containerWidth = this.$store.viewWidth / 2;
			this.containerHeight = this.$store.viewHeight - this.$parent.margin.top - this.$parent.margin.bottom;

			this.svg = d3.select("#" + this.$parent.id)
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
			if (this.$store.showTarget && !this.$store.comparisonMode && this.$store.selectedMode == "Ensemble" && this.$store.selectedFormat == "SuperGraph") {
				this.drawLegend("Target run", this.containerWidth - this.padding.right, this.containerHeight - 4 * this.padding.bottom, this.$store.distributionColor.target);
			}
			if (this.$store.selectedMode == "Ensemble" && this.$store.selectedFormat == "SuperGraph") {
				this.drawLegend("Ensemble of runs", this.containerWidth - this.padding.right, this.containerHeight - 3 * this.padding.bottom, this.$store.distributionColor.ensemble);
			}
		},

		_color_map() {
			this.clearColorMap();
			let text = "";
			let yOffsetCount = 1;

			if (this.color.type == "Exclusive") {
				text = "Exc. Runtime colormap";
			}
			else if (this.color.type == "Inclusive") {
				text = "Inc. Runtime colormap";
			}
			else if (this.color.type == "MeanGradients") {
				text = "Distribution colormap";
				yOffsetCount = 2;
			}
			else if (this.color.type == "MeanDiff") {
				text = "Mean Difference colormap";
				yOffsetCount = 2;
			}
			else if (this.color.type == "RankDiff") {
				text = "Rank Difference colormap";
				yOffsetCount = 2;
			}
			this.drawColorMap(text, this.containerWidth - this.padding.right, this.containerHeight - this.padding.bottom * yOffsetCount);
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
			let splits = this.$store.selectedColorPoint;
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
				.text(utils.formatRuntimeWithUnits(this.colorMin));

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
				.text(utils.formatRuntimeWithUnits(this.colorMax));
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