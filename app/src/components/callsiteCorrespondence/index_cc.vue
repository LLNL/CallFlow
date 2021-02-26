/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */
<template>
  <v-layout row wrap :id="id">
    <InfoChip ref="InfoChip" :title="title" :summary="summary" />
    <v-layout row wrap v-if="isCallsiteSelected == true">
      <v-btn
        class="ma-1 reveal-button"
        small
        tile
        outlined
        color="white"
        @click="clickCallsite"
      >
        Reveal
      </v-btn>
    </v-layout>

    <v-layout row wrap v-if="isModuleSelected == true">
      <v-btn
        class="ma-1 reveal-button"
        small
        tile
        outlined
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
        outlined
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
        outlined
        color="white"
        v-if="showSplitButton == 'true'"
        @click="split"
      >
        Split
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
	</v-row>

    <v-container
      class="ml-4 callsite-information-node"
      v-for="callsite in differenceCallsites"
      :key="getID(callsite.id)"
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
                  :v-on="on"
                  :class="selectClassName[callsite.name]"
                  @click="changeSelectedClassName"
                >
                  {{ formatNumberOfHops(callsite.component_path) }}
                </v-row>
              </template>
              <span
                >Callsite depth:
                {{ formatNumberOfHops(callsite.component_path) }}</span
              >
            </v-tooltip>
          </v-card>
        </v-col>

        <v-col cols="11">
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

      <v-row class="information">
        <v-col class="pa-0 subtitle-2">
          Module: {{ formatModule(callsite) }}
        </v-col>
      </v-row>
      <v-row>
        <div class="subtitle-2" :style="'color: ' + targetColor">Mean : {{tMeans[callsite.name]}}</div>
        <!-- <div class="subtitle-2" :style="'color: ' + targetColor">Variance : {{variance[callsite.name]}}</div> -->
        <v-col
          class="subtitle-2"
          :style="'color: ' + targetColor"
          v-if="selectedMode == 'Ensemble'"
        >
          Std. Dev. : {{ targetStandardDeviation[callsite.name] }}
          {{ selectedMode }}
        </v-col>
      </v-row>

      <BoxPlot :ref="callsite.id" :callsite="callsite" showTarget="false" />

      <v-row>
        <v-col class="pl-2subtitle-2" :style="'color: ' + ensembleColor">
          Mean : {{ ensembleMeans[callsite.name] }}
        </v-col>
        <v-col class="pl-2subtitle-2" :style="'color: ' + ensembleColor">
          Std. Dev. :
          {{ ensembleStandardDeviation[callsite.name] }}
        </v-col>
      </v-row>
    </v-container>

    <v-container
      class="ml-4 callsite-information-node"
      v-for="callsite in intersectionCallsites"
      :key="getID(callsite.id)"
    >
      <v-row  class="pt-2">
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
                  {{ formatNumberOfHops(callsite.component_path) }}
                </v-row>
              </template>
              <span>
                Callsite depth:{{ formatNumberOfHops(callsite.component_path) }}
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

     <v-row wrap class="information">
		<v-col class="pa-0 subtitle-2">Min : {{ tMin[callsite.name] }}</v-col>
		<v-col class="pa-0 subtitle-2">Max : {{ tMax[callsite.name] }}</v-col>
      </v-row>
      <v-row wrap class="information">
        <v-col class="pa-0 subtitle-2">Mean : {{ tMean[callsite.name] }}</v-col>
      </v-row>
      <v-row wrap class="information">
        <v-col class="pa-0 subtitle-2"
          >Variance : {{ tVariance[callsite.name] }}</v-col
        >
        <v-col class="pa-0 subtitle-2"
          >Imbalance : {{ tImb[callsite.name] }}</v-col
        >
      </v-row>
      <v-row wrap class="information">
        <v-col class="pa-0 subtitle-2">
          Kurtosis : {{ tKurt[callsite.name] }}
        </v-col>
        <v-col class="pa-0 subtitle-2">
          Skewness : {{ tSkew[callsite.name] }}
        </v-col>
      </v-row>

      <BoxPlot :ref="callsite.id" :callsite="callsite" showTarget="false" />
      

	<v-row wrap class="information">
		<v-col class="pa-0 subtitle-2">Min : {{ eMin[callsite.name] }}</v-col>
		<v-col class="pa-0 subtitle-2">Max : {{ eMax[callsite.name] }}</v-col>
      </v-row>
      <v-row wrap class="information">
        <v-col class="pa-0 subtitle-2">Mean : {{ eMean[callsite.name] }}</v-col>
      </v-row>
      <v-row wrap class="information">
        <v-col class="pa-0 subtitle-2"
          >Variance : {{ eVariance[callsite.name] }}</v-col
        >
        <v-col class="pa-0 subtitle-2"
          >Imbalance : {{ eImb[callsite.name] }}</v-col
        >
      </v-row>
      <v-row wrap class="information">
        <v-col class="pa-0 subtitle-2">
          Kurtosis : {{ eKurt[callsite.name] }}
        </v-col>
        <v-col class="pa-0 subtitle-2">
          Skewness : {{ eSkew[callsite.name] }}
        </v-col>
      </v-row>
    </v-container>
  </v-layout>
</template>

<script>
// Library imports
import * as d3 from "d3";

// Local library imports
import * as utils from "lib/utils";
import EventHandler from "lib/routing/EventHandler";

import InfoChip from "../general/infoChip";

// Local component imports
import BoxPlot from "./boxplot";

export default {
	name: "CallsiteCorrespondence",
	components: {
		BoxPlot,
		InfoChip,
	},
	data: () => ({
		selected: {},
		id: "auxiliary-function-overview",
		people: [],
		title: "Call Site Correspondence",
		summary: "",
		callsites: [],
		dataReady: false,
		numberOfIntersectionCallsites: 0,
		numberOfDifferenceCallsites: 0,
		firstRender: true,
		padding: {top: 0, right: 10, bottom: 0, left: 10},
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
			{title: "Sort by Inclusive runtime"},
			{title: "Sort by Exclusive Runtime"},
		],
		compareMode: false,
		selectedModule: "",
		selectedCallsite: "",
		informationHeight: 70,
		revealCallsites: [],
		selectedMetric: "",
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
		selectedMode: "Single",
		tMin: {},
		tMax: {},
		tMean: {},
		tVariance: {},
		tImb: {},
		tKurt: {},
		tSkew: {},
		eMin: {},
		eMax: {},
		eMean: {},
		eVariance: {},
		eImb: {},
		eKurt: {},
		eSkew: {},
	}),
	mounted() {
		let self = this;

		EventHandler.$on("highlight-dataset", (data) => {
			let dataset = data["dataset"];
			if (self.$store.showTarget) {
				self.highlightCallsitesByDataset(dataset);
			}
		});

		EventHandler.$on("highlight-datasets", (datasets) => {
			console.log("[Interaction] Highlighting the datasets :", datasets);
			self.highlight(datasets);
		});

		EventHandler.$on("ensemble-select-module", (data) => {
			let thismodule = data["module"];
			// self.selectCallsitesByModule(thismodule)
			this.isModuleSelected = true;
			self.selectModule(thismodule);
		});

		EventHandler.$on("callsite-correspondence-sort", (val) => {
			self.$store.selectedRuntimeSortBy = val;
			self.differenceCallsites = self.sortByAttribute(
				self.knc["difference"],
				val,
			);
			self.intersectionCallsites = self.sortByAttribute(
				self.knc["intersection"],
				val,
			);
		});
	},

	methods: {
		init() {
			if (this.firstRender) {
				this.width = document.getElementById(this.id).clientWidth;
				let heightRatio = this.$store.selectedMode == "Ensemble" ? 0.65 : 1.0;
				this.height = heightRatio * this.$store.viewHeight;
				this.boxplotWidth = this.width - this.padding.left - this.padding.right;
				document.getElementById(this.id).style.maxHeight = this.height + "px";
				this.firstRender = false;
			}
			this.visualize();
		},

		visualize() {
			this.setStates();
			this.boxplotByMetric();
			// this.borderColorByMetric()
		},

		setStates() {
			this.callsites = this.$store.data_cs["ensemble"];
			this.targetCallsites = this.$store.data_cs[this.$store.selectedTargetDataset];

			this.knc = this.KNC();

			this.numberOfDifferenceCallsites = Object.keys(
				this.knc["difference"],
			).length;
			this.numberOfIntersectionCallsites = Object.keys(
				this.knc["intersection"],
			).length;

			this.differenceCallsites = this.sortByAttribute(
				this.knc["difference"],
				this.$store.selectedMetric,
			);
			this.intersectionCallsites = this.sortByAttribute(
				this.knc["intersection"],
				this.$store.selectedMetric,
			);

			this.intersectionCallsites = this.hideAllCallsites(
				this.intersectionCallsites,
			);
			this.differenceCallsites = this.hideAllCallsites(
				this.differenceCallsites,
			);

			this.selectedModule = this.$store.selectedModule;
			this.selectedMode = this.$store.selectedMode;
			this.selectedCallsite = this.$store.selectedCallsite;
			this.selectedMetric = this.$store.selectedMetric;
			if (this.$store.selectedMetric == "Ensemble") {
				this.ensembleColor = d3
					.rgb(this.$store.distributionColor.ensemble)
					.darker(1);
				this.targetColor = d3
					.rgb(this.$store.distributionColor.target)
					.darker(1);
			} else {
				// There is actually no target for single run. But we just set the value.
				this.ensembleColor = this.$store.runtimeColor.textColor;
				this.targetColor = this.$store.runtimeColor.textColor;
			}
		},

		boxplotByMetric() {
			for (let callsite in this.callsites) {
				const t_data = this.targetCallsites[callsite][this.selectedMetric];
				const e_data = this.callsites[callsite][this.selectedMetric];

				if (this.targetCallsites[callsite] != undefined) {
					this.tMin[callsite] = utils.formatRuntimeWithoutUnits(t_data["min"]);
					this.tMax[callsite] = utils.formatRuntimeWithoutUnits(t_data["max"]);
					this.tMean[callsite] = utils.formatRuntimeWithoutUnits(t_data["mean"]);
					this.tVariance[callsite] = utils.formatRuntimeWithoutUnits(t_data["var"]);
					this.tImb[callsite] = utils.formatRuntimeWithoutUnits(t_data["imb"]);
					this.tKurt[callsite] = utils.formatRuntimeWithoutUnits(t_data["kurt"]);
					this.tSkew[callsite] = utils.formatRuntimeWithoutUnits(t_data["skew"]);
				} else {
					this.tMeans[callsite] = 0;
					this.tVariance[callsite] = 0;
				}

				this.eMin[callsite] = utils.formatRuntimeWithoutUnits(e_data["min"]);
				this.eMax[callsite] = utils.formatRuntimeWithoutUnits(e_data["max"]);
				this.eMean[callsite] = utils.formatRuntimeWithoutUnits(e_data["mean"]);
				this.eVariance[callsite] = utils.formatRuntimeWithoutUnits(e_data["var"]);
				this.eImb[callsite] = utils.formatRuntimeWithoutUnits(e_data["imb"]);
				this.eKurt[callsite] = utils.formatRuntimeWithoutUnits(e_data["kurt"]);
				this.eSkew[callsite] = utils.formatRuntimeWithoutUnits(e_data["skew"]);
				this.selectClassName[callsite] = "unselect-callsite";
			}
		},

		borderColorByMetric() {
			for (let callsite in this.intersectionCallsites) {
				let callsite_data = this.intersectionCallsites[callsite];
				let data = callsite_data[this.$store.selectedMetric]["mean"];
				let id = "callsite-information-" + callsite_data.id;
				document.getElementById(
					id,
				).style.borderColor = this.$store.color.getColorByValue(data);
			}
		},

		// create unique ID for each callsite.
		getID(callsiteID) {
			return "callsite-correspondence-" + callsiteID;
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

		formatNumberOfHops(path) {
			return path.length - 1;
		},

		formatRuntime(val) {
			let format = d3.format(".2");
			let ret = format(val) + " \u03BCs";
			return ret;
		},

		// Find the known node correspondence.
		KNC() {
			let callsites = new Set(Object.keys(this.$store.data_cs["ensemble"]));
			let targetCallsites = new Set(
				Object.keys(this.$store.data_cs[this.$store.selectedTargetDataset]),
			);
			let difference = new Set(
				[...callsites].filter((x) => !targetCallsites.has(x)),
			);

			let intersection = new Set(
				[...callsites].filter((x) => targetCallsites.has(x)),
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

		clear() {},

		dataset(idx) {
			return this.labels[idx];
		},

		clickCallsite(event) {
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

		// Sort the callsite information view by the attribute.
		sortByAttribute(callsites, attribute) {
			// Create items array
			let self = this;
			let items = callsites.map(function (key) {
				return [key, self.callsites[key]];
			});

			items = items.sort( (first, second) => {
				return second[1][this.$store.selectedMetric][attribute] - first[1][this.$store.selectedMetric][attribute];
			});

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
#auxiliary-function-overview {
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

.callsite-information-node {
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