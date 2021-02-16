<template>
    <v-chip class="chip" chips color="teal" label outlined clearable>
        {{ title }}
        <v-icon>info</v-icon>
        <v-card class="mx-auto" tile outlined>
            <v-tooltip bottom>
                <template >
                    <v-flex
                    id="summary"
                    text-xs-center
                    >
                    {{ summary }}
                    </v-flex>
                </template>
                <!-- <span> -->
                    {{summary}}
                <!-- </span> -->
            </v-tooltip>
        </v-card>
    </v-chip>
</template>

<script>
export default {
	name: "InfoChip",
	props: ["title", "summary"]
};
</script>