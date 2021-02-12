<template>
    <v-toolbar id="toolbar" color="teal" dark fixed app clipped-right>
        <v-toolbar-side-icon @click.stop="openSettings()">
            <v-icon>settings</v-icon>
        </v-toolbar-side-icon>
        <v-toolbar-title class="toolbar-title">{{ appName }}</v-toolbar-title>
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
	props: ["isSettingsOpen"],

	data: () => ({
		appName: "CallFlow",
	}),

	methods: {
		openSettings() {
			this.$emit("update:isSettingsOpen", !this.isSettingsOpen);
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
	margin: 0.5em; 
	font-size: 22px;
	font-weight: 400;
	color: white;
}
</style>