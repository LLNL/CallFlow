/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
  <v-layout row wrap :id="id">
    <InfoChip ref="InfoChip" :title="title" :summary="summary" :info="info" />
    <v-layout row wrap v-if="isCallsiteSelected == true">
      <v-btn
        class="ma-1 reveal-button"
        small
        tile
        color="white"
        @click="revealCallsite"
      >
        Reveal
      </v-btn>
    </v-layout>

    <v-layout row wrap v-if="isModuleSelected == true">
      <v-btn
        class="ma-1 reveal-button"
        small
        tile
        color="white"
        :class="isEntryFunctionSelected"
        @click="showEntryFunctions"
      >
        Entry call sites
      </v-btn>
      <v-btn
        class="ma-1 reveal-button"
        small
        tile
        color="white"
        :class="isCalleeSelected"
        @click="showExitFunctions"
      >
        Callees
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
        class="ma-1 reveal-button"
        small
        tile
        color="white"
        v-if="showSplitButton == 'true'"
        @click="split"
      >
        Split
      </v-btn>
    </v-layout>

    <v-container
      class="ml-4 callsite-information-node"
      v-for="callsite in callsites"
      :key="getID(callsite.nid)"
    >
      <v-row class="pt-2">
        <!-- <v-col cols="1" >
          <v-card class="ma-2 ml-4" tile outlined>
            <v-tooltip bottom>
              <template v-slot:activator="{on}">
                <v-row
                  class="pl-2"
                  :id="callsite.name"
                  v-on="on"
                  :class="selectClassName[callsite.name]"
                  @click="changeSelectedClassName"
                >
                  {{ formatNumberOfHops(callsite.component_path) }}
                </v-row>
              </template>
              <span>
                Callsite depth:{{ formatNumberOfHops(callsite.component_path) }}
              </span>
            </v-tooltip>
          </v-card>
        </v-col> -->

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

      <v-row class="information">
        <!-- <v-col class="pa-0 subtitle-2">
          Module: {{ formatModule(callsite) }}
        </v-col> -->
      </v-row>
      <v-row wrap class="information">
		<v-col class="pa-0 subtitle-2">Min : {{ min[callsite.name] }}</v-col>
		<v-col class="pa-0 subtitle-2">Max : {{ max[callsite.name] }}</v-col>
      </v-row>
      <v-row wrap class="information">
        <v-col class="pa-0 subtitle-2">Mean : {{ mean[callsite.name] }}</v-col>
        <v-spacer></v-spacer>
      </v-row>
      <v-row wrap class="information">
        <v-col class="pa-0 subtitle-2"
          >Variance : {{ variance[callsite.name] }}</v-col
        >
        <v-col class="pa-0 subtitle-2"
          >Imbalance : {{ imb[callsite.name] }}</v-col
        >
      </v-row>
      <v-row wrap class="information">
        <v-col class="pa-0 subtitle-2">
          Kurtosis : {{ kurt[callsite.name] }}
        </v-col>
        <v-col class="pa-0 subtitle-2">
          Skewness : {{ skew[callsite.name] }}
        </v-col>
      </v-row>

      <BoxPlot :ref="callsite.nid" :data="boxplot[callsite.name]" />
    </v-container>
  </v-layout>
</template>

<script>
// Library imports
import * as d3 from "d3";

// Local library imports
import * as utils from "lib/utils";
import EventHandler from "lib/routing/EventHandler";
import APIService from "lib/routing/APIService";

import InfoChip from "../general/infoChip";

// Local component imports
import BoxPlot from "./boxplot";

export default {
	name: "CallsiteInformation",
	components: {
		BoxPlot,
		InfoChip,
	},
	data: () => ({
		id: "callsite-information-overview",
		title: "Call site Information",
		summary: "Call site Information view provides an insight into the runtime distribution among its MPI ranks. Boxplots are calculated to represent the range of the distribution and outliers (dots) correspond to the ranks which are beyond the 1.5*IQR. Additionally, several statistical measures are also provided.",
		info: "",
		callsites: [],
		numberOfcallsites: 0,
		firstRender: true,
		padding: {top: 0, right: 10, bottom: 0, left: 10},
		textOffset: 25,
		boxplotHeight: 340,
		boxplotWidth: 0,
		duration: 300,
		iqrFactor: 0.15,
		outlierRadius: 4,
		outlierList: {},
		callsiteIDMap: {},
		settings: [
			{title: "Sort by Inclusive runtime"},
			{title: "Sort by Exclusive Runtime"},
		],
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
		min: {},
		max: {},
		mean: {},
		variance: {},
		imb: {},
		kurt: {},
		skew: {},
		boxplot: {},
	}),

	mounted() {
		let self = this;

		EventHandler.$on("single-boxplots", () =>  {
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
			self.$store.selectedRuntimeSortBy = val;
			self.callsites = self.sortByAttribute(self.callsites, val);
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

			// Initiate the data fetching. 
			EventHandler.$emit("single-boxplots");
		},

		/**
		 * Visualizes the callsite information in the view.
		 * Three things are performed.
		 */
		async visualize() {
			const data = await APIService.POSTRequest("single_boxplots", {
				dataset: this.$store.selectedTargetDataset,
				metric: this.$store.selectedMetric,
				callsites: [
					"LagrangeElements",
					"UpdateVolumesForElems",
					"CalcLagrangeElements",
					"CalcKinematicsForElems",
					"CalcQForElems",
					"CalcMonotonicQGradientsForElems",
					"CalcMonotonicQRegionForElems",
					"ApplyMaterialPropertiesForElems",
					"EvalEOSForElems",
					"CalcEnergyForElems",
					"CalcPressureForElems",
					"CalcSoundSpeedForElems",
					"IntegrateStressForElems",
					"UpdateVolumesForElems"
				],
				ntype: "callsite",
			});

			// Sort the callsites.
			this.callsites = this.sortByAttribute(
				data,
				this.$store.selectedMetric,
				"mean",
				"tgt"
			);

			console.log(this.callsites);

			this.numberOfcallsites = Object.keys(this.callsites).length;
			// Set from Application store.
			this.selectedModule = this.$store.selectedModule;
			this.selectedMode = this.$store.selectedMode;
			this.selectedCallsite = this.$store.selectedCallsite;
			this.selectedMetric = this.$store.selectedMetric;
			this.targetColor = this.$store.runtimeColor.textColor;

			this.info = this.numberOfcallsites + " call sites";

			this.process();
		},

		/**
		 * Create ID for each callsite's div.
		 * @param {*} callsiteID
		 */
		getID(callsiteID) {
			console.log(callsiteID);
			return "callsite-information-node-" + callsiteID;
		},

		/**
	     * Color the border of the callsite information block by a metric.
    	 */
		borderColorByMetric(data) {
			const id = "#callsite-information-node-" + data.nid;
			const mean_time = data["mean"];
			const strokeColor = this.$store.runtimeColor.getColorByValue(mean_time);
			d3.select(id).style("stroke", strokeColor);
		},

		/**
		 * Process the data for callsites
		 */
		process() {
			for (let callsite_name in this.callsites) {
				let callsite = this.callsites[callsite_name];

				// Set the border color of the container.
				this.borderColorByMetric(callsite);

				// Set the dictionaries for metadata information. 
				this.min[callsite_name] = utils.formatRuntimeWithoutUnits(callsite["min"]);
				this.max[callsite_name] = utils.formatRuntimeWithoutUnits(callsite["max"]);
				this.mean[callsite_name] = utils.formatRuntimeWithoutUnits(callsite["mean"]);
				this.variance[callsite_name] = utils.formatRuntimeWithoutUnits(callsite["var"]);
				this.imb[callsite_name] = utils.formatRuntimeWithoutUnits(callsite["imb"]);
				this.kurt[callsite_name] = utils.formatRuntimeWithoutUnits(callsite["kurt"]);
				this.skew[callsite_name] = utils.formatRuntimeWithoutUnits(callsite["skew"]);
				
				// Set the data for the boxplot.
				this.boxplot[callsite.name] = {"q": callsite["q"], "outliers": callsite["outliers"], "nid": callsite["nid"]};

				// Set the selection for a callsite. 
				this.selectClassName[callsite.name] = "unselect-callsite";
			}
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
				return second[1][metric][attribute] - first[1][metric][attribute];
			});

			callsites = items.reduce(function (map, obj) {
				map[obj[0]] = obj[1][metric];
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
			console.log(name);
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
			return path.length - 1;
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
#callsite-information-overview {
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
  color: #009688 !important;
  font-size: 75%;
  padding: 2px;
}

.callsite-information-node {
  padding: 10px 0px 5px 5px;
  /* padding-bottom: 4px;
	padding-top:5px; */
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

.information {
  margin-left: 15px;
  font-size: 16px;
}
</style>