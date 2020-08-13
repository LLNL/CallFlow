/** 
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

import tpl from "../../html/callsiteInformation.html";
import '../../css/callsiteInformation.css';

import EventHandler from "../EventHandler";
import BoxPlot from "./boxplot";
import * as d3 from "d3";
import * as utils from "../utils";

export default {
	name: "CallsiteInformation",
	template: tpl,
	components: {
		BoxPlot,
	},
	data: () => ({
		id: "callsite-information-overview",
		message: "Call site Information",
		callsites: [],
		numberOfIntersectionCallsites: 0,
		firstRender: true,
		padding: { top: 0, right: 10, bottom: 0, left: 10 },
		textOffset: 25,
		boxplotHeight: 340,
		boxplotWidth: 0,
		duration: 300,
		iqrFactor: 0.15,
		outlierRadius: 4,
		outlierList: {},
		callsiteIDMap: {},
		settings: [
			{ "title": "Sort by Inclusive runtime" },
			{ "title": "Sort by Exclusive Runtime" }],
		selectedModule: "",
		selectedCallsite: "",
		informationHeight: 0,
		revealCallsites: [],
		selectedMetric: "",
		targetMeans: {},
		targetVariance: {},
		targetStandardDeviation: {},
		intersectionCallsites: {},
		isModuleSelected: false,
		isCallsiteSelected: false,
		isEntryFunctionSelected: "unselect-callsite",
		isCalleeSelected: "unselect-callsite",
		showSplitButton: "false",
		selectClassName: {},
		selectedOutlierRanks: {},
		selectedOutlierDatasets: {},
		meanIncTime: {},
		meanExcTime: {},
		variance: {},
		stdDeviation: {}
	}),

	mounted() {
		let self = this;
		EventHandler.$on("highlight_datasets", (datasets) => {
			console.log("[Interaction] Highlighting the datasets :", datasets);
			self.highlight(datasets);
		});

		EventHandler.$on("update_auxiliary_sortBy", (sortBy) => {
			self.updateSortBy(sortBy);
		});

		EventHandler.$on("select_module", (data) => {
			self.selectModule(data["module"]);
		});

		EventHandler.$on("highlight_dataset", (data) => {
			let dataset = data["dataset"];
			if (self.$store.showTarget) {
				self.highlightCallsitesByDataset(dataset);
			}
		});

		EventHandler.$on("callsite_information_sort", (data) => {
			let attribute = self.$store.selectedRuntimeSortBy;
			self.intersectionCallsites = self.sortByAttribute(self.knc["intersection"], attribute);
		});
	},

	methods: {
		/**
		 * Set up the view.
		 * We only have to do this once.
		 */
		init() {
			if (this.firstRender) {
				this.width = document.getElementById(this.id).clientWidth;
				let heightRatio = this.$store.selectedMode == "Ensemble" ? 0.66 : 1.0;
				this.height = heightRatio * this.$store.viewHeight;
				this.boxplotWidth = this.width - this.padding.left - this.padding.right;
				document.getElementById(this.id).style.maxHeight = this.height + "px";
				this.informationHeight = 50;
				this.firstRender = false;
			}
			this.visualize()
		},

		visualize() {
			this.borderColorByMetric()
			this.setStates();

			// TODO: Generalize this for all the possible metrics.
			for (let callsite in this.callsites) {
				let data = this.callsites[callsite][this.$store.selectedMetric]
				this.meanIncTime[callsite] = utils.formatRuntimeWithoutUnits(data["mean_time"]);
				this.variance[callsite] = utils.formatRuntimeWithoutUnits(data["variance"]);
				this.stdDeviation[callsite] = utils.formatRuntimeWithoutUnits(data["std_deviation"]);

				this.selectClassName[callsite] = "unselect-callsite";
				EventHandler.$emit("show_mpi_boxplot", this.callsites[callsite]);
			}
		},

		/**
		 * Create ID for each callsite's div.
		 * @param {*} callsiteID 
		 */
		getID(callsiteID) {
			return "callsite-information-" + callsiteID;
		},

		/**
		 * Set the states for the variables at the UI level.
		 * Similar to how React.useState().
		 */
		setStates() {
			// Set from Application store.
			this.selectedModule = this.$store.selectedModule;
			this.selectedMode = this.$store.selectedMode;
			this.selectedCallsite = this.$store.selectedCallsite;
			this.selectedMetric = this.$store.selectedMetric;
			this.targetColor = this.$store.runtimeColor.textColor;
			this.callsites = this.$store.callsites[this.$store.selectedTargetDataset];
			this.numberOfIntersectionCallsites = Object.keys(this.callsites).length;

			// Sort the callsites.
			this.intersectionCallsites = this.sortByAttribute(this.callsites, this.$store.selectedMetric);
		},

		/**
		 * Color the border of the callsite information block by a metric.
		 */
		borderColorByMetric() {
			for (let callsite in this.callsites) {
				let data = this.callsites[callsite][this.$store.selectedMetric];
				let id = "callsite-information-node" + data.id;
				document.getElementById(id).style.borderColor = this.$store.color.getColorByValue(data["mean_time"]);
			}
		},

		/**
		 * Sort the callsite ordering based on the attribute.
		* // TODO: Generalize this to any metric.
		 * @param {Array} callsites - Callsites as a list.
		 * @param {String} attribute - Attribute to sort by.
		 */
		sortByAttribute(callsites, attribute) {
			let items = Object.keys(callsites).map(function (key) {
				return [key, callsites[key]];
			});

			// Sort the array based on the second element
			if (attribute == "Exclusive" || attribute == "Inclusive") {
				items = items.sort(function (first, second) {
					return second[1][attribute]["mean_time"] - first[1][attribute]["mean_time"];
				});
			}
			else if (attribute == "Standard Deviation") {
				items.sort(function (first, second) {
					return second[1][self.$store.selectedMetric]["std_deviation"] - first[1][self.$store.selectedMetric]["std_deviation"];
				});
			}

			callsites = items.reduce(function (map, obj) {
				map[obj[0]] = obj[1];
				return map;
			}, {});

			return callsites;
		},

		/**
		 * Selection feature.
		 * Code to select the callsite by the component-level button
		 */
		changeSelectedClassName() {
			event.stopPropagation();
			let callsite = event.currentTarget.id;
			// If it was already selected
			if (this.selectClassName[callsite] == "select-callsite") {
				this.revealCallsites.splice(this.revealCallsites.indexOf(callsite), 1);
				event.target.className = "flex text-xs-center unselect-callsite";
				this.selectClassName[callsite] = "unselect-callsite";
			}
			else {
				this.selectClassName[callsite] = "select-callsite";
				event.target.className = "flex text-xs-center select-callsite";
				this.revealCallsites.push(callsite);
			}

			if (this.revealCallsites.length == 0) {
				this.switchIsSelectedCallsite(false);
			}
			else {
				this.switchIsSelectedCallsite(true);
			}
			console.debug("Selected callsites: ", this.revealCallsites);
		},

		switchIsSelectedCallsite(val) {
			this.isCallsiteSelected = val;
		},

		switchIsSelectedModule(val) {
			this.isModuleSelected = val;
		},

		selectedClassName(callsite) {
			return this.selectClassName[callsite];
		},

		/**
		 * Formatting the text in view. 
		 * TODO: move all this to utils. We should be able to 
		 */
		trunc(str, n) {
			str = str.replace(/<unknown procedure>/g, "proc ");
			return (str.length > n) ? str.substr(0, n - 1) + "..." : str;
		},

		formatModule(module) {
			if (module.length < 10) {
				return module;
			}
			return this.trunc(module, 10);
		},

		formatName(name) {
			if (name.length < 25) {
				return name;
			}
			let ret = utils.truncNames(name, 25);
			return ret;
		},

		formatNumberOfHops(name) {
			if (name == undefined || name[0] == undefined) {
				return "-";
			}
			return name[0] - 1;
		},

		formatRuntime(val) {
			let format = d3.format(".2");
			let ret = format(val) + " \u03BCs";
			return ret;
		},

		clear() {
			for(let callsite in this.callsites){ 
				EventHandler.$emit("hide_mpi_boxplot", this.callsites[callsite]);
			}
		},

		dataset(idx) {
			return this.labels[idx];
		},

		clickCallsite(event) {
			event.stopPropagation();
			let callsite = event.currentTarget.id;
			this.$socket.emit("reveal_callsite", {
				reveal_callsites: this.revealCallsites,
				datasets: this.$store.selectedDatasets,
			});

			EventHandler.$emit("reveal_callsite");
		},

		showEntryFunctions(event) {
			event.stopPropagation();
			if (this.isEntryFunctionSelected == "unselect-callsite") {
				this.isEntryFunctionSelected = "select-callsite";
				this.isCalleeSelected = "unselect-callsite";
			}
			else {
				this.isEntryFunctionSelected = "unselect-callsite";
			}
			this.showSplitButton = "true";
		},

		showExitFunctions(event) {
			event.stopPropagation();
			if (this.isCalleeSelected == "unselect-callsite") {
				this.isCalleeSelected = "select-callsite";
				this.isEntryFunctionSelected = "unselect-callsite";
			}
			else {
				this.isCalleeSelected = "unselect-callsite";
			}
			this.showSplitButton = "true";
		},

		/**
		 * Interaction: On supernode click, the callsites belonging to the supernode 
		 * are only shown in the callsite information view.
		 * 
		 * @param {String} module 
		 */
		selectModule(module) {
			let callsites_in_module = this.$store.moduleCallsiteMap[this.$store.selectedTargetDataset][module];
			
			this.numberOfCallsites = Object.keys(callsites_in_module).length;

			// Clear up the current callsites map.
			this.callsites = {};

			// Set display: none to all .callsite-information-node.
			// This hides the nodes when a supernode is selected.
			d3.selectAll('.callsite-information-node').style("display", "none")

			// Set the data and render each callsite.
			callsites_in_module.forEach((callsite) => {
				if (callsites_in_module.indexOf(callsite) > -1) {
					this.callsites[callsite] = this.$store.callsites[this.$store.selectedTargetDataset][callsite];
				}
				console.log(this.callsites[callsite].id)
				d3.select('#callsite-information-' + this.callsites[callsite].id).style("display","block");
			});
		},

		selectCallsitesByModule(thismodule) {
			this.selectedModule = thismodule;
			this.selectedCallsite = "";

			let all_callsites = Object.keys(this.$store.callsites[this.$store.selectedTargetDataset]);
			let ensemble_callsites = this.$store.callsites["ensemble"];

			for (let callsite in all_callsites) {
				if (ensemble_callsites.hasOwnProperty(callsite)) {
					document.getElementById(ensemble_callsites[callsite].id).style.opacity = 0.2;
					document.getElementById(ensemble_callsites[callsite].id).style.borderStyle = "solid";
				}
			}

			let highlight_callsites = this.$store.moduleCallsiteMap[thismodule];
			for (let callsite in highlight_callsites) {
				if (ensemble_callsites.hasOwnProperty(callsite)) {
					document.getElementById(ensemble_callsites[callsite].id).style.opacity = 1;
					document.getElementById(ensemble_callsites[callsite].id).style.borderStyle = "dotted";
				}
			}
		},

		getSelectedOutlierRanks(callsite) {
			return this.selectedOutlierRanks[callsite];
		},

		/**
		 * Interaction: Graph splitting.
		*/
		split() {
			if (this.isEntryFunctionSelected == "select-callsite") {
				this.$socket.emit("split_by_entry_callsites", {
					selectedModule: this.$store.selectedModule,
					datasets: this.$store.selectedDatasets,
				});
				EventHandler.$emit("split_by_entry_callsites");
			}
			else if (this.isCalleeSelected == "select-callsite") {
				this.$socket.emit("split_by_callees", {
					selectedModule: this.$store.selectedModule,
					datasets: this.$store.selectedDatasets,
				});
				EventHandler.$emit("split_by_callees");
			}
		}
	}
};

