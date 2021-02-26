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
      <v-col cols="auto pt-4" class="chip-info">
          {{ info }}
      </v-col>
  </v-row>
</template>

<script>

export default {
	name: "InfoChip",
	props: ["title", "summary", "info"],
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
