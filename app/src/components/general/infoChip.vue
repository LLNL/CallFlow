<template>
  <v-layout>
    <v-row class="grey lighten-5">
      <v-col cols="2">
        <v-chip class="chip" chips color="teal" label outlined clearable>
          <span class="chip-title">
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
      <v-col cols="8">
      </v-col>
      <v-col cols="2" class="text-right chip-info">
        <!-- <span> -->
          {{ info }}
        <!-- </span> -->
      </v-col>
    </v-row>
  </v-layout>
</template>

<script>
export default {
	name: "InfoChip",
	props: ["title", "summary", "info"],
};
</script>

<style scoped>
.chip {
  padding: 1px;
  font-size: 14px;
}

.chip-title {
  padding: 1px;
  margin: 0px;
}

.chip-info {
  color: #009688;
}

.chip-summary {
  width: 200px;
}
</style>