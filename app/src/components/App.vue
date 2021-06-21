/**
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 *
 * SPDX-License-Identifier: MIT
 */

<template>
	<v-app>
		<v-app-bar color="teal" id="toolbar" app>
			<div class="toolbar-title">
				CallFlow
			</div>
			<v-btn class="mr-md-4">
				<router-link to="/cct" replace>CCT</router-link>
			</v-btn>
			<v-btn class="mr-md-4">
				<router-link to="/super_graph" replace>Super Graph</router-link>
			</v-btn>
			<v-btn class="mr-md-4">
				<router-link to="/ensemble_super_graph" replace>Ensemble Super Graph</router-link>
			</v-btn>
		</v-app-bar>
		<v-main>
			<router-view></router-view>
		</v-main>
		<Footer ref="Footer" :text="footerText" :year="year"></Footer>
	</v-app>
</template>

<script>
// Local library imports
import Color from "lib/color/";

// Local components
import Footer from "./general/footer";

export default {
	name: "App",
	components: {
		Footer,
	},
	data: () => ({
		run_counts: 0,
		footerText: "Lawrence Livermore National Laboratory and VIDi Labs, University of California, Davis",
		year: "2021",
		isDataReady: false,
	}),

	mounted() {
		document.title = "CallFlow";

		this.setGlobalVariables(); // Set the general variables in the store.
		this.setViewDimensions(); // Set the view dimensions.	
	},

	methods: {
		setGlobalVariables() {
			console.log("[App] Set global variables.");
			this.$store.selectedProp = "rank";
		
			// Shoud be specified in the CSS, not here.
			this.$store.fontSize = 14;
			this.$store.transitionDuration = 1000;
				
			// Histogram properties
			this.$store.selectedScale = "Linear";

			// Color properties
			this.$store.runtimeColor = new Color("OrRd");

			// Ensemble color properites
			this.$store.distributionColor = new Color("Greens");
		},
		setViewDimensions() {
			console.log("[App] Set view dimensions.");

			// Set toolbar height 
			let toolbarHeight = 0;
			if (document.getElementById("toolbar") != null) {
				toolbarHeight = document.getElementById("toolbar").clientHeight;
			}

			// Set footer height
			let footerHeight = 0;
			if (document.getElementById("footer") != null) {
				footerHeight = document.getElementById("footer").clientHeight;
			}

			this.$store.viewWidth = window.innerWidth;
			this.$store.viewHeight = window.innerHeight - toolbarHeight - footerHeight;
		},
	},
};
</script>

<style>
* {
	margin: 0;
	padding: 0;
}

.toolbar-title {
	margin: 1em; 
	font-size: 22px;
	font-weight: 400;
	color: white;
}

body {
	font-family: "Open Sans", sans-serif;
	font-size: 1em;
}


.selected {
	stroke: #343838;
	stroke-width: 1px;
}

.unselected {
	stroke: #dbdbdb;
	stroke-width: 3px;
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

.v-chip__content {
	color: white;
	font-size: 1.25em;
}

.scroll {
	overflow-y: auto;
}

.tooltip {
	padding-left: 10px;
	font-size: 0.75em;
	font-weight: 500;
}

.setting-button {
	border: 0px solid !important;
	right: 0px !important;
	color: #009688 !important;
	font-size: 2em !important;
	background-color: white !important;
}

.v-list {
	padding: 8px;
}

.splitpanes.default-theme .splitpanes__pane {
	height: auto;
	background: #f7f7f7 !important;
}

.md-theme-default a:not(.md-button) {
	color: #009687 !important;
}

/* Over write the primary text to avoid blue color change on selection*/
.my-app.v-application .primary--text {
	color: #fff !important;
	caret-color: #fff !important;
}

/** start Lasso CSS */
.drawn {
	fill: rgba(255, 255, 255, 0.5);
	stroke: #009688;
	stroke-width: 1.5px;
}

.origin {
	fill: #009688;
	opacity: 0.5;
}
/** end Lasso CSS */
</style>