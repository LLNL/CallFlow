:wq<template>
    <v-col>
        <v-row cols="12" class="ma-1">
            <v-subheader class="teal lighten-4">{{ subHeading }}</v-subheader>
        </v-row>
        <v-row cols="12" class="ma-1">
            <v-select
            label="Metric"
            :items="metrics"
            v-model="selectedMetric"
            :menu-props="{maxHeight: '200'}"
            persistent-hint
            >
            </v-select>
        </v-row>
    </v-col>
</template>

<script>
export default {
	name: "Select",
	props: ["subHeading"],
};
</script>