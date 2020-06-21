import * as d3 from "d3";

export default {
	template: "<g :id=\"id\"></g>",
	name: "Mean",
	components: {},

	data: () => ({
		stroke_width: 7,
		id: "mean"
	}),

	methods: {
		init(nodes, containerG) {
			this.nodes = nodes;
			this.containerG = containerG;

			this.ensemble_module_data = this.$store.modules["ensemble"];
			this.ensemble_callsite_data = this.$store.callsites["ensemble"];

			this.visualize();
		},

		visualize() {
			this.containerG.selectAll(".callsite-rect")
				.data(this.nodes)
				.transition()
				.duration(this.$parent.transitionDuration)
				.attrs({
					"opacity": d => {
						console.log(d);
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
					console.log(this.stroke_width)
					if (d.type == "intermediate") {
						return 1;
					}
					else {
						return this.stroke_width;
					}
				})
				.style("fill", (d) => {
					if (d.id.split("_")[0] == "intermediate") {
						return this.$store.color.ensemble;
					}
					else {
						let color = this.$store.color.getColor(d);
						return color;
					}
				});
		},

		clear() {
		},
	}
};