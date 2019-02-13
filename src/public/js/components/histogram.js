/* eslint-disable no-undef */
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
let histogramSVG;
let histogramXScale;
let histogramYScale;
let histogramHeight;
let histogramWidth;
let histogramOffset;
let boxHeight;
let boxWidth;

function histogramUI(data) {
    $('#hist_view').empty();
    const width = $('#hist_view').parent().width();
    const height = $('#hist_view').parent().height();
    const histogram = new Histogram({
        ID: '#hist_view',
        width,
        height,
        margin: {
            top: 10, right: 10, bottom: 30, left: 40,
        },
		data: Object.values(data.inc),
		dataset_index: Object.values(data.dataset_index),
        numbOfBins: 20,
        //	brushCallBack: brushCallBack,
        //	clickCallBack: nodeClickCallBack
    });
    return histogram;
}

function brushCallBack(processIDList) {
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


export default histogramUI;

function Histogram(args) {
    let containerID = args.ID || 'body',
        containerWidth = args.width || 900,
        containerHeight = args.height || 900,
        margin = args.margin || {
            top: 10, right: 30, bottom: 10, left: 10,
        },
        data = args.data,
		numbOfBins = args.numbOfBins || 20,
		dataset_index = args.dataset_index,
        brushCallBack = args.brushCallBack,
        clickCallBack = args.clickCallBack;

    const temp = this.dataProcess(args, data);
    this.xVals = temp[0];
    this.freq = temp[1];
    this.axis_x = temp[2];
    this.binContainsProcID = temp[3];
    this.logScaleBool = false;

    boxWidth = containerWidth - margin.right - margin.left;
    boxHeight = containerHeight - margin.top - margin.bottom - 20;
    histogramOffset = Math.floor(boxHeight / 3);
    histogramHeight = boxHeight - histogramOffset;
    histogramWidth = boxWidth;

    histogramSVG = d3.select(containerID)
        .append('svg')
        .attr('width', boxWidth + margin.right + margin.left)
        .attr('height', boxHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${ margin.left},${ margin.top})`);

    histogramXScale = d3.scale.ordinal().domain(this.xVals).rangeRoundBands([0, histogramWidth], 0.05);

    if (d3.max(this.freq) < 50) {
        histogramYScale = d3.scale.linear().domain([0, d3.max(this.freq)]).range([histogramHeight, 0]);
        this.logScaleBool = false;
    } else {
        histogramYScale = d3.scale.log().domain([1, d3.max(this.freq)]).range([histogramHeight, 10]);
        this.logScaleBool = true;
    }

    this.setContainerWidth = function (newWidth) {
        containerWidth = newWidth;
        width = containerWidth - margin.left - margin.right;
    };

    this.setContainerHeight = function (newHeight) {
        containerHeight = newHeight;
        height = containerHeight - margin.top - margin.bottom;
    };

    this.reDraw = function () {
        $(containerID).empty();
        histogramOffset = Math.floor(height / 3);
        histogramHeight = boxHeight - histogramOffset;
        this.visualize(args);
    };
    this.visualize(args);
    return this;
}

Histogram.prototype.dataProcess = function (args, data) {
    const xVals = [];
    const freq = [];
    const axis_x = [];

    const dataSorted = data.slice();
    dataSorted.sort((a, b) => a - b);

    const dataMin = dataSorted[0];
    const dataMax = dataSorted[dataSorted.length - 1];

    const dataWidth = ((dataMax - dataMin) / args.numbOfBins);
    const binContainsProcID = {};
    for (let i = 0; i < args.numbOfBins; i++) {
        xVals.push(i);
        freq.push(0);
        axis_x.push(dataMin + (i * dataWidth));
    }

    data.forEach((val, idx) => {
        let pos = Math.floor((val - dataMin) / dataWidth);
        if (pos >= args.numbOfBins) {
	    pos = args.numbOfBins - 1;
        }
        freq[pos] += 1;
        if (binContainsProcID[pos] == null) {
	    binContainsProcID[pos] = [];
        }
        binContainsProcID[pos].push(idx);
    });

    return [xVals, freq, axis_x, binContainsProcID];
};

// give an array of ids, group the ids into cosecutive group
// return a string version and an array version
// stolen from this: https://gist.github.com/XciA/10572206
Histogram.prototype.groupProcess = function (processIDs) {
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
};

Histogram.prototype.visualize = function (args) {
    this.bars(args);
    this.brush(args);
    this.axis(args);
    this.rankLineScale(args);
};

Histogram.prototype.bars = function (args) {
    const self = this;
    const toolTip = d3.select(args.containerID)
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

    histogramSVG.selectAll('.selectBars').data(self.freq).enter()
        .append('rect')
        .attr('class', 'selectBars')
        .attr('x', (d, i) => histogramXScale(self.xVals[i]))
        .attr('y', d =>
	    // height - y(d);
	     histogramYScale(d),)
        .attr('width', d =>
	    // return width/hData.length - 1.0;
	     histogramXScale.rangeBand(),)
        .attr('height', (d) => {
	    let histFreq = d;
	    if (d < 1 && self.logScaleBool) {
                histFreq = 1;
                return 0;
	    }
	    return histogramHeight - histogramYScale(d);
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
	    const groupProcStr = self.groupProcess(self.binContainsProcID[i]).string;
	    const mousePos = d3.mouse(d3.select(args.containerID).node());
	    toolTip.style('opacity', 1)
                .style('left', () => {
		    let xPos = mousePos[0] + 10;
		    if (xPos >= width - 25) {
                        return `${xPos - 100  }px;`;
		    }

                    return `${mousePos[0]  + 10  }px`;
                })
                .style('top', () => `${mousePos[1]  }px`)
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
        });
};

/* Brush for selecting the Sankey nodes and generating a new plot to compare */
Histogram.prototype.brush = function (args) {
    const self = this;
    const brush = d3.svg.brush()
        .x(histogramXScale)
        .on('brush', brushing)
    // .extent([0,width])
        .on('brushend', brushend);
    const brushG = histogramSVG.append('g').attr('class', 'brush').call(brush);

    brushG.selectAll('rect').attr('height', histogramHeight).attr('opacity', 0.2);
    let brushStart = 0;
    let brushEnd = args.numbOfBins;
    let bExtent;

    function brushing() {
        bExtent = brush.extent();
        const brushScale = d3.scale.linear().domain(histogramXScale.range()).range(histogramXScale.domain());
        let localBrushStart = (brush.empty()) ? brushStart : Math.floor(brushScale(bExtent[0]));
        if (localBrushStart < 0) {
	    localBrushStart = 0;
        }
        const localBrushEnd = (brush.empty()) ? brushEnd : Math.floor(brushScale(bExtent[1]));
        histogramSVG.select('g.brush').call((brush.empty()) ? brush.clear() : brush.extent([brushScale.invert(localBrushStart), brushScale.invert(localBrushEnd)]));

        brushStart = localBrushStart;
        brushEnd = localBrushEnd;

        // highlight rank lines that is brush
        histogramSVG.selectAll('.binRank').attr('opacity', 0);
        for (let i = brushStart; i < brushEnd; i++) {
	    histogramSVG.selectAll(`.bin_${i}`).attr('opacity', 1);
        }

        if (brushStart == brushEnd) {
	    histogramSVG.selectAll('.binRank').attr('opacity', 1);
        }
    }

    function brushend() {
        const processIDList = [];
        for (let i = brushStart; i < brushEnd; i++) {
	    if (self.binContainsProcID[i] != null) {
                const curList = self.binContainsProcID[i];
                curList.forEach((processID) => {
		    processIDList.push(processID);
                });
	    }
        }
        brushCallBack(processIDList);
    }
};

/* Axis for the histogram */
Histogram.prototype.axis = function (args) {
    const xFormat = d3.format('.1e');
    const self = this;
    const xAxis = d3.svg.axis()
        .scale(histogramXScale)
        .orient('bottom')
    // .outerTickSize(0)
        .ticks(self.xVals.length)
        .tickFormat((d, i) => {
	    let temp = self.axis_x[i];
	    if (i % 4 == 0) {
	     	let value = temp * 0.000001;
	     	return `${xFormat(value)  }s`;
	    }
	    return '';
        });

    const yAxis = d3.svg.axis()
        .scale(histogramYScale)
        .orient('left')
        .ticks(self.freq.length)
        .tickFormat((d, i) => {
	    if(self.logScaleBool){
		if( d % 4 == 0 ){
		    return d;
		}
		
		    return "";
		
	    }
	    
		return d;
	    
	})
        .ticks(5, '%');

    const xAxisLine = histogramSVG.append('g')
        .attr('class', 'x axis')
        .attr('transform', `translate(0,${ histogramHeight})`)
        .call(xAxis);

    const yAxisLine = histogramSVG.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    const yAxisLineText = yAxisLine.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -30)
        .attr('x', -histogramHeight + 50)
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
};

Histogram.prototype.rankLineScale = function (args) {
    const self = this;
    const rankLineScale = d3.scale.linear().domain([0, args.data.length]).range([0, histogramWidth]);
    // var rankLinesG = svg.append('g');
    self.freq.forEach((fregVal, idx) => {
        const processIDs = self.binContainsProcID[idx];
        if (processIDs) {
	    const rankLinesG = histogramSVG.append('g')
	    	.attr('class', `binRank bin_${  idx}`)
	    	.attr('data-name', idx);

	    processIDs.sort((a, b) => a - b);

	    const groupArray = self.groupProcess(processIDs).array;
	    const binWidth = histogramXScale.rangeBand();
	    const widthPerRank = binWidth / processIDs.length;
	    const binLocation = histogramXScale(idx);
	    let cumulativeBinSpace = 0;

	    groupArray.forEach((group) => {
                let line;
                if (group.length == 1) {
		    var start = group[0];
		    var end = start + 1;
		    var topX1 = cumulativeBinSpace + binLocation;
		    var topX2 = cumulativeBinSpace + binLocation + (1) * widthPerRank;

		    var botX3 = rankLineScale(start);
		    var botX4 = rankLineScale(start);

		    var topY = boxHeight - histogramOffset;
		    var botY = boxHeight;
		    cumulativeBinSpace += ( 1 ) * widthPerRank;

		    line = 'M' + topX1 + ' ' + topY
		    	+ 'L ' + topX2 + ' ' + topY
		    	+ 'L ' + botX4 + ' ' + botY
		    	+ 'L ' + botX3 + ' ' + botY;
                } else {
		    var start = group[0];
		    var end = group[1];

		    var topX1 = cumulativeBinSpace + binLocation;
		    var topX2 = cumulativeBinSpace + (end - start + 1) * widthPerRank + binLocation;

		    var botX3 = rankLineScale(start);
		    var botX4 = rankLineScale(end);

		    var topY = boxHeight - histogramOffset;
		    var botY = boxHeight;

		    cumulativeBinSpace += ( end - start + 1 ) * widthPerRank;

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

    const rankLineAxis = d3.svg.axis()
        .scale(rankLineScale)
        .orient('bottom')
    // .outerTickSize(0)
        .ticks(10)
        .tickFormat((d, i) => d);

    const rankLineAxisLine = histogramSVG.append('g')
        .attr('class', 'x axis')
        .attr('transform', `translate(0,${boxHeight - 0})`)
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
};
