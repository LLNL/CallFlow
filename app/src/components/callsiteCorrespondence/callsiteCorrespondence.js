/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import tpl from "../../html/callsiteCorrespondence.html";
import EventHandler from "../EventHandler";
import BoxPlot from "./boxplot";
import * as d3 from "d3";
import * as utils from "../utils";

export default {
	name: "CallsiteCorrespondence",
	template: tpl,
	components: {
		BoxPlot,
	},
	data: () => ({
		selected: {},
		id: "auxiliary-function-overview",
		people: [],
		message: "Call site Correspondence",
		callsites: [],
		dataReady: false,
		numberOfIntersectionCallsites: 0,
		numberOfDifferenceCallsites: 0,
		firstRender: true,
		padding: { top: 0, right: 10, bottom: 0, left: 10 },
		textOffset: 25,
		boxplotHeight: 340,
		boxplotWidth: 0,
		duration: 300,
		iqrFactor: 0.15,
		outlierRadius: 4,
		targetOutlierList: {},
		outlierList: {},
		callsiteIDMap: {},
		settings: [
			{ "title": "Sort by Inclusive runtime" },
			{ "title": "Sort by Exclusive Runtime" }],
		compareMode: false,
		selectedModule: "",
		selectedCallsite: "",
		informationHeight: 70,
		revealCallsites: [],
		selectedMetric: "",
		targetMeans: {},
		targetVariance: {},
		targetStandardDeviation: {},
		ensembleMeans: {},
		ensembleVariance: {},
		ensembleStandardDeviation: {},
		targetColor: "",
		differenceCallsites: {},
		intersectionCallsites: {},
		isModuleSelected: false,
		isCallsiteSelected: false,
		isEntryFunctionSelected: "unselect-callsite",
		isCalleeSelected: "unselect-callsite",
		showSplitButton: "false",
		selectClassName: {},
		selectedOutlierRanks: {},
		selectedOutlierDatasets: {},
		showKNCCallsite: {},
		showuKNCCallsite: {},
		selectedMode: "Single"
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
			let thismodule = data["module"];
			// self.selectCallsitesByModule(thismodule)
			this.isModuleSelected = true;
			self.selectModule(thismodule);
		});

		EventHandler.$on("highlight_dataset", (data) => {
			let dataset = data["dataset"];
			if (self.$store.showTarget) {
				self.highlightCallsitesByDataset(dataset);
			}
		});

		EventHandler.$on("callsite_information_sort", (data) => {
			let attribute = self.$store.selectedRuntimeSortBy;
			self.differenceCallsites = self.sortByAttribute(self.knc["difference"], attribute);
			self.intersectionCallsites = self.sortByAttribute(self.knc["intersection"], attribute);
		});
	},

	methods: {
		init() {
			if (this.firstRender) {
				this.width = document.getElementById(this.id).clientWidth;
				let heightRatio = this.$store.selectedMode == "Ensemble" ? 0.66 : 1.0;
				this.height = heightRatio * this.$store.viewHeight;
				this.boxplotWidth = this.width - this.padding.left - this.padding.right;
				document.getElementById(this.id).style.maxHeight = this.height + "px";
				this.firstRender = false;
			}

			this.callsites = this.$store.callsites["ensemble"];
			this.targetCallsites = this.$store.callsites[this.$store.selectedTargetDataset];

			this.knc = this.KNC();

			this.numberOfDifferenceCallsites = Object.keys(this.knc["difference"]).length;
			this.numberOfIntersectionCallsites = Object.keys(this.knc["intersection"]).length;

			this.differenceCallsites = this.sortByAttribute(this.knc["difference"], this.$store.selectedMetric);
			this.intersectionCallsites = this.sortByAttribute(this.knc["intersection"], this.$store.selectedMetric);

			this.intersectionCallsites = this.hideAllCallsites(this.intersectionCallsites);
			this.differenceCallsites = this.hideAllCallsites(this.differenceCallsites);

			this.selectedModule = this.$store.selectedModule;
			this.selectedMode = this.$store.selectedMode;
			this.selectedCallsite = this.$store.selectedCallsite;
			this.selectedMetric = this.$store.selectedMetric;
			if (this.$store.selectedMetric == "Ensemble") {
				this.ensembleColor = d3.rgb(this.$store.distributionColor.ensemble).darker(1);
				this.targetColor = d3.rgb(this.$store.distributionColor.target).darker(1);
			}
			else {
				// There is actually no target for single run. But we just set the value. 
				this.ensembleColor = this.$store.runtimeColor.textColor;
				this.targetColor = this.$store.runtimeColor.textColor;
			}

			for (let callsite in this.callsites) {
				if (this.targetCallsites[callsite] != undefined) {
					this.targetMeans[callsite] = utils.formatRuntimeWithoutUnits(this.targetCallsites[callsite][this.$store.selectedMetric]["mean_time"]);
					this.targetVariance[callsite] = utils.formatRuntimeWithoutUnits(this.targetCallsites[callsite][this.$store.selectedMetric]["variance"]);
					this.targetStandardDeviation[callsite] = utils.formatRuntimeWithoutUnits(this.targetCallsites[callsite][this.$store.selectedMetric]["std_deviation"]);

					this.ensembleMeans[callsite] = utils.formatRuntimeWithoutUnits(this.callsites[callsite][this.$store.selectedMetric]["mean_time"]);
					this.ensembleVariance[callsite] = utils.formatRuntimeWithoutUnits(this.callsites[callsite][this.$store.selectedMetric]["variance"]);
					this.ensembleStandardDeviation[callsite] = utils.formatRuntimeWithoutUnits(this.callsites[callsite][this.$store.selectedMetric]["std_deviation"]);
				}
				else {
					this.targetMeans[callsite] = 0;
					this.targetVariance[callsite] = 0;
					this.targetStandardDeviation[callsite] = 0;
					this.ensembleMeans[callsite] = 0;
					this.ensembleVariance[callsite] = 0;
					this.ensembleStandardDeviation[callsite] = 0;
				}
				this.selectClassName[callsite] = "unselect-callsite";
			}

			// this.borderColorByMetric()
		},

		borderColorByMetric() {
			for (let callsite in this.intersectionCallsites) {
				let callsite_data = this.intersectionCallsites[callsite];
				let data = callsite_data[this.$store.selectedMetric]["mean_time"];
				let id = "callsite-information-" + callsite_data.id;
				document.getElementById(id).style.borderColor = this.$store.color.getColorByValue(data);
			}
		},

		// create unique ID for each callsite.
		getID(callsiteID) {
			return "callsite-information-" + callsiteID;
		},

		// Code to select the callsite by the component-level button
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


		// Formatting for the html view
		formatModule(module) {
			if (module.length < 10) {
				return module;
			}
			return this.trunc(module, 10);
		},

		formatName(name) {
			if (name.length < 15) {
				return name;
			}
			let ret = utils.truncNames(name, 15);
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

		// Find the known node correspondence. 
		KNC() {
			let callsites = new Set(Object.keys(this.$store.callsites["ensemble"]));
			let targetCallsites = new Set(Object.keys(this.$store.callsites[this.$store.selectedTargetDataset]));
			let difference = new Set(
				[...callsites].filter(x => !targetCallsites.has(x)));

			let intersection = new Set(
				[...callsites].filter(x => targetCallsites.has(x)));

			return {
				"difference": Array.from(difference),
				"intersection": Array.from(intersection)
			};
		},

		// Show/hide the boxplots
		showAllCallsites(callsites) {
			for (let i = 0; i < callsites.length; i++) {
				callsites[i].reveal = true;
			}
		},

		hideAllCallsites(callsites) {
			for (let callsite in callsites) {
				callsites[callsite].reveal = false;
			}
			return callsites;
		},

		// Reveal the boxplots on request. 
		showIntersectionBoxPlot(callsite) {
			event.stopPropagation();
			let callsite_name = event.currentTarget.id;
			this.intersectionCallsites[callsite_name].reveal = true;
			EventHandler.$emit("show_boxplot", this.intersectionCallsites[callsite_name]);
		},

		closeIntersectionBoxPlot(callsite) {
			event.stopPropagation();
			let callsite_name = event.currentTarget.id;
			EventHandler.$emit("hide_boxplot", this.intersectionCallsites[callsite_name]);
		},

		clear() {

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

		trunc(str, n) {
			str = str.replace(/<unknown procedure>/g, "proc ");
			return (str.length > n) ? str.substr(0, n - 1) + "..." : str;
		},

		selectModule(thismodule) {
			let module_callsites = this.$store.moduleCallsiteMap["ensemble"][thismodule];
			this.differenceCallsites = {};
			this.knc["difference"].forEach((callsite) => {
				if (module_callsites.indexOf(callsite) > -1) {
					this.differenceCallsites[callsite] = this.$store.callsites["ensemble"][callsite];
				}
			});
			this.numberOfDifferenceCallsites = Object.keys(this.differenceCallsites).length;

			this.intersectionCallsites = {};
			this.knc["intersection"].forEach((callsite) => {
				if (module_callsites.indexOf(callsite) > -1) {
					this.intersectionCallsites[callsite] = this.$store.callsites["ensemble"][callsite];
				}
			});
			this.numberOfIntersectionCallsites = Object.keys(this.intersectionCallsites).length;
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

		// Sort the callsite information view by the attribute. 
		sortByAttribute(callsites, attribute) {
			// Create items array
			let self = this;
			let items = callsites.map(function (key) {
				return [key, self.callsites[key]];
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

		// Outlier interactions
		getSelectedOutlierDatasets(callsite) {
			return this.selectedOutlierDatasets[callsite];
		},

		getSelectedOutlierRanks(callsite) {
			return this.selectedOutlierRanks[callsite];
		},

		// Split interactions
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

