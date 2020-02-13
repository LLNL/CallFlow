/*
*****************************************************************************
 * Copyright (c) 2017-19, Lawrence Livermore National Security, LLC.
 * Produced at the Lawrence Livermore National Laboratory.
 *
 * Written by Suraj Kesavan <spkesavan@ucdavis.edu>.
 *
 * LLNL-CODE-740862. All rights reserved.
 *
 * This file is part of CallFlow. For details, see:
 * https://github.com/LLNL/CallFlow
 * Please also read the LICENSE file for the MIT License notice.
 ***************************************************************************** */

import tpl from '../../html/distHistogram.html'
import * as d3 from 'd3'
import "d3-selection-multi"
import ToolTip from './tooltip'
import EventHandler from '../EventHandler'

// http://plnkr.co/edit/wfOx8615PnZh2CST301F?p=preview

export default {
    template: tpl,
    name: 'DiffHistogram',
    components: {
        ToolTip
    },
    props: [],
    data: () => ({
        data: [],
        width: null,
        height: null,
        histogramHeight: null,
        histogramWidth: null,
        padding: {
            top: 10,
            right: 10,
            bottom: 10,
            left: 30,
        },
        dataset_index: [],
        id: 'dist_histogram_view',
        firstRender: true,
        xVals: [],
        freq: [],
        selectedColorBy: 'Inclusive',
        MPIcount: 0,
        message: 'MPI Distribution'
    }),

    mounted() {
        let self = this
        EventHandler.$on('ensemble_histogram', function (data) {
            self.clear()
            console.log("Disthistogram: ", data['module'])
            self.render(data['module'])
        })
    },

    methods: {
        init() {
            this.toolbarHeight = document.getElementById('toolbar').clientHeight
            this.footerHeight = document.getElementById('footer').clientHeight
            this.footerHeight = document.getElementById('footer').clientHeight

            // Assign the height and width of container
            this.width = document.getElementById('dist_histogram_view').clientWidth
            this.height = (window.innerHeight - this.toolbarHeight - this.footerHeight) * 0.3

            // Assign width and height for histogram and rankLine SVG.
            this.boxWidth = this.width - this.padding.right - this.padding.left;
            this.boxHeight = this.height - this.padding.top - this.padding.bottom;
            this.histogramOffset = Math.floor(this.boxHeight / 3);
            this.histogramHeight = this.boxHeight - this.histogramOffset;
            this.histogramWidth = this.boxWidth;
            this.boxWidth = Math.min(this.boxWidth, this.boxHeight)

            // Create the SVG
            this.svg = d3.select('#' + this.id)
                .append('svg')
                .attrs({
                    "width": this.width,
                    "height": this.height,
                })
        },

        render(callsite) {
            let data = this.$store.modules['ensemble'][callsite]
            let temp = this.dataProcess(data);
            this.xVals = temp[0];
            this.freq = temp[1];
            this.axis_x = temp[2];
            this.binContainsProcID = temp[3];
            this.logScaleBool = false;

            const targetData = this.$store.modules[this.$store.selectedTargetDataset][callsite]
            const targetTemp = this.dataProcess(targetData)
            this.targetXVals = targetTemp[0]
            this.targetFreq = targetTemp[1]
            this.target_axis_x = targetTemp[3]
            this.target_binContainsProcID = targetTemp[3]

            // this.$refs.ToolTip.init(this.id)

            console.log(this.xVals, this.histogramWidth)
            this.histogramXScale = d3.scaleBand()
                .domain(this.xVals)
                .range(["#c6dbef", "#6baed6", "#2171b5", "#084594"])
                .rangeRound([0, this.histogramWidth])

            // if (d3.max(this.freq) < 50) {
                this.histogramYScale = d3.scaleLinear()
                    .domain([0, d3.max(this.freq)])
                    .range([this.histogramHeight, 0])
                this.logScaleBool = false;
            // } else {
                // this.histogramYScale = d3.scaleLog()
                    // .domain([1, d3.max(this.freq)])
                    // .range([this.boxHeight, 10]);
                // this.logScaleBool = true;
            // }
            this.visualize();
        },

        clear() {
            d3.selectAll('.dist-histogram-bar').remove()
            d3.selectAll('.dist-histogram-target').remove()
            d3.selectAll('.dist-histogram-others').remove()
            d3.select('.x-axis').remove()
            d3.select('.y-axis').remove()
            d3.selectAll('.binRank').remove()
            d3.selectAll('.lineRank').remove()
            d3.selectAll('.target_lineRank').remove()
            d3.selectAll('.tick').remove()
            this.$refs.ToolTip.clear()
        },

        visualize() {
            this.ensembleBars();
            this.targetBars();
            this.axis();
            this.rankLines();
            // this.brushes()
        },

        setContainerWidth(newWidth) {
            this.containerWidth = newWidth
            this.width = this.containterWidth - this.margin.left - this.margin.right
        },

        setContainerHeight(newHeight) {
            this.containerHeight = newHeight
            this.height = this.containerHeight - this.margin.top - this.margin.bottom
        },

        array_unique(arr) {
            return arr.filter(function (value, index, self) {
                return self.indexOf(value) === index;
            })
        },

        dataProcess(data) {
            let attr_data = {}
            let axis_x = []
            let binContainsProcID = {}
            let dataSorted = []
            let dataMin = 0
            let dataMax = 0

            if (this.selectedColorBy == 'Inclusive') {
                attr_data = data['hist_time (inc)']
                dataMin = data['min_time (inc)'];
                dataMax = data['max_time (inc)'];
                dataSorted = data['sorted_time (inc)']
            } else if (this.selectedColorBy == 'Exclusive') {
                attr_data = data['hist_time']
                dataMin = data['min_time']
                dataMax = data['max_time']
                dataSorted = data['sorted_time']
            } else if (this.selectedColorBy == 'Imbalance') {
                attr_data = data['hist_imbalance']
            }

            const dataWidth = ((dataMax - dataMin) / this.$store.selectedBinCount);
            for (let i = 0; i < this.$store.selectedBinCount; i++) {
                axis_x.push(dataMin + (i * dataWidth));
            }

            dataSorted.forEach((val, idx) => {
                let pos = Math.floor((val - dataMin) / dataWidth);
                if (pos >= this.$store.selectedBinCount) {
                    pos = this.$store.selectedBinCount - 1;
                }
                    if (binContainsProcID[pos] == null) {
                    binContainsProcID[pos] = [];
                }
                binContainsProcID[pos].push(data['rank'][idx]);
            });
            console.log(attr_data['x'], attr_data['y'], axis_x, binContainsProcID)
            return [attr_data['x'], attr_data['y'], axis_x, binContainsProcID];
        },

        removeDuplicates(arr) {
            var seen = {};
            return arr.filter(function (item) {
                return seen.hasOwnProperty(item) ? false : (seen[item] = true);
            });
        },

        // give an array of ids, group the ids into cosecutive group
        // return a string version and an array version
        // stolen from this: https://gist.github.com/XciA/10572206
        groupProcess(processIDs) {
            let constData = processIDs.slice();
            constData = this.removeDuplicates(constData)
            let a = 0;
            let groupArrayStr = '[ ';
            const groupArray = [];
            let first = true;
            cons(constData[0], 1);

            function cons(s, t) {
                if (s + 1 == constData[t]) {
                    s = constData[t];
                    t += 1;
                    cons(s, t);
                } else {
                    print(a, t - 1);
                }
            }

            function print(k, t) {
                display(k, t);
                t++;
                a = t;
                const start = constData[t];
                if (t < constData.length) {
                    cons(start, t + 1);
                }
            }

            function display(k, t) {
                let string = '';
                const temp = [];
                if (k != t) {
                    string = `[${constData[k]}-${constData[t]}]`;
                    temp.push(constData[k]);
                    temp.push(constData[t]);
                } else {
                    string = `[${constData[k]}]`;
                    temp.push(constData[k]);
                }

                if (!first) {
                    groupArrayStr += ', ';
                }
                groupArrayStr += string;
                groupArray.push(temp);
                first = false;
            }
            groupArrayStr += ' ]';
            return {
                string: groupArrayStr,
                array: groupArray
            };
        },

        targetBars() {
            let self = this
            this.svg.selectAll('.dist-target')
                .data(this.targetFreq)
                .enter()
                .append('rect')
                .attr('class', 'dist-histogram-bar dist-target')
                .attr('x', (d, i) => {
                    return this.padding.left + this.histogramXScale(this.targetXVals[i])
                })
                .attr('y', (d, i) => {
                    return this.histogramYScale(d)
                })
                .attr('width', (d) => {
                    return this.histogramXScale.bandwidth()
                })
                .attr('height', (d) => {
                    return Math.abs(this.histogramHeight - this.histogramYScale(d));
                })
                .attr('fill', this.$store.color.target)
                .attr('opacity', 1)
                .attr('stroke-width', (d, i) => '0.2px')
                .attr('stroke', (d, i) => 'black')
                .on('mouseover', function (d, i) {
                    // d3.select(this)
                    //     .attr('fill', 'red');
                    // d3.selectAll(`.lineRank_${i}`)
                    //     .style('fill', 'orange')
                    //     .style('fill-opacity', 1)
                    let groupProcStr = self.groupProcess(self.binContainsProcID[i]).string;
                    self.$refs.ToolTip.render(groupProcStr, d)
                })
                .on('mouseout', function (d, i) {
                    d3.select(this)
                        .attr('fill', this.$store.color.ensemble);
                    d3.selectAll(`.lineRank_${i}`)
                        .style('fill', 'grey')
                        .style('fill-opacity', 0.4);
                    self.$refs.ToolTip.clear()
                })
        },

        ensembleBars() {
            let self = this
            this.svg.selectAll('.dist-ensemble')
                .data(this.freq)
                .enter()
                .append('rect')
                .attr('class', 'dist-histogram-bar dist-ensemble')
                .attr('x', (d, i) => {
                    return this.padding.left + this.histogramXScale(this.xVals[i])
                })
                .attr('y', (d, i) => {
                    return this.histogramYScale(d)
                })
                .attr('width', (d) => {
                    return this.histogramXScale.bandwidth()
                })
                .attr('height', (d) => {
                    return Math.abs(this.histogramHeight - this.histogramYScale(d));
                })
                .attr('fill', (d) => {
                    let color = self.$store.color.ensemble
                    return color
                })
                .attr('opacity', 1)
                .attr('stroke-width', (d, i) => '0.2px')
                .attr('stroke', (d, i) => 'black')
                .on('mouseover', function (d, i) {
                    // d3.select(this)
                    //     .attr('fill', 'red');
                    // d3.selectAll(`.lineRank_${i}`)
                    //     .style('fill', 'orange')
                    //     .style('fill-opacity', 1)
                    let groupProcStr = self.groupProcess(self.binContainsProcID[i]).string;
                    self.$refs.ToolTip.render(groupProcStr, d)
                })
                .on('mouseout', function (d, i) {
                    // d3.select(this)
                    //     .attr('fill', 'steelblue');
                    // d3.selectAll(`.lineRank_${i}`)
                    //     .style('fill', 'grey')
                    //     .style('fill-opacity', 0.4);
                    // self.$refs.ToolTip.clear()
                })
        },

        /* Axis for the histogram */
        axis() {
            const xFormat = d3.format('.1e');
            const xAxis = d3.axisBottom(this.histogramXScale)
                .ticks(this.MPIcount)
                .tickFormat((d, i) => {
                    let temp = this.axis_x[i];
                    // if (i % 2 == 0) {
                    //     let value = temp * 0.000001
                    //     return `${xFormat(value)}s`
                    // }
                    return `${temp.toFixed(2)}ms`;
                });

            const yAxis = d3.axisLeft(this.histogramYScale)
                .ticks(this.freq.length)
                .tickFormat((d, i) => {
                    return d
                })
            // .ticks(this.$store.numbOfRanks, '%');

            const xAxisLine = this.svg.append('g')
                .attr('class', 'x-axis')
                .attr('transform', `translate(${this.padding.left},${this.histogramHeight})`)
                .call(xAxis)

            const yAxisLine = this.svg.append('g')
                .attr('class', 'y-axis')
                .attr('transform', `translate(${this.padding.left},${0})`)
                .call(yAxis)

            const yAxisLineText = yAxisLine.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('y', 0)
                .attr('x', 0)
                .attr('dy', '.71em')
                .style('text-anchor', 'end')
                .text('Frequency');

            xAxisLine.selectAll('path')
                .style('fill', 'none')
                .style('stroke', 'black')
                .style('stroke-width', '1px');

            xAxisLine.selectAll('line')
                .style('fill', 'none')
                .style('stroke', '#000')
                .style('stroke-width', '1px')
                .style('opacity', 0.5);

            xAxisLine.selectAll('text')
                .style('font-size', '9px')
                .style('font-family', 'sans-serif')
                .style('font-weight', 'lighter');

            yAxisLine.selectAll('path')
                .style('fill', 'none')
                .style('stroke', 'black')
                .style('stroke-width', '1px');

            yAxisLine.selectAll('line')
                .style('fill', 'none')
                .style('stroke', '#000')
                .style('stroke-width', '1px')
                .style('opacity', 0.2);

            yAxisLine.selectAll('text')
                .style('font-size', '9px')
                .style('font-family', 'sans-serif')
                .style('font-weight', 'lighter');
        },

        drawRankLines(group, processIDs, index, type) {
            const binWidth = this.histogramXScale.bandwidth();
            const widthPerRank = binWidth / processIDs.length;
            const binLocation = this.histogramXScale(index);
            let cumulativeBinSpace = 0;
            let line;
            if (group.length == 1) {
                var start = group[0];
                var end = start + 1;
                var topX1 = cumulativeBinSpace + binLocation
                var topX2 = cumulativeBinSpace + binLocation + (1) * widthPerRank;

                var botX3 = this.ranklinescale(start);
                var botX4 = this.ranklinescale(start);

                var topY = this.boxHeight - this.histogramOffset
                var botY = this.boxHeight;
                cumulativeBinSpace += (1) * widthPerRank;

                line = 'M' + topX1 + ' ' + topY +
                    'L ' + topX2 + ' ' + topY +
                    'L ' + botX4 + ' ' + botY +
                    'L ' + botX3 + ' ' + botY;
            } else {
                var start = group[0];
                var end = group[1];

                var topX1 = cumulativeBinSpace + binLocation
                var topX2 = cumulativeBinSpace + (end - start + 1) * widthPerRank + binLocation;

                var botX3 = this.ranklinescale(start) + this.padding.left;
                var botX4 = this.ranklinescale(end) + this.padding.left;

                var topY = this.boxHeight - this.histogramOffset;
                var botY = this.boxHeight - this.padding.bottom;

                cumulativeBinSpace += (end - start + 1) * widthPerRank;

                line = 'M' + topX1 + ' ' + topY +
                    'L ' + topX2 + ' ' + topY +
                    'L ' + botX4 + ' ' + botY +
                    'L ' + botX3 + ' ' + botY;
            }
            if (type == 'ensemble') {
                this.rankLinesG.append('path')
                    .attr('d', line)
                    .attr('class', 'lineRank lineRank_' + index)
                    .style('fill', this.$store.color.ensemble)
                    .style('fill-opacity', 0.4);
            }
            else if (type == 'target') {
                this.target_rankLinesG.append('path')
                    .attr('d', line)
                    .attr('class', 'target_lineRank target_lineRank_' + index)
                    .style('fill', this.$store.color.target)
                    .style('fill-opacity', 0.4)
            }
        },

        rankLines() {
            this.ranklinescale = d3.scaleLinear()
                .domain([0, this.MPIcount])
                .range([0, this.histogramWidth]);

            this.freq.forEach((fregVal, index) => {
                const processIDs = this.binContainsProcID[index];
                const target_processIDs = this.target_binContainsProcID[index]
                console.log(processIDs, target_processIDs)
                // For ensemble process ids.
                if (processIDs) {
                    this.rankLinesG = this.svg.append('g')
                        .attr('class', `binRank bin_${index}`)
                        .attr('data-name', index)
                        .attr('transform', `translate(${this.padding.left},${0})`)

                    processIDs.sort((a, b) => a - b);

                    const groupArray = this.groupProcess(processIDs).array;

                    groupArray.forEach((group) => {
                        this.drawRankLines(group, processIDs, index, 'ensemble')
                    })

                }
                // For the target process ids.
                if (target_processIDs) {
                    this.target_rankLinesG = this.svg.append('g')
                        .attr('class', `target_binRank targetbin_${index}`)
                        .attr('data-name', index)
                        .attr('transform', `translate(${this.padding.left},${0})`)

                    target_processIDs.sort((a, b) => a - b)

                    const target_groupArray = this.groupProcess(target_processIDs).array;

                    console.log(target_groupArray)
                    target_groupArray.forEach((group) => {
                        this.drawRankLines(group, target_processIDs, index, 'target')
                    })
                }
            });

            const rankLineAxis = d3.axisBottom(this.ranklinescale)
                .ticks(10)
                .tickFormat((d, i) => d);

            this.rankLineAxisLine = this.svg.append('g')
                .attr('class', 'x axis')
                .attr('transform', `translate(${this.padding.left},${this.boxHeight - 10})`)
                .call(rankLineAxis);

            this.rankLineAxisLineText = this.rankLineAxisLine.append('text')
                .attr('y', 20)
                .attr('x', 25)
                .attr('dy', '.71em')
                .style('text-anchor', 'end')
                .text('MPI Ranks');

            this.rankLineAxisLine.selectAll('path')
                .style('fill', 'none')
                .style('stroke', 'black')
                .style('stroke-width', '1px');

            this.rankLineAxisLine.selectAll('line')
                .style('fill', 'none')
                .style('stroke', '#000')
                .style('stroke-width', '1px')
                .style('opacity', 0.5);

            this.rankLineAxisLine.selectAll('text')
                .style('font-size', '9px')
                .style('font-family', 'sans-serif')
                .style('font-weight', 'lighter');
        },

        brushes() {
            this.brushdata = []
            this.brushSVG = this.svg
                .append('svg')

            this.brush = d3.brushX()
                .extent([
                    [this.padding.left, this.padding.top],
                    [this.width - this.padding.right, this.height - this.padding.bottom]
                ])
                .on('brush', this.brushing)
                .on('end', this.brushend)
            let id = 0
            this.brushdata.push({
                id: id,
                brush: this.brush
            })

            this.brushSVG
                .selectAll('.brush')
                .data(this.brushdata)
                .enter()
                .insert("g", ".brush")
                .attr("class", "brush")
                .call(this.brush)
        },

        brushing() {
            const brushScale = d3.scaleLinear().domain(this.histogramXScale.domain()).range(this.histogramXScale.range());
            let brushStart = d3.event.selection.map(brushScale.invert)[0]
            let brushEnd = d3.event.selection.map(brushScale.invert)[1]
            let brushPoints = this.histogramXScale.domain().length

            this.localBrushStart = Math.floor(brushStart * brushPoints)
            this.localBrushEnd = Math.ceil(brushEnd * brushPoints)

            // highlight rank lines that is brush
            this.svg.selectAll('.binRank').attr('opacity', 0);
            for (let i = this.localBrushStart; i < this.localBrushEnd; i++) {
                this.svg.selectAll(`.bin_${i}`).attr('opacity', 1);
            }

            if (this.localBrushStart == this.localBrushEnd) {
                this.svg.selectAll('.binRank').attr('opacity', 1);
            }
        },

        brushend() {
            let self = this
            const processIDList = [];
            for (let i = this.localBrushStart; i < this.localBrushEnd; i++) {
                if (self.binContainsProcID[i] != null) {
                    const curList = self.binContainsProcID[i];
                    curList.forEach((processID) => {
                        processIDList.push(processID);
                    });
                }
            }
            self.$socket.emit('split-rank', {
                'dataset': self.$store.selectedDataset,
                'ids': processIDList
            })
        },
    }
}