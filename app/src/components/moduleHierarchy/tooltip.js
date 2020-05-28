import tpl from "../../html/moduleHierarchy/tooltip.html";
import * as d3 from "d3";
import * as utils from "../utils";

export default {
	template: tpl,
	name: "ToolTip",
	components: {},

	data: () => ({
		id: "",
		textCount: 0,
		textxOffset: 20,
		textyOffset: 20,
		textPadding: 18,
		offset: 10,
		fontSize: 12,
	}),
	sockets: {
		tooltip(data) {
			this.render(data);
		},
	},

	methods: {
		init(id) {
			this.id = id;
			this.toolTipDiv = d3.select("#" + this.id);

			this.height = 80;
			this.halfWidth = document.getElementById(this.id).clientWidth / 2;
			this.halfHeight = document.getElementById(this.id).clientHeight / 2;
		},

		addText(text) {
			this.toolTipText = this.toolTipDiv
				.append("text")
				.style("font-family", "sans-serif")
				.style("font-size", "")
				.attrs({
					"class": "toolTipContent",
					"x": () => {
						if (this.mousePosX + this.halfWidth > document.getElementById(this.id).clientWidth) {
							return (this.mousePosX - this.width) + this.textxOffset + "px";
						}
						return this.mousePosX + this.textxOffset + "px";
					},
					"y": () => {
						if (this.mousePosY + this.halfHeight > document.getElementById(this.id).clientHeight) {
							return ((this.mousePosY) + this.textyOffset + this.textPadding * this.textCount) - this.height + "px";
						}
						return (this.mousePosY) + this.textyOffset + this.textPadding * this.textCount + "px";
					}
				})
				.text(text);
			this.textCount += 1;
		},

		info() {
			this.addText("Name: " + utils.truncNames(this.data.data.id, 40));
			let label = "";
			if (this.$store.selectedMetric == "Exclusive") {
				label = "Exc.";
			}
			else if (this.$store.selectedMetric == "Inclusive") {
				label = "Inc.";
			}
			this.addText("Target " + label + " time: " + utils.formatRuntimeWithUnits(this.data.data.data[this.$store.selectedMetric]["max_time"]));
		},

		render(data) {
			this.clear();
			this.data = data;
			this.width = 26 * this.fontSize;
			var svgScale = d3.scaleLinear().domain([2, 11]).range([50, 150]);
			this.mousePos = d3.mouse(d3.select("#" + this.id).node());
			this.mousePosX = this.mousePos[0];
			this.mousePosY = this.mousePos[1];
			// this.toolTipDiv.attr('height', svgScale(10) + "px")
			this.toolTipRect = this.toolTipDiv
				.append("rect")
				.attrs({
					"class": "toolTipContent",
					"fill": "white",
					"stroke": "black",
					"rx": "10px",
					"fill-opacity": 1,
					"width": this.width,
					"height": "50",
					"x": () => {
						if (this.mousePosX + this.halfWidth > document.getElementById(this.id).clientWidth) {
							return (this.mousePosX - this.width) + "px";
						}
						return (this.mousePosX) + "px";
					},
					"y": () => {
						if (this.mousePosY + this.halfHeight > document.getElementById(this.id).clientHeight) {
							return (this.mousePosY - this.height) + "px";
						}
						return (this.mousePosY) + "px";
					}
				});

			this.info();
		},

		clear() {
			this.textCount = 0;
			d3.selectAll(".toolTipContent").remove();
		},
	}
};