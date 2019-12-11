/** *****************************************************************************
 * Copyright (c) 2017, Lawrence Livermore National Security, LLC.
 * Produced at the Lawrence Livermore National Laboratory.
 *
 * Written by Huu Tan Nguyen <htpnguyen@ucdavis.edu>.
 *
 * LLNL-CODE-740862. All rights reserved.
 *
 * This file is part of CallFlow. For details, see:
 * https://github.com/LLNL/CallFlow
 * Please also read the LICENSE file for the MIT License notice.
 ***************************************************************************** */

import tpl from '../../html/callgraph/miniHistograms.html'
import * as d3 from 'd3'
import 'd3-selection-multi'

export default {
    template: tpl,
    name: 'MiniHistograms',
    components: {},
    props: [],
    data: () => ({
        view: {},
        xScale: [],
        yScale: [],
        vals: [],
        freq: {},
        data: [],
        minimapXScale: null,
        minimapYScale: null,
        selectedColorBy: "Inclusive",
        padding: {
            top: 0, left: 0, right: 0, bottom: 10
        },
        nodeScale: 0.99,
        data: null,
        id: '',
        nodes: null,
        edges: null,
    }),

    mounted() {
        this.id = 'minihistogram-overview-' + this._uid
    },

    sockets: {
        dist_mini_histogram(data) {
            this.data = JSON.parse(data)
            for (const [key, value] of Object.entries(this.data)) {
                let node = key
                let d = JSON.parse(value)
                this.render(d, node)
            }
        }
    },

    methods: {
        init(graph, view) {
            this.nodeMap = graph.nodeMap
            this.nodes = graph.nodes
            this.links = graph.links
            this.view = view
            this.$socket.emit('dist-mini-histogram', {
                'target-datasets': [this.$store.selectedTargetDataset],
            })
        },

        array_unique(arr) {
            return arr.filter(function (value, index, self) {
                return self.indexOf(value) === index;
            })
        },

        dataProcess(data) {
            const xVals = [];
            const freq = [];
            const dataSorted = []
            let attr_data = {}

            if (this.selectedColorBy == 'Inclusive') {
                attr_data = data['time (inc)']
            } else if (this.selectedColorBy == 'Exclusive') {
                attr_data = data['time']
            } else if (this.selectedColorBy == 'Name') {
                attr_data = data['rank']
            } else if (this.selectedColorBy == 'Imbalance') {
                attr_data = data['imbalance']
            }

            let ranks = data['rank']
            this.MPIcount = this.array_unique(ranks).length
            for (let i = 0; i < attr_data.length; i += 1) {
                for (const [key, value] in Object.entries(attr_data)) {
                    if (dataSorted[i] == undefined) {
                        dataSorted[i] = 0
                    }
                    dataSorted[i] += attr_data[i]
                }
            }

            dataSorted.sort((a, b) => a - b)
            const dataMin = dataSorted[0];
            const dataMax = dataSorted[dataSorted.length - 1];

            const dataWidth = ((dataMax - dataMin) / this.$store.selectedBinCount);
            for (let i = 0; i < this.$store.selectedBinCount; i++) {
                xVals.push(i);
                freq.push(0);
            }

            dataSorted.forEach((val, idx) => {
                let pos = Math.floor((val - dataMin) / dataWidth);
                if (pos >= this.$store.selectedBinCount) {
                    pos = this.$store.selectedBinCount - 1;
                }
                freq[pos] += 1;
            });

            return [xVals, freq];
        },

        clear() {
            d3.selectAll('#histobars').remove()
        },

        render(data, node) {
            let node_dict = this.nodes[this.nodeMap[node]]
            if (node in this.nodeMap) {
                // const targetData = this.dataTarProcess(data['target'])
                const otherData = this.dataProcess(data['ensemble'][0][0])
                let xVals = otherData[0]
                let freq = otherData[1]

                this.minimapXScale = d3.scaleBand()
                    .domain(xVals)
                    .rangeRound([0, this.$parent.nodeWidth])

                this.minimapYScale = d3.scaleLinear()
                    .domain([0, d3.max(freq)])
                    .range([this.$parent.ySpacing, 0]);

                for (let i = 0; i < freq.length; i += 1) {
                    d3.select('#' + this.id)
                        .append('rect')
                        .attrs({
                            'id': 'histobars',
                            'class': 'histogram-bar ensemble',
                            'width': () => this.minimapXScale.bandwidth(),
                            'height': (d) => {
                                return (this.$parent.nodeWidth) - this.minimapYScale(freq[i])
                            },
                            'x': (d) => node_dict.x + this.minimapXScale(xVals[i]),
                            'y': (d) => node_dict.y + this.minimapYScale(freq[i]),
                            'opacity': 1,
                            'stroke-width': '0.2px',
                            'stroke': 'black',
                            'fill': '#C0C0C0',
                        })
                }

                const targetData = this.dataProcess(data['target'][0][this.$store.selectedTargetDataset])
                let target_x_vals = targetData[0]
                let target_freq = targetData[1]

                this.minimap_target_x_scale = d3.scaleBand()
                    .domain(target_x_vals)
                    .rangeRound([0, this.$parent.nodeWidth])

                this.minimap_target_y_scale = d3.scaleLinear()
                    .domain([0, d3.max(target_freq)])
                    .range([this.$parent.ySpacing, 0]);

                for (let i = 0; i < target_freq.length; i += 1) {
                    d3.select('#' + this.id)
                        .append('rect')
                        .attrs({
                            'id': 'histobars',
                            'class': 'histogram-bar target',
                            'width': () => this.minimap_target_x_scale.bandwidth(),
                            'height': (d) => {
                                return (this.$parent.nodeWidth) - this.minimapYScale(target_freq[i])
                            },
                            'x': (d) => node_dict.x + this.minimapXScale(target_x_vals[i]),
                            'y': (d) => node_dict.y + this.minimapYScale(target_freq[i]),
                            'opacity': 1,
                            'stroke-width': '0.2px',
                            'stroke': 'black',
                            'fill': '#8DB188',
                        })
                }

            }



        }
    }
}