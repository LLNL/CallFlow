import tpl from "../../html/function/index.html";
import * as  d3 from "d3";
import EventHandler from "../EventHandler";

export default {
	name: "Function",
	template: tpl,
	components: {
	},

	data: () => ({
		graph: null,
		id: "function-overview",
		padding: {
			top: 10, right: 10, bottom: 10, left: 10
		},
		width: null,
		height: null,
		textxOffset: 10,
		textyOffset: 10,
		textPadding: 0,
		textCount: 0,
		textSize: 15,
		message: "Callsite Information",
		number_of_callsites: 0,
	}),

	sockets: {
		splitcaller(data) {
			console.log("Split caller graph", data);
		}
	},

	methods: {
		init() {
			if (!this.firstRender) {
				this.clear();
			}
			else {
				this.firstRender = false;
			}
			this.number_of_callsites = Object.keys(this.$store.callsites[this.$store.selectedTargetDataset]).length;
			let index = 1;
			for (const [idx, callsite] of Object.entries(this.$store.callsites[this.$store.selectedTargetDataset])) {
				this.ui(callsite, index);
				// this.visualize(callsite.name)
				index += 1;
			}
		},

		clear() {
			var els = document.querySelectorAll(".auxiliary-node");
			for (var i = 0; i < els.length; i++) {
				els[i].parentNode.innerHTML = "";
			}
		},

		trunc(str, n) {
			str = str.replace(/<unknown procedure>/g, "proc ");
			return (str.length > n) ? str.substr(0, n - 1) + "..." : str;
		},

		ui(callsite, idx) {
			let container = document.createElement("div");
			let div = document.createElement("div");
			div.style.width = (document.getElementById("function-overview").clientWidth - 20) + "px";
			div.setAttribute("id", callsite.id);
			div.setAttribute("class", "auxiliary-node");

			let checkbox = this.createCheckbox(callsite);

			let callsite_label = this.createNameLabel(callsite, idx);
			let time_inc = callsite["mean_time (inc)"].toFixed(2);
			let inclusive_runtime = this.createLabel("".concat("Inclusive Runtime (mean): ", (time_inc * 0.000001).toFixed(2), "s"));
			let time = callsite["mean_time"].toFixed(2);
			let exclusive_runtime = this.createLabel("".concat("Exclusive Runtime (mean): ", (time * 0.000001).toFixed(2), "s"));


			div.appendChild(checkbox);
			div.appendChild(callsite_label);
			div.appendChild(inclusive_runtime);
			div.appendChild(exclusive_runtime);

			container.appendChild(div);
			let maxHeight = window.innerHeight - document.getElementById("toolbar").clientHeight - document.getElementById("footer").clientHeight;
			document.getElementById("function-overview").style.maxHeight = maxHeight + "px";
			document.getElementById("function-overview").append(container);
		},

		// UI supportign functions.
		createNameLabel(callsite, idx) {
			let id = callsite.module + "-" + callsite.name;
			let name = idx + ". " + this.trunc(callsite.module, 25) + "-" + this.trunc(callsite.name, 25);
			let div = document.createElement("div");
			let label = document.createElement("div");
			let textNode = document.createTextNode(name);

			let highlightSVG = document.createElement("svg");
			highlightSVG.id = id;
			this.addHighlightBox(callsite);
			label.appendChild(highlightSVG);

			label.appendChild(textNode);
			div.appendChild(label);
			return label;
		},

		// UI supportign functions.
		createLabel(text) {
			let div = document.createElement("div");
			let label = document.createElement("div");
			let textNode = document.createTextNode(text);
			label.appendChild(textNode);
			div.appendChild(label);
			return label;
		},

		createCheckbox(callsite) {
			let self = this;
			let div = document.createElement("div");
			let container = document.createElement("div");
			let checkbox = document.createElement("button");
			checkbox.name = callsite.name;
			checkbox.module = callsite.module;
			checkbox.node_name = callsite.name;
			checkbox.setAttribute("class", "reveal-button");
			checkbox.innerHTML = "Reveal";
			// container.appendChild(textNode)
			checkbox.onclick = function (event) {
				event.stopPropagation();
				let thisModule = this.module;
				let thisCallsite = this.name;

				self.$socket.emit("reveal_callsite", {
					module: thisModule,
					callsite: thisCallsite,
					dataset: self.$store.selectedTargetDataset
				});

				EventHandler.$emit("single_histogram", {
					datasets: self.$store.selectedTargetDataset,
					module: thisModule,
					name: thisCallsite
				});

				EventHandler.$emit("single_scatterplot", {
					datasets: self.$store.selectedTargetDataset,
					module: thisModule,
					name: thisCallsite
				});
			};
			container.appendChild(checkbox);
			div.appendChild(container);
			return div;
		},

		addHighlightBox(callsite) {
			let d = "";
			let id = callsite.module + "-" + callsite.name;
			if (this.$store.selectedMetric == "Inclusive") {
				d = callsite["mean_time (inc)"];
			}
			else if (this.$store.selectedMetric == "Exclusive") {
				d = callsite["mean_time"];
			}
			let color_arr = this.$store.color.getColorByValue(d);
			let color_rgb = this.$store.color.rgbArrayToHex(color_arr);
			let rect = d3.select("#" + id).append("rect")
				.attrs({
					width: 20,
					height: 20,
					fill: color_rgb
				});
		},

		addText(text, isBold = false) {
			this.textCount += 1;
			this.toolTipText = d3.select("#" + this.id)
				.data([text])
				.append("text")
				.style("font-family", "sans-serif")
				.style("font-weight", (d, i) => {
					if (isBold) {
						return "700";
					}
					return "400";
				})
				.style("font-size", this.textSize)
				.attrs({
					"class": "functionContent",
					"x": (d, i) => {
						return this.textxOffset + "px";
					},
					"y": () => {
						return this.textyOffset + this.textPadding * this.textCount + "px";
					}
				})
				.text((d) => {
					return d;
				})
				.style("pointer-events", "auto")
				.on("click", (d) => {
					console.log("Selected split-caller", d);
					self.$socket.emit("splitcaller", {
						"name": "split-caller",
						"dataset1": this.$store.selectedDataset,
						"split": d
					});
				});
		},

		render(data) {
			this.clear();

			this.addText("Module: ", true);
			this.addText(this.$store.selectedNode["id"]);

			this.addText("Entry functions: ", true);
			let entry_functions = data["entry_functions"][0];
			let callees = data["callees"];
			for (const [key, value] of Object.entries(callees[0])) {
				this.addText(key);
			}

			this.addText("Callees: ", true);
			// let callees = data['callees']
			for (const [key, value] of Object.entries(callees[0])) {
				let text = value + "  ->  " + key;
				this.addText(text);
			}

			this.addText("Callers: ", true);
			let callers = data["callers"];
			for (const [key, value] of Object.entries(callers[0])) {
				let text = value + "  ->  " + key;
				this.addText(text);
			}
			this.addText("Other Functions: ", true);
			let other_functions = data["other_functions"][0];
			for (let i = 0; i < other_functions.length; i += 1) {
				this.addText(other_functions[i]);
			}
		},

		update(data) {

		},
	}
};