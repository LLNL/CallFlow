<template>
  <v-flex column wrap>
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
    <v-spacer></v-spacer>
    <span class="chip-info">
      {{ info }}
    </span>
  </v-flex>
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
  padding-left: 0px;
}

.chip-summary {
  width: 200px;
}
</style>