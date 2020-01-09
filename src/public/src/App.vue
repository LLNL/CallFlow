<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
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
  /*stroke: #ccc;*/
  /*stroke: #555;*/
  stroke: black;
  stroke-width: 5px;
  /*opacity: 0;*/
}

.selected {
  stroke: #009688;
  stroke-width: 5px;
}

.unselected {
  stroke: black;
  stroke-width: 2px;
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
  font-family: 'Open Sans', sans-serif;
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

#run-information {
  max-height: 400px;
}

#auxiliary-function-overview {
  max-height: 350px;
  overflow: auto;
  background: white;
}

.auxiliary-node {
  padding: 10px;
  margin: 3px;
  border-color: #7b7474;
  border-width: 3px;
  border-style: solid;
}

.reveal-button {
  float: right;
  margin: 2px;
  border: grey;
  border-style: outset;
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

.jbtn-file input[type='file'] {
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
    border-color: #1A6059 !important;
    background-color: white !important;
    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.15) !important;
    transform: scale(0.9) !important;
    transition: transform 0.3s !important;
    color: #1A6059 !important;
}
</style>
