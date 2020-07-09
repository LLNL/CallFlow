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
	name: "Outliers",
	template: "<g class=\"outlier\"></g>",
	data: () => ({
		paddingTop: 10,
		textOffset: 40,
		fontSize: 10,
		outlierRadius: 4,
		informationHeight: 70
	}),

	created() {
		this.id = "outliers-" + this.callsiteID;
	},

	methods: {
		init(q, targetq, ensembleWhiskerIndices, targetWhiskerIndices, d, targetd, xScale, callsite, showTarget) {
			this.q = q;
			this.targetq = targetq;
			this.ensembleWhiskerIndices = ensembleWhiskerIndices;
			this.targetWhiskerIndices = targetWhiskerIndices;
			this.d = d;
			this.targetd = targetd;
			this.xScale = xScale;
			this.callsite = callsite;

			// Get the SVG belonging to this callsite.
			this.svg = d3.select("#boxplot-" + callsite.id);
			this.g = this.svg
				.select(".outlier")
				.attrs({
					"transform": "translate(0, " + this.paddingTop + ")"
				});


			this.height = this.$parent.containerHeight;
			this.width = this.$parent.containerWidth;

			this.boxHeight = this.height - this.paddingTop - this.informationHeight;
			this.boxWidth = this.width;

			this.targetOutliers();
			this.$parent.$refs.ToolTip.init("boxplot-" + callsite.id);
		},

		groupByBand(data, band) {
			let ret = [];
			let temp_x = 0;
			let j = 0;
			let count = 0;
			let max_count = 0;
			let values, x, datasets, ranks;
			for (let i = 0; i < data.length; i += 1) {
				let d = data[i];

				// Assign the temp value for the case i == 0
				if (i == 0) {
					temp_x = d.x;
					values = [];
					x = [];
					datasets = [];
					ranks = [];
				}

				let diff = Math.abs(d.x - temp_x);
				// Check if it intersects within the bandLimit
				if (diff <= band) {
					x.push(d.x);
					values.push(d.value);
					datasets.push(d.dataset);
					ranks.push(d.rank);

					count += 1;
				}

				// If it falls beyond the bandlimit, we push the result in group and start a new group
				else if (diff > band) {
					ret.push({
						values: values,
						x: x,
						count: count,
						ranks: ranks,
						datasets: datasets
					});
					if (count > max_count) {
						max_count = count;
					}
					values = [];
					x = [];
					datasets = [];
					ranks = [];

					values.push(d.value);
					x.push(d.x);
					datasets.push(d.dataset);
					ranks.push(d.rank);

					count = 1;
					temp_x = d.x;
				}

				// For data.length - 1 case, we need to create a new group if needed. 
				if (i == data.length - 1) {
					if (diff > band) {
						ret.push({
							values: values,
							x: x,
							datasets: datasets,
							ranks: ranks,
							count: count
						});
					}
					else if (diff > band) {
						values = [];
						x = [];
						datasets = [];
						ranks = [];

						values.push(d.value);
						x.push(d.x);
						ranks.push(d.rank);
						datasets.push(d.dataset);
						count = 1;
						ret.push({
							values: values,
							x: x,
							datasets: datasets,
							ranks: ranks,
							count: count
						});
					}
				}

			}
			return {
				circles: ret,
				max_count: max_count
			};
		},

		groupOutliers(data, radius, datatype) {
			const radius2 = radius ** 2;

			const circles = data.map(d => {
				let x = this.xScale(d.value);
				return {
					x: x,
					value: d.value,
					rank: d.rank,
					dataset: d.dataset
				};
			})
				.sort((a, b) => a.x - b.x);

			const epsilon = 1e-3;
			let head = null, tail = null;

			// Returns true if circle ⟨x,y⟩ intersects with any circle in the queue.
			function intersects(x, y) {
				let a = head;
				while (a) {
					if (radius2 - epsilon > (a.x - x) ** 2 + (a.y - y) ** 2) {
						return true;
					}
					a = a.next;
				}
				return false;
			}

			// Place each circle sequentially.
			for (const b of circles) {

				// Remove circles from the queue that can’t intersect the new circle b.
				while (head && head.x < b.x - radius2) { head = head.next; }

				// Choose the minimum non-intersecting tangent.
				if (intersects(b.x, b.y = 0)) {
					let a = head;
					b.y = Infinity;
					do {
						let y = a.y + Math.sqrt(radius2 - (a.x - b.x) ** 2);
						if (y < b.y && !intersects(b.x, y)) {
							b.y = y;
						}
						a = a.next;
					} while (a);
				}

				// Add b to the queue.
				b.next = null;
				if (head === null) { head = tail = b; }
				else { tail = tail.next = b; }
			}

			let temp = this.groupByBand(circles, this.$store.bandWidth);
			if (datatype == "ensemble") {
				this.max_count = temp["max_count"];
			}
			let group_circles = temp["circles"];

			return group_circles;
		},

		cleanUpEmptyOutliers(data) {
			let ret = [];
			for (let i = 0; i < data.length; i += 1) {
				if (data[i].count != 0) {
					ret.push(data[i]);
				}
			}
			return ret;
		},

		targetOutliers() {
			let self = this;

			let callsite_data = this.$store.callsites[this.$store.selectedTargetDataset][this.callsite.name];
			let data = [];
			if (callsite_data != undefined) {
				data = callsite_data[this.$store.selectedMetric]["outliers"];

				let targetOutlierList = [];
				for (let idx = 0; idx < data["values"].length; idx += 1) {
					if (data["values"][idx] != 0) {
						targetOutlierList.push({
							"value": data["values"][idx],
							"dataset": data["datasets"][idx],
							"rank": data["ranks"][idx]
						});
					}
				}
				this.target_outliers = this.groupOutliers(targetOutlierList, this.$store.bandWidth, "target");
				this.outlier = this.g
					.selectAll(".target-outlier")
					.data(this.target_outliers)
					.join("circle")
					.attrs({
						"r": d => {
							if (this.max_count == 0) {
								return 0;
							}
							else {
								return (d.count / this.max_count) + 4;
							}
						},
						"cx": d => d.x[0],
						"cy": d => this.boxHeight / 2 - this.informationHeight / 4,
						"class": "target-outlier"
					})
					.style("opacity", 1)
					.style("fill", this.$store.runtimeColor.intermediate)
					.on("click", (d) => {
						// self.$parent.$parent.selectedOutlierRanks[self.callsite.name] = d['ranks'].sort((a, b) => a - b)
						// self.$parent.$parent.selectedOutlierDatasets[self.callsite.name] = d['datasets'].filter((value, index, self) => {
						//     return self.indexOf(value) === index;
						// })
						self.$parent.$parent.selectedOutlierRanks = d["ranks"].sort((a, b) => a - b);
						self.$parent.$parent.selectedOutlierDatasets = d["datasets"].filter((value, index, self) => {
							return self.indexOf(value) === index;
						});
					})
					.on("mouseover", (d) => {
						self.$parent.$refs.ToolTip.renderOutliers(d);
					})
					.on("mouseout", (d) => {
						self.$parent.$refs.ToolTip.clear();
					});
			}
			else {
				this.target_outliers = [];
			}
		},

		clear() {
			this.g.selectAll(".ensemble-outlier").remove();
			this.g.selectAll(".target-outlier").remove();
		}
	}
};