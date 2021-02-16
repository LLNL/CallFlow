<template>
    <v-chip class="chip" chips color="teal" label outlined clearable>
        {{ title }}
        <v-tooltip bottom>
            <template v-slot:activator="{ on }">
                <v-icon v-on="on" color="white" dark >info</v-icon>
            </template>
            <span>
                {{summary}}
            </span>
        </v-tooltip>
    </v-chip>
</template>

<script>
export default {
	name: "InfoChip",
	props: ["title", "summary"]
};
</script>