import Vue from 'vue'
import VueSlider from 'vue-slider-component'
import 'vue-slider-component/theme/antd.css'
import Color from './color';
import Splitpanes from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import EventHandler from '../EventHandler'

// Template import
import tpl from '../html/callflow.html'

// Single mode imports
import Callgraph from './callgraph'
import CCT from './cct'
import Icicle from './icicle'
import Scatterplot from './scatterplot'
import Histogram from './histogram'
import Function from './function'

// Diff mode imports
import Diffgraph from './diffgraph'
import DiffFunction from './difffunction'
import DiffHistogram from './diffhistogram'
import DiffIcicle from './difficicle'
import DiffScatterplot from './diffScatterplot'
import DiffCCT from './diffcct'

export default {
	name: 'CallFlow',
	template: tpl,
	components: {
		Splitpanes,
		VueSlider,
		Callgraph,
		CCT,
		Scatterplot,
		Function,
		Histogram,
		Icicle,
		Diffgraph,
		DiffCCT,
		// DiffCCT2,
		DiffHistogram,
		DiffScatterplot,
		DiffFunction,
		DiffIcicle,
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
		scatterMode: ['mean', 'all'],
		selectedScatterMode: 'all',
		modes: [],
		selectedMode: 'Distribution',
		selectedBinCount: 5,
		selectedFunctionsInCCT: 50,
		selectedDiffNodeAlignment: 'Middle',
		diffNodeAlignment: ['Middle', 'Top'],
		isCallgraphInitialized: false,
		isCCTInitialized: false,
		datas: ['Dataframe', 'Graph'],
		selectedData: 'Dataframe',
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
			console.log("Config file contains: ", data)
			this.numOfDatasets = data['datasets'].length

			// Enable diff mode only if the number of datasets >= 2
			this.$store.datasets = data['names']
			this.datasets = data['names']
			this.$store.selectedDataset = data['names'][4]
			this.selectedDataset = data['names'][4]

			if (this.numOfDatasets >= 2) {
				this.enableDiff = true
				this.modes = ['Single', 'Distribution']
				this.selectedDataset2 = data['names'][4]
				this.$store.selectedDataset2 = data['names'][4]
				// this.selectedMode = 'Diff'

			} else {
				this.enableDiff = false
				this.modes = ['Single']
				this.selectedDataset2 = ''
				this.selectedMode = 'Single'
			}
			this.$store.maxExcTime = data['max_excTime']
			this.$store.minExcTime = data['min_excTime']
			this.$store.maxIncTime = data['max_incTime']
			this.$store.minIncTime = data['min_incTime']
			this.$store.numbOfRanks = data['numbOfRanks']
			this.$store.selectedBinCount = this.selectedBinCount
			this.selectedIncTime = ((this.selectedFilterPerc * this.$store.maxIncTime[this.selectedDataset] * 0.000001) / 100).toFixed(3)
			this.$store.selectedScatterMode = this.selectedScatterMode
			this.$store.selectedData = this.selectedData
			this.$store.selectedDiffNodeAlignment = this.selectedDiffNodeAlignment
			this.init()
		},

		reset(data) {
			console.log("Data for", this.selectedFormat, ": ", data)
			this.init()
		},

		group(data) {
			console.log(data)
			console.log("Data for", this.selectedFormat, ": ", data)
			if (this.selectedData == 'Dataframe') {
				this.$refs.CallgraphA.init(data)
			} else if (this.selectedData == 'Graph') {
				this.$refs.CallgraphB.init(data)
			}
			this.$refs.Scatterplot.init()
			this.$refs.Histogram.init()
			this.$refs.Function.init()
			this.$refs.Icicle.init()
		},

		diff_group(data) {
			console.log("Data for", this.selectedFormat, ": [", this.selectedMode, "]", data)
			if (this.selectedData == 'Dataframe') {
				this.$refs.DiffgraphA.init(data)
				this.$refs.DiffScatterplot.init()
				this.$refs.DiffHistogram.init()
			} else if (this.selectedData == 'Graph') {
				this.$refs.DiffgraphB.init(data)
				this.$refs.DiffFunction.init()
				this.$refs.DiffIcicle.init()
			}
		},

		diff_cct(data) {
			console.log("Diff CCT data: ", data)
			this.$refs.DiffCCT1.init(data[this.$store.selectedDataset], '1')
			this.$refs.DiffCCT2.init(data[this.$store.selectedDataset2], '2')
		}
	},

	methods: {
		clear() {
			if (this.selectedFormat == 'Callgraph') {
				this.$refs.CCT.clear()
			} else if (this.selectedFormat == 'CCT') {
				if (this.selectedData == 'Dataframe') {
					this.$refs.CallgraphA.clear()
				} else if (this.selectedData == 'Graph') {
					this.$refs.CallgraphB.clear()
				}
				this.$refs.Histogram.clear()
				this.$refs.Scatterplot.clear()
				this.$refs.Function.clear()
				this.$refs.Icicle.clear()
			}
		},

		clearLocal() {
			if (this.selectedFormat == 'Callgraph') {
				if (this.selectedData == 'Dataframe') {
					this.$refs.CallgraphA.clear()
				} else if (this.selectedData == 'Graph') {
					this.$refs.CallgraphB.clear()
				}
				this.$refs.Histogram.clear()
				this.$refs.Scatterplot.clear()
				this.$refs.Function.clear()
				this.$refs.Icicle.clear()
			} else if (this.selectedFormat == 'CCT') {
				this.$refs.CCT.clear()
			} else if (this.selectedFormat == 'Diffgraph') {
				this.$refs.Diffgraph.clear()
				this.$refs.Icicle.clear()
				this.$refs.DiffHistogram.clear()
			}
		},

		init() {
			// Initialize colors
			this.colors()

			if (this.selectedMode == 'Single') {
				if (this.selectedFormat == 'CCT') {
					this.$socket.emit('cct', {
						dataset: this.$store.selectedDataset,
						functionInCCT: this.selectedFunctionsInCCT,
					})
				} else if (this.selectedFormat == 'Callgraph') {
					this.$socket.emit('group', {
						dataset: this.$store.selectedDataset,
						format: this.selectedFormat,
						groupBy: this.selectedGroupBy
					})
				}

			} else if (this.selectedMode == 'Distribution') {
				if (this.selectedFormat == 'CCT') {
					this.$socket.emit('diff_cct', {
						dataset1: this.$store.selectedDataset,
						dataset2: this.$store.selectedDataset2,
						functionInCCT: this.selectedFunctionsInCCT,
					})
				} else if (this.selectedFormat == 'Callgraph') {
					this.$socket.emit('diff_init', {
						datasets: this.$store.datasets,
						groupBy: this.selectedGroupBy
					})
					
					this.$socket.emit('diff_group', {
						datasets: this.$store.datasets,
						groupBy: this.selectedGroupBy
					})
					// this.$socket.emit('diff_scatterplot', {
                    //     datasets: this.$store.datasets,
                    //     dataset1: this.$store.selectedDataset,
                    //     dataset2: this.$store.selectedDataset2,
                    //     col: 'time (inc)',
                    //     catcol: 'name',
                    //     plot: 'bland-altman'
                    // })
				}
			}
		},

		colors() {
			this.$store.color = new Color(this.selectedColorBy)
			this.colorMap = this.$store.color.getAllColors()

			if (this.selectedColorBy == 'Inclusive') {
				this.selectedColorMin = this.$store.minIncTime[this.selectedDataset]
				this.selectedColorMax = this.$store.maxIncTime[this.selectedDataset]
			} else if (this.selectedColorBy == 'Exclusive') {
				this.selectedColorMin = this.$store.minExcTime[this.selectedDataset]
				this.selectedColorMax = this.$store.maxExcTime[this.selectedDataset]
			}

			this.$store.color.setColorScale(this.selectedColorMin, this.selectedColorMax, this.selectedColorMap, this.selectedColorPoint)
			this.$store.colorPoint = this.selectedColorPoint
			console.log("Datasets are :", this.$store.datasets)
			this.$store.color.datasetColor = {}
			for(let i = 0; i < this.$store.datasets.length; i += 1){
				this.$store.color.datasetColor[this.$store.datasets[i]] = this.$store.color.getCatColor(i)
			}
			console.log("Assigned Color map: ", this.$store.color.datasetColor)
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
			if (this.selectedFormat == 'CCT') {
				this.$socket.emit('cct', {
					dataset: this.$store.selectedDataset,
					functionInCCT: this.selectedFunctionsInCCT,
				})
			} else if (this.selectedFormat == 'Callgraph') {
				this.$socket.emit('group', {
					dataset: this.$store.selectedDataset,
					format: this.selectedFormat,
					groupBy: this.selectedGroupBy
				})
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
			this.clearLocal()
			this.init()
		},

		updateDataset() {
			this.clearLocal()
			this.colors()
			this.$store.selectedDataset = this.selectedDataset
			this.init()
		},

		updateMode() {
			this.clear()
			this.init()
		},

		updateColorBy() {
			this.clearLocal()
			this.updateColor(this.selectedColorBy)
		},

		updateFilterBy() {
			Vue.nextTick(() => {

			})
		},

		updateColorPoint(){
			this.clearLocal()
			this.colors()
			this.init()
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

		},

		updateScatterMode() {
			if (this.$store.selectedNode != undefined) {
				this.$store.selectedScatterMode = this.selectedScatterMode
				this.$socket.emit('scatterplot', {
					module: this.$store.selectedNode,
					dataset1: this.$store.selectedDataset,
				})
			} else {
				console.log('The selected module is :', this.$store.selectedNode)
			}
		},

		updateFunctionsInCCT() {
			this.$socket.emit('cct', {
				dataset: this.$store.selectedDataset,
				functionInCCT: this.selectedFunctionsInCCT,
			})
		},

		updateData() {
			this.$store.selectedData = this.selectedData
			this.clear()
			this.init()
		},

		updateDiffNodeAlignment(){
			console.log('Alignment mode: ', this.selectedDiffNodeAlignment)
			this.$store.selectedDiffNodeAlignment = this.selectedDiffNodeAlignment
			EventHandler.$emit('update_diff_node_alignment')
		},

	}
}