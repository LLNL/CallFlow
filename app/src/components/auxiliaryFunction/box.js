/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import tpl from "../../html/auxiliaryFunction/quartileBox.html";
import * as d3 from "d3";

export default {
	name: "Box",
	template: tpl,

	data: () => ({
		id: "box",
		paddingTop: 10,
		textOffset: 40,
		fontSize: 10,
		debug: false
	}),

	methods: {
		init(callsite, q, targetq, xScale, showTarget) {
			if (this.debug) {
				console.log("Ensemble q: ", q);
				console.log("Target q: ", targetq);
			}
			this.q = q;
			this.targetq = targetq;
			this.xScale = xScale;

			// Get the SVG belonging to this callsite.
			this.svg = d3.select("#boxplot-" + callsite.id);
			this.id = "box-" + callsite.id;

			this.g = this.svg
				.select(".box")
				.attrs({
					"transform": "translate(0, " + this.$parent.boxPosition + ")"
				});

			this.ensembleBox();
			if (this.$store.showTarget && showTarget) {
				this.targetBox();
			}
			this.centerLine();
			this.$parent.$refs.ToolTip.init("boxplot-" + callsite.id);
		},

		ensembleBox() {
			let self = this;
			this.boxSVG = this.g
				.append("rect")
				.attrs({
					"class": "ensembleBox",
					"y": 0,
					"x": this.xScale(this.q.q1),
					"height": this.$parent.rectHeight,
					"fill": this.$store.color.ensemble,
					"width": this.xScale(this.q.q3) - this.xScale(this.q.q1),
					"stroke": "#202020",
					"stroke-width": 0.5
				})
				.style("z-index", 1)
				.on("mouseover", (d) => {
					self.$parent.$refs.ToolTip.renderQ(self.q);
				})
				.on("mouseout", (d) => {
					self.$parent.$refs.ToolTip.clear();
				});
		},

		targetBox() {
			let self = this;
			this.targetBoxSVG = this.g
				.append("rect")
				.attr("class", "targetbox")
				.attrs({
					"y": 0,
					"x": this.xScale(this.targetq.q1),
					"height": this.$parent.rectHeight,
					"fill": this.$store.color.target,
					"width": (d) => {
						if (self.targetq.q1 == self.targetq.q3) {
							return 3;
						}
						return self.xScale(self.targetq.q3) - self.xScale(self.targetq.q1);
					},
					"stroke": "#202020",
					"stroke-width": 0.5
				})
				.style("z-index", 1)
				.on("mouseover", (d) => {
					self.$parent.$refs.ToolTip.renderQ(self.targetq);
				})
				.on("mouseout", (d) => {
					self.$parent.$refs.ToolTip.clear();
				});
		},

		centerLine() {
			let self = this;
			this.centerLineSVG = this.g
				.insert("line", "rect")
				.attrs({
					"class": "centerLine",
					"y1": this.$parent.centerLinePosition,
					"x1": this.xScale(this.q.min),
					"y2": this.$parent.centerLinePosition,
					"x2": this.xScale(this.q.max),
					"stroke": "black"
				})
				.style("stroke-width", "1.5")
				.style("z-index", 10);
		},

		clear() {
			this.g.selectAll(".ensembleBox").remove();
			if (this.$store.showTarget) {
				this.g.selectAll(".targetbox").remove();
			}
			this.g.selectAll(".centerLine").remove();
		}
	}
};