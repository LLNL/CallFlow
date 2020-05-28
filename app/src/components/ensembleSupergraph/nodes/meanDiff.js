import * as d3 from "d3";
import * as utils from "../../utils";

export default {
	template: "<g :id=\"id\"></g>",
	name: "MeanGradients",
	components: {},

	data: () => ({
		strokeWidth: 7,
		id: "mean-diff-gradients",
		meanDiff: {}
	}),

	methods: {
		init(nodes, containerG, data) {
			this.nodes = nodes;
			this.containerG = containerG;
			this.data = data;

			this.process();
			this.colorScale();
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

			let max_diff = 0;
			let min_diff = 0;
			for (let i = 0; i < this.data.length; i += 1) {
				let d = this.data[i]["mean_diff"];
				let callsite = this.data[i]["name"];
				this.meanDiff[callsite] = d;
				max_diff = Math.max(d, max_diff);
				min_diff = Math.min(d, min_diff);
			}
		},

		colorScale() {
			this.$store.meanDiffColor.setColorScale(this.mean_diff_min, this.mean_diff_max, this.$store.selectedDistributionColorMap, this.$store.selectedColorPoint);
			this.$parent.$parent.$refs.EnsembleColorMap.updateWithMinMax("meanDiff", this.mean_diff_min, this.mean_diff_max);
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
						return 1;
					},
					"height": d => {
						return d.height;
					},
				})
				.style("stroke", (d) => {
					return 1;
				})
				.style("fill", (d, i) => {
					let color = d3.rgb(this.$store.meanDiffColor.getColorByValue((this.meanDiff[d.module])));
					return color;
				});
		},

		clear() {
		},
	}
};