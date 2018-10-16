/*******************************************************************************
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
 ******************************************************************************/
function scatterPlotUI(data){
    var width = $("#scat_view").parent().width();
    var height = $("#scat_view").parent().height();
    var runTimeLable;
    var scatDat;

    $('#scat_view').empty();
    let scatterPot = new Scatter({
	    ID: "#scat_view",
	    width: width,
	    height: height,
	    margin: {top: 10, right: 10, bottom: 30, left: 44},
	    yData: data["inc"].slice(),
	    xData: data["exc"].slice(),
	    sort: false						
    })			
}

export default scatterPlotUI

function Scatter(args){
    var containerID = args.ID || "body",
	    containerWidth = args.width || 900,
	    containerHeight = args.height || 900,
	    margin = args.margin || {top: 10, right: 30, bottom: 10, left: 10},
	    yData = args.yData,
	    xData = args.xData,
	    label = args.label,
	    sort =  args.sort,
	    clickCallBack = args.clickCallBack;	

    // console.log("in scatter", label, sort);
    var width = containerWidth - margin.left - margin.right;
    var height = containerHeight - margin.top - margin.bottom;

    //find min and max
    var yMin = Number.MAX_SAFE_INTEGER;
    var yMax = 0;

    var xMin = Number.MAX_SAFE_INTEGER;
    var xMax = 0;
    // if(sort == true){
    // 	data.sort(function(a,b){
    // 		return a - b;
    // 	});
    // }

    yData.forEach(function(d){
	    yMin = Math.min(yMin, d);
	    yMax = Math.max(yMax, d);
    });

    xData.forEach(function(d){
	    xMin = Math.min(xMin, d);
	    xMax = Math.max(xMax, d);
    });

    var leastSquaresCoeff = leastSquares(xData.slice(), yData.slice());
    var regressionY = leastSquaresCoeff["y_res"];
    var corre_coef = leastSquaresCoeff["corre_coef"];
    //set scale
    var xScale;
//    var yScale;
    var yScale = d3.scale.log().domain([minVal + 0.000001, maxVal + 0.000001]).range([height, 0]);

    var svg;

    function visualize(){
	    xScale = d3.scale.linear().domain([xMin, xMax]).range([0, width]);
	    yScale = d3.scale.linear().domain([yMin, yMax]).range([height, 0]);
	    svg = d3.select(containerID).append('svg')
	        .attr('width', width + margin.left + margin.right)
	        .attr('height', height + margin.top + margin.bottom)
	        .append('g')
	        .attr('transform', "translate(" + margin.left + "," + margin.top + ")");

	    var xAxis = d3.svg.axis()
	        .scale(xScale)
	        .orient('bottom')
	        .ticks(5)
	    // .tickFormat(d3.formatPrefix(".1", 1e6));
	        .tickFormat(d3.format(".1e"));	
	    var yAxis = d3.svg.axis()
	        .scale(yScale)
	        .orient('left')
	        .ticks(5)
	        .tickFormat(d3.format(".1e"));		

	    var xAxisLine = svg.append('g')
	        .attr('class', 'xAxis')
	        .attr("transform", "translate(0," + height + ")")
	        .call(xAxis)
	    xAxisLine.append('text')
	        .attr('x', width)
	        .attr('y', -6)
	        .style('text-anchor', 'end')
	        .text("Exclusive Runtime")

	    var yAxisLine = svg.append('g')
	        .attr('class', 'yAxis')
	        .call(yAxis)
	    yAxisLine.append("text")
	        .attr('transform', 'rotate(-90)')
	        .attr('y', 6)
	        .attr('dy', ".71em")
	        .style("text-anchor", "end")
	        .text("Inclusive Runtime");

	    svg.append('g').selectAll('.dot')
	        .data(yData)
	        .enter().append('circle')
	        .attr('class', 'dot')
	        .attr('r', 3)
	        .attr('cx', function(d, i){
		        return xScale(xData[i]);
	        })
	        .attr('cy', function(d, i){
		        return yScale(d);
	        })
	        .style('fill', "#4682b4")

	    var line = d3.svg.line()
	        .x(function(d,i) {
		        return xScale(xData[i]);
	        })
	        .y(function(d) {
		        return yScale(d);
	        });

	    var trendline = svg.append('g').append("path")
	        .datum(regressionY)
	        .attr("class", "res_line")
	        .attr("d", line)
	        .style("stroke", "black")
	        .style("stroke-width", "1px")
	        .style("opacity", 0.5);	

	    var coefText = svg.append('g');
	    var decimalFormat = d3.format("0.2f");
	    coefText.append('text')
	        .text("corr-coef: " + decimalFormat(corre_coef))
	        .attr("x", function(d) {return width - 100;})
	        .attr("y", function(d) {return 10;});	

        xAxisLine.selectAll('path')
	        .style("fill", "none")
	        .style("stroke", "black")
	        .style("stroke-width", "1px");
	    xAxisLine.selectAll('line')
	        .style("fill", "none")
	        .style("stroke", "#000")
	        .style("stroke-width", "1px")
	        .style("opacity", 0.5);
        xAxisLine.selectAll("text")
	        .style('font-size', '10px')
	        .style('font-family', 'sans-serif')
	        .style('font-weight', 'lighter');		

        yAxisLine.selectAll('path')
	        .style("fill", "none")
	        .style("stroke", "black")
	        .style("stroke-width", "1px");
	    yAxisLine.selectAll('line')
	        .style("fill", "none")
	        .style("stroke", "#000")
	        .style("stroke-width", "1px")
	        .style("opacity", 0.5);
        yAxisLine.selectAll("text")
	        .style('font-size', '10px')
	        .style('font-family', 'sans-serif')
	        .style('font-weight', 'lighter');						
    }

    visualize();

    this.setContainerWidth = function(newWidth){
	    containerWidth = newWidth;
	    width = containerWidth - margin.left - margin.right;

	    console.log(containerWidth);
    }

    this.setContainerHeight = function(newHeight){
	    containerHeight = newHeight;
	    height = containerHeight - margin.top - margin.bottom;
    }

    this.reDraw = function(){
	    $(containerID).empty();
	    visualize();
    }

    // returns slope, intercept and r-square of the line
    function leastSquares(xSeries, ySeries) {
	    var n = xSeries.length;
	    var x_mean = 0;
        var y_mean = 0;
        var term1 = 0;
        var term2 = 0;

        for (var i = 0; i < n; i++) {
            x_mean += xSeries[i];
            y_mean += ySeries[i];
        }

        // calculate mean x and y
        x_mean /= n;
        y_mean /= n;

        // calculate coefficients
        var xr = 0;
        var yr = 0;
        for (i = 0; i < xSeries.length; i++) {
            xr = xSeries[i] - x_mean;
            yr = ySeries[i] - y_mean;
            term1 += xr * yr;
            term2 += xr * xr;

        }

        var b1 = term1 / term2;
        var b0 = y_mean - (b1 * x_mean);
        // perform regression 

        let yhat = [];
        // fit line using coeffs
        for (i = 0; i < xSeries.length; i++) {
            yhat.push(b0 + (xSeries[i] * b1));
        }

        //compute correlation coef
        var xy = [];
	    var x2 = [];
	    var y2 = [];
	    
	    for(var i=0; i<n; i++) {
	        xy.push(xSeries[i] * ySeries[i]);
	        x2.push(xSeries[i] * xSeries[i]);
	        y2.push(ySeries[i] * ySeries[i]);
	    }

	    var sum_x = 0;
	    var sum_y = 0;
	    var sum_xy = 0;
	    var sum_x2 = 0;
	    var sum_y2 = 0;
	    
	    for(var i=0; i< n; i++) {
	        sum_x += xSeries[i];
	        sum_y += ySeries[i];
	        sum_xy += xy[i];
	        sum_x2 += x2[i];
	        sum_y2 += y2[i];
	    }
	    var step1 = (n * sum_xy) - (sum_x * sum_y);
	    var step2 = (n * sum_x2) - (sum_x * sum_x);
	    var step3 = (n * sum_y2) - (sum_y * sum_y);
	    var step4 = Math.sqrt(step2 * step3);
	    var corre_coef = step1 / step4;

        return {
            "y_res" : yhat,
            "corre_coef" : corre_coef
        };

    }

}
