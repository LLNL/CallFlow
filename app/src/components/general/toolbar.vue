<template>
    <v-toolbar id="toolbar" color="teal" dark fixed app clipped-right>
        <v-toolbar-side-icon @click.stop="openSettings()">
            <v-icon>settings</v-icon>
        </v-toolbar-side-icon>
        <v-toolbar-title style="margin-right: 3em">{{ appName }}</v-toolbar-title>
		
        <RunSelection ref="RunSelection" />
		<!-- <ViewSelection ref="ViewSelection" /> -->
    </v-toolbar>
</template>

<script>
// Local imports
import RunSelection from "./runSelection";
// import ViewSelection from "./viewSelection";

export default {
	name: "Toolbar",
	components: {
		RunSelection,
		// ViewSelection,
	},
	props: ["left"],

	data: () => ({
		appName: "CallFlow",
	}),

	methods: {
		openSettings() {
			this.$emit("update:left", !this.left);
		}
	}
};

</script>

<style scoped>
.toolbar {
	padding: 0px 0px 0px;
}

.toolbar > .v-toolbar__content {
	height: 54px !important;
}

.toolbar-title {
	margin-right: 3em; 
	font-size: 26px;
	font-weight: 400;
	color: white;
}
</style>