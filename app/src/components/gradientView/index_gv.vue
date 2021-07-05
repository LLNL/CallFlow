<template>
    <div>
        <InfoChip ref="InfoChip" :title="title" :summary="infoSummary" :info="info" />
        <svg :id="id"></svg>
    </div>
</template>

<script>
import * as d3 from "d3";
import "d3-selection-multi";
import { mapGetters } from "vuex";

import InfoChip from "../general/infoChip";

export default {
	name: "GradientView",
    
	components: {
		InfoChip
	},

	computed: {
		...mapGetters({
			summary: "getSummary",
			selectedNode: "getSelectedNode",
			gradients: "getGradients",
			selectedTargetRun: "getSelectedTargetRun",
			selectedMetric: "getSelectedMetric",
			runBinCount: "getRunBinCount",
		})
	},
    
	data: () => ({
		id: "gradient-view",
		info: "",
		infoSummary: "Gradient view visualizes the ",
		title: "Encoding",
		padding: {
			top: 10,
			right: 10,
			bottom: 10,
			left: 15,
		},
	}),

	watch: {
		gradients: function (val) {
			this.data = val;
			this.visualize();
		}
	},

	methods: {
		init() {
			this.$store.dispatch("fetchGradients", {
				dataset: this.selectedTargetRun,
				node: this.selectedNode["name"],
				ntype: this.selectedNode["type"],
				nbins: this.runBinCount,
			});
		},

		visualize() {
			this.width = this.$store.viewWidth * 0.25;
			this.height = 150;

			this.boxWidth = this.width - 1 * (this.padding.right + this.padding.left);
			this.boxHeight = this.height - 2 * (this.padding.top + this.padding.bottom);

			this.xAxisHeight = this.boxWidth - (this.paddingFactor + 1) * this.padding.left;
			this.yAxisHeight = this.boxHeight - (this.paddingFactor + 1) * this.padding.left;

			// Create the SVG
			this.svg = d3.select("#" + this.id).attrs({
				width: this.boxWidth,
				height: this.boxHeight,
				transform: "translate(" + this.padding.left + "," + this.padding.top + ")",
			});

			console.log(this.$store.distributionColor);

			this.svg.append("rect")
				.attrs({
					width: this.boxWidth,
					height: this.boxHeight,
					opacity: 1,
					// stroke: (d) => this.stroke_by_metric(d, this.selectedMetric),
					// "stroke-width": (d) =>
					// 	d.type == "intermediate"
					// 		? this.intermediateStrokeWidth
					// 		: this.defaultStrokeWidth,
					fill: this.fill_with_gradients(
						this.data,
						this.selectedMetric,
						this.$store.distributionColor
					),
				});        
		},

		fill_with_gradients(d, metric, color) {
			
			const defs = d3.select("#" + this.id).append("defs");

			const linearGradient = defs
				.append("linearGradient")
				.attr("id", "#node-gradient" + this.selectedNode["name"]);

			linearGradient
				.attr("x1", "0%")
				.attr("y1", "0%")
				.attr("x2", "100%")
				.attr("y2", "0%");

			console.log(d);

			const grid = d[metric]["hist"]["b"];
			const val = d[metric]["hist"]["h"];	

			for (let i = 0; i < grid.length; i += 1) {
				let x = (i + i + 1) / (2 * grid.length);
				linearGradient
					.append("stop")
					.attr("offset", 100 * x + "%")
					.attr("stop-color", color.getColorByValue(val[i]));
			}

			return "url(#node-gradient-" + this.selectedNode + ")";
		},

		stroke_by_metric(d, metric) {
			if (d.attr_dict.type == "intermediate") {
				return this.generalColors.intermediate;
			} else if (d.attr_dict.type == "callsite") {
				return d3.rgb(this.$store.runtimeColor.getColor(d, metric));
			} else if (d.attr_dict.type == "module") {
				return d3.rgb(this.$store.runtimeColor.getColor(d, metric));
			}
		},
        
	}
};
</script>