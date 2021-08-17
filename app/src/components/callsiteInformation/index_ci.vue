/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
  <v-layout row wrap :id="id">
    <InfoChip ref="InfoChip" :title="title" :summary="infoSummary" :info="info"
    />
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

    
    <v-container
      class="ml-4 ci-node"
      v-for="callsite in callsites"
      :key="getID(callsite.nid)"
    >
      <v-row>
         <v-col cols="2">
          <v-card class="ma-2 ml-4" tile outlined>
            <v-tooltip bottom>
              <template v-slot:activator="{on}">
                <v-row align="center" justify="center"
                  :id="callsite.name"
                  v-on="on"
                  :class="selectClassName[callsite.name]"
                  @click="changeSelectedClassName"
                >
                  {{ formatNumberOfHops(cpath[callsite.name]) }}
                </v-row>
              </template>
              <span>
                Callsite path: {{ formatPath(cpath[callsite.name][0]) }}
              </span>
            </v-tooltip>
          </v-card>
        </v-col>

        <v-col cols="10">
          <v-tooltip bottom>
            <template v-slot:activator="{on}">
              <v-row class="mt-0 pl-2 subtitle-2 font-weight-black" v-on="on">
                {{ formatName(callsite.name) }}
              </v-row>
            </template>
            <span>{{ callsite.name }}</span>
          </v-tooltip>
        </v-col>
      </v-row>

		<Statistics ref="ci-Statistics" :tData="stats[callsite.name]" />
		<BoxPlot ref="BoxPlot" :data.sync="boxplot[callsite.name]" /> 
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
	name: "CallsiteInformation",
	components: {
		BoxPlot,
		InfoChip,
		Statistics,
	},
	data: () => ({
		id: "ci-overview",
		title: "Call site Information",
		infoSummary: "Call site Information view provides an insight into the runtime distribution among its MPI ranks. Boxplots are calculated to represent the range of the distribution and outliers (dots) correspond to the ranks which are beyond the 1.5*IQR. Additionally, several statistical measures are also provided.",
		info: "",
		callsites: [],
		numberOfcallsites: 0,
		firstRender: true,
		padding: {top: 0, right: 10, bottom: 0, left: 10},
		textOffset: 25,
		boxplotHeight: 340,
		boxplotWidth: 0,
		duration: 300,
		outlierRadius: 4,
		outlierList: {},
		callsiteIDMap: {},
		settings: [
			{title: "Sort by Inclusive runtime"},
			{title: "Sort by Exclusive Runtime"},
		],
		informationHeight: 50,
		revealCallsites: [],
		isModuleSelected: false,
		isCallsiteSelected: true,
		isEntryFunctionSelected: "unselect-callsite",
		isCalleeSelected: "unselect-callsite",
		showSplitButton: "false",
		selectClassName: {},
		selectedOutlierRanks: {},
		selectedOutlierDatasets: {},
		boxplot: {},
		stats: {},
		cpath: {},
	}),

	computed: {
		...mapGetters({
			selectedTargetRun: "getSelectedTargetRun",
			selectedNode: "getSelectedNode",
			selectedMetric: "getSelectedMetric",
			data: "getSingleBoxplots",
			summary: "getSummary",
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

		EventHandler.$on("reset-single-boxplots", () =>  {
			self.clear();
			self.init();
			self.visualize();
		});

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
		EventHandler.$on("callsite-information-sort", (val) => {
			self.clear();
			self.visualize();
		});
	},

	methods: {
		/**
		 * Set up the view.
		 */
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

			this.$store.dispatch("fetchSingleBoxplots", {
				dataset: this.selectedTargetRun,
				metric: this.selectedMetric,
				callsites: callsites,
				ntype: "callsite",
				iqr: this.iqrFactor,
			});

			this.width = document.getElementById(this.id).clientWidth;
			this.boxplotWidth = this.width - this.padding.left - this.padding.right;
			
			let heightRatio = this.$store.selectedMode == "Ensemble" ? 0.66 : 1.0;
			this.height = heightRatio * this.$store.viewHeight;
			document.getElementById(this.id).style.maxHeight = this.height + "px";
		},

		/**
		 * Visualizes the callsite information in the view.
		 * Three things are performed.
		 */
		visualize() {
			// Sort the callsites.
			this.callsites = this.sortByAttribute(
				this.data,
				this.selectedMetric,
				this.runtimeSortBy,
				"tgt"
			);

			this.numberOfcallsites = Object.keys(this.callsites).length;
			this.info = this.numberOfcallsites + " call sites";

			for (let callsite_name in this.callsites) {
				if(!this.callsites[callsite_name]){
					continue;
				}
				let callsite = this.callsites[callsite_name];

				// Set the dictionaries for metadata information. 
				this.stats[callsite_name] = { 
					"min": utils.formatRuntimeWithoutUnits(callsite["min"]),
					"max": utils.formatRuntimeWithoutUnits(callsite["max"]),
					"mean": utils.formatRuntimeWithoutUnits(callsite["mean"]),
					"var": utils.formatRuntimeWithoutUnits(callsite["var"]),
					"imb": utils.formatRuntimeWithoutUnits(callsite["imb"]),
					"kurt": utils.formatRuntimeWithoutUnits(callsite["kurt"]),
					"skew": utils.formatRuntimeWithoutUnits(callsite["skew"]),
				};
				
				// Set the data for the boxplot.
				this.boxplot[callsite_name] = {"q": callsite["q"], "outliers": callsite["outliers"], "nid": callsite["nid"]};
				this.cpath[callsite_name] = callsite["cpath"];

				// Set the selection for a callsite. 
				this.selectClassName[callsite_name] = "unselect-callsite";

				// Set the border color of the container.
				this.borderColorByMetric(callsite);
			}
		},

		/**
		 * Create ID for each callsite's div.
		 * @param {*} callsiteID
		 */
		getID(callsiteID) {
			return "callsite-information-node-" + callsiteID;
		},

		/**
	     * Color the border of the callsite information block by a metric.
    	 */
		borderColorByMetric(data) {
			const id = "#callsite-information-node-" + data.nid;
			const mean_time = data.mean;
			// const strokeColor =
			// this.$store.runtimeColor.getColorByValue(mean_time);
			const strokeColor = "#f00";
			d3.select(id).style("stroke", strokeColor);
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
		},

		/**
		 *
		 */
		switchIsSelectedCallsite(val) {
			this.isCallsiteSelected = val;
		},

		/**
		 *
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
		 * @param {*} callsite
		 */
		formatModule(callsite) {
			const _m = this.$store.summary[this.$store.selectedTargetDataset]["c2m"][callsite["name"]];
			const splice = 15;
			if (_m.length < splice) {
				return _m;
			}
			return utils.truncNames(_m, splice);
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
     * @param {*} path
     */
		formatNumberOfHops(path) {
			return path[0].length;
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

		formatPath(path) {
			const cMap = this.summary[this.selectedTargetRun]["callsites"];
			let ret = [];
			for (let callsite of path) {	
				ret.push(cMap[callsite]);
			}
			return ret;
		},

		/**
     *
     */
		clear() {
			this.callsites = {};
			EventHandler.$emit("clear-boxplot");
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
			this.$socket.emit("reveal_callsite", {
				mode: this.$store.selectedMode,
				reveal_callsites: this.revealCallsites,
				dataset: this.$store.selectedTargetDataset,
			});

			EventHandler.$emit("reveal-callsite");
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
			} else {
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
			} else {
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
			let callsites_in_module = this.$store.moduleCallsiteMap[
				this.$store.selectedTargetDataset
			][module];

			this.numberOfCallsites = Object.keys(callsites_in_module).length;

			// Set display: none to all .callsite-information-node.
			// This hides the nodes when a supernode is selected.
			for (let callsite in this.callsites) {
				d3.select("#callsite-information-" + callsite.id).style(
					"display",
					"none",
				);
			}

			// Clear up the current callsites map.
			this.callsites = {};

			// Set the data and render each callsite.
			callsites_in_module.forEach((callsite) => {
				this.callsites[callsite] = this.$store.data_cs[
					this.$store.selectedTargetDataset
				][callsite];
				d3.select("#callsite-information-" + this.callsites[callsite].id).style(
					"display",
					"block",
				);
			});
		},

		/**
     *
     */
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
			} else if (this.isCalleeSelected == "select-callsite") {
				this.$socket.emit("split_by_callees", {
					selectedModule: this.$store.selectedModule,
					dataset: this.$store.selectedTargetDataset,
				});
				EventHandler.$emit("split-by-callees");
			}
		},
	},
};
</script>

<style>
#ci-overview {
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

.ci-node {
  padding: 10px 0px 5px 5px;
  margin: 10px;
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