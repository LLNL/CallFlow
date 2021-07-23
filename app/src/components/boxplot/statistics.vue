<template>
    <v-row>
        <v-col cols="6" wrap> 
            <v-col class="pa-0 subtitle-2">Min : {{ tData.min }}</v-col>
            <v-col class="pa-0 subtitle-2">Max : {{ tData.max }}</v-col>
            <v-col class="pa-0 subtitle-2">Mean : {{ tData.mean }}</v-col>
            <v-col class="pa-0 subtitle-2">Variance : {{ tData.var }}</v-col>
            <v-col class="pa-0 subtitle-2">Imbalance : {{ tData.imb }}</v-col>
            <v-col class="pa-0 subtitle-2">Kurtosis : {{ tData.kurt }}</v-col>
            <v-col class="pa-0 subtitle-2">Skewness : {{ tData.skew }}</v-col>
        </v-col>
        <v-col cols="6" wrap v-if="bData">  
            <v-col class="pa-0 subtitle-2 green--text">Min : {{ bData.min }}</v-col>
            <v-col class="pa-0 subtitle-2 green--text">Max : {{ bData.max }}</v-col>
            <v-col class="pa-0 subtitle-2 green--text">Mean : {{ bData.mean }}</v-col>
            <v-col class="pa-0 subtitle-2 green--text">Variance : {{ bData.var }}</v-col>
            <v-col class="pa-0 subtitle-2 green--text">Imbalance : {{ bData.imb }}</v-col>
            <v-col class="pa-0 subtitle-2 green--text">Kurtosis : {{ bData.kurt }}</v-col>
            <v-col class="pa-0 subtitle-2 green--text">Skewness : {{ bData.skew }}</v-col>
        </v-col>
    </v-row>
</template>

<script>

export default {
	name: "Statistics", 
	props: ["bData", "tData"],
	created() {
		this.id = "statistics" + this.tData.nid;
	},
};
</script>