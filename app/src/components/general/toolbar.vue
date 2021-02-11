<template>
    <v-toolbar id="toolbar" color="teal" dark fixed app clipped-right>
        <v-toolbar-side-icon @click.stop="left = !left">
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

	data: () => ({
		appName: "CallFlow",
		left: false,
	}),
};

</script>