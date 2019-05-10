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
		dialog: true,
		socketError: false,
		isAggregated: true,
		server: 'localhost:5000',
		config: {
			headers: { 'Access-Control-Allow-Origin': '*' }
		},
		left: false,
		formats: ['Callgraph', 'CCT'],
		datasets: ['kripke-impi', 'kripke-mvapich2', 'kripke-openmpi'],
		selectedDataset: 'kripke-impi',
		selectedDataset2: 'kripke-mvapich2',
		selectedFormat: 'Callgraph',
		groupBy: ['Name', 'Function', 'Files'],
		selectedGroupBy: 'Function',
		filterBy: ['Inclusive', 'Exclusive'],
		selectedFilterBy: 'Inclusive',
		filterPercRange: [0, 100],
		filterPerc: 10, 
		colorBy: ['Name', 'Exclusive', 'Inclusive', 'Uncertainity'],
		selectedColorBy: 'Exclusive',
		modes: ['Single', 'Diff'],
		selectedMode: 'Diff',
		CallgraphData: null,
		CCTData: null,
		level: [0, 4],
		isCallgraphInitialized: false,
		isCCTInitialized: false,
	}),

	watch: {
	},

	mounted() {
		this.registerSockets()
		this.init()
	},

	sockets: {
		connect: () => {
			console.log('socket connected')
		},
	},

	methods: {
		clear() {
			this.$refs.Callgraph.clear()
		},

		registerSockets() {
			this.sockets.subscribe('dataset', (data) => {
				console.log("Data for", this.selectedFormat, ": ", data)
				this.$refs.Callgraph.colorOption = this.selectedColorBy
				if (this.selectedFormat == 'Callgraph') {
					if (this.isCallgraphInitialized == true) {
						this.$refs.Callgraph.update(data)
					}
					else {
						this.isCallgraphInitialized = true
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
						this.$refs.CCT.init(data)
					}
				}
			})

			this.sockets.subscribe('diff', (data) => {
				data = JSON.parse(data)
				this.$refs.Diffgraph.init(data)
			})

			this.sockets.subscribe('module_hierarchy', (data) => {

			})
		},

		init() {
			if(this.selectedMode == 'Single'){
				this.$socket.emit('group', {
					dataset: this.selectedDataset,
					format: this.selectedFormat,
				})
				
			}
			else if(this.selectedMode == 'Diff'){
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

		updateColorBy(){
			Vue.nextTick(() => {
				this.clear()
				this.$refs.Callgraph.updateColor(this.selectedColorBy)
				
			})
		},

		updateFilterBy(){
			Vue.nextTick(() => {
				this.clear()
			})
		}
	}
}
