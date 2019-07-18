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
import tpl from '../html/scatterplot.html'
import * as d3 from 'd3'
import ToolTip from './scatterplot/tooltip'

export default {
	name: 'Scatterplot',
	template: tpl,
	components: {
		ToolTip
	},

	data: () => ({
		graph: null,
		id: 'scatterplot',
		width: null,
		height: null,
		margin: {
			top: 10,
			right: 30,
			bottom: 10,
			left: 10
		},
		xData: null,
		yData: null,
		xMin: 0,
		xMax: Number.MAX_SAFE_INTEGER,
		yMin: 0,
		yMax: Number.MAX_SAFE_INTEGER,

		

	}),

	watch: {

	},

	sockets: {
		scatterplot(data) {
			data = JSON.parse(data)
			console.log("Scatter data: ", data)
			this.render(data)
		},
	},

	mounted() {
		this.id = this.id
	},

	methods: {
		init() {			
			this.toolbarHeight = document.getElementById('toolbar').clientHeight
			this.footerHeight = document.getElementById('footer').clientHeight
            this.width = document.getElementById(this.id).clientWidth
			this.height = (window.innerHeight - this.toolbarHeight - this.footerHeight)*0.5
			
			this.scatterWidth = this.width - this.margin.right - this.margin.left;
            this.scatterHeight = this.height - this.margin.top - this.margin.bottom;
		},

		process(data){
			this.yData = data["time (inc)"]
			this.xData = data["time"]
			
			this.yData.forEach(function (d) {
				this.yMin = Math.min(this.yMin, d);
				this.yMax = Math.max(this.yMax, d);
			});

			this.xData.forEach(function (d) {
				this.xMin = Math.min(this.xMin, d);
				this.xMax = Math.max(this.xMax, d);
			});

			this.leastSquaresCoeff = this.leastSquares(this.xData.slice(), this.yData.slice());
			this.regressionY = leastSquaresCoeff["y_res"];
			this.corre_coef = leastSquaresCoeff["corre_coef"];

			this.xScale = d3.scaleLinear().domain([this.xMin, this.xMax]).range([0, this.width])
			this.yScale = d3.scaleLinear().domain([this.yMin, this.yMax]).range([this.height, 0])
		},

		render(data) {
			this.process(data)
			this.svg = d3.select(containerID).append('svg')
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
				.attr('cx', function (d, i) {
					return xScale(xData[i]);
				})
				.attr('cy', function (d, i) {
					return yScale(d);
				})
				.style('fill', "#4682b4")

			var line = d3.svg.line()
				.x(function (d, i) {
					return xScale(xData[i]);
				})
				.y(function (d) {
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
				.attr("x", function (d) {
					return width - 100;
				})
				.attr("y", function (d) {
					return 10;
				});

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
		},
		// returns slope, intercept and r-square of the line
		leastSquares(xSeries, ySeries) {
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

			yhat = [];
			// fit line using coeffs
			for (i = 0; i < xSeries.length; i++) {
				yhat.push(b0 + (xSeries[i] * b1));
			}

			//compute correlation coef
			var xy = [];
			var x2 = [];
			var y2 = [];

			for (var i = 0; i < n; i++) {
				xy.push(xSeries[i] * ySeries[i]);
				x2.push(xSeries[i] * xSeries[i]);
				y2.push(ySeries[i] * ySeries[i]);
			}

			var sum_x = 0;
			var sum_y = 0;
			var sum_xy = 0;
			var sum_x2 = 0;
			var sum_y2 = 0;

			for (var i = 0; i < n; i++) {
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
				"y_res": yhat,
				"corre_coef": corre_coef
			};

		},

		setContainerWidth(newWidth) {
			containerWidth = newWidth;
			width = containerWidth - margin.left - margin.right;
		},


		clear() {

		},

		update(data) {

		},
	}
}


function Scatter(args) {



	this.



	this.reDraw = function () {
		$(containerID).empty();

		visualize();
	}


}