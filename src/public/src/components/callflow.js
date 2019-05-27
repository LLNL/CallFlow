import tpl from '../html/callflow.html'
import Callgraph from './callgraph'
import Diffgraph from './diffgraph'
import CCT from './cct'
import Icicle from './icicle'
import Vue from 'vue'

export default {
	name: 'entry',
	template: tpl,
	components: {
		Callgraph,
		CCT,
		Icicle,
		Diffgraph,
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
		selectedFilterBy: 'Inclusive',
		filterPercRange: [0, 100],
		filterPerc: 10,
		colorBy: ['Name', 'Exclusive', 'Inclusive', 'Uncertainity'],
		selectedColorBy: 'Exclusive',
		modes: [],
		selectedMode: 'Single',
		CallgraphData: null,
		CCTData: null,
		level: [0, 4],
		isCallgraphInitialized: false,
		isCCTInitialized: false,
		enableDiff: false,
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
			}
			this.init()
		},

		group(data) {
			console.log("Data for", this.selectedFormat, ": ", data)
			if (this.selectedFormat == 'Callgraph') {
				if (this.isCallgraphInitialized == true) {
					this.$refs.Callgraph.update(data)
				}
				else {
					this.isCallgraphInitialized = true
					this.$refs.Callgraph.colorOption = this.selectedColorBy
					this.$refs.Callgraph.init(data)
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

		diff(data) {
			data = JSON.parse(data)
			this.$refs.Diffgraph.init(data)
		},

		hierarchy(data) {
			data = JSON.parse(data)
		},

		histogram(data) {
			data = JSON.parse(data)
			this.$refs.Histograms.init(data)
		}

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
		}
	}
}
