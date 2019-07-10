import tpl from '../html/callflow.html'
import Callgraph from './callgraph'
import Diffgraph from './diffgraph'
import CCT from './cct'
import Icicle from './icicle'
import Histogram from './histogram'
import Vue from 'vue'

import VueSlider from 'vue-slider-component'
import 'vue-slider-component/theme/antd.css'
import Color from './color';

export default {
	name: 'entry',
	template: tpl,
	components: {
		Callgraph,
		CCT,
		Icicle,
		Diffgraph,
		VueSlider,
		Histogram
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
		modes: [],
		selectedMode: 'Single',
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
			} else {
				this.enableDiff = false
				this.modes = ['Single']
				this.selectedDataset2 = ''
				this.maxExcTime = data['max_excTime']
				this.minExcTime = data['min_excTime']
				this.maxIncTime = data['max_incTime']
				this.minIncTime = data['min_incTime']
				this.selectedIncTime = (this.selectedFilterPerc * this.maxIncTime) / 100
			}
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
			this.$refs.Icicle.init()
		},

		diff(data) {
			data = JSON.parse(data)
			this.$refs.Diffgraph.init(data)
		},
	},

	methods: {
		clear() {
			if (this.selectedFormat == 'Callgraph') {
				this.$refs.CCT.clear()
			} else if (this.selectedFormat == 'CCT') {
				this.$refs.Callgraph.clear()
			}
		},

		clearLocal() {
			if (this.selectedFormat == 'Callgraph') {
				this.$refs.Callgraph.clear()
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

			} else if (this.selectedMode == 'Diff') {
				this.$socket.emit('diff', {
					datasets: this.$store.datasets,
					format: this.selectedFormat
				})
			}
		},

		colors() {
			this.$store.color = new Color(this.selectedColorBy)
			this.$store.color.setColorScale(this.minIncTime, this.maxIncTime, this.minExcTime, this.maxExcTime)
		},

		reset() {
			this.$socket.emit('reset', {
				dataset: this.$store.selectedDataset,
				filterBy: this.selectedFilterBy,
				filterPerc: this.selectedFilterPerc
			})
		},

		updateColor() {
			this.$store.color = new Color(this.selectedColorBy)
			this.$store.color.setColorScale(this.minIncTime, this.maxIncTime, this.minExcTime, this.maxExcTime)
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
	}
}