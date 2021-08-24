/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
	<g class="outlier"></g>
</template>

<script>
import * as d3 from "d3";
import { mapGetters } from "vuex";

export default {
	name: "Outliers",
	data: () => ({
		paddingTop: 10,
		textOffset: 40,
		fontSize: 10,
		outlierRadius: 4,
		informationHeight: 70
	}),

	props: ["nid", "tOutliers", "bOutliers", "xScale", "idPrefix"],

	computed: {
		...mapGetters({
			generalColors: "getGeneralColors",
		})
	},

	mounted() {
		// Get the SVG belonging to this callsite.
		this.svg = d3.select("#" + this.idPrefix + this.nid);
		this.g = this.svg
			.select(".outlier")
			.attrs({
				"transform": "translate(0, " + this.paddingTop + ")"
			});


		this.height = this.$parent.containerHeight;
		this.width = this.$parent.containerWidth;

		this.boxHeight = this.height - this.paddingTop - this.informationHeight;
		this.boxWidth = this.width;

		this.outliers(this.tOutliers);
		if (this.bOutliers) {
			this.outliers(this.bOutliers);
		}
		this.$parent.$refs.ToolTip.init(this.idPrefix + this.nid);
	},

	methods: {
		/**
		 * 
		 * @param {*} data 
		 * @param {*} band 
		 */
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
					// datasets = [];
					ranks = [];
				}

				let diff = Math.abs(d.x - temp_x);
				// Check if it intersects within the bandLimit
				if (diff <= band) {
					x.push(d.x);
					values.push(d.value);
					// datasets.push(d.dataset);
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
						// datasets: datasets
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
					// datasets.push(d.dataset);
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
							// datasets: datasets,
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
						// datasets.push(d.dataset);
						count = 1;
						ret.push({
							values: values,
							x: x,
							// datasets: datasets,
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

		/**
		 * 
		 * @param {*} data 
		 * @param {*} radius 
		 * @param {*} datatype 
		 */
		groupOutliers(data, radius, datatype) {
			const radius2 = radius ** 2;

			const circles = data.map(d => {
				return {
					x: this.xScale(d.value),
					value: d.value,
					rank: d.rank,
					// dataset: d.dataset
				};
			});
		
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
			return circles;
			// return this.groupByBand(circles, this.bandWidth);
		},

		/**
		 * 
		 * @param {*} data 
		 */
		cleanUpEmptyOutliers(data) {
			let ret = [];
			for (let i = 0; i < data.length; i += 1) {
				if (data[i].count != 0) {
					ret.push(data[i]);
				}
			}
			return ret;
		},

		outliers(data) {
			let self = this;
			let targetOutlierList = [];
			for (let idx = 0; idx < data["values"].length; idx += 1) {
				if (data["values"][idx] != 0) {
					targetOutlierList.push({
						"value": data["values"][idx],
						// "dataset": data["datasets"][idx],
						"rank": data["ranks"][idx]
					});
				}
			}
			let circles = this.groupOutliers(targetOutlierList, this.bandWidth, "target");
			circles.sort((a, b) => a.x - b.x);

			this.g
				.selectAll(".target-outlier")
				.data(circles)
				.join("circle")
				.attrs({
					"r": d => {
						return 4;
					},
					"cx": d => d.x,
					"cy": d => this.boxHeight / 2 - this.informationHeight / 4,
					"class": "target-outlier"
				})
				.style("opacity", 1)
				.style("fill", this.generalColors.intermediate)
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
				.on("mouseover", (d) => this.$parent.$refs.ToolTip.renderOutliers(d))
				.on("mouseout", (d) => this.$parent.$refs.ToolTip.clear());
		},

		/**
		 * 
		 */
		clear() {
			this.g.selectAll(".ensemble-outlier").remove();
			this.g.selectAll(".target-outlier").remove();
		}
	}
};
</script>