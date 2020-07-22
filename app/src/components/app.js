/*******************************************************************************
 * Copyright (c) 2020, Lawrence Livermore National Security, LLC.
 * Produced at the Lawrence Livermore National Laboratory.
 *
 * Written by Suraj Kesavan <spkesavan@ucdavis.edu>.
 *
 * LLNL-CODE-740862. All rights reserved.
 *
 * This file is part of CallFlow. For details, see:
 * https://github.com/LLNL/CallFlow
 * Please also read the LICENSE file for the MIT License notice.
 ******************************************************************************/
import template from '../html/app.html'
import '../css/app.css'

export default {
    name: "App",
	template: template,
    data: () => ({
        data: {},
        runCounts: 0,
        runtimeHeaders: [
            { text: "Run", value: "dataset" },
            {
                text: "Min. Inclusive runtime (\u03BCs)",
                value: "min_inclusive_runtime"
            },
            {
                text: "Max. Inclusive runtime (\u03BCs)",
                value: "max_inclusive_runtime",
                sortable: true
            },
            {
                text: "Min. Exclusive runtime (\u03BCs)",
                value: "min_exclusive_runtime"
            },
            {
                text: "Max. Exclusive runtime (\u03BCs)",
                value: "max_exclusive_runtime"
            }
        ],
        runtime: [],
        expanded: [],
        singleExpand: false,
        moduleHeaders: [
            { text: "Module", value: "module" },
            {
                text: "Inclusive runtime (\u03BCs)",
                value: "inclusive_runtime",
                sortable: true
            },
            { text: "Exclusive runtime (\u03BCs)", value: "exclusive_runtime" },
            { text: "Imbalance perc (%)", value: "imbalance_perc" },
            { text: "Number of Callsites", value: "number_of_callsites" },
            { text: "", value: "data-table-expand" }
        ],
        modules: []
    }),
    sockets: {
        config(data) {
            this.data = JSON.parse(data);
            this.runCounts = this.data.dataset_names.length;
            // set the data for runtime.
            for (let dataset of this.data.dataset_names) {
                this.runtime.push({
                    dataset: dataset,
                    min_inclusive_runtime: this.data.minIncTime[dataset],
                    max_inclusive_runtime: this.data.maxIncTime[dataset],
                    min_exclusive_runtime: this.data.minExcTime[dataset],
                    max_exclusive_runtime: this.data.maxExcTime[dataset]
                });
            }
            for (let module in this.data.module_callsite_map) {
                this.modules.push({
                    module: module,
                    number_of_callsites: this.data.module_callsite_map[module].length
                });
            }
        }
    },
    mounted() {
        this.$socket.emit("config", {});
    },
    methods: {}
};