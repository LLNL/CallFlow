<template>
    <v-flex xs12 class="ml-4 mt-4 mb-6">
        <v-row align="center" justify="space-around">
        <v-btn class="mx-10" icon>
            <span> Reload </span>
            <v-icon v-on:click="reset()">refresh</v-icon>
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn class="mx-4" icon>
            <v-icon v-on:click="closeSettings()">close</v-icon>
        </v-btn>
        </v-row>
    </v-flex>
</template>

<script>
export default {
	name: "Header",
	props: ["reset", "closeSettings"],
};
</script>