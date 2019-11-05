<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>
export default {
  name: "App"
};
</script>

<style>
#toolbar{
	padding: 0px 0px 0px;
}

#toolbar > .v-toolbar__content{
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

.node text { font: 12px sans-serif; }

.link {
  fill: none;
  /*stroke: #ccc;*/
  /*stroke: #555;*/
  stroke: black;
  stroke-width: 5px;
  /*opacity: 0;*/
}

.selected{
    stroke: #009688;
    stroke-width: 5px;
}

.unselected{
    stroke: black;
    stroke-width: 2px;    
}

.big_text{
    font-size: 32px;
}

*{
	margin: 0;
	padding: 0;
}

body{
	top: -10px !important;
	font-family: 'Open Sans', sans-serif;
	margin-bottom: 0px;
	height: 99%;
}

/* #content{
	height: 98% !important;
	padding-top: 15px;
}

.m-b-reset{
	margin-bottom: 0px !important;
}

.padding-reset{
	padding: 0px !important;
}

.ui .message{
	padding-top: 30px !important;
	padding-bottom:  50px !important;
}

.m-top-10{
	margin-top: 10px !important;
}

.hidden{
	opacity: 0;
}

.ui .button{
	text-transform: capitalize;
}

.ui.grid{
	margin-top: -1rem;
	margin-bottom: -1rem;
	margin-left: -0.5rem !important;
	margin-right: -0.5rem !important;
	height: 100% !important;
}

.ui.segment{
	height: 100% !important;

	/*this lines modify the border*/
	/*border: 1px solid !important;*/
/* } */
.column#side_vis{
	padding-bottom: 0px !important;
	margin-right: -10em !important;
	padding-right: -10em !important;
}
/*#main_vis{
	height : 100% !important;
}*/
.ui.vis{
	height: 98% !important;
}

.tight{
	margin-left: -1em;
	/*padding-right: -1em;*/
}
.ui.segment.vis_container{
	margin-right: -1em;
}

.small_container#control{
	height: 33% !important;
}
#nodeInfo{
	/*height: 33% !important;*/
	height: 65% !important;
}
#other{
	height: 32% !important;
}


.box {
    font: 10px sans-serif;
}

.box line,
.box rect,
.box circle {
    fill: steelblue;
    stroke: #000;
    stroke-width: 1.5px;
}

.box .center {
    stroke-dasharray: 3,3;
}

.box .outlier {
    fill: none;
    stroke: #000;
}

#flist_view{
    overflow-y: scroll;
    max-height: 100vh;
}

#vis {
	border: 2px;
	border-color: #000;
}

.v-chip__content{
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
</style>