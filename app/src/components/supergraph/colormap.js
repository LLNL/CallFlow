import tpl from "../../html/supergraph/colormap.html";
import * as d3 from "d3";
import "d3-selection-multi";

export default {
	template: tpl,
	name: "ColorMap",
	components: {
	},

	props: [
	],

	data: () => ({
		transitionDuration: 1000,
		width: 200,
		height: 20,
		colorScaleHeight: 30,
		colorMin: 0,
		colorMax: 0,
		padding: {
			bottom: 10,
			right: 250,
		},
		id: ""
	}),

	watch: {

	},

	mounted() { },

	methods: {
		init() {
			this.color = this.$store.color;
			this.colorMin = this.color.colorMin;
			this.colorMax = this.color.colorMax;
			this.innerHTMLText = [this.$store.colorMin, this.$store.colorMax];
			this.colorMap = this.color.colorMap;
			this.colorPoints = this.color.colorPoints;

			this.parentID = this.$parent.id;
			this.containerWidth = this.$parent.width;
			this.containerHeight = this.$parent.height;

			this.scaleG = d3.select("#" + this.parentID)
				.append("g")
				.attrs({
					"id": "colormap",
				});

			this.render();
			this.drawText();
		},

		render() {
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
				.text(this.colorMin * 0.000001 + "s");

			this.scaleG.append("text")
				.style("fill", "black")
				.style("font-size", "14px")
				.attrs({
					"dy": ".35em",
					"text-anchor": "middle",
					"class": "colormap-text",
					"transform": `translate(${this.containerWidth - this.padding.right + this.width}, ${this.containerHeight - 2 * this.padding.bottom})`,
				})
				.text(this.colorMax * 0.000001 + "s");
		},

		clear() {
			d3.selectAll(".colormap-text").remove();
			d3.selectAll(".colormap-rect").remove();
		},
	}
};