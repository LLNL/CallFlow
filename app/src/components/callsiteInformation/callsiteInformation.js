/** 
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

import tpl from "../../html/callsiteInformation.html";
import "../../css/callsiteInformation.css";

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
		numberOfcallsites: 0,
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
		mean: {},
		variance: {},
		stdDeviation: {}
	}),

	mounted() {
		let self = this;
		
		/**
		 * Event handler when a user selects a supernode.
		 */
		EventHandler.$on("single-select-module", (data) => {
			this.isModuleSelected = true;
			self.selectModule(data["module"]);
		});

		/**
		 * Event handler for sorting the callsites by a metric.
		 */
		EventHandler.$on("callsite-information-sort", (data) => {
			let attribute = self.$store.selectedRuntimeSortBy;
			self.callsites = self.sortByAttribute(self.callsites, attribute);
		});
	},

	methods: {
		/**
		 * Set up the view.
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
			this.visualize();
		},

		/**
		 * Visualizes the callsite information in the view.
		 * Three things are performed.
		 */
		visualize() {
			this.setStates();
			this.borderColorByMetric();
			this.boxplotByMetric();
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


			// this.callsites store the callsites in the current context. 
			// this.numberOfCallsites is used to show the number of callsites in the view. 
			this.callsites = this.$store.callsites[this.$store.selectedTargetDataset];
			this.numberOfcallsites = Object.keys(this.callsites).length;

			// Sort the callsites.
			this.callsites = this.sortByAttribute(this.callsites, this.$store.selectedMetric);
		},

		/**
		 * Color the border of the callsite information block by a metric.
		 */
		borderColorByMetric() {
			for (let callsite in this.callsites) {
				let data = this.callsites[callsite];
				let id = "#callsite-information-node-" + data.id;
				d3.select(id).style("stroke", this.$store.runtimeColor.getColorByValue(data[this.$store.selectedMetric]["mean_time"]));
			}
		},

		/**
		 * Draws a boxplot for the callsites. 
		 */
		boxplotByMetric() {
			// TODO: Generalize this for all the possible metrics.
			for (let callsite in this.callsites) {
				let data = this.callsites[callsite][this.selectedMetric];
				this.mean[callsite] = utils.formatRuntimeWithoutUnits(data["mean_time"]);
				this.variance[callsite] = utils.formatRuntimeWithoutUnits(data["variance"]);
				this.stdDeviation[callsite] = utils.formatRuntimeWithoutUnits(data["std_deviation"]);
				this.selectClassName[callsite] = "unselect-callsite";
			}
		},

		/**
		 * Sort the callsite ordering based on the attribute.
		 * 
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
			console.info("Selected callsites: ", this.revealCallsites);
		},

		/**
		 * 
		 * @param {*} val 
		 */
		switchIsSelectedCallsite(val) {
			this.isCallsiteSelected = val;
		},

		/**
		 * 
		 * @param {*} val 
		 */
		switchIsSelectedModule(val) {
			this.isModuleSelected = val;
		},

		/**
		 * 
		 * @param {*} callsite 
		 */
		selectedClassName(callsite) {
			return this.selectClassName[callsite];
		},

		/**
		 * 
		 * @param {*} module 
		 */
		formatModule(module) {
			if (module.length < 10) {
				return module;
			}
			return utils.truncNames(module, 10);
		},

		/**
		 * 
		 * @param {*} name 
		 */
		formatName(name) {
			if (name.length < 25) {
				return name;
			}
			let ret = utils.truncNames(name, 25);
			return ret;
		},

		/**
		 * 
		 * @param {*} name 
		 */
		formatNumberOfHops(name) {
			if (name == undefined || name[0] == undefined) {
				return "-";
			}
			return name[0] - 1;
		},

		/**
		 * 
		 * @param {*} val 
		 */
		formatRuntime(val) {
			let format = d3.format(".2");
			let ret = format(val) + " \u03BCs";
			return ret;
		},

		/**
		 * 
		 */
		clear() {
			for (let callsite in this.callsites) {
				EventHandler.$emit("hide-mpi-boxplot", this.callsites[callsite]);
			}
		},

		/**
		 * 
		 * @param {*} idx 
		 */
		dataset(idx) {
			return this.labels[idx];
		},

		/**
		 * 
		 * @param {*} event 
		 */
		revealCallsite(event) {
			event.stopPropagation();
			console.log(this.$store.selectedTargetDataset)
			this.$socket.emit("reveal_callsite", {
				mode: this.$store.selectedMode,
				reveal_callsites: this.revealCallsites,
				dataset: this.$store.selectedTargetDataset,
			});

			EventHandler.$emit("reveal_callsite");
		},

		/**
		 * 
		 * @param {*} event 
		 */
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

		/**
		 * 
		 * @param {*} event 
		 */
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

			// Set display: none to all .callsite-information-node.
			// This hides the nodes when a supernode is selected.
			for(let callsite in this.callsites){
				d3.select("#callsite-information-" + callsite.id).style("display", "none");
			}

			// Clear up the current callsites map.
			this.callsites = {};

			// Set the data and render each callsite.
			callsites_in_module.forEach((callsite) => {
				this.callsites[callsite] = this.$store.callsites[this.$store.selectedTargetDataset][callsite];
				d3.select("#callsite-information-" + this.callsites[callsite].id).style("display", "block");
			});
		},

		/**
		 * 
		 */
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

		/**
		 * 
		 * @param {String} callsite 
		 */
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
					dataset: this.$store.selectedTargetDataset,
				});
				EventHandler.$emit("split-by-entry-callsites");
			}
			else if (this.isCalleeSelected == "select-callsite") {
				this.$socket.emit("split_by_callees", {
					selectedModule: this.$store.selectedModule,
					dataset: this.$store.selectedTargetDataset,
				});
				EventHandler.$emit("split-by-callees");
			}
		}
	}
};

