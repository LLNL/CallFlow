<template>
    <v-layout row wrap v-if="isCallsiteSelected == true">
      <v-btn class="ma-1 reveal-button" small tile color="white" @click="revealCallsite">
        Reveal
      </v-btn>
      <v-btn class="ma-1 reveal-button" small tile color="white" @click="showEntryFunctions">
        Split by callers
      </v-btn>
      <v-btn class="ma-1 reveal-button" small tile color="white" @click="showCallees">
        Split by callees
      </v-btn>
    </v-layout>
</template>

<script>
export default {
	name: "SplitControl",
	data: () => ({

	}),
	methods: {
		revealCallsite()  {

		},

		showEntryFunctions() {

		},

		showCallees() {
        
		}
	}
};
</script>