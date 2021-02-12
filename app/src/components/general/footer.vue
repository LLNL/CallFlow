/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

<template>
  <v-footer id="footer" color="teal" app>
    {{ text }}
    <v-spacer></v-spacer>
    <span>&copy; {{ year }}</span>
  </v-footer>
</template>

<script>
export default {
	name: "Footer",
	props: ["text", "year"],
};
</script>

<style scoped>
#footer {
	color: #fff;
}
</style>