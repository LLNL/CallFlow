/** 
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
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

import Color from "../lib/color/color";
import Splitpanes from "splitpanes";
import "splitpanes/dist/splitpanes.css";

import EventHandler from "./EventHandler";

import io from "socket.io-client";
import * as utils from "./utils";

export default {
	name: "ExperimentalCallFlow",
	components: {
		
	},

	watch: {
		showTarget: function(val) {
			EventHandler.$emit("show-target-auxiliary");
		},
	},

	data: () => ({
		appName: "CallFlow",
		server: "localhost:5000",
		config: {
			headers: {
				"Access-Control-Allow-Origin": "*",
			},
		},
		
	}),

	mounted() {
		var socket = io.connect(this.server, { reconnect: false });
		this.$socket.emit("init", {
			mode: this.selectedMode,
		});
	},

	beforeDestroy() {
		//Unsubscribe on destroy
		this.$socket.emit("disconnect");
	},

	sockets: {
		
	},

	methods: {
		
	},
};
</script>