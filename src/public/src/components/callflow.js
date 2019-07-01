import tpl from '../html/callflow.html'
import Callgraph from './callgraph'
import Diffgraph from './diffgraph'
import CCT from './cct'
import Icicle from './icicle'
import Histogram from './histogram'
import Vue from 'vue'

import VueSlider from 'vue-slider-component'
import 'vue-slider-component/theme/antd.css'

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
			headers: { 'Access-Control-Allow-Origin': '*' }
		},
		left: false,
		formats: ['Callgraph', 'CCT'],
		datasets: [],
		selectedDataset: '',
		selectedDataset2: '',
		selectedFormat: 'Callgraph',
		groupBy: ['Name', 'Function', 'Files'],
		selectedGroupBy: 'Function',
		filterBy: ['Inclusive', 'Exclusive'],
		filterRange: [0, 100],
		selectedFilterBy: 'Inclusive',
		selectedIncTime: 0,
		filterPercRange: [0, 100],
		selectedFilterPerc: 10,
		colorBy: ['Name', 'Exclusive', 'Inclusive', 'Imbalance'],
		selectedColorBy: 'Exclusive',
		modes: [],
		selectedMode: 'Single',
		CallgraphData: null,
		CCTData: null,
		level: [0, 4],
		isCallgraphInitialized: false,
		isCCTInitialized: false,
		enableDiff: false,
		firstRender: false
	}),

	watch: {
	},

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
			this.datasets = data['names']
			this.selectedDataset = data['names'][0]

			if (this.numOfDatasets >= 2) {
				this.enableDiff = true
				this.modes = ['Single', 'Diff']
				this.selectedDataset2 = data['names'][1]
			}
			else {
				this.enableDiff = false
				this.modes = ['Single']
				this.selectedDataset2 = ''
				this.maxExcTime = data['max_excTime']
				this.minExcTime = data['min_excTime']
				this.maxIncTime = data['max_incTime']
				this.minIncTime = data['min_incTime']
				this.selectedIncTime = (this.selectedFilterPerc*this.maxIncTime)/100
			}
			this.init()
		},

		filter(data) {
			console.log("Data for", this.selectedFormat, ": ", data)
			this.update(data)
		},

		group(data) {
			console.log("Data for", this.selectedFormat, ": ", data)
			this.update(data)
		},

		diff(data) {
			data = JSON.parse(data)
			this.$refs.Diffgraph.init(data)
		},

		hierarchy(data) {
			data = JSON.parse(data)
		},
	},

	methods: {
		clear() {
			if (this.selectedFormat == 'Callgraph') {
				this.$refs.CCT.clear()
			}
			else if (this.selectedFormat == 'CCT') {
				this.$refs.Callgraph.clear()
			}
		},

		clearLocal(){
			if (this.selectedFormat == 'Callgraph') {
				this.$refs.Callgraph.clear()
			}
			else if (this.selectedFormat == 'CCT') {
				this.$refs.CCT.clear()
			}
		},

		init() {
			if (this.selectedMode == 'Single') {
				this.$socket.emit('group', {
					dataset: this.selectedDataset,
					format: this.selectedFormat,
				})

			}
			else if (this.selectedMode == 'Diff') {
				this.$socket.emit('diff', {
					dataset1: this.selectedDataset,
					dataset2: this.selectedDataset2,
					format: this.selectedFormat
				})
			}
		},

		update(data){	
			if(this.firstRender == false){
				this.firstRender = true
			}
			else{
				console.log("Clearing the Sankey view")
				this.clearLocal()
			}
			if (this.selectedFormat == 'Callgraph') {
				if (this.isCallgraphInitialized == true) {
					this.$refs.Callgraph.update(data)
				}
				else {
					this.isCallgraphInitialized = true
					this.$refs.Callgraph.colorOption = this.selectedColorBy
					this.$refs.Callgraph.init(data)
					// this.$refs.Histogram.init(data)
				}
			}
			else if (this.selectedFormat == 'CCT') {
				this.CCTData = data
				if (this.isCCTInitialized == true) {
					this.$refs.CCT.update(data)
				}
				else {
					this.isCCTInitialized = true
					this.$refs.CCT.colorOption = this.selectedColorBy
					this.$refs.CCT.init(data)
				}
			}
		},

		reset() {
			this.$socket.emit('filter', {
				dataset: this.selectedDataset,
				format: this.selectedFormat,
				filterBy: this.selectedFilterBy,
				filterPerc: this.selectedFilterPerc
			})
		},

		updateFormat() {
			Vue.nextTick(() => {
				this.clear()
				this.$socket.emit('group', {
					dataset: this.selectedDataset,
					format: this.selectedFormat
				})
			})
		},

		updateDataset() {
			Vue.nextTick(() => {
				this.clear()
				this.$socket.emit('group', {
					dataset: this.selectedDataset,
					format: this.selectedFormat
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
				this.clear()
				this.$refs.Callgraph.updateColor(this.selectedColorBy)

			})
		},

		updateFilterBy() {
			Vue.nextTick(() => {
				this.clear()
			})
		},

		updateFilterPerc() {
			this.$socket.emit('filter', {
				dataset: this.selectedDataset,
				format: this.selectedFormat,
				filterBy: this.selectedFilterBy,
				filterPerc: this.selectedFilterPerc
			})
		},

		updateFilterIncTime(){
			this.selectedFilterPerc = (this.selectedIncTime/this.maxIncTime)*100
			console.log(this.selectedFilterPerc)
			this.$socket.emit('filter', {
				dataset: this.selectedDataset,
				format: this.selectedFormat,
				filterBy: this.selectedFilterBy,
				filterPerc: this.selectedFilterPerc
			})
		},
	}
}
