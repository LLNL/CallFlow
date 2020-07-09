/*******************************************************************************
 * Copyright (c) 2020, Lawrence Livermore National Security, LLC.
 * Produced at the Lawrence Livermore National Laboratory.
 *
 * Written by Suraj Kesavan <spkesavan@ucdavis.edu>.
 *
 * LLNL-CODE-740862. All rights reserved.
 *
 * This file is part of CallFlow. For details, see:
 * https://github.com/LLNL/CallFlow
 * Please also read the LICENSE file for the MIT License notice.
 ******************************************************************************/
import * as d3 from "d3";

export default {
	template: "<g :id=\"id\"></g>",
	name: "MeanGradients",
	components: {},

	data: () => ({
		strokeWidth: 7,
		id: "rank-diff-gradients",
		renderZeroLine: {},
	}),

	methods: {
		init(nodes, containerG, data) {
			this.nodes = nodes;
			this.containerG = containerG;
			this.data = data;

			this.process();
			this.colorScale();
			this.gradients();
			this.visualize();
		},

		process() {
			this.renderZeroLine = {};

			this.rank_min = 0;
			this.rank_max = 0;
			this.mean_min = 0;
			this.mean_max = 0;
			this.mean_diff_min = 0;
			this.mean_diff_max = 0;

			for (let i = 0; i < this.data.length; i += 1) {
				if (this.$store.selectedMetric == "Inclusive") {
					this.rank_min = Math.min(this.rank_min, this.data[i]["hist"]["y_min"]);
					this.rank_max = Math.max(this.rank_max, this.data[i]["hist"]["y_max"]);
					this.mean_min = Math.min(this.mean_min, this.data[i]["hist"]["x_min"]);
					this.mean_max = Math.max(this.mean_max, this.data[i]["hist"]["x_max"]);
					this.mean_diff_min = Math.min(this.mean_diff_min, this.data[i]["mean_diff"]);
					this.mean_diff_max = Math.max(this.mean_diff_max, this.data[i]["mean_diff"]);
				}
				else if (this.$store.selectedMetric == "Exclusive") {
					this.rank_min = Math.min(this.rank_min, this.data[i]["hist"]["y_min"]);
					this.rank_max = Math.max(this.rank_max, this.data[i]["hist"]["y_max"]);
					this.mean_min = Math.min(this.mean_min, this.data[i]["hist"]["x_min"]);
					this.mean_max = Math.max(this.mean_max, this.data[i]["hist"]["x_max"]);
					this.mean_diff_min = Math.min(this.mean_diff_min, this.data[i]["mean_diff"]);
					this.mean_diff_max = Math.max(this.mean_diff_max, this.data[i]["mean_diff"]);
				}
			}
		},

		colorScale() {
			this.$store.rankDiffColor.setColorScale(this.rank_min, this.rank_max, this.$store.selectedDistributionColorMap, this.$store.selectedColorPoint);
			this.$parent.$parent.$refs.EnsembleColorMap.update("rankDiff", this.data);
		},

		gradients() {
			let method = "hist";
			for (let i = 0; i < this.data.length; i += 1) {
				let d = this.data[i];
				let defs = d3.select("#" + this.id)
					.append("defs");

				console.log(d);

				this.diffGradient = defs.append("linearGradient")
					.attrs({
						"id": "diff-gradient-" + this.$parent.nidNameMap[d.name],
						"class": "diff-gradient"
					});

				this.diffGradient
					.attrs({
						"x1": "0%",
						"y1": "0%",
						"x2": "0%",
						"y2": "100%"
					});

				let grid = d[method]["x"];
				let val = d[method]["y"];

				for (let i = 0; i < grid.length; i += 1) {
					let x = (i + i + 1) / (2 * grid.length);

					if (grid[i + 1] > 0) {
						let zero = (i + i + 3) / (2 * grid.length);
						this.zeroLine(d["name"], zero);
					}
					this.diffGradient.append("stop")
						.attrs({
							"offset": 100 * x + "%",
							"stop-color": this.$store.rankDiffColor.getColorByValue((val[i]))
						});
				}
			}
		},

		clearZeroLine() {
			d3.selectAll(".zeroLine").remove();
			d3.selectAll(".zeroLineText").remove();
		},

		zeroLine(node, y1) {
			if (this.renderZeroLine[node] == undefined) {
				d3.select("#ensemble-callsite-" + node.client_idx)
					.append("line")
					.attrs((d) => {
						return {
							"class": "zeroLine",
							"x1": 0,
							"y1": y1 * d.height,
							"x2": this.$parent.nodeWidth,
							"y2": y1 * d.height
						};
					})
					.style("opacity", (d) => {
						return 1;
					})
					.style("stroke", "#000")
					.style("stroke-width", (d) => {
						return 5;
					});

				d3.select("#ensemble-callsite-" + this.$parent.nidNameMap[node])
					.append("text")
					.attrs({
						"class": "zeroLineText",
						"dy": "0",
						"x": this.$parent.nodeWidth / 2 - 10,
						"y": (d) => y1 * d.height - 5
					})
					.style("opacity", 1)
					.style("font-size", "20px")
					.text((d) => {
						return 0;
					});
				this.renderZeroLine[node] = true;
			}
		},

		visualize() {
			let rectangles = this.containerG.selectAll("rect")
				.data(this.nodes);

			// Transition
			rectangles
				.transition()
				.duration(this.$store.transitionDuration)
				.attrs({
					"opacity": d => {
						if (d.type == "intermediate") {
							return 0.0;
						}
						else {
							return 1.0;
						}
					},
				})
				.style("stroke", (d) => {
					let runtimeColor = "";
					if (d.type == "intermediate") {
						runtimeColor = this.$store.color.ensemble;
					}
					else if (d.type == "component-node") {
						if (this.$store.callsites[this.$store.selectedTargetDataset][d.id] != undefined) {
							runtimeColor = d3.rgb(this.$store.color.getColor(d));
						}
						else {
							runtimeColor = this.$store.color.ensemble;
						}
					}
					else if (d.type == "super-node") {
						if (this.$store.modules[this.$store.selectedTargetDataset][d.id] != undefined) {
							runtimeColor = d3.rgb(this.$store.color.getColor(d));
						}
						else {
							runtimeColor = this.$store.color.ensemble;
						}
					}
					return runtimeColor;
				})
				.style("stroke-width", (d) => {
					if (d.type == "intermediate") {
						return 1;
					}
					else {
						return this.stroke_width;
					}
				})
				.style("fill", (d, i) => {
					return "url(#diff-gradient-" + d.client_idx + ")";
				});
		},

		//Gradients
		clearGradients() {
			this.svg.selectAll(".diff-gradient").remove();
		},

		clear() {
		},
	}
};