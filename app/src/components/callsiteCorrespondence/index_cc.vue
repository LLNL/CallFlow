/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
  <v-layout row wrap :id="id">
    <InfoChip ref="InfoChip" :title="title" :summary="infoSummary" />

	<v-layout row wrap class="pl-8 pb-3">
      <v-btn
        class="reveal-button"
        small
        tile
        outlined
		:class="isEntryFunctionSelected"
        @click="revealCallsite"
      >
        Reveal
      </v-btn>
      <v-btn
        class="reveal-button"
        small
        tile
        outlined
        :class="isEntryFunctionSelected"
        @click="showEntryFunctions"
      >
        Split caller
      </v-btn>
      <v-btn
        class="reveal-button"
        small
        tile
        outlined
        :class="isCalleeSelected"
        @click="showExitFunctions"
      >
        Split callee
      </v-btn>
    </v-layout>

	<v-row class="ml-4">
		<v-col>
		<p class="subtitle-2">
			Matched {{ numberOfIntersectionCallsites }} callsites.
		</p>
		</v-col>
		<v-col>
		<p class="subtitle-2">
			Unmatched {{ numberOfDifferenceCallsites }}
			callsites.
		</p>
		</v-col>
	</v-row>v

    <v-container
	:v-if="numberOfDifferenceCallsites > 0"
      class="ml-4 cc-node"
      v-for="callsite in differenceCallsites"
      :key="getID(callsite.nid)"
    >
      <v-row>
        <v-col cols="12">
          <v-tooltip bottom>
            <template v-slot:activator="{on}">
              <v-row class="pl-2 subtitle-2 font-weight-black" v-on="on">
                {{ formatName(callsite.name) }}
              </v-row>
            </template>
            <span>{{ callsite.name }}</span>
          </v-tooltip>
        </v-col>
      </v-row>

		<v-row wrap class="pa-2">
			<Statistics 
				:bData="intersectionCallsites[callsite.name]['bStats']" />
		</v-row>
		<v-row class="pa-2">
			<BoxPlot :ref="callsite.id" 
				:bData="intersectionCallsites[callsite.name]['bBoxplot']" 
				showTarget="false" />
		</v-row>   
    </v-container>

    <v-container
      class="ml-4 cc-node"
      v-for="callsite in intersectionCallsites"
      :key="getID(callsite.name)"
    >
      <v-row>
        <v-col cols="1">
          <v-card class="ma-2 ml-4" tile outlined>
            <v-tooltip bottom>
              <template v-slot:activator="{on}">
                <v-row
				class="pl-2"
                  :id="callsite.name"
                  text-xs-center
                  v-on="on"
                  :class="selectClassName[callsite.name]"
				@click="changeSelectedClassName"
                >
                  {{ formatNumberOfHops(cpath[callsite.name]) }}
                </v-row>
              </template>
              <span>
                Callsite path:{{ formatPath(cpath[callsite.name][0]) }}
              </span>
            </v-tooltip>
          </v-card>
        </v-col>

        <v-col cols="11">
          <v-tooltip bottom>
            <template v-slot:activator="{on}">
              <v-row class="mt-0 ml-2 pl-2 subtitle-2 font-weight-black" v-on="on">
                {{ formatName(callsite.name) }}
              </v-row>
            </template>
            <span>{{ callsite.name }}</span>
          </v-tooltip>
        </v-col>
      </v-row>

		<Statistics ref="cc-Statistics"
			:tData="intersectionCallsites[callsite.name]['tStats']" 
			:bData="intersectionCallsites[callsite.name]['bStats']" />
		<BoxPlot 
			:bData="intersectionCallsites[callsite.name]['bBoxplot']" 
			:tData="intersectionCallsites[callsite.name]['tBoxplot']" 
			showTarget="false" />
    </v-container>
  </v-layout>
</template>

<script>
// Library imports
import * as d3 from "d3";
import { mapGetters } from "vuex";

// Local library imports
import * as utils from "lib/utils";
import EventHandler from "lib/routing/EventHandler";

import InfoChip from "../general/infoChip";

// Local component imports
import BoxPlot from "./boxplot";
import Statistics from "../boxplot/statistics";

export default {
	name: "CallsiteCorrespondence",
	components: {
		BoxPlot,
		InfoChip,
		Statistics
	},
	data: () => ({
		id: "cc-overview",
		title: "Call Site Correspondence",
		infoSummary: "Call site Correspondence view provides an insight into the runtime distribution among its MPI ranks. Boxplots are calculated to represent the range of the distribution and outliers (dots) correspond to the ranks which are beyond the 1.5*IQR. Additionally, several statistical measures are also provided. The (green) boxplots and dots belong to the target run's statistics. Both matched (callsites in both target and ensemble) and unmatched (callsites not in target but in ensemble) are shown in separate lists",
		callsites: [],
		numberOfIntersectionCallsites: 0,
		numberOfDifferenceCallsites: 0,
		padding: {top: 0, right: 10, bottom: 0, left: 10},
		boxplotHeight: 340,
		boxplotWidth: 0,
		revealCallsites: [],
		differenceCallsites: {},
		intersectionCallsites: {},
		isModuleSelected: false,
		isCallsiteSelected: false,
		isEntryFunctionSelected: "unselect-callsite",
		isCalleeSelected: "unselect-callsite",
		showSplitButton: "true",
		showKNCCallsite: {},
		tStats: {},
		bStats: {},
		tBoxplot: {},
		bBoxplot: {},
		cpath: {},
		selectClassName: {},
	}),

	computed: {
		...mapGetters({
			selectedTargetRun: "getSelectedTargetRun",
			selectedNode: "getSelectedNode",
			selectedMetric: "getSelectedMetric",
			data: "getEnsembleBoxplots",
			summary: "getSummary",
			generalColors: "getGeneralColors",
			runtimeSortBy: "getRuntimeSortBy",
			iqrFactor: "getIQRFactor",	
		})
	},

	watch: {
		data: function () {
			this.visualize();
		},
	},

	mounted() {
		let self = this;

		EventHandler.$on("highlight-dataset", (data) => {
			let dataset = data["dataset"];
			if (self.showTarget) {
				self.highlightCallsitesByDataset(dataset);
			}
		});

		EventHandler.$on("highlight-datasets", (datasets) => {
			console.log("[Interaction] Highlighting the datasets :", datasets);
			self.highlight(datasets);
		});


		EventHandler.$on("callsite-correspondence-sort", (val) => {
			self.clear();
			self.visualize();
		});

		EventHandler.$on("reset-ensemble-boxplots", () =>  {
			self.clear();
			self.init();
			self.visualize();
		});
	},

	methods: {
		init() {
			const summary = this.summary[this.selectedTargetRun];
			let callsites = [];
			if (this.selectedNode["type"] == "module") {
				const module_name = this.selectedNode["name"];
				const module_idx = summary["invmodules"][module_name];
				callsites = summary["m2c"][module_idx].map((cs) => summary["callsites"][cs]);
			}
			else if (this.selectedNode["type"] == "callsite") {
				callsites = [this.selectedNode["name"]];
			}

			this.$store.dispatch("fetchEnsembleBoxplots", {
				dataset: this.selectedTargetRun,
				metric: this.selectedMetric,
				callsites: callsites,
				ntype: "callsite",
				iqr: this.iqrFactor,
			});

			this.width = document.getElementById(this.id).clientWidth;
			this.boxplotWidth = this.width - this.padding.left - this.padding.right;
			this.height = 0.7 * this.$store.viewHeight;
			document.getElementById(this.id).style.height = this.height + "px";
		},

		visualize() {
			this.tCallsites = this.sortByAttribute(this.data, this.selectedMetric, this.runtimeSortBy, "tgt");
			this.bCallsites = this.sortByAttribute(this.data, this.selectedMetric, this.runtimeSortBy, "bkg");
			
			this.knc = this.KNC(this.tCallsites, this.bCallsites);
			this.numberOfIntersectionCallsites = this.knc["intersection"].length;
			this.numberOfDifferenceCallsites = this.knc["difference"].length;

			this.ensembleColor = d3
				.rgb(this.generalColors.ensemble)
				.darker(1);
			this.targetColor = d3
				.rgb(this.generalColors.target)
				.darker(1);

			this.boxplotByMetric();
			// this.borderColorByMetric()
		},

		/**
		 * Sort the callsite ordering based on the attribute.
		 *
		 * @param {Array} callsites - Callsites as a list.
		 * @param {Stirng} metric - Metric (e.g., time or time (inc))
		 * @param {String} attribute - Attribute to sort by.
		 */
		sortByAttribute(callsites, metric, attribute, boxplot_type) {
			let items = Object.keys(callsites).map(function (key) {
				return [key, callsites[key][boxplot_type]];
			});

			items = items.sort( (first, second) => {
				if (first[1][metric] == undefined || second[1][metric] == undefined) {
					return -1;
				}
				return second[1][metric][attribute] - first[1][metric][attribute];
			});

			callsites = items.reduce(function (map, obj) {
				if (obj[1][metric]){
					map[obj[0]] = obj[1][metric];
				}
				return map;
			}, {});

			return callsites;
		},

		boxplotByMetric() {
			for (let callsite_name of this.knc["intersection"]) {
				let tCallsite = this.tCallsites[callsite_name];
				let bCallsite = this.bCallsites[callsite_name];

				this.intersectionCallsites[callsite_name] = {
					"nid": tCallsite.nid,
					"name": tCallsite.name,
					"tStats": this.getStatistics(tCallsite),
					"bStats": this.getStatistics(bCallsite),
					"tBoxplot": this.getBoxplot(tCallsite),
					"bBoxplot": this.getBoxplot(bCallsite)
				};

				this.cpath[callsite_name] = tCallsite["cpath"];

				this.selectClassName[callsite_name] = "unselect-callsite";
			}

			for (let callsite_name of this.knc["difference"]) {
				let bCallsite = this.bCallsites[callsite_name];

				this.differenceCallsites[callsite_name] = {
					"nid": bCallsite.nid,
					"bStats": this.getStatistics(bCallsite),
					"bBoxplot": this.getBoxplot(bCallsite)
				};

				this.cpath[callsite_name] =  bCallsite["cpath"];

				this.selectClassName[callsite_name] = "unselect-callsite";
			}
		},

		getStatistics(callsite) {
			return { 
				"min": utils.formatRuntimeWithoutUnits(callsite["min"]),
				"max": utils.formatRuntimeWithoutUnits(callsite["max"]),
				"mean": utils.formatRuntimeWithoutUnits(callsite["mean"]),
				"var": utils.formatRuntimeWithoutUnits(callsite["var"]),
				"imb": utils.formatRuntimeWithoutUnits(callsite["imb"]),
				"kurt": utils.formatRuntimeWithoutUnits(callsite["kurt"]),
				"skew": utils.formatRuntimeWithoutUnits(callsite["skew"]),
			};
		},

		getBoxplot(callsite) {
			return {
				"q": callsite["q"],
				"outliers": callsite["outliers"], 
				"nid": callsite["nid"]
			};
		},

		borderColorByMetric() {
			for (let callsite in this.intersectionCallsites) {
				let callsite_data = this.intersectionCallsites[callsite];
				let data = callsite_data[this.selectedMetric]["mean"];
				let id = "callsite-information-" + callsite_data.id;
				document.getElementById(
					id,
				).style.borderColor = this.$store.color.getColorByValue(data);
			}
		},

		// create unique ID for each callsite.
		getID(callsiteID) {
			return "cc-node-" + callsiteID;
		},

		// Code to select the callsite by the component-level button
		changeSelectedClassName(callsite) {
			event.stopPropagation();
			// If it was already selected
			if (this.selectClassName[callsite] == "select-callsite") {
				this.revealCallsites.splice(this.revealCallsites.indexOf(callsite), 1);
				event.target.className = "flex text-xs-center unselect-callsite";
				this.selectClassName[callsite] = "unselect-callsite";
			} else {
				this.selectClassName[callsite] = "select-callsite";
				event.target.className = "flex text-xs-center select-callsite";
				this.revealCallsites.push(callsite);
			}

			if (this.revealCallsites.length == 0) {
				this.switchIsSelectedCallsite(false);
			} else {
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
			const moduleName = module["name"];
			if (moduleName.length < 10) {
				return moduleName;
			}
			return this.trunc(moduleName, 10);
		},

		formatName(name) {
			if (name.length < 25) {
				return name;
			}
			let ret = utils.truncNames(name, 25);
			return ret;
		},

		formatNumberOfHops(path) {
			return path[0].length;
		},

		formatRuntime(val) {
			let format = d3.format(".2");
			let ret = format(val) + " \u03BCs";
			return ret;
		},

		formatPath(val) {
			const cMap = this.summary[this.selectedTargetRun]["callsites"];
			let ret = [];
			for (let c of val) {	
				ret.push(cMap[c]);
			}
			return ret;
		},

		// Find the known node correspondence.
		KNC(tCallsites, bCallsites) {
			let bSet = new Set(Object.keys(bCallsites));
			let tSet = new Set(Object.keys(tCallsites));
			let difference = new Set(
				[...bSet].filter((x) => !tSet.has(x)),
			);

			let intersection = new Set(
				[...bSet].filter((x) => tSet.has(x)),
			);

			return {
				difference: Array.from(difference),
				intersection: Array.from(intersection),
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
			console.log("Toggling", callsite_name);
			this.intersectionCallsites[callsite_name].reveal = true;
			EventHandler.$emit(
				"show-boxplot",
				this.intersectionCallsites[callsite_name],
			);
		},

		closeIntersectionBoxPlot(callsite) {
			event.stopPropagation();
			let callsite_name = event.currentTarget.id;
			EventHandler.$emit(
				"hide-boxplot",
				this.intersectionCallsites[callsite_name],
			);
		},

		clear() {
			// TODO: Need to avoid a forceUpdate on the component. Bad practice.
			// This is a hacky solution as there is currently no way to refresh
			// the subcomponents once rendered. D3.remove is very aggressive and
			// removes all the content.
			this.$forceUpdate();
		},

		dataset(idx) {
			return this.labels[idx];
		},

		revealCallsite(event) {
			event.stopPropagation();
			let callsite = event.currentTarget.id;
			this.$socket.emit("reveal_callsite", {
				mode: this.$store.selectedMode,
				reveal_callsites: this.revealCallsites,
				datasets: this.$store.selectedDatasets,
			});

			EventHandler.$emit("reveal-callsite");
		},

		showEntryFunctions(event) {
			event.stopPropagation();
			if (this.isEntryFunctionSelected == "unselect-callsite") {
				this.isEntryFunctionSelected = "select-callsite";
				this.isCalleeSelected = "unselect-callsite";
			} else {
				this.isEntryFunctionSelected = "unselect-callsite";
			}
			this.showSplitButton = "true";
		},

		showExitFunctions(event) {
			event.stopPropagation();
			if (this.isCalleeSelected == "unselect-callsite") {
				this.isCalleeSelected = "select-callsite";
				this.isEntryFunctionSelected = "unselect-callsite";
			} else {
				this.isCalleeSelected = "unselect-callsite";
			}
			this.showSplitButton = "true";
		},

		trunc(str, n) {
			str = str.replace(/<unknown procedure>/g, "proc ");
			return str.length > n ? str.substr(0, n - 1) + "..." : str;
		},

		selectModule(thismodule) {
			let module_callsites = this.$store.moduleCallsiteMap["ensemble"][
				thismodule
			];
			this.differenceCallsites = {};
			this.knc["difference"].forEach((callsite) => {
				if (module_callsites.indexOf(callsite) > -1) {
					this.differenceCallsites[callsite] = this.$store.data_cs["ensemble"][
						callsite
					];
				}
			});
			this.numberOfDifferenceCallsites = Object.keys(
				this.differenceCallsites,
			).length;

			this.intersectionCallsites = {};
			this.knc["intersection"].forEach((callsite) => {
				if (module_callsites.indexOf(callsite) > -1) {
					this.intersectionCallsites[callsite] = this.$store.data_cs[
						"ensemble"
					][callsite];
				}
			});
			this.numberOfIntersectionCallsites = Object.keys(
				this.intersectionCallsites,
			).length;
		},

		selectCallsitesByModule(thismodule) {
			this.selectedModule = thismodule;
			this.selectedCallsite = "";

			let all_callsites = Object.keys(
				this.$store.data_cs[this.$store.selectedTargetDataset],
			);
			let ensemble_callsites = this.$store.data_cs["ensemble"];

			for (let callsite in all_callsites) {
				if (ensemble_callsites.hasOwnProperty(callsite)) {
					document.getElementById(
						ensemble_callsites[callsite].id,
					).style.opacity = 0.2;
					document.getElementById(
						ensemble_callsites[callsite].id,
					).style.borderStyle = "solid";
				}
			}

			let highlight_callsites = this.$store.moduleCallsiteMap[thismodule];
			for (let callsite in highlight_callsites) {
				if (ensemble_callsites.hasOwnProperty(callsite)) {
					document.getElementById(
						ensemble_callsites[callsite].id,
					).style.opacity = 1;
					document.getElementById(
						ensemble_callsites[callsite].id,
					).style.borderStyle = "dotted";
				}
			}
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
					mode: this.$store.selectedMode,
					selectedModule: this.$store.selectedModule,
					datasets: this.$store.selectedDatasets,
				});
				EventHandler.$emit("reveal-callsite");
			} else if (this.isCalleeSelected == "select-callsite") {
				this.$socket.emit("split_by_callees", {
					mode: this.$store.selectedMode,
					selectedModule: this.$store.selectedModule,
					datasets: this.$store.selectedDatasets,
				});
				EventHandler.$emit("reveal-callsite");
			}
		},
	},
};
</script>

<style>
#cc-overview {
  overflow: auto;
}

.show-boxplot-btn {
  padding: 1;
}

.unselect-callsite {
  color: #009688 !important;
  background: white !important;
  cursor: pointer;
}

.select-callsite {
  color: white !important;
  background: #009688 !important;
  cursor: pointer;
}

.reveal-button {
  float: right;
  margin: 1px;
  /* color: #009688 !important; */
  font-size: 75%;
  padding: 2px;
}

.cc-node {
  padding: 10px;
  margin: 3px;
  border-width: 1px;
  border-style: solid;
  border-color: #d0cccc;
}

.box {
  font: 10px sans-serif;
}

.box line,
.box rect,
.box circle {
  stroke: #000;
  stroke-width: 1.5px;
}

.box .center {
  stroke-dasharray: 3, 3;
}

.box .outlier {
  fill: none;
  stroke: #000;
}

.component-info {
  color: #009688;
  padding: 8px;
}

.component-data {
  color: #009688;
  padding: 0px;
}
</style>