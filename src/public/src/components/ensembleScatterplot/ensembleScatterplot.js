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
import tpl from '../../html/ensembleScatterplot/index.html'
import * as d3 from 'd3'
import ToolTip from './tooltip'
import Settings from '../settings/settings'
import EventHandler from '../EventHandler'

export default {
	name: 'EnsembleScatterplot',
	template: tpl,
	components: {
		ToolTip,
		Settings
	},

	data: () => ({
		padding: {
			top: 10,
			right: 10,
			bottom: 10,
			left: 15
		},
		xData: null,
		yData: null,
		xMin: 0,
		xMax: 0,
		yMin: 0,
		yMax: 0,
		firstRender: true,
		xData: [],
		yData: [],
		nameData: [],
		id: 'ensemble-scatterplot-view',
		svgID: 'ensemble-scatterplot-view-svg',
		message: "Runtime Scatterplot",
		boxOffset: 20,
		settings: [{ title: 'Show Difference plot' }, { title: 'aaa' }]
	}),

	mounted() {
		let self = this
		EventHandler.$on('ensemble_scatterplot', function (data) {
			// self.clear()
			console.log("Ensemble Scatterplot: ", data['module'])
			self.render(data['module'])
		})
	},

	methods: {
		init() {
			this.toolbarHeight = document.getElementById('toolbar').clientHeight
			this.footerHeight = document.getElementById('footer').clientHeight
			this.width = window.innerWidth * 0.25
			this.height = (window.innerHeight - this.toolbarHeight - 2 * this.footerHeight) * 0.33

			this.boxWidth = this.width - this.padding.right - this.padding.left;
			this.boxHeight = this.height - this.padding.top - this.padding.bottom;

			this.svg = d3.select('#' + this.svgID)
				.attr('width', this.boxWidth - this.padding.left - this.padding.right)
				.attr('height', this.boxHeight - this.padding.top - this.padding.bottom)
				.attr('transform', "translate(" + this.padding.left + "," + this.padding.top + ")")

			let modules_arr = Object.keys(this.$store.modules['ensemble'])

			EventHandler.$emit('ensemble_scatterplot', {
				module: modules_arr[0],
				name: "main",
				dataset: this.$store.runNames,
			})
		},

		preprocess(data, dataset_name) {
			for (let key in data["mean"]) {
				this.yData.push(data['mean'][key])
			}

			for (let key in data["diff"]) {
				this.xData.push(data['diff'][key])
				this.nameData.push(key)
			}
		},

		render(module) {
			if (!this.firstRender) {
				this.clear()
			}
			this.firstRender = false
			this.module = module

			this.ensembleProcess()
			this.targetProcess()
			this.xAxis()
			this.yAxis()
			this.ensembleDots()
			this.targetDots()
			this.correlationText()
		},

		ensembleProcess() {
			let mean_time = []
			let mean_time_inc = []
			for (let i = 0; i < this.$store.runNames.length; i += 1) {
				if (this.$store.runNames[i] != this.$store.selectedTargetDataset) {
					let callsites_in_module = this.$store.moduleCallsiteMap['ensemble'][this.module]
					console.log(callsites_in_module)
					for (let j = 0; j < callsites_in_module.length; j += 1) {
						let thiscallsite = callsites_in_module[j]
						console.log(thiscallsite)

						let thisdata = this.$store.callsites[this.$store.runNames[i]][thiscallsite]
						if (thisdata != undefined) {
							mean_time.push({
								'callsite': thiscallsite,
								'val': thisdata['mean_time'],
								'run': this.$store.runNames[i]
							})
							mean_time_inc.push({
								'callsite': thiscallsite,
								'val': thisdata['mean_time (inc)'],
								'run': this.$store.runNames[i]
							})

						}
					}
				}
			}

			console.log(mean_time, mean_time_inc)

			let all_data = this.$store.modules['ensemble'][this.module]
			let temp
			if (this.$store.selectedScatterMode == 'mean') {
				temp = this.scatterMean(mean_time, mean_time_inc)
			}
			else if (this.$store.selectedScatterMode == 'all') {
				temp = this.scatterAll(data['time'], data['time (inc)'])
			}

			console.log(temp)

			this.xMin = temp[0]
			this.yMin = temp[1]
			this.xMax = temp[2]
			this.yMax = temp[3]
			this.xArray = temp[4]
			this.yArray = temp[5]

			this.leastSquaresCoeff = this.leastSquares(this.xArray.slice(), this.yArray.slice())
			this.regressionY = this.leastSquaresCoeff["y_res"];
			this.corre_coef = this.leastSquaresCoeff["corre_coef"];

			this.xAxisHeight = this.boxWidth - 4 * this.padding.left
			this.yAxisHeight = this.boxHeight - 4 * this.padding.left

			console.log(this.xMin, this.xMax, this.yMin, this.yMax)
			this.xScale = d3.scaleLinear().domain([this.xMin, 1.2 * this.xMax]).range([0, this.xAxisHeight])
			this.yScale = d3.scaleLinear().domain([this.yMin, 1.2 * this.yMax]).range([this.yAxisHeight, 0])
		},

		targetProcess() {
			let mean_time = []
			let mean_time_inc = []

			let callsites_in_module = this.$store.moduleCallsiteMap[this.$store.selectedTargetDataset][this.module]
			for (let i = 0; i < callsites_in_module.length; i += 1) {
				let thiscallsite = callsites_in_module[i]
				let thisdata = this.$store.callsites[this.$store.selectedTargetDataset][thiscallsite]
				mean_time.push({
					'callsite': thiscallsite,
					'val': thisdata['mean_time'],
					'run': this.$store.selectedTargetDataset
				})
				mean_time_inc.push({
					'callsite': thiscallsite,
					'val': thisdata['mean_time (inc)'],
					'run': this.$store.selectedTargetDataset
				})
			}

			let temp
			this.$store.selectedScatterMode = 'mean'
			if (this.$store.selectedScatterMode == 'mean') {
				temp = this.scatterMean(mean_time, mean_time_inc)
			}
			else if (this.$store.selectedScatterMode == 'all') {
				let data = this.$store.modules[this.$store.selectedTargetDataset][this.module]
				temp = this.scatterAll(data['time'], data['time (inc)'])
			}
			this.xtargetMin = temp[0]
			this.ytargetMin = temp[1]
			this.xtargetMax = temp[2]
			this.ytargetMax = temp[3]
			this.xtargetArray = temp[4]
			this.ytargetArray = temp[5]
		},

		scatterAll(xData, yData) {
			let xArray = []
			let yArray = []
			let yMin = 0
			let xMin = 0
			let xMax = 0
			let yMax = 0

			for (const [idx, d] of Object.entries(xData)) {
				xMin = Math.min(xMin, d)
				xMax = Math.max(xMax, d)
				xArray.push(d)
			}

			for (const [idx, d] of Object.entries(yData)) {
				yMin = Math.min(yMin, d)
				yMax = Math.max(yMax, d)
				yArray.push(d)
			}

			return [xMin, yMin, xMax, yMax, xArray, yArray]
		},

		scatterMean(xData, yData) {
			let xArray = []
			let yArray = []
			let yMin = 0
			let xMin = 0
			let xMax = 0
			let yMax = 0

			for (const [idx, d] of Object.entries(xData)) {
				console.log(d)
				xMin = Math.min(xMin, d.val)
				xMax = Math.max(xMax, d.val)
				xArray.push(d)
			}

			for (const [idx, d] of Object.entries(yData)) {
				yMin = Math.min(yMin, d.val)
				yMax = Math.max(yMax, d.val)
				yArray.push(d)
			}

			return [xMin, yMin, xMax, yMax, xArray, yArray]
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

		xAxis() {
			let self = this
			const xFormat = d3.format('0.1s');
			var xAxis = d3.axisBottom(this.xScale)
				.ticks(5)
				.tickFormat((d, i) => {
					let temp = d;
					if (i % 2 == 0) {
						let value = temp * 0.000001
						return `${xFormat(value)}s`
					}
					return '';
				});

			this.svg.append('text')
				.attr('class', 'scatterplot-axis-label')
				.attr('x', this.boxWidth - 2*this.padding.right)
				.attr('y', this.yAxisHeight - this.padding.top)
				.style('font-size', '12px')
				.style('text-anchor', 'end')
				.text("Exclusive Runtime")


			let xAxisHeightCorrected = this.yAxisHeight
			var xAxisLine = this.svg.append('g')
				.attr('class', 'axis')
				.attr('id', 'xAxis')
				.attr("transform", "translate(" + 3 * this.padding.left + "," + xAxisHeightCorrected + ")")
				.call(xAxis)

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
				.style('font-size', '12px')
				.style('font-family', 'sans-serif')
				.style('font-weight', 'lighter');
		},

		yAxis() {
			let self = this
			const yFormat = d3.format('0.2s')
			let yAxis = d3.axisLeft(this.yScale)
				.ticks(5)
				.tickFormat((d, i) => {
					let temp = d;
					if (i % 2 == 0) {
						let value = temp * 0.000001
						return `${yFormat(value)}s`
					}
					return '';
				})

			var yAxisLine = this.svg.append('g')
				.attr('id', 'yAxis')
				.attr('class', 'axis')
				.attr('transform', "translate(" + 3 * this.padding.left + ", 0)")
				.call(yAxis)

			this.svg.append("text")
				.attr('class', 'scatterplot-axis-label')
				.attr('transform', 'rotate(-90)')
				.attr('x', 0)
				.attr('y', 1 * this.padding.left)
				.style("text-anchor", "end")
				.style("font-size", "12px")
				.text("Inclusive Runtime")

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
				.style('font-size', '12px')
				.style('font-family', 'sans-serif')
				.style('font-weight', 'lighter');
		},

		trendline() {
			let self = this
			var line = d3.line()
				.x(function (d, i) {
					return self.xScale(self.xArray[i]) + 3 * self.padding.left;
				})
				.y(function (d, i) {
					return self.yScale(self.yArray[i]);
				});

			var trendline = this.svg.append('g')
				.attr('class', 'trend-line')
				.append("path")
				.datum(this.regressionY)
				.attr("d", line)
				.style("stroke", "black")
				.style("stroke-width", "1px")
				.style("opacity", 0.5);
		},

		ensembleDots() {
			for (let i = 0; i < this.xArray.length; i += 1) {
				this.svg
					.append('circle')
					.attrs({
						'class': 'ensemble-dot',
						'r': 5,
						'cx': () => {
							console.log(this.xScale(this.xArray[i].val), this.padding.left)
							return this.xScale(this.xArray[i].val) + 3 * this.padding.left
						},
						'cy': () => {
							return this.yScale(this.yArray[i].val)
						}
					})
					.style('stroke', '#202020')
					.style('stroke-width', 0.5)
					.style('fill', this.$store.color.ensemble)
			}
		},

		targetDots() {
			let self = this
			this.svg.selectAll('.target-dot')
				.data(this.ytargetArray)
				.enter().append('circle')
				.attr('class', 'target-dot')
				.attr('r', 5)
				.attr('cx', function (d, i) {
					return self.xScale(self.xtargetArray[i].val) + 3 * self.padding.left;
				})
				.attr('cy', function (d, i) {
					return self.yScale(self.ytargetArray[i].val);
				})
				.style('fill', this.$store.color.target)
				.style('stroke', '#202020')
				.style('stroke-width', 0.5)
		},

		correlationText() {
			let self = this
			let decimalFormat = d3.format("0.2f");
			this.svg.append('g').append('text')
				.attr('class', 'text')
				.text("corr-coef: " + decimalFormat(this.corre_coef))
				.attr("x", function (d) {
					return self.boxWidth - self.width / 3;
				})
				.attr("y", function (d) {
					return 20;
				});
		},

		setContainerWidth(newWidth) {
			containerWidth = newWidth;
			width = containerWidth - padding.left - padding.right;
		},


		clear() {
			console.log("clearing")
			d3.selectAll('.ensemble-dot').remove()
			d3.selectAll('.target-dot').remove()
			d3.selectAll('.axis').remove()
			d3.selectAll('.trend-line').remove()
			d3.selectAll('.scatterplot-axis-label').remove()
			d3.selectAll('.text').remove()
			d3.selectAll('.scatterplot-axis-label').remove()
		},

		update(data) {

		},
	}
}