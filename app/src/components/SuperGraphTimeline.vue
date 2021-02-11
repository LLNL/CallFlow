/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
  <v-app id="inspire">
    <v-toolbar id="toolbar" color="teal" dark fixed app clipped-right>
      <v-toolbar-side-icon @click.stop="left = !left">
        <v-icon>settings</v-icon>
      </v-toolbar-side-icon>
      <v-toolbar-title style="margin-right: 3em">{{ appName }}</v-toolbar-title>
    </v-toolbar>

    <v-navigation-drawer v-model="left" temporary fixed>
    </v-navigation-drawer>

    <v-content class="pt-auto" v-if="selectedMode == 'Single'">
      
    </v-content>

    <v-footer id="footer" color="teal" app>
      Lawrence Livermore National Laboratory and VIDi Labs, University of
      California, Davis
      <v-spacer></v-spacer>
      <span>&copy; 2020</span>
    </v-footer>
  </v-app>
</template>

<script>
import * as d3 from "d3";
import Splitpanes from "splitpanes";
import "splitpanes/dist/splitpanes.css";

import Color from "lib/color/";

import EventHandler from "lib/routing/EventHandler";

import * as utils from "lib/utils";

export default {
	name: "TimelineSuperGraph",
	components: {
		
	},

	watch: {
	
	},

	data: () => ({
		appName: "CallFlow",		
	}),

	mounted() {
	},

	methods: {
		
	},
};
</script>