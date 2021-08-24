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

import * as utils from "lib/utils";
import Color from "lib/color/";
import InfoChip from "../general/infoChip";
import EventHandler from "lib/routing/EventHandler";

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
			colorPoint: "getColorPoint",
			runtimeColorMap: "getRuntimeColorMap",
			distributionColorMap: "getDistributionColorMap"
		})
	},
    
	data: () => ({
		id: "gradient-view",
		info: "",
		infoSummary: "Gradient view visualizes the ",
		title: "Ensemble Gradients",
		padding: {
			top: 10,
			right: 10,
			bottom: 10,
			left: 15,
		},
		defaultStrokeWidth: 10,
		runtimeColor: null,
		distributionColor: null,
	}),

	watch: {
		gradients: function (val) {
			this.data = val;
			this.visualize();
		}
	},

	mounted() {
		let self = this;
		EventHandler.$on("reset-ensemble-gradients", function () {
			self.clear();
			self.init();
		});
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
			this.width = this.$store.viewWidth * 0.20;
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

			this.setupColors();

			this.svg.append("rect")
				.attrs({
					width: this.boxWidth,
					height: this.boxHeight,
					id: "ensemble-gradient-rect"
				})
				.style("stroke", this.stroke_by_metric(this.data, this.selectedMetric))
				.style("stroke-width",  this.defaultStrokeWidth)
				.style("fill", this.fill_with_gradients(
					this.data,
					this.selectedMetric,
					this.distributionColor));

			this.svg.append("text")
				.attrs({
					x: 20,
					y: 30,
					id: "ensemble-gradient-text"
				})
				.style("fill", (d) => {
					const data = this.data[this.selectedMetric].dataset.mean[this.selectedTargetRun];
					const color = this.runtimeColor.getColor(data);
					return this.runtimeColor.setContrast(color);
				})
				.style("font-size", "16px")
				.text(this.selectedNode["name"]);
		},

		singleColors() {
			const data = this.summary[this.selectedTargetRun][this.selectedMetric];
			this.runtimeColor = new Color(this.selectedMetric, data[0], data[1], this.runtimeColorMap, this.colorPoint);
		},

		ensembleColors() {
			const data = this.data[this.selectedMetric]["hist"]["h"];
			const [ colorMin, colorMax ]  = utils.getMinMax(data);
			this.distributionColor = new Color("MeanGradients", colorMin, colorMax, this.distributionColorMap, this.colorPoint);			
		},

		setupColors() {
			this.singleColors();
			this.ensembleColors();
		},

		fill_with_gradients(d, metric, color) {
			const defs = d3.select("#" + this.id).append("defs");

			const linearGradient = defs
				.append("linearGradient")
				.attr("class", "ensemble-gradient-defs")
				.attr("id", "ensemble-gradient-defs-" + this.selectedNode["name"]);

			linearGradient
				.attr("x1", "0%")
				.attr("y1", "0%")
				.attr("x2", "100%")
				.attr("y2", "0%");

			const grid = d[metric]["hist"]["b"];
			const val = d[metric]["hist"]["h"];	

			for (let i = 0; i < grid.length; i += 1) {
				let x = (i + i + 1) / (2 * grid.length);
				linearGradient
					.append("stop")
					.attr("offset", 100 * x + "%")
					.attr("stop-color", color.getColorByValue(val[i]));
			}

			return "url(#ensemble-gradient-defs-" + this.selectedNode["name"] + ")";
		},

		stroke_by_metric(d, metric) {
			const data = d[metric].dataset.mean[this.selectedTargetRun];
			const color = this.runtimeColor.getColorByValue(data);
			return d3.rgb(color);
		},

		clear() {
			d3.selectAll(".ensemble-gradient-rect").remove();
			d3.selectAll(".ensemble-gradient-text").remove();
			d3.selectAll(".ensemble-gradient-defs").remove();

		},
        
	}
};
</script>