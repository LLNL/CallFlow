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

import tpl from '../../html/ensembleHistogram/index.html'
import * as d3 from 'd3'
import "d3-selection-multi"
import ToolTip from './tooltip'
import EventHandler from '../EventHandler'

// http://plnkr.co/edit/wfOx8615PnZh2CST301F?p=preview

export default {
    template: tpl,
    name: 'EnsembleHistogram',
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
            left: 10,
        },
        dataset_index: [],
        id: 'ensemble-histogram-view',
        svgID: 'ensemble-histogram-view-svg',
        firstRender: true,
        xVals: [],
        freq: [],
        selectedColorBy: 'Inclusive',
        MPIcount: 0,
        message: 'MPI Distribution',
        axisLabelFactor: 3.5,
        thisNode: '',
    }),

    mounted() {
        let self = this
        EventHandler.$on('ensemble_histogram', function (data) {
            self.clear()
            console.log("Ensemble Histogram: ", data['module'])
            if(data['callsite'] != undefined){
                self.thisNode = data["module"] + '=' + data['callsite']
            }
            else{
                self.thisNode = data['module']
            }
            self.render(data['module'])
        })
    },

    methods: {
        init() {
            this.toolbarHeight = document.getElementById('toolbar').clientHeight
            this.footerHeight = document.getElementById('footer').clientHeight

            // Assign the height and width of container
            this.width = window.innerWidth * 0.25
            this.height = (window.innerHeight - this.toolbarHeight - 2 * this.footerHeight) * 0.33

            // Assign width and height for histogram and rankLine SVG.
            this.boxWidth = this.width - this.padding.right - this.padding.left;
            this.boxHeight = this.height - this.padding.top - this.padding.bottom;

            this.histogramOffset = Math.floor(this.boxHeight / 3);
            this.histogramHeight = this.boxHeight - this.histogramOffset - this.padding.top
            this.histogramWidth = this.boxWidth - this.padding.left*this.axisLabelFactor - this.padding.right
            this.rankScaleHeight = this.boxHeight - this.histogramHeight
            this.rankScaleWidth = this.histogramWidth
            // Create the SVG
            this.svg = d3.select('#' + this.svgID)
                .attrs({
                    "width": this.boxWidth,
                    "height": this.boxHeight,
                })

            let modules_arr = Object.keys(this.$store.modules['ensemble'])

            EventHandler.$emit('ensemble_histogram', {
                module: modules_arr[0],
                name: "main",
                dataset: this.$store.runNames,
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
            this.target_axis_x = targetTemp[2]
            this.target_binContainsProcID = targetTemp[3]

            this.$refs.ToolTip.init(this.svgID)

            this.rankCount = parseInt(this.$store.numOfRanks['ensemble'])
            console.log(this.axis_x, this.target_axis_x)

            let minXVal = Math.min(this.axis_x[0], this.target_axis_x[0])
            let maxXVal = Math.max(this.axis_x[this.axis_x.length - 1], this.target_axis_x[this.target_axis_x.length - 1])

            // console.log(minXVal, maxXVal)
            // this.concatenatedXVals = []
            // for(let i = 0; i <= this.$store.selectedBinCount; i += 1){
            //     let val = minXVal + ((maxXVal - minXVal)/this.$store.selectedBinCount)*i
            //     this.concatenatedXVals.push(val)
            // }
            // console.log(this.concatenatedXVals)

            this.concatenatedXVals = this.xVals.concat(this.targetXVals)
            this.concatenatedXVals = this.concatenatedXVals.sort((a, b) => a.toFixed(2) - b.toFixed(2))

            this.histogramXScale = d3.scaleBand()
                .domain(this.concatenatedXVals)
                .rangeRound([0, this.histogramWidth])

            if (d3.max(this.freq) < 50) {
                this.histogramYScale = d3.scaleLinear()
                    .domain([0, d3.max(this.freq)])
                    .range([this.histogramHeight, 0])
                this.logScaleBool = false;
            } else {
                this.histogramYScale = d3.scaleLog()
                    .domain([0.1, d3.max(this.freq)])
                    .range([this.histogramHeight, 0]);
                this.logScaleBool = true;
            }
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
            d3.selectAll('.histogram-axis-label').remove()
            d3.selectAll('.ensemble-histogram-rank-axis').remove()
            this.$refs.ToolTip.clear()
        },

        visualize() {
            this.ensembleBars()
            this.targetBars()
            this.xAxis()
            this.yAxis()
            this.rankLines()
            this.brushes()
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

            if (this.$store.selectedMetric == 'Inclusive') {
                attr_data = data['hist_time (inc)']
                dataMin = data['min_time (inc)'];
                dataMax = data['max_time (inc)'];
                dataSorted = data['sorted_time (inc)']
            } else if (this.$store.selectedMetric == 'Exclusive') {
                attr_data = data['hist_time']
                dataMin = data['min_time']
                dataMax = data['max_time']
                dataSorted = data['sorted_time']
            } else if (this.$store.selectedMetric == 'Imbalance') {
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
                .attrs({
                    'x': (d, i) => {
                        console.log(this.targetXVals[i], this.histogramXScale(this.targetXVals[i]))
                        return this.histogramXScale(this.targetXVals[i])
                    },
                    'y': (d, i) => {
                        return this.histogramYScale(d)
                    },
                    'width': (d) => {
                        return this.histogramXScale.bandwidth()
                    },
                    'height': (d) => {
                        return Math.abs(this.histogramHeight - this.histogramYScale(d));
                    },
                    'fill': this.$store.color.target,
                    'opacity': 1,
                    'stroke-width': '0.2px',
                    'stroke': '#202020',
                    'transform': "translate(" + this.axisLabelFactor * this.padding.left + "," + 0 + ")"
                })
                .on('mouseover', function (d, i) {
                    d3.select(this)
                        .attr('fill', 'red');
                    d3.selectAll(`.lineRank_${i}`)
                        .style('fill', 'orange')
                        .style('fill-opacity', 1)
                    let groupProcStr = self.groupProcess(self.binContainsProcID[i]).string;
                    self.$refs.ToolTip.render(groupProcStr, d)
                })
                .on('mouseout', function (d, i) {
                    d3.select(this)
                        .attr('fill', this.$store.color.target);
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
                .attrs({
                    'x': (d, i) => {
                        return this.histogramXScale(this.xVals[i])
                    },
                    'y': (d, i) => {
                        return this.histogramYScale(d)
                    },
                    'width': (d) => {
                        return this.histogramXScale.bandwidth()
                    },
                    'height': (d) => {
                        return Math.abs(this.histogramHeight - this.histogramYScale(d));
                    },
                    'fill': (d) => {
                        let color = self.$store.color.ensemble
                        return color
                    },
                    'opacity': 1,
                    'stroke-width': '0.2px',
                    'stroke': '#202020',
                    'transform': "translate(" + this.axisLabelFactor * this.padding.left + "," + 0 + ")"
                })
                .on('mouseover', function (d, i) {
                    d3.select(this)
                        .attr('fill', 'red');
                    d3.selectAll(`.lineRank_${i}`)
                        .style('fill', 'orange')
                        .style('fill-opacity', 1)
                    let groupProcStr = self.groupProcess(self.binContainsProcID[i]).string;
                    self.$refs.ToolTip.render(groupProcStr, d)
                })
                .on('mouseout', function (d, i) {
                    d3.select(this)
                        .attr('fill', self.$store.color.ensemble);
                    d3.selectAll(`.lineRank_${i}`)
                        .style('fill', 'grey')
                        .style('fill-opacity', 0.4);
                    self.$refs.ToolTip.clear()
                })
        },

        /* Axis for the histogram */
        /* Axis for the histogram */
        xAxis() {
            const xFormat = d3.format('.1e');
            const xAxis = d3.axisBottom(this.histogramXScale)
                .ticks(this.$store.selectedBinCount)
                .tickFormat((d, i) => {
                    console.log(d, i)
                    let temp = this.concatenatedXVals[i];
                    if (i % 4 == 0 && i == this.$store.numOfRanks['ensemble']) {
                        let value = temp * 0.000001
                        return `${value.toFixed(2)}s`;
                    }
                });

            this.svg.append('text')
                .attr('class', 'histogram-axis-label')
                .attr('x', this.boxWidth)
                .attr('y', this.histogramHeight + 4 * this.padding.top)
                .style('font-size', '12px')
                .style('text-anchor', 'end')
                .text(this.$store.selectedMetric + " Runtime")

            const xAxisLine = this.svg.append('g')
                .attr('class', 'x-axis')
                .attr('transform', `translate(${this.axisLabelFactor * this.padding.left},${this.histogramHeight})`)
                .call(xAxis)

            xAxisLine.selectAll('path')
                .style('fill', 'none')
                .style('stroke', 'black')
                .style('stroke-width', '1px')

            xAxisLine.selectAll('line')
                .style('fill', 'none')
                .style('stroke', '#000')
                .style('stroke-width', '1px')
                .style('opacity', 0.5);

            xAxisLine.selectAll('text')
                .style('font-size', '12px')
                .style('font-family', 'sans-serif')
                .style('font-weight', 'lighter')
        },

        yAxis() {
            const yAxis = d3.axisLeft(this.histogramYScale)
                .ticks(this.freq.length)
                .tickFormat((d, i) => {
                    if (i % 4 == 0) {
                        return d
                    }
                })

            this.svg.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('class', 'histogram-axis-label')
                .attr('x', - this.histogramHeight + this.padding.top)
                .attr('y', this.padding.left)
                .style('font-size', '12px')
                .style('text-anchor', 'end')
                .text("Frequency")

            const yAxisLine = this.svg.append('g')
                .attr('class', 'y-axis')
                .attr('transform', `translate(${this.axisLabelFactor * this.padding.left},${0})`)
                .call(yAxis)

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
                .style('font-size', '12px')
                .style('font-family', 'sans-serif')
                .style('font-weight', 'lighter');
        },

        drawRankLines(group, processIDs, xVals, idx, type) {
            const binWidth = this.histogramXScale.bandwidth();
            const widthPerRank = binWidth / processIDs.length;
            const binLocation = this.histogramXScale(xVals);
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

                var botX3 = this.ranklinescale(start);
                var botX4 = this.ranklinescale(end);

                var topY = this.boxHeight - this.histogramOffset;
                var botY = this.boxHeight - 3 * this.padding.bottom

                cumulativeBinSpace += (end - start + 1) * widthPerRank;

                line = 'M' + topX1 + ' ' + topY +
                    'L ' + topX2 + ' ' + topY +
                    'L ' + botX4 + ' ' + botY +
                    'L ' + botX3 + ' ' + botY;
            }
            if (type == 'ensemble') {
                this.rankLinesG.append('path')
                    .attr('d', line)
                    .attr('class', 'lineRank lineRank_' + idx)
                    .style('fill', this.$store.color.ensemble)
                    .style('fill-opacity', 0.4)
                    .attr('transform', `translate(${this.axisLabelFactor * this.padding.left},${-this.padding.bottom})`)
            }
            else if (type == 'target') {
                this.target_rankLinesG.append('path')
                    .attr('d', line)
                    .attr('class', 'target_lineRank target_lineRank_' + idx)
                    .style('fill', this.$store.color.target)
                    .style('fill-opacity', 0.4)
                    .attr('transform', `translate(${this.axisLabelFactor * this.padding.left},${-this.padding.bottom})`)
            }
        },

        rankLines() {
            this.ranklinescale = d3.scaleLinear()
                .domain([0, this.rankCount])
                .range([0, this.rankScaleWidth]);

            this.freq.forEach((fregVal, idx) => {
                const processIDs = this.binContainsProcID[idx];
                const target_processIDs = this.target_binContainsProcID[idx]
                // For ensemble process ids.
                if (processIDs) {
                    this.rankLinesG = this.svg.append('g')
                        .attr('class', `binRank bin_${idx}`)
                        .attr('data-name', idx)
                        .attr('transform', `translate(${this.padding.left},${0})`)

                    processIDs.sort((a, b) => a - b);

                    const groupArray = this.groupProcess(processIDs).array;

                    groupArray.forEach((group) => {
                        this.drawRankLines(group, processIDs, this.xVals[idx], idx, 'ensemble')
                    })

                }
                // For the target process ids.
                if (target_processIDs) {
                    this.target_rankLinesG = this.svg.append('g')
                        .attr('class', `target_binRank targetbin_${idx}`)
                        .attr('data-name', idx)
                        .attr('transform', `translate(${this.padding.left},${0})`)

                    target_processIDs.sort((a, b) => a - b)

                    const target_groupArray = this.groupProcess(target_processIDs).array;

                    target_groupArray.forEach((group) => {
                        this.drawRankLines(group, target_processIDs, idx, 'target')
                    })
                }
            });

            console.log(this.$store.selectedBinCount)

            const rankLineAxis = d3.axisBottom(this.ranklinescale)
                .ticks(this.$store.selectedBinCount)
                .tickFormat((d, i) => {
                    console.log(i, d)
                    if (i % 10 == 0 || i == this.$store.numOfRanks['ensemble'] - 1) {
                        return d
                    }
                });

            this.rankLineAxisLine = this.svg.append('g')
                .attr('class', 'ensemble-histogram-rank-axis')
                .attr('transform', `translate(${this.axisLabelFactor * this.padding.left},${this.boxHeight - 4 * this.padding.bottom})`)
                .call(rankLineAxis);

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

            this.rankLineAxisLineText = this.rankLineAxisLine
                .append('text')
                .attr('y', 20)
                .attr('x', 25)
                .attr('dy', '.71em')
                .style('text-anchor', 'end')
                .text('MPI Ranks');
        },

        brushes() {
            this.brushdata = []
            this.brushSVG = this.svg
                .append('svg')

            this.brush = d3.brushX()
                .extent([
                    [this.axisLabelFactor * this.padding.left, this.histogramHeight - this.padding.top],
                    [this.boxWidth, this.boxHeight - this.padding.top]
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
            const brushScale = d3.scaleLinear()
                .domain(this.histogramXScale.domain())
                .range(this.histogramXScale.range());

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