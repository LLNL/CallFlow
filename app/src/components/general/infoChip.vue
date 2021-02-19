<template>
    <v-row class="ml-2 mt-4">
      <v-col cols="auto">
        <v-chip class="pa-1 chip" chips color="teal" label clearable>
          <span class="ma-2">
            {{ title }}
          </span>
          <v-tooltip bottom max-width="300">
            <template v-slot:activator="{on}">
              <v-icon v-on="on" color="white" dark>info</v-icon>
            </template>
            <span class="chip-summary">
              {{ summary }}
            </span>
          </v-tooltip>
        </v-chip>
      </v-col>
      <!-- <v-col cols="8">
        <ColorMap ref="ColorMap" />
      </v-col> -->
      <v-col cols="auto pt-4" class="chip-info">
          {{ info }}
      </v-col>
    </v-row>
</template>

<script>
import ColorMap from "./colormap";

export default {
	name: "InfoChip",
	components: {
		// ColorMap
	},
	props: ["title", "summary", "info"],
	mounted() {
		// this.$refs.ColorMap.init(this.$store.runtimeColor);
	}
};
</script>

<style scoped>
.chip {
  font-size: 14px;
}

.chip-info {
  color: #009688;
}

.chip-summary {
  width: 200px;
}
</style>