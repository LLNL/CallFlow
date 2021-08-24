<template>
	<v-container class="pa-0">
		<v-app-bar id="toolbar" color="teal" fixed>
			<div @click.stop="openSettings()" align-left>
				<v-icon color="white">settings</v-icon>
			</div>
			<router-link
				to="/"
				v-slot="{ navigate }">
				<a
					@click="navigate.bind($event)">
					<slot></slot>
					<div class="toolbar-title"> CallFlow </div>
				</a>
			</router-link>
			<RunSelection />
		</v-app-bar>
	</v-container>
</template>

<script>
// Local imports
import RunSelection from "./runSelection";

export default {
	name: "Toolbar",
	components: {
		RunSelection,
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

.toolbar-title {
	margin: 1em; 
	font-size: 22px;
	font-weight: 500;
	color: white;
}
</style>