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
11 * Please also read the LICENSE file for the MIT License notice.
 ***************************************************************************** */

import tpl from '../html/histogram.html'
import * as  d3 from 'd3'
// import "d3-selection-multi"

export default {
    template: tpl,
    name: 'Histogram',
    components: {
    },
    props: [
        // 'selectedColorBy'
    ],
    data: () => ({
        data: [],
        width: 0,
        height: 0,
        margin: {
            top: 10, right: 10, bottom: 30, left: 40,
        },
        dataset_index: [],
        numbOfBins: 5,
        boxWidth: 0,
        boxHeight: 0,
        histogramOffset: 0,
        histogramHeight: 0,
        histogramWidth: 0,
        histogramSVG: null,
        id: 'hist_view',
        firstRender: true,
        xVals: [],
        freq: [],
        selectedColorBy: 'Inclusive', 
        MPIcount: 0,
    }),

    mounted() {
    },

    sockets: {
        histogram(data) {
            data = JSON.parse(data)
            if (this.debug == true){
                console.log(data)
            }
            this.start(data)
        },
    },

    methods: {
        init() {
            this.padding = { left: 15, top: 10, right: 0, bottom: 40 }

            this.width = document.getElementById('hist_view').clientWidth
            this.height = window.innerHeight / 2 - 50

            this.boxWidth = this.width - this.margin.right - this.margin.left;
            this.boxHeight = this.height - this.margin.top - this.margin.bottom - 20;
            this.histogramOffset = Math.floor(this.boxHeight / 3);
            this.histogramHeight = this.boxHeight - this.histogramOffset;
            this.histogramWidth = this.boxWidth;

            this.histogramSVGid = 'hist_view_svg'
            this.brush();
            this.setupSVG()
        },

        setupSVG() {
            this.histogramSVG = d3.select('#' + this.id)
                .append('svg')
                .attrs({
                    "id": "hist_view_svg",
                    "width": this.boxWidth + this.margin.right + this.margin.left,
                    "height": this.boxHeight + this.margin.top + this.margin.bottom,
                })
                .append('g')
                .attr('transform', `translate(${this.margin.left},${this.margin.top})`)
        },

        start(data) {
            if (!this.firstRender) {
                this.clear()
                this.setupSVG()
            }

            this.firstRender = false

            const temp = this.dataProcess(data);
            this.xVals = temp[0];
            this.freq = temp[1];
            this.axis_x = temp[2];
            this.binContainsProcID = temp[3];

            this.logScaleBool = false;
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
            console.log("Histogram data by: ", this.selectedColorBy)
            if(this.selectedColorBy == 'Inclusive'){
                attr_data = data['time (inc)']
            }
            else if (this.selectedColorBy == 'Exclusive'){
                attr_data = data['time']
            }
            else if(this.selectedColorBy == 'Name'){
                attr_data = data['rank']
            }
            else if(this.selectedColorBy == 'Imbalance'){
                attr_data = data['imbalance']
            }

            let funcCount = Object.keys(attr_data).length
            let ranks = data['rank'][0]
            this.MPIcount = this.array_unique(ranks).length
            for(let i = 0; i < attr_data[0].length; i += 1){
                for(const [key, value] in Object.entries(attr_data)){
                    if (dataSorted[i] == undefined){
                        dataSorted[i] = 0
                    }
                    dataSorted[i] += attr_data[0][i]
                }
            }          

            dataSorted.sort((a, b) => a - b)
            const dataMin = dataSorted[0];
            const dataMax = dataSorted[dataSorted.length - 1];  

            
            const dataWidth = ((dataMax - dataMin) / this.numbOfBins);
            // console.log(dataWidth)
            const binContainsProcID = {};
            for (let i = 0; i < this.numbOfBins; i++) {
                xVals.push(i);
                freq.push(0);
                axis_x.push(dataMin + (i * dataWidth));
            }

            dataSorted.forEach((val, idx) => {
                let pos = Math.floor((val - dataMin) / dataWidth);
                if (pos >= this.numbOfBins) {
                    pos = this.numbOfBins - 1;
                }
                freq[pos] += 1;
                if (binContainsProcID[pos] == null) {
                    binContainsProcID[pos] = [];
                }
                binContainsProcID[pos].push(data['rank'][0][idx]);
            });
            this.data  = dataSorted

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
            return { string: groupArrayStr, array: groupArray };
        },

        clear() {
            d3.select('#' + this.histogramSVGid).remove()
        },

        visualize() {
            this.bars();
            this.axis();
            this.rankLineScale();
        },

        bars() {
            const toolTip = d3.select('#' + this.svg_id)
                .append('div')
                .attr('class', 'toolTip')
                .style('position', 'absolute')
                .style('padding', '5px 10px 0px 10px')
                .style('opacity', 0)
                .style('background', 'white')
                .style('height', 'auto')
                .style('width', 'auto')
                .style('border-radius', '10px')
                .style('border-width', '1px')
                .style('border-style', 'solid')
                .style('position', 'absolute');
            const toolTipText = toolTip
                .append('p')
                .style('font-family', 'sans-serif')
                .style('font-size', '13px');

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
                .on('click', (d, i) => {
                })
                .on('mouseover', function (d, i) {
                    d3.select(this)
                        .attr('fill', 'red');
                    d3.selectAll(`.lineRank_${i}`)
                        .style('fill', 'orange')
                        .style('fill-opacity', 1);
                    const groupProcStr = this.groupProcess(this.binContainsProcID[i]).string;
                    const mousePos = d3.mouse(d3.select(this.id).node());
                    toolTip.style('opacity', 1)
                        .style('left', () => {
                            let xPos = mousePos[0] + 10;
                            if (xPos >= this.width - 25) {
                                return `${xPos - 100}px;`;
                            }

                            return `${mousePos[0] + 10}px`;
                        })
                        .style('top', () => `${mousePos[1]}px`)
                        .style('height', 'auto')
                        .style('width', 'auto');
                    toolTipText.html(`Processes: ${groupProcStr}`);
                })
                .on('mouseout', function (d, i) {
                    d3.select(this)
                        .attr('fill', 'steelblue');
                    d3.selectAll(`.lineRank_${i}`)
                        .style('fill', 'grey')
                        .style('fill-opacity', 0.4);

                    toolTip.style('opacity', 0)
                        .style('left', () => '0px')
                        .style('top', () => '0px')
                        .style('height', 'auto')
                        .style('width', 'auto');

                    toolTipText.html('');
                })
        },

        /* Axis for the histogram */
        axis() {
            const xFormat = d3.format('.1e');
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
                .ticks(5, '%');

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
            console.log(this.MPIcount)
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

                            line = 'M' + topX1 + ' ' + topY
                                + 'L ' + topX2 + ' ' + topY
                                + 'L ' + botX4 + ' ' + botY
                                + 'L ' + botX3 + ' ' + botY;
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

                            line = 'M' + topX1 + ' ' + topY
                                + 'L ' + topX2 + ' ' + topY
                                + 'L ' + botX4 + ' ' + botY
                                + 'L ' + botX3 + ' ' + botY;
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


        /* Brush for selecting the Sankey nodes and generating a new plot to compare */
        brush() {
            this.brush = d3.brushX()
                .extent([[this.padding.left, this.padding.top], [this.width - this.padding.right, this.height - this.padding.bottom]])
                .on('brush', this.brushing)
                .on('end', this.brushend);
            // const brushG = this.histogramSVG.append('g').attr('class', 'brush').call(this.brush);
            // brushG.selectAll('rect').attr('height', this.histogramHeight).attr('opacity', 0.2);
        },

        brushing() {
            let brushStart = 0;
            let brushEnd = this.numbOfBins;
            let bExtent;
            bExtent = brush.extent();
            const brushScale = d3.scaleLinear().domain(histogramXScale.range()).range(histogramXScale.domain());
            let localBrushStart = (brush.empty()) ? brushStart : Math.floor(brushScale(bExtent[0]));
            if (localBrushStart < 0) {
                localBrushStart = 0;
            }
            const localBrushEnd = (brush.empty()) ? brushEnd : Math.floor(brushScale(bExtent[1]));
            this.histogramSVG.select('g.brush').call((brush.empty()) ? brush.clear() : brush.extent([brushScale.invert(localBrushStart), brushScale.invert(localBrushEnd)]));

            brushStart = localBrushStart;
            brushEnd = localBrushEnd;

            // highlight rank lines that is brush
            this.histogramSVG.selectAll('.binRank').attr('opacity', 0);
            for (let i = brushStart; i < brushEnd; i++) {
                this.histogramSVG.selectAll(`.bin_${i}`).attr('opacity', 1);
            }

            if (brushStart == brushEnd) {
                this.histogramSVG.selectAll('.binRank').attr('opacity', 1);
            }
        },

        brushend() {
            const processIDList = [];
            for (let i = brushStart; i < brushEnd; i++) {
                if (self.binContainsProcID[i] != null) {
                    const curList = self.binContainsProcID[i];
                    curList.forEach((processID) => {
                        processIDList.push(processID);
                    });
                }
            }
            this.brushCallBack(processIDList);
        },

        brushCallBack(processIDList) {
            $.ajax({
                type: 'GET',
                contentType: 'application/json',
                dataType: 'json',
                url: '/calcEdgeValues',
                data: { processIDList },
                success(edgeSets) {
                    // edges = edgeSets["brush"];
                    const myNodes = [];

                    const labelList = Object.keys(nodes);
                    labelList.forEach((lab) => {
                        let tempObj = nodes[lab];
                        myNodes.push(tempObj);
                    });

                    const remapedEdgesBrushed = reMapEdges(edgeSets.brush);
                    const remapedEdgesNonBrushed = reMapEdges(edgeSets.nonBrush);

                    sankeyVis.changeProcessSelect({ brush: edgeSets.brush, nonBrush: edgeSets.nonBrush });
                    sankeyVis.changeProcessSelect({ brush: remapedEdgesBrushed, nonBrush: remapedEdgesNonBrushed });

                    if (showLabelBool == true) {
                        d3.selectAll('.node text').style('opacity', 1);
                    } else {
                        d3.selectAll('.node text').style('opacity', 0);
                    }
                },
                error() {
                    console.log('There was problem with getting the metric data');
                },
            });
        }
    }
}