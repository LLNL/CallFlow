<template>
    <v-container v-if="!isDataReady" fill-height fluid>
        <v-row align="center" justify="center">
            <v-col align="center">
                <v-progress-circular indeterminate color="teal"></v-progress-circular>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
export default {
	name: "Loader",
	props: ["isDataReady"]
};
</script>