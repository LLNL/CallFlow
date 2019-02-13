/* eslint-disable no-var */
/* eslint-disable vars-on-top */
/* eslint-disable block-scoped-var */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
/* eslint-disable prefer-const */
/* eslint-disable prefer-destructuring */
/* eslint-disable one-var */
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
function scatterPlotUI(data) {
    const width = $('#scat_view').parent().width();
    const height = $('#scat_view').parent().height();
    let runTimeLable;
	let scatDat;
	
	console.log(data.inc[0], typeof(data.inc), Object.values(data.inc));

    $('#scat_view').empty();
    const scatterPot = new Scatter({
	    ID: '#scat_view',
	    width,
	    height,
	    margin: {
            top: 10, right: 10, bottom: 30, left: 44,
        },
	    yData: Object.values(data.inc),
	    xData: Object.values(data.exc),
	    sort: false,
    });
}

export default scatterPlotUI;

function Scatter(args) {
    let containerID = args.ID || 'body',
	    containerWidth = args.width || 900,
	    containerHeight = args.height || 900,
	    margin = args.margin || {
            top: 10, right: 30, bottom: 10, left: 10,
        },
	    yData = args.yData,
	    xData = args.xData,
	    label = args.label,
	    sort = args.sort,
	    clickCallBack = args.clickCallBack;

    let width = containerWidth - margin.left - margin.right;
    let height = containerHeight - margin.top - margin.bottom;

    // find min and max
    let yMin = Number.MAX_SAFE_INTEGER;
    let yMax = 0;

    let xMin = Number.MAX_SAFE_INTEGER;
    let xMax = 0;

    function arrayMin(arr) {
        let len = arr.length,
            min = Infinity;
        while (len--) {
            if (arr[len] < min) {
                min = arr[len];
            }
        }
        return min;
    }

    function arrayMax(arr) {
        let len = arr.length,
            max = -Infinity;
        while (len--) {
            if (arr[len] > max) {
                max = arr[len];
            }
        }
        return max;
    }

    console.log(yData, xData);
    yMin = arrayMin(yData);
    yMax = arrayMax(yData);

    xMin = arrayMin(xData);
    xMax = arrayMax(xData);

    const leastSquaresCoeff = leastSquares(xData, yData);
    const regressionY = leastSquaresCoeff.y_res;
    const corre_coef = leastSquaresCoeff.corre_coef;


    let xScale;
    let yScale = d3.scale.log().domain([yMin + 0.000001, yMax + 0.000001]).range([height, 0]);

    let svg;

    function visualize() {
	    xScale = d3.scale.linear().domain([xMin, xMax]).range([0, width]);
	    yScale = d3.scale.linear().domain([yMin, yMax]).range([height, 0]);
	    svg = d3.select(containerID).append('svg')
	        .attr('width', width + margin.left + margin.right)
	        .attr('height', height + margin.top + margin.bottom)
	        .append('g')
	        .attr('transform', `translate(${margin.left},${margin.top})`);

	    const xAxis = d3.svg.axis()
	        .scale(xScale)
	        .orient('bottom')
	        .ticks(5)
	        .tickFormat(d3.format('.1e'));
	    const yAxis = d3.svg.axis()
	        .scale(yScale)
	        .orient('left')
	        .ticks(5)
	        .tickFormat(d3.format('.1e'));

	    const xAxisLine = svg.append('g')
	        .attr('class', 'xAxis')
	        .attr('transform', `translate(0,${height})`)
	        .call(xAxis);
	    xAxisLine.append('text')
	        .attr('x', width)
	        .attr('y', -6)
	        .style('text-anchor', 'end')
	        .text('Exclusive Runtime');

	    const yAxisLine = svg.append('g')
	        .attr('class', 'yAxis')
	        .call(yAxis);
	    yAxisLine.append('text')
	        .attr('transform', 'rotate(-90)')
	        .attr('y', 6)
	        .attr('dy', '.71em')
	        .style('text-anchor', 'end')
	        .text('Inclusive Runtime');

	    svg.append('g').selectAll('.dot')
	        .data(yData)
	        .enter()
            .append('circle')
	        .attr('class', 'dot')
	        .attr('r', 3)
	        .attr('cx', (d, i) => xScale(xData[i]))
	        .attr('cy', (d, i) => yScale(d))
	        .style('fill', '#4682b4');

	    const line = d3.svg.line()
	        .x((d, i) => xScale(xData[i]))
	        .y(d => yScale(d));

	    const trendline = svg.append('g').append('path')
	        .datum(regressionY)
	        .attr('class', 'res_line')
	        .attr('d', line)
	        .style('stroke', 'black')
	        .style('stroke-width', '1px')
	        .style('opacity', 0.5);

	    const coefText = svg.append('g');
	    const decimalFormat = d3.format('0.2f');
	    coefText.append('text')
	        .text(`corr-coef: ${decimalFormat(corre_coef)}`)
	        .attr('x', d => width - 100)
	        .attr('y', d => 10);

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
	        .style('font-size', '10px')
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
	        .style('opacity', 0.5);
        yAxisLine.selectAll('text')
	        .style('font-size', '10px')
	        .style('font-family', 'sans-serif')
	        .style('font-weight', 'lighter');
    }

    visualize();

    this.setContainerWidth = function (newWidth) {
	    containerWidth = newWidth;
	    width = containerWidth - margin.left - margin.right;

	    console.log(containerWidth);
    };

    this.setContainerHeight = function (newHeight) {
	    containerHeight = newHeight;
	    height = containerHeight - margin.top - margin.bottom;
    };

    this.reDraw = function () {
	    $(containerID).empty();
	    visualize();
    };

    // returns slope, intercept and r-square of the line
    function leastSquares(xSeries, ySeries) {
	    const n = xSeries.length;
	    let x_mean = 0;
        let y_mean = 0;
        let term1 = 0;
        let term2 = 0;

        for (var i = 0; i < n; i++) {
            x_mean += xSeries[i];
            y_mean += ySeries[i];
        }

        // calculate mean x and y
        x_mean /= n;
        y_mean /= n;

		console.log(x_mean, y_mean)
        // calculate coefficients
        let xr = 0;
        let yr = 0;
        for (i = 0; i < xSeries.length; i++) {
            xr = xSeries[i] - x_mean;
            yr = ySeries[i] - y_mean;
            term1 += xr * yr;
            term2 += xr * xr;
        }

        const b1 = term1 / term2;
        const b0 = y_mean - (b1 * x_mean);
        // perform regression

        const yhat = [];
        // fit line using coeffs
        for (i = 0; i < xSeries.length; i++) {
            yhat.push(b0 + (xSeries[i] * b1));
        }

        // compute correlation coef
        const xy = [];
	    const x2 = [];
	    const y2 = [];

	    for (let i = 0; i < n; i++) {
	        xy.push(xSeries[i] * ySeries[i]);
	        x2.push(xSeries[i] * xSeries[i]);
	        y2.push(ySeries[i] * ySeries[i]);
	    }

	    let sum_x = 0;
	    let sum_y = 0;
	    let sum_xy = 0;
	    let sum_x2 = 0;
	    let sum_y2 = 0;

	    for (let i = 0; i < n; i++) {
	        sum_x += xSeries[i];
	        sum_y += ySeries[i];
	        sum_xy += xy[i];
	        sum_x2 += x2[i];
	        sum_y2 += y2[i];
	    }
	    const step1 = (n * sum_xy) - (sum_x * sum_y);
	    const step2 = (n * sum_x2) - (sum_x * sum_x);
	    const step3 = (n * sum_y2) - (sum_y * sum_y);
	    const step4 = Math.sqrt(step2 * step3);
	    const corre_coef = step1 / step4;

        return {
            y_res: yhat,
            corre_coef,
        };
    }
}
