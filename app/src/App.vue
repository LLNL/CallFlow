<!--
/*******************************************************************************
 * Copyright (c) 2020, Lawrence Livermore National Security, LLC.
 * Produced at the Lawrence Livermore National Laboratory.
 *
 * Written by Suraj Kesavan <spkesavan@ucdavis.edu>.
 *
 * LLNL-CODE-740862. All rights reserved.
 *
 * This file is part of CallFlow. For details, see:
 * https://github.com/LLNL/CallFlow
 * Please also read the LICENSE file for the MIT License notice.
 ******************************************************************************/
-->
<template>
  <v-app>
    <div id="app">
      <v-toolbar id="toolbar" color="teal" fixed app clipped-right>
        <v-toolbar-title style="margin-right: 3em; color: white">CallFlow</v-toolbar-title>

        <v-btn outlined>
          <router-link to="/single">Single</router-link>
        </v-btn>

        <v-btn outlined v-if="runCounts > 1">
          <router-link to="/ensemble">Ensemble</router-link>
        </v-btn>
      </v-toolbar>

      <router-view></router-view>
      <v-content>
        <v-layout>
          <v-container fluid>
            <v-card tile>
              <v-card-title>Experiment: {{ data.runName }}</v-card-title>
            </v-card>
            <v-card tile>
              <v-card-title>Data Path: {{ data.data_path }}</v-card-title>
            </v-card>
            <v-card tile>
              <v-card-title>Runtime Information</v-card-title>
              <v-data-table
                dense
                :headers="runtimeHeaders"
                :items="runtime"
                :items-per-page="5"
                class="elevation-1"
              >
                <template slot="items" slot-scope="props">
                  <tr>
                    <td nowrap="true">{{ props.item.dataset }}</td>
                    <td nowrap="true">{{ props.item.min_inclusive_runtime }}</td>
                    <td nowrap="true">{{ props.item.max_inclusive_runtime }}</td>
                    <td nowrap="true">{{ props.item.min_exclusive_runtime }}</td>
                    <td nowrap="true">{{ props.item.max_exclusive_runtime }}</td>
                  </tr>
                </template>
              </v-data-table>
            </v-card>
            <!-- <v-card tile>
              <v-card-title>Module Callsite Mapping</v-card-title>
              <v-data-table
                dense
                :headers="moduleHeaders"
                :items="modules"
                :items-per-page="5"
                :single-expand="singleExpand"
                :expanded.sync="expanded"
                item-key="name"
                show-expand
                class="elevation-1"
              >
                <template slot="items" slot-scope="props">
                  <tr>
                    <td nowrap="true">{{ props.item.module }}</td>
                    <td nowrap="true">{{ props.item.inclusive_runtime }}</td>
                    <td nowrap="true">{{ props.item.exclusive_runtime }}</td>
                    <td nowrap="true">{{ props.item.imbalance_perc }}</td>
                    <td nowrap="true">{{ props.item.number_of_callsites }}</td>
                    <td nowrap="true">
                      <v-icon @click="expand(!isExpanded)">keyboard_arrow_down</v-icon>
                    </td>
                  </tr>
                </template>

                <template v-slot:expanded-item="{ headers, item }">
                  <td :colspan="headers.length">More info about {{ item.name }}</td>
                </template>
              </v-data-table>
            </v-card>-->
          </v-container>
        </v-layout>
      </v-content>
    </div>
  </v-app>
</template>

<script>
export default {
  name: "App",
  data: () => ({
    data: {},
    runCounts: 0,
    runtimeHeaders: [
      { text: "Run", value: "dataset" },
      {
        text: "Min. Inclusive runtime (\u03BCs)",
        value: "min_inclusive_runtime"
      },
      {
        text: "Max. Inclusive runtime (\u03BCs)",
        value: "max_inclusive_runtime",
        sortable: true
      },
      {
        text: "Min. Exclusive runtime (\u03BCs)",
        value: "min_exclusive_runtime"
      },
      {
        text: "Max. Exclusive runtime (\u03BCs)",
        value: "max_exclusive_runtime"
      }
    ],
    runtime: [],
    expanded: [],
    singleExpand: false,
    moduleHeaders: [
      { text: "Module", value: "module" },
      {
        text: "Inclusive runtime (\u03BCs)",
        value: "inclusive_runtime",
        sortable: true
      },
      { text: "Exclusive runtime (\u03BCs)", value: "exclusive_runtime" },
      { text: "Imbalance perc (%)", value: "imbalance_perc" },
      { text: "Number of Callsites", value: "number_of_callsites" },
      { text: "", value: "data-table-expand" }
    ],
    modules: []
  }),
  sockets: {
    config(data) {
      this.data = JSON.parse(data);
      this.runCounts = this.data.dataset_names.length;
      // set the data for runtime.
      for (let dataset of this.data.dataset_names) {
        this.runtime.push({
          dataset: dataset,
          min_inclusive_runtime: this.data.minIncTime[dataset],
          max_inclusive_runtime: this.data.maxIncTime[dataset],
          min_exclusive_runtime: this.data.minExcTime[dataset],
          max_exclusive_runtime: this.data.maxExcTime[dataset]
        });
      }
      for (let module in this.data.module_callsite_map) {
        this.modules.push({
          module: module,
          number_of_callsites: this.data.module_callsite_map[module].length
        });
      }
    }
  },
  mounted() {
    this.$socket.emit("config", {});
  },
  methods: {}
};
</script>

<style>
#toolbar {
  padding: 0px 0px 0px;
}

#toolbar > .v-toolbar__content {
  height: 54px !important;
}

#vis {
  border: 2px solid #e1e1e1;
}

.node rect {
  stroke: #333;
  fill: #fff;
}

.edgePath path {
  stroke: #333;
  fill: #333;
  stroke-width: 1.5px;
}

.v-text-field {
  padding-top: 0px;
}

.vue-slider {
  display: inline-block;
  left: 30px;
}

.node circle {
  /*fill: #fff;*/
  stroke: black;
  stroke-width: 0.5px;
}

.node text {
  font: 12px sans-serif;
}

.link {
  fill: none;
  stroke: black;
  stroke-width: 5px;
}

.selected {
  stroke: #343838;
  stroke-width: 1px;
}

.unselected {
  stroke: #dbdbdb;
  stroke-width: 3px;
}

.big_text {
  font-size: 32px;
}

* {
  margin: 0;
  padding: 0;
}

body {
  top: -10px !important;
  font-family: "Open Sans", sans-serif;
  margin-bottom: 0px;
  height: 99%;
  font-size: 16px;
}
.column#side_vis {
  padding-bottom: 0px !important;
  margin-right: -10em !important;
  padding-right: -10em !important;
}

.ui.vis {
  height: 98% !important;
}

.tight {
  margin-left: -1em;
}
.ui.segment.vis_container {
  margin-right: -1em;
}

.small_container#control {
  height: 33% !important;
}

#nodeInfo {
  height: 65% !important;
}

#other {
  height: 32% !important;
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

#flist_view {
  overflow-y: scroll;
  max-height: 100vh;
}

#vis {
  border: 2px;
  border-color: #000;
}

.v-chip__content {
  color: white;
  font-size: 125%;
}

.scroll {
  overflow-y: auto;
}

/* Lasso CSS*/
.drawn {
  fill: rgba(255, 255, 255, 0.5);
  stroke: #009688;
  stroke-width: 1.5px;
}

.origin {
  fill: #009688;
  opacity: 0.5;
}
#auxiliary-function-overview,
#callsite-information-overview {
  overflow: auto;
}

#function-overview {
  overflow: auto;
}

.auxiliary-node {
  padding: 10px;
  margin: 3px;
  border-width: 1px;
  border-style: solid;
  border-color: #a7a7a7;
}

.reveal-button {
  float: right;
  margin: 1px;
  color: #009688 !important;
  font-size: 75%;
  padding: 2px;
}

.tooltip {
  padding-left: 10px;
  font-size: 14px;
  font-weight: 500;
}

.jbtn-file {
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.jbtn-file input[type="file"] {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 100%;
  min-height: 100%;
  text-align: right;
  filter: alpha(opacity=0);
  opacity: 0;
  outline: none;
  cursor: inherit;
  display: block;
}
.vue-slider-dot-tooltip-inner {
  font-size: 14px !important;
  white-space: nowrap !important;
  border-radius: 5px !important;
  padding: 0px 0px !important;
  border-color: #1a6059 !important;
  background-color: white !important;
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.15) !important;
  transform: scale(0.9) !important;
  transition: transform 0.3s !important;
  color: #1a6059 !important;
}

.setting-button {
  border: 0px solid !important;
  right: 0px !important;
  color: #009688 !important;
  font-size: 36px !important;
  background-color: white !important;
}

.component-info {
  color: #009688;
  padding: 8px;
}

.component-data {
  color: #009688;
  padding: 0px;
}

.v-list {
  padding: 8px;
}

.splitpanes.default-theme .splitpanes__pane {
  background: #f7f7f7 !important;
}

#parameter-projection-view {
  background: #f7f7f7 !important;
}

.md-theme-default a:not(.md-button) {
  color: #009687 !important;
}

.valueText {
  font-weight: 700 !important;
}

.chip {
  font-weight: 500 !important;
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

#footer {
  color: #fff;
}
</style>
