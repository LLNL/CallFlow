import tpl from '../html/callflow.html'
import Callgraph from './callgraph'
import Diffgraph from './diffgraph'
import CCT from './cct'
import Icicle from './icicle'
import Scatterplot from './scatterplot'
import Histogram from './histogram'
import Vue from 'vue'

import VueSlider from 'vue-slider-component'
import 'vue-slider-component/theme/antd.css'
import Color from './color';
import Splitpanes from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'


export default {
	name: 'entry',
	template: tpl,
	components: {
		Callgraph,
		CCT,
		Scatterplot,
		Diffgraph,
		VueSlider,
		Histogram,
		Splitpanes,
		Icicle,
	},
	data: () => ({
		socket: null,
		appName: 'Callflow',
		socketError: false,
		server: 'localhost:5000',
		config: {
			headers: {
				'Access-Control-Allow-Origin': '*'
			}
		},
		left: false,
		formats: ['Callgraph', 'CCT'],
		selectedFormat: 'Callgraph',
		datasets: [],
		selectedDataset: '',
		selectedDataset2: '',
		groupBy: ['Name', 'Module', 'File'],
		selectedGroupBy: 'Module',
		filterBy: ['Inclusive', 'Exclusive'],
		filterRange: [0, 100],
		selectedFilterBy: 'Inclusive',
		selectedIncTime: 0,
		filterPercRange: [0, 100],
		selectedFilterPerc: 10,
		colorBy: ['Module', 'Exclusive', 'Inclusive', 'Imbalance'],
		selectedColorBy: 'Inclusive',
		colorMap: [],
		selectedColorMap: "OrRd",
		colorPoints: [3, 4, 5, 6, 7, 8, 9],
		selectedColorPoint: 3,
		selectedColorMin: null,
		selectedColorMax: null,
		selectedColorMinText: '',
		selectedColorMaxText: '',
		groupModes: ['include callbacks', 'exclude callbacks'],
		selectedGroupMode: 'include callbacks',
		modes: [],
		selectedMode: 'Single',
		selectedBinCount: 5,
		CallgraphData: null,
		CCTData: null,
		isCallgraphInitialized: false,
		isCCTInitialized: false,
		enableDiff: false,
		firstRender: false,
	}),

	watch: {},

	mounted() {
		this.$socket.emit('init')
	},

	sockets: {
		connect() {
			console.log('socket connected')
		},

		init(data) {
			data = JSON.parse(data)
			console.log("Config file: ", data)
			this.numOfDatasets = data['datasets'].length
			// Enable diff mode only if the number of datasets >= 2
			this.$store.datasets = data['names']
			this.datasets = data['names']
			this.$store.selectedDataset = data['names'][0]
			this.selectedDataset = data['names'][0]

			if (this.numOfDatasets >= 2) {
				this.enableDiff = true
				this.modes = ['Single', 'Diff']
				this.selectedDataset2 = data['names'][1]
				this.$store.selectedDataset2 = data['names'][1]

			} else {
				this.enableDiff = false
				this.modes = ['Single']
				this.selectedDataset2 = ''
			}
			this.$store.maxExcTime = data['max_excTime']
			this.$store.minExcTime = data['min_excTime']
			this.$store.maxIncTime = data['max_incTime']
			this.$store.minIncTime = data['min_incTime']
			this.$store.numbOfRanks = data['numbOfRanks']
			this.$store.selectedBinCount = this.selectedBinCount
			this.selectedIncTime = ((this.selectedFilterPerc * this.$store.maxIncTime * 0.000001) / 100).toFixed(3)

			this.init()
		},

		reset(data) {
			console.log("Data for", this.selectedFormat, ": ", data)
			this.init()
		},

		group(data) {
			console.log("Data for", this.selectedFormat, ": ", data)
			this.$refs.Callgraph.init(data)
			this.$refs.Histogram.init()
			this.$refs.Scatterplot.init()

		},

		diff(data) {
			console.log("Data for", this.selectedFormat, ": ", data)
			this.$refs.Diffgraph.init(data)
			this.$refs.Histogram.init()
			this.$refs.Icicle.init()
		},
	},

	methods: {
		clear() {
			if (this.selectedFormat == 'Callgraph') {
				this.$refs.CCT.clear()
			} else if (this.selectedFormat == 'CCT') {
				this.$refs.Callgraph.clear()
				this.$refs.Histogram.clear()
				this.$refs.Scatterplot.clear()
			}
		},

		clearLocal() {
			if (this.selectedFormat == 'Callgraph') {
				this.$refs.Callgraph.clear()
				this.$refs.Histogram.clear()
				this.$refs.Icicle.clear()
			} else if (this.selectedFormat == 'CCT') {
				this.$refs.CCT.clear()
			}
		},

		init() {
			// Initialize colors
			this.colors()
			if (this.selectedMode == 'Single') {
				if (this.selectedFormat == 'CCT') {
					this.$socket.emit('cct', {
						dataset: this.$store.selectedDataset,
					})
				} else if (this.selectedFormat == 'Callgraph') {
					this.$socket.emit('group', {
						dataset: this.$store.selectedDataset,
						format: this.selectedFormat,
						groupBy: this.selectedGroupBy
					})
				}

			} 
			else if (this.selectedMode == 'Diff') {
				if (this.selectedFormat == 'CCT') {
					this.$socket.emit('cct', {
						dataset: this.$store.selectedDataset,
					})
					this.$socket.emit('cct2', {
						dataset: this.$store.selectedDataset2,
					})
				}
				else if(this.selectedFormat == 'Callgraph'){
					this.$socket.emit('diff', {
						dataset1: this.$store.selectedDataset,
						dataset2: this.$store.selectedDataset2,
						groupBy: this.selectedGroupBy
					})
				}
			}
		},

		colors() {
			this.$store.color = new Color(this.selectedColorBy)
			this.colorMap = this.$store.color.getAllColors()

			if (this.selectedColorBy == 'Inclusive') {
				this.selectedColorMin = this.$store.minIncTime
				this.selectedColorMax = this.$store.maxIncTime
			} else if (this.selectedColorBy == 'Exclusive') {
				this.selectedColorMin = this.$store.minExcTime
				this.selectedColorMax = this.$store.maxExcTime
			}

			this.$store.color.setColorScale(this.selectedColorMin, this.selectedColorMax, this.selectedColorMap, this.selectedColorPoint)
			this.selectedColorMinText = this.selectedColorMin.toFixed(3) * 0.000001
			this.selectedColorMaxText = this.selectedColorMax.toFixed(3) * 0.000001
		},

		reset() {
			this.$socket.emit('reset', {
				dataset: this.$store.selectedDataset,
				filterBy: this.selectedFilterBy,
				filterPerc: this.selectedFilterPerc
			})
		},

		updateColor() {
			this.colors()
			if (this.selectedFormat == 'Callgraph') {
				this.$refs.Callgraph.render()
			} else if (this.selectedFormat == 'CCT') {
				this.$refs.CCT.render()
			}
		},

		updateColorMinMax() {
			this.$store.color.setColorScale(this.selectedColorMin, this.selectedColorMax, this.selectedColorMap, this.selectedColorPoint)
			if (this.selectedFormat == 'Callgraph') {
				this.$refs.Callgraph.render()
			} else if (this.selectedFormat == 'CCT') {
				this.$refs.CCT.render()
			}
		},

		updateFormat() {
			Vue.nextTick(() => {
				// this.clear()
				if (this.selectedFormat == 'CCT') {
					this.$socket.emit('cct', {
						dataset: this.$store.selectedDataset,
					})
				} else {
					this.$socket.emit('group', {
						dataset: this.$store.selectedDataset,
						format: this.selectedFormat,
						groupBy: this.selectedGroupBy
					})
				}

			})
		},

		updateDataset() {
			Vue.nextTick(() => {
				this.clearLocal()
				this.$socket.emit('group', {
					dataset: this.$store.selectedDataset,
					format: this.selectedFormat,
					groupBy: this.selectedGroupBy
				})
			})
		},

		updateMode() {
			Vue.nextTick(() => {
				this.clear()
				this.init()
			})
		},

		updateColorBy() {
			Vue.nextTick(() => {
				this.clearLocal()
				this.updateColor(this.selectedColorBy)

			})
		},

		updateFilterBy() {
			Vue.nextTick(() => {

			})
		},

		updateGroupBy() {
			Vue.nextTick(() => {
				this.clearLocal()
				this.$socket.emit('group', {
					dataset: this.$store.selectedDataset,
					format: this.selectedFormat,
					groupBy: this.selectedGroupBy,
				})
			})
		},

		updateFilterPerc() {
			// this.$socket.emit('filter', {
			// 	dataset: this.$store.selectedDataset,
			// 	format: this.selectedFormat,
			// 	filterBy: this.selectedFilterBy,
			// 	filterPerc: this.selectedFilterPerc
			// })
		},

		updateFilterIncTime() {
			this.selectedFilterPerc = (this.selectedIncTime / this.maxIncTime) * 100
			this.$socket.emit('filter', {
				dataset: this.$store.selectedDataset,
				format: this.selectedFormat,
				filterBy: this.selectedFilterBy,
				filterPerc: this.selectedFilterPerc
			})
		},

		updateBinCount() {
			// Update the binCount in the store
			this.$store.selectedBinCount = this.selectedBinCount
			// Clear the existing histogram if there is one.
			if (this.$store.selectedNode != null) {
				this.$refs.Histogram.clear()
				let d = this.$store.selectedNode
				this.$socket.emit('histogram', {
					mod_index: d.mod_index[0],
					module: d.module[0],
					dataset1: this.$store.selectedDataset,
				})
			}
			// Call updateMiniHistogram inside callgraph.js
			this.$refs.Callgraph.updateMiniHistogram()
			// TODO: Call updateHistogram for diffCallgraph when needed. 

		}
	}
}