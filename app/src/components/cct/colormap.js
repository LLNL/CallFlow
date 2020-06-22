/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import * as d3 from "d3";
import "d3-selection-multi";
import * as utils from "../utils";

export default {
	template: '<g :id="id"></g>',
	name: "ColorMap",
	components: {},

	props: [],

	data: () => ({
		transitionDuration: 1000,
		width: 200,
		height: 20,
		colorScaleHeight: 30,
		colorMin: 0,
		colorMax: 0,
		padding: {
			bottom: 30,
			right: 250,
		},
		id: "single-colormap"
	}),

	watch: {

	},

	mounted() {
	},

	methods: {
		init() {
			this.colorMin = this.$store.selectedColorMin;
			this.colorMax = this.$store.selectedColorMax;
			this.innerHTMLText = [this.colorMin, this.colorMax];
			// this.$store.color.setColorScale(this.colorMin, this.colorMax, 'OrRd', 3)
			this.color = this.$store.color;
			this.colorMap = this.color.colorMap;
			this.colorPoints = this.color.colorPoints;

			this.parentID = this.$parent.id;
			this.containerWidth = this.$parent.width;
			this.containerHeight = this.$parent.height;

			this.scaleG = d3.select("#" + this.id);
			this.render();
		},

		render() {
			this.color = this.$store.color;
			if (this.color.option == "Module") {
				console.log("TODO");
			} else {
				let splits = this.$store.colorPoint;
				let color = this.color.getScale(this.color.option);

				for (let i = 0; i < splits; i += 1) {
					let splitColor = this.colorMin + ((i * this.colorMax) / (splits));
					this.scaleG.append("rect")
						.attrs({
							"width": this.width / splits,
							"height": this.height,
							"x": i * (this.width / splits),
							"class": "colormap-rect",
							"transform": `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - this.padding.bottom})`,
							"fill": color(splitColor)
						});
				}
			}

			this.drawText();
		},

		drawText() {
			// draw the element
			this.scaleG.append("text")
				.style("fill", "black")
				.style("font-size", "14px")
				.attrs({
					"dy": ".35em",
					"text-anchor": "middle",
					"class": "colormap-text",
					"transform": `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 2 * this.padding.bottom})`,
				})
				.text(utils.formatRuntimeWithUnits(this.colorMin));

			this.scaleG.append("text")
				.style("fill", "black")
				.style("font-size", "14px")
				.attrs({
					"dy": ".35em",
					"text-anchor": "middle",
					"class": "colormap-text",
					"transform": `translate(${this.containerWidth - this.padding.right + this.width}, ${this.containerHeight - 2 * this.padding.bottom})`,
				})
				.text(utils.formatRuntimeWithUnits(this.colorMax));

		},

		clear() {
			d3.selectAll(".colormap-text").remove();
			d3.selectAll(".colormap-rect").remove();
		},
	}
};