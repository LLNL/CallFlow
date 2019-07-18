/** *****************************************************************************
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

import tpl from '../html/histogram.html'
import * as d3 from 'd3'
import "d3-selection-multi"
import ToolTip from './Histogram/tooltip'

export default {
    template: tpl,
    name: 'Histogram',
    components: {
        ToolTip
    },
    props: [],
    data: () => ({
        data: [],
        width: 0,
        height: 0,
        margin: {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10,
        },
        dataset_index: [],
        boxWidth: 0,
        boxHeight: 0,
        histogramOffset: 0,
        histogramHeight: 0,
        histogramWidth: 0,
        histogramSVG: null,
        id: 'histogram_view',
        firstRender: true,
        xVals: [],
        freq: [],
        selectedColorBy: 'Inclusive',
        MPIcount: 0,
    }),

    mounted() {},

    sockets: {
        histogram(data) {
            data = JSON.parse(data)
            console.log("Histogram Data: ", data)
            this.render(data)
        },
    },

    methods: {
        init() {
            this.toolbarHeight = document.getElementById('toolbar').clientHeight
			this.footerHeight = document.getElementById('footer').clientHeight
            this.width = document.getElementById(this.id).clientWidth
            this.height = (window.innerHeight - this.toolbarHeight - this.footerHeight)*0.5

            this.histogramWidth = this.width - this.margin.right - this.margin.left;
            this.histogramHeight = this.height - this.margin.top - this.margin.bottom;
        },

        render(data) {
            if (!this.firstRender) {
                this.clear()
            }

            this.firstRender = false
            const temp = this.dataProcess(data);
            this.xVals = temp[0];
            this.freq = temp[1];
            this.axis_x = temp[2];
            this.binContainsProcID = temp[3];
            this.logScaleBool = false;

            this.histogramSVG = d3.select('#' + this.id)
                .attrs({
                    "width": this.histogramWidth - this.margin.right - this.margin.left,
                    "height": this.histogramHeight + this.margin.top + this.margin.bottom,
                    "transform": `translate(${this.margin.left}, ${this.margin.top})`
                })
            this.$refs.ToolTip.init(this.id)

            this.histogramXScale = d3.scaleBand()
                .domain(this.xVals)
                .rangeRound([0, this.histogramWidth], 0.05)

            if (d3.max(this.freq) < 50) {
                this.histogramYScale = d3.scaleLinear()
                    .domain([0, d3.max(this.freq)])
                    .range([this.histogramHeight, 0])
                this.logScaleBool = false;
            } else {
                this.histogramYScale = d3.scaleLog()
                    .domain([1, d3.max(this.freq)])
                    .range([this.histogramHeight, 10]);
                this.logScaleBool = true;
            }
            this.visualize();
        },

        clear() {
            d3.select('#' + this.id).remove()
            this.$refs.ToolTip.clear()
        },

        visualize() {
            this.bars();
            this.axis();
            this.rankLineScale();
            // this.brushes ()
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
            const xVals = [];
            const freq = [];
            const axis_x = [];
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

            let funcCount = Object.keys(attr_data).length
            let ranks = data['rank'][0]
            this.MPIcount = this.array_unique(ranks).length
            for (let i = 0; i < attr_data[0].length; i += 1) {
                for (const [key, value] in Object.entries(attr_data)) {
                    if (dataSorted[i] == undefined) {
                        dataSorted[i] = 0
                    }
                    dataSorted[i] += attr_data[0][i]
                }
            }
``
            dataSorted.sort((a, b) => a - b)
            const dataMin = dataSorted[0];
            const dataMax = dataSorted[dataSorted.length - 1];


            const dataWidth = ((dataMax - dataMin) / this.$store.selectedBinCount);
            const binContainsProcID = {};
            for (let i = 0; i < this.$store.selectedBinCount; i++) {
                xVals.push(i);
                freq.push(0);
                axis_x.push(dataMin + (i * dataWidth));
            }

            dataSorted.forEach((val, idx) => {
                let pos = Math.floor((val - dataMin) / dataWidth);
                if (pos >= this.$store.selectedBinCount) {
                    pos = this.$store.selectedBinCount - 1;
                }
                freq[pos] += 1;
                if (binContainsProcID[pos] == null) {
                    binContainsProcID[pos] = [];
                }
                binContainsProcID[pos].push(data['rank'][0][idx]);
            });
            this.data = dataSorted

            // console.log(xVals, freq, axis_x, binContainsProcID)
            return [xVals, freq, axis_x, binContainsProcID];
        },

        // give an array of ids, group the ids into cosecutive group
        // return a string version and an array version
        // stolen from this: https://gist.github.com/XciA/10572206
        groupProcess(processIDs) {
            const constData = processIDs.slice();
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
                // groupArray.push(temp);
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

        bars() {
            let self = this
            this.histogramSVG.selectAll('.selectBars').data(this.freq).enter()
                .append('rect')
                .attr('class', 'selectBars')
                .attr('x', (d, i) => this.histogramXScale(this.xVals[i]))
                .attr('y', d => {
                    return this.histogramYScale(d)
                })
                .attr('width', d =>
                    this.histogramXScale.bandwidth())
                .attr('height', (d) => {
                    let histFreq = d;
                    if (d < 1 && this.logScaleBool) {
                        histFreq = 1;
                        return 0;
                    }
                    return this.histogramHeight - this.histogramYScale(d);
                })
                .attr('fill', 'steelblue')
                .attr('opacity', 1)
                .attr('stroke-width', (d, i) => '0.2px')
                .attr('stroke', (d, i) => 'black')
                .on('click', (d, i) => {})
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
                        .attr('fill', 'steelblue');
                    d3.selectAll(`.lineRank_${i}`)
                        .style('fill', 'grey')
                        .style('fill-opacity', 0.4);
                    self.$refs.ToolTip.clear()
                })
        },

        /* Axis for the histogram */
        axis() {
            const xFormat = d3.format('1e');
            const xAxis = d3.axisBottom(this.histogramXScale)
                .ticks(this.MPIcount)
                .tickFormat((d, i) => {
                    let temp = this.axis_x[i];
                    if (i % 4 == 0) {
                        let value = temp * 0.000001;
                        return `${xFormat(value)}s`;
                    }
                    return '';
                });

            const yAxis = d3.axisLeft(this.histogramYScale)
                .ticks(this.freq.length)
                .tickFormat((d, i) => {
                    if (this.logScaleBool) {
                        if (d % 4 == 0) {
                            return d;
                        }
                        return "";
                    }
                    return d;
                })
                .ticks(this.$store.numbOfRanks, '%');

            const xAxisLine = this.histogramSVG.append('g')
                .attr('class', 'x axis')
                .attr('transform', `translate(0,${this.histogramHeight})`)
                .call(xAxis);

            const yAxisLine = this.histogramSVG.append('g')
                .attr('class', 'y axis')
                .call(yAxis);

            const yAxisLineText = yAxisLine.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('y', -30)
                .attr('x', -this.histogramHeight + 50)
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

        rankLineScale() {
            const ranklinescale = d3.scaleLinear().domain([0, this.MPIcount]).range([0, this.histogramWidth]);
            this.freq.forEach((fregVal, idx) => {
                const processIDs = this.binContainsProcID[idx];
                if (processIDs) {
                    const rankLinesG = this.histogramSVG.append('g')
                        .attr('class', `binRank bin_${idx}`)
                        .attr('data-name', idx);

                    processIDs.sort((a, b) => a - b);

                    const groupArray = this.groupProcess(processIDs).array;
                    const binWidth = this.histogramXScale.bandwidth();
                    const widthPerRank = binWidth / processIDs.length;
                    const binLocation = this.histogramXScale(idx);
                    let cumulativeBinSpace = 0;

                    groupArray.forEach((group) => {
                        let line;
                        if (group.length == 1) {
                            var start = group[0];
                            var end = start + 1;
                            var topX1 = cumulativeBinSpace + binLocation;
                            var topX2 = cumulativeBinSpace + binLocation + (1) * widthPerRank;

                            var botX3 = ranklinescale(start);
                            var botX4 = ranklinescale(start);

                            var topY = this.boxHeight - this.histogramOffset;
                            var botY = this.boxHeight;
                            cumulativeBinSpace += (1) * widthPerRank;

                            line = 'M' + topX1 + ' ' + topY +
                                'L ' + topX2 + ' ' + topY +
                                'L ' + botX4 + ' ' + botY +
                                'L ' + botX3 + ' ' + botY;
                        } else {
                            var start = group[0];
                            var end = group[1];

                            var topX1 = cumulativeBinSpace + binLocation;
                            var topX2 = cumulativeBinSpace + (end - start + 1) * widthPerRank + binLocation;

                            var botX3 = ranklinescale(start);
                            var botX4 = ranklinescale(end);

                            var topY = this.boxHeight - this.histogramOffset;
                            var botY = this.boxHeight;

                            cumulativeBinSpace += (end - start + 1) * widthPerRank;

                            line = 'M' + topX1 + ' ' + topY +
                                'L ' + topX2 + ' ' + topY +
                                'L ' + botX4 + ' ' + botY +
                                'L ' + botX3 + ' ' + botY;
                        }

                        rankLinesG.append('path')
                            .attr('d', line)
                            .attr('class', 'lineRank_' + idx)
                            .style('fill', (d) => {
                                return "grey";
                            })
                            .style('fill-opacity', 0.4);
                    });
                }
            });

            const rankLineAxis = d3.axisBottom(ranklinescale)
                .ticks(10)
                .tickFormat((d, i) => d);

            const rankLineAxisLine = this.histogramSVG.append('g')
                .attr('class', 'x axis')
                .attr('transform', `translate(0,${this.boxHeight - 0})`)
                .call(rankLineAxis);

            const rankLineAxisLineText = rankLineAxisLine.append('text')
                // .attr("transform", "rotate(-90)")
                .attr('y', 20)
                .attr('x', 25)
                .attr('dy', '.71em')
                .style('text-anchor', 'end')
                .text('MPI Ranks');

            rankLineAxisLine.selectAll('path')
                .style('fill', 'none')
                .style('stroke', 'black')
                .style('stroke-width', '1px');
            rankLineAxisLine.selectAll('line')
                .style('fill', 'none')
                .style('stroke', '#000')
                .style('stroke-width', '1px')
                .style('opacity', 0.5);
            rankLineAxisLine.selectAll('text')
                .style('font-size', '9px')
                .style('font-family', 'sans-serif')
                .style('font-weight', 'lighter');
        },

        drawBrush() {
            this.brushdata = []
            this.brushSVG = this.histogramSVG
                .append('svg')

            this.brush = d3.brushX()
                .extent([
                    [this.margin.left, this.margin.top],
                    [this.width - this.margin.right, this.height - this.margin.bottom]
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
            this.histogramSVG.selectAll('.binRank').attr('opacity', 0);
            for (let i = this.localBrushStart; i < this.localBrushEnd; i++) {
                this.histogramSVG.selectAll(`.bin_${i}`).attr('opacity', 1);
            }

            if (this.localBrushStart == this.localBrushEnd) {
                this.histogramSVG.selectAll('.binRank').attr('opacity', 1);
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