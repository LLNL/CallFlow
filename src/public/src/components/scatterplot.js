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
import { thresholdSturges } from 'd3-array';

export default {
	name: 'Scatterplot',
	template: tpl,
	components: {
		ToolTip
	},

	data: () => ({
		graph: null,
		id: 'scatterplot-view',
		width: null,
		height: null,
		margin: {
			top: 10,
			right: 10,
			bottom: 10,
			left: 10
		},
		xData: null,
		yData: null,
		xMin: 0,
		xMax: 0,
		yMin: 0,
		yMax: 0,
		firstRender: true,
	}),

	sockets: {
		scatterplot(data) {
			data = JSON.parse(data)
			console.log("Scatter data: ", data)
			if (this.firstRender) {
				this.init()
			}
			this.render(data)
		},
	},

	mounted() {
	},

	methods: {
		init() {
			this.toolbarHeight = document.getElementById('toolbar').clientHeight
			this.footerHeight = document.getElementById('footer').clientHeight
			this.width = window.innerWidth * 0.3
			this.height = (window.innerHeight - this.toolbarHeight - this.footerHeight) * 0.5

			this.scatterWidth = this.width - this.margin.right - this.margin.left;
			this.scatterHeight = this.height - this.margin.top - this.margin.bottom;

			this.svg = d3.select('#' + this.id)
				.attr('width', this.width - this.margin.left - this.margin.right)
				.attr('height', this.height - this.margin.top - this.margin.bottom)
				.attr('transform', "translate(" + this.margin.left + "," + this.margin.top + ")");
		},

		scatterAll() {
			let xArray = []
			let yArray = []
			let yMin = 0
			let xMin = 0
			let xMax = 0
			let yMax = 0

			for (const [idx, d] of Object.entries(this.yData)) {
				for (let rank = 0; rank < d.length; rank += 1) {
					yMin = Math.min(yMin, d[rank])
					yMax = Math.max(yMax, d[rank])
					yArray.push(d[rank])
				}
			}

			for (const [idx, d] of Object.entries(this.xData)) {
				for (let rank = 0; rank < d.length; rank += 1) {
					xMin = Math.min(xMin, d[rank]);
					xMax = Math.max(xMax, d[rank]);
					xArray.push(d[rank])
				}
			}

			return [xMin, yMin, xMax, yMax, xArray, yArray]
		},

		scatterMean() {
			let xArray = []
			let yArray = []
			let yMin = 0
			let xMin = 0
			let xMax = 0
			let yMax = 0
			for (const [idx, d] of Object.entries(this.yData)) {
				let ySum = 0
				for (let rank = 0; rank < d.length; rank += 1) {
					yMin = Math.min(yMin, d[rank])
					yMax = Math.max(yMax, d[rank])
					ySum += d[rank]
				}
				yArray.push(ySum / d.length)
			}

			for (const [idx, d] of Object.entries(this.xData)) {
				let xSum = 0
				for (let rank = 0; rank < d.length; rank += 1) {
					xMin = Math.min(xMin, d[rank]);
					xMax = Math.max(xMax, d[rank]);
					xSum += d[rank]
				}
				yArray.push(xSum / d.length)
			}
			return [xMin, yMin, xMax, yMax, xArray, yArray]
		},

		process(data) {
			this.yData = data["time (inc)"]
			this.xData = data["time"]
			this.nameData = data['name']

			let temp
			if (this.$store.selectedScatterMode == 'mean') {
				console.log('mean')
				temp = this.scatterMean()
			}
			else if (this.$store.selectedScatterMode == 'all') {
				console.log('all')
				temp = this.scatterAll()
			}
			this.xMin = temp[0]
			this.yMin = temp[1]
			this.xMax = temp[2]
			this.yMax = temp[3]
			this.xArray = temp[4]
			this.yArray = temp[5]

			console.log(this.xArray, this.yArray)

			this.leastSquaresCoeff = this.leastSquares(this.xArray.slice(), this.yArray.slice())
			this.regressionY = this.leastSquaresCoeff["y_res"];
			this.corre_coef = this.leastSquaresCoeff["corre_coef"];

			this.xAxisHeight = this.scatterWidth - 4 * this.margin.left
			this.yAxisHeight = this.scatterHeight - 4 * this.margin.top
			this.xScale = d3.scaleLinear().domain([this.xMin, 1.5 * this.xMax]).range([0, this.xAxisHeight])
			this.yScale = d3.scaleLinear().domain([this.yMin, 1.5 * this.yMax]).range([this.yAxisHeight, 0])
		},

		render(data) {
			if (!this.firstRender) {
				this.clear()
			}
			this.firstRender = false
			this.process(data)
			let self = this

			var xAxis = d3.axisBottom(self.xScale)
				.ticks(5)
				.tickFormat(d3.format("0.2s"));
			var yAxis = d3.axisLeft(self.yScale)
				.ticks(5)
				.tickFormat(d3.format("0.2s"));

			let xAxisHeightCorrected = self.xAxisHeight + this.margin.left
			var xAxisLine = this.svg.append('g')
				.attr('class', 'axis')
				.attr('id', 'xAxis')
				.attr("transform", "translate(" + 3 * self.margin.left + "," + xAxisHeightCorrected + ")")
				.call(xAxis)

			this.svg.append('text')
				.attr('class', 'axisLabel')
				.attr('x', self.scatterWidth)
				.attr('y', self.yAxisHeight)
				.style('font-size', '10px')
				.style('text-anchor', 'end')
				.text("Exclusive Runtime")

			var yAxisLine = this.svg.append('g')
				.attr('id', 'yAxis')
				.attr('class', 'axis')
				.attr('transform', "translate(" + 3 * self.margin.top + ", 0)")
				.call(yAxis)

			this.svg.append("text")
				.attr('class', 'axisLabel')
				.attr('transform', 'rotate(-90)')
				.attr('x', 0)
				.attr('y', 4 * this.margin.left)
				.style("text-anchor", "end")
				.style("font-size", "10px")
				.text("Inclusive Runtime");

			this.svg.selectAll('.dot')
				.data(this.yArray)
				.enter().append('circle')
				.attr('class', 'dot')
				.attr('r', 3)
				.attr('cx', function (d, i) {
					return self.xScale(d) + 3 * self.margin.left;
				})
				.attr('cy', function (d, i) {
					return self.yScale(d);
				})
				.style('fill', "#4682b4")

			var line = d3.line()
				.x(function (d, i) {
					return self.xScale(self.xArray[i]) + 3 * self.margin.left;
				})
				.y(function (d, i) {
					return self.yScale(self.yArray[i]);
				});

			var trendline = this.svg.append('g').append("path")
				.datum(this.regressionY)
				.attr("class", "res_line")
				.attr("d", line)
				.style("stroke", "black")
				.style("stroke-width", "1px")
				.style("opacity", 0.5);

			var coefText = this.svg.append('g');
			var decimalFormat = d3.format("0.2f");
			coefText.append('text')
				.attr('class', 'text')
				.text("corr-coef: " + decimalFormat(this.corre_coef))
				.attr("x", function (d) {
					return self.scatterWidth - 100;
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
			console.log(xSeries, ySeries)
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
			d3.selectAll('.dot').remove()
			d3.selectAll('.axis').remove()
			d3.selectAll('.res_line').remove()
			d3.selectAll('.axisLabel').remove()
			d3.selectAll('.text').remove()
		},

		update(data) {

		},
	}
}