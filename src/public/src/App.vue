<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>
export default {
  name: "App"
};
</script>

<style>
#app {
}

#vis {
  border: 2px solid #e1e1e1;
}
.node rect {
  stroke: #333;
  fill: #fff;
}

.edgePath path {
  stroke: #333;
  fill: #333;
  stroke-width: 1.5px;
}

.v-text-field {
  padding-top: 0px;
}

#frequency-slider {
  display: inline-block;
  margin: 5px;
}
</style>