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

// Ensemble mode imports
import Distgraph from './distgraph'
import SimilarityMatrix from './similarityMatrix'
import Projection from './projection'
import RunInformation from './runInformation'
import AuxiliaryFunction from './auxiliaryFunction'
import DistHistogram from './disthistogram'

import UploadButton from './uploadButton'
import io from 'socket.io-client'

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
		Distgraph,
		SimilarityMatrix,
		Projection,
		RunInformation,
		AuxiliaryFunction,
		DistHistogram,
		UploadButton
	},

	data: () => ({
		appName: 'CallFlow',
		// server: '169.237.6.49:5000',
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
		selectedTargetDataset: '',
		selectedDataset2: '',
		groupBy: ['Name', 'Module', 'File'],
		selectedGroupBy: 'Module',
		filterBy: ['Inclusive', 'Exclusive'],
		filterRange: [0, 100],
		selectedFilterBy: 'Inclusive',
		selectedIncTime: 0,
		filterPercRange: [0, 100],
		selectedFilterPerc: 5,
		colorBy: ['Module', 'Exclusive', 'Inclusive', 'Imbalance'],
		selectedColorBy: 'Inclusive',
		colorMap: [],
		selectedColorMap: "Reds",
		colorPoints: [3, 4, 5, 6, 7, 8, 9],
		selectedColorPoint: 9,
		selectedColorMin: null,
		selectedColorMax: null,
		selectedColorMinText: '',
		selectedColorMaxText: '',
		groupModes: ['include callbacks', 'exclude callbacks'],
		selectedGroupMode: 'include callbacks',
		scatterMode: ['mean', 'all'],
		selectedScatterMode: 'all',
		modes: [],
		selectedMode: '',
		selectedBinCount: 5,
		selectedFunctionsInCCT: 70,
		selectedDiffNodeAlignment: 'Top',
		diffNodeAlignment: ['Middle', 'Top'],
		isCallgraphInitialized: false,
		isCCTInitialized: false,
		datas: ['Dataframe', 'Graph'],
		selectedData: 'Dataframe',
		firstRender: false,
		enableDist: false,
		summaryChip: 'Ensemble Graph',
		auxiliarySortBy: 'time (inc)',
		ranks: [],
		selectedTargetDataset: '',
		initLoad: true,
		comparisonMode: false,
		selectedCompareDataset: null,
		compareModes: ['meanDiff', 'rankDiff'],
		selectedCompareMode: 'rankDiff',
		enableCompareMode: false,
		selectedOutlierBand: 4,
		defaultCallSite: '<program root>',
		exhibitModes: ['Presentation', 'Default'],
		selectedExhibitMode: 'Default',
		presentationOrder: [
			"run_information",
			"dist_group",
			"dist_gradients",
			"dist-mini-histogram",
			"dist_hierarchy",
			"dist_auxiliary",
			"dist_similarity",
			"dist_projection",
		],
		parameter_analysis: true,
	}),

	watch: {},

	mounted() {
		var socket = io.connect(this.server, { reconnect: false });

		// Check socket connection.
		console.log('Socket connection check-1 : ', socket.connected);
		socket.on('connect', function () {
			console.log('Socket connection check 2: ', socket.connected);
		});

		// Raise an exception if the socket fails to connect
		socket.on('connect_error', function (err) {
			console.log('Socket error: ', err);
		});

		this.$socket.emit('init')
	},

	sockets: {
		connect() {
			console.log('socket connected')
		},

		// Assign variables for the store and Callflow ui component.
		// Assign colors and min, max inclusive and exclusive times.
		init(data) {
			data = JSON.parse(data)
			console.log("Config file contains: ", data)
			this.numOfDatasets = data['datasets'].length

			// Enable diff mode only if the number of datasets >= 2
			let datasetMapping = this.assignUniqueDatasetNames(data['names'])
			this.$store.datasets = datasetMapping['arr']
			this.$store.datasetMap = datasetMapping['map']
			this.$store.datasetRevMap = datasetMapping['revmap']
			this.$store.actual_dataset_names = data['names']
			this.datasets = this.$store.actual_dataset_names

			if (this.numOfDatasets >= 2) {
				this.enableDist = true
				this.modes = ['Single', 'Ensemble']
				this.selectedMode = 'Ensemble'
				this.selectedTargetDataset = data['names'][0]
				this.$store.selectedTargetDataset = data['names'][0]
			}
			else {
				this.enableDist = false
				this.modes = ['Single']
				this.selectedDataset2 = ''
				this.selectedMode = 'Single'
				this.$store.selectedTargetDataset = data['names'][0]
				this.selectedTargetDataset = data['names'][0]
			}
			this.$store.maxExcTime = data['max_excTime']
			this.$store.minExcTime = data['min_excTime']
			this.$store.maxIncTime = data['max_incTime']
			this.$store.minIncTime = data['min_incTime']
			this.$store.numbOfRanks = data['numbOfRanks']
			this.$store.selectedBinCount = this.selectedBinCount
			this.selectedIncTime = ((this.selectedFilterPerc * this.$store.maxIncTime[this.selectedTargetDataset] * 0.000001) / 100).toFixed(3)
			this.$store.selectedScatterMode = this.selectedScatterMode
			this.$store.selectedData = this.selectedData
			this.$store.selectedFormat = this.selectedFormat
			this.$store.selectedGroupBy = this.selectedGroupBy
			this.$store.selectedDiffNodeAlignment = this.selectedDiffNodeAlignment
			this.$store.selectedCompareMode = this.selectedCompareMode
			this.$store.colorset = ['#59A14E', '#AF7AA1', '#F18F2C']
			this.$store.auxiliarySortBy = this.auxiliarySortBy
			this.$store.nodeInfo = {}
			this.setTargetDataset()

			this.init()
		},

		// Reset to the init() function.
		reset(data) {
			console.log("Data for", this.selectedFormat, ": ", data)
			this.init()
		},

		// Fetch aggregated graph for single mode.
		group(data) {
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

		// Fetch aggregated graph (Super graph) for distribution mode.
		dist_group(data) {
			data = JSON.parse(data)
			console.log("Data for", this.selectedFormat, ": [", this.selectedMode, "]", data)
			// DFS(data, "libmonitor.so.0.0.0=<program root>", true, true)
			console.log(this.initLoad, this.selectedData)
			if (this.selectedData == 'Dataframe' && this.initLoad) {
				this.$refs.Projection.init()
				this.$refs.SimilarityMatrix.init()
				this.$refs.DistgraphA.init(data)
				this.$refs.DistHistogram.init()
				this.$refs.AuxiliaryFunction.init()
				this.$refs.RunInformation.init()
				this.initLoad = false
			} else if (this.selectedData == 'Graph' && this.initLoad) {
				this.$refs.DistgraphB.init(data)
				// this.$refs.DistFunction.init()
				// this.$refs.DistIcicle.init()
				this.initLoad = false
			}
			else {
				this.$refs.DistgraphA.init(data)
			}
		},

		dist_group_highlight(data) {
			data = JSON.parse(data)
			console.log("Group highlight for", this.selectedFormat, ": [", this.selectedMode, "]", data)
			// DFS(data, "libmonitor.so.0.0.0=<program root>", true, true)
			if (this.selectedData == 'Dataframe' && this.initLoad) {
				this.$refs.DistgraphA.init(data)
			} else if (this.selectedData == 'Graph' && this.initLoad) {
				this.$refs.DistgraphB.init(data)
			}
			else {
				this.$refs.DistgraphA.init(data)
			}
		},

		// Fetch CCT for distribution mode.
		comp_cct(data) {
			console.log("Diff CCT data: ", data)
			this.$refs.DistCCT1.init(data[this.$store.selectedTargetDataset], '1')
			this.$refs.DistCCT2.init(data[this.$store.selectedTargetDataset], '2')
		},

		dist_cct(data) {
			console.log("Dist cct data: ", data)
			this.$refs.CCT.init(data['union'], '2')
		},

		dist_mini_histogram(data) {
			data = JSON.parse(data)
			this.createNodeInfoStore(data)
			this.$refs.DistHistogram.render(this.defaultCallSite)
		},

		compare() {
			this.selectedCompareDataset = this.$store.selectedCompareDataset
		},

		disconnect() {
			console.log('Disconnected.')
		}
	},

	methods: {
		// Assigns idx to datasets.
		// osu_bcast.XX.XX.XX-XX => osu_bcast_1 and so on.
		assignUniqueDatasetNames(names) {
			let ret = []
			let retMap = {}
			let retRevMap = {}
			for (let i = 0; i < names.length; i += 1) {
				let name = names[i].split('.')[0]
				ret.push(name + '_' + i)
				retMap[names[i]] = name + '_' + i
				retRevMap[name + '_' + i] = names[i]
			}
			return {
				"arr": ret,
				"map": retMap,
				"revmap": retRevMap
			}
		},

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
				this.$refs.Projection.clear()
			}
		},

		clearLocal() {
			// if (this.selectedFormat == 'Callgraph') {
			// 	if (this.selectedData == 'Dataframe') {
			// 		this.$refs.CallgraphA.clear()
			// 	} else if (this.selectedData == 'Graph') {
			// 		this.$refs.CallgraphB.clear()
			// 	}
			// 	this.$refs.Histogram.clear()
			// 	this.$refs.Scatterplot.clear()
			// 	this.$refs.Function.clear()
			// 	this.$refs.Icicle.clear()
			// 	this.$refs.Projection.clear()
			// } else
			if (this.selectedFormat == 'CCT') {
				this.$refs.CCT.clear()
			} else if (this.selectedFormat == 'Callgraph') {
				this.$refs.DistgraphA.clear()
				this.$refs.Icicle.clear()
				this.$refs.DistHistogram.clear()
				this.$refs.Projection.clear()
				this.$refs.RunInformation.clear()
				this.$refs.AuxiliaryFunction.clear()
			}
		},

		init() {
			this.presentationPage = 0
			if (this.selectedExhibitMode == 'Presentation') {
				let self = this
				this.addEvent(document, "keypress", function (e) {
					e = e || window.event;
					if (e.keyCode == '97') {
						console.log(self.presentationOrder, self.presentationPage)
						self.sendRequest(self.presentationOrder[self.presentationPage])
						self.presentationPage += 1
					}
				});
			}
			// Initialize colors
			this.colors()
			console.log("[Mode = ", this.selectedMode, "]")
			console.log("[Dataset = ", this.selectedTargetDataset, "]")
			console.log("[Format = ", this.selectedFormat, "]")
			// Call the appropriate socket to query the server.
			if (this.selectedMode == 'Single') {
				if (this.selectedFormat == 'CCT') {
					this.$socket.emit('cct', {
						dataset: this.$store.selectedTargetDataset,
						functionsInCCT: this.selectedFunctionsInCCT,
					})
				} else if (this.selectedFormat == 'Callgraph') {
					this.$socket.emit('group', {
						dataset: this.$store.selectedTargetDataset,
						format: this.selectedFormat,
						groupBy: this.selectedGroupBy
					})
				}

			} else if (this.selectedMode == 'Ensemble') {
				if (this.selectedFormat == 'CCT') {
					console.log("[Mode = Ensemble]")
					this.$socket.emit('dist_cct', {
						datasets: this.$store.actual_dataset_names,
						functionsInCCT: this.selectedFunctionsInCCT,
					})
				} else if (this.selectedFormat == 'Callgraph' && this.selectedExhibitMode == 'Default') {
					// if (this.parameter_analysis) {
					// 	this.$socket.emit('run_information', {
					// 		datasets: this.$store.actual_dataset_names,
					// 	})
					// }

					this.$socket.emit('dist_auxiliary', {
						datasets: this.$store.actual_dataset_names,
						sortBy: this.$store.auxiliarySortBy,
						module: 'all'
					})

					this.$socket.emit('dist_group', {
						datasets: this.$store.actual_dataset_names,
						groupBy: this.selectedGroupBy
					})

					// if(this.parameter_analysis){
					// 	this.$socket.emit('dist_similarity', {
					// 		datasets: this.$store.actual_dataset_names,
					// 		algo: 'deltacon',
					// 		module: 'all'
					// 	})
					// }

					// this.$socket.emit('dist_gradients', {
					// 	datasets: this.$store.actual_dataset_names,
					// 	plot: 'kde'
					// })

					// if(this.parameter_analysis){
					// 	this.$socket.emit('dist_projection', {
					// 		datasets: this.$store.actual_dataset_names,
					// 		algo: 'tsne'
					// 	})
					// }

					// this.$socket.emit('dist_hierarchy', {
					// 	module: 'libpsm_infinipath.so.1.16=41:<unknown procedure> 0x188fe [libpsm_infinipath.so.1.16]',
					// 	datasets: this.$store.actual_dataset_names,
					// })

					// this.$socket.emit('dist_hierarchy', {
					// 	module: 'Calc=CalcForceForNodes',
					// 	datasets: this.$store.actual_dataset_names,
					// })

					// this.$socket.emit('ensemble_histogram', {
					// 	module: 'libpsm_infinipath.so.1.16=41:<unknown procedure> 0x188fe [libpsm_infinipath.so.1.16]',
					// 	datasets: this.$store.actual_dataset_names,
					// })

					// this.$socket.emit('ensemble_histogram', {
					// 	module: 'Calc=CalcForceForNodes		',
					// 	datasets: this.$store.actual_dataset_names,
					// })

				}
			}
		},

		sendRequest(request) {
			console.log(request)
			switch (request) {
				case 'run_information':
					this.$socket.emit('run_information', {
						datasets: this.$store.actual_dataset_names,
					})
					break;
				case 'dist_group':
					this.$socket.emit('dist_group', {
						datasets: this.$store.actual_dataset_names,
						groupBy: this.selectedGroupBy
					})
					break;
				case 'dist-mini-histogram':
					this.$socket.emit('dist-mini-histogram', {
						'target-datasets': [this.$store.selectedTargetDataset],
					})
					break;
				case 'dist_similarity':
					this.$socket.emit('dist_similarity', {
						datasets: this.$store.actual_dataset_names,
						algo: 'deltacon',
						module: 'all'
					})
					break;
				case 'dist_gradients':
					this.$socket.emit('dist_gradients', {
						datasets: this.$store.actual_dataset_names,
						plot: 'kde'
					})
					break;
				case 'dist_projection':
					this.$socket.emit('dist_projection', {
						datasets: this.$store.actual_dataset_names,
						algo: 'tsne'
					})
					break;
				case 'dist_auxiliary':
					this.$socket.emit('dist_auxiliary', {
						datasets: this.$store.actual_dataset_names,
						sortBy: this.$store.auxiliarySortBy,
						module: 'all'
					})
					break;
				case 'dist_hierarchy':
					this.$socket.emit('dist_hierarchy', {
						module: 'libpsm_infinipath.so.1.16=41:<unknown procedure> 0x188fe [libpsm_infinipath.so.1.16]',
						datasets: this.$store.actual_dataset_names,
					})
					break;
			}
		},

		colors() {
			this.$store.color = new Color(this.selectedColorBy)
			this.$store.zeroToOneColor = new Color(this.selectedColorBy)
			this.$store.binColor = new Color('Bin')
			this.$store.rankDiffColor = new Color('RankDiff')
			this.$store.meanDiffColor = new Color('MeanDiff')

			this.colorMap = this.$store.color.getAllColors()
			if (this.selectedMode == 'Ensemble') {
				if (this.selectedColorBy == 'Inclusive') {
					this.selectedColorMin = this.$store.minIncTime['ensemble']
					this.selectedColorMax = this.$store.maxIncTime['ensemble']
				}
				else if (this.selectedColorBy == 'Exclusive') {
					this.selectedColorMin = this.$store.minExcTime['ensemble']
					this.selectedColorMax = this.$store.maxExcTime['ensemble']
				}
			}
			else if (this.selectedMode == 'Single') {
				if (this.selectedColorBy == 'Inclusive') {
					this.selectedColorMin = this.$store.minIncTime[this.selectedTargetDataset]
					this.selectedColorMax = this.$store.maxIncTime[this.selectedTargetDataset]
				} else if (this.selectedColorBy == 'Exclusive') {
					this.selectedColorMin = this.$store.minExcTime[this.selectedTargetDataset]
					this.selectedColorMax = this.$store.maxExcTime[this.selectedTargetDataset]
				}
			}

			this.$store.color.setColorScale(this.selectedColorMin, this.selectedColorMax, this.selectedColorMap, this.selectedColorPoint)
			this.$store.zeroToOneColor.setColorScale(0, 1, this.selectedColorMap, this.selectedColorPoint)

			this.$store.colorPoint = this.selectedColorPoint
			console.log("Datasets are :", this.datasets)
			this.$store.color.datasetColor = {}
			for (let i = 0; i < this.$store.datasets.length; i += 1) {
				this.$store.color.datasetColor[this.$store.datasets[i]] = this.$store.color.getCatColor(i)
			}
			console.log("Assigned Color map: ", this.$store.color.datasetColor)
			this.$store.selectedColorMin = this.selectedColorMin
			this.$store.selectedColorMax = this.selectedColorMax
			this.$store.selectedColorMap = this.selectedColorMap
			this.$store.selectedColorPoint = this.selectedColorPoint
			this.selectedColorMinText = this.$store.selectedColorMinText = this.selectedColorMin.toFixed(3) * 0.000001
			this.selectedColorMaxText = this.$store.selectedColorMaxText = this.selectedColorMax.toFixed(3) * 0.000001
			this.$store.color.highlight = '#AF9B90';//'#4681B4'
			this.$store.color.target = '#4681B4'//'#AF9B90';//'#4681B4'
			this.$store.color.ensemble = '#C0C0C0';//'#4681B4'
			this.$store.color.compare = '#043060'
		},

		reset() {
			this.$socket.emit('reset', {
				dataset: this.$store.selectedTargetDataset,
				filterBy: this.selectedFilterBy,
				filterPerc: this.selectedFilterPerc
			})
		},

		createNodeInfoStore(data) {
			for (const [key, value] of Object.entries(data)) {
				let node = key
				let d = JSON.parse(value)
				let split_node = node.split('=')[1]
				this.$store.nodeInfo[split_node] = d
			}
			console.log("NodeInfo: ", this.$store.nodeInfo)
		},

		setTargetDataset() {
			let min_inclusive_dataset = '';
			let min_inclusive_time = this.$store.maxIncTime['ensemble']
			for (let dataset in this.$store.maxIncTime) {
				if (this.$store.maxIncTime.hasOwnProperty(dataset)) {
					if (min_inclusive_time > this.$store.maxIncTime[dataset]) {
						min_inclusive_dataset = dataset
					}
					min_inclusive_time = Math.min(this.$store.maxIncTime[dataset], min_inclusive_time)
				}
			}
			// this.$store.selectedTargetDataset = min_inclusive_dataset
			// this.selectedTargetDataset = min_inclusive_dataset
			this.$store.selectedTargetDataset = '1-core'
			this.selectedTargetDataset = '1-core'
			console.log('Minimum among all runtimes: ', this.selectedTargetDataset)
		},

		updateColor() {
			this.clearLocal()
			this.colors()
			if (this.selectedFormat == 'CCT') {
				this.$socket.emit('cct', {
					dataset: this.$store.selectedTargetDataset,
					functionsInCCT: this.selectedFunctionsInCCT,
				})
			} else if (this.selectedFormat == 'Callgraph') {
				this.$socket.emit('group', {
					dataset: this.$store.selectedTargetDataset,
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

		updateTargetDataset() {
			this.clearLocal()
			this.$store.selectedTargetDataset = this.selectedTargetDataset
			console.log("[Update] Target Dataset: ", this.selectedTargetDataset)
			if (this.selectedExhibitMode == 'Presentation') {
				for (let i = 0; i < this.presentationPage - 1; i += 1) {
					this.sendRequest(this.presentationOrder[this.presentationPage])
				}
			}
			else {
				this.init()
			}
		},

		updateMode() {
			this.clearLocal()
			if (this.selectedMode == 'Ensemble') {

			}
			else if (this.selectedMode == 'Single') {

			}
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

		updateColorPoint() {
			this.clearLocal()
			this.colors()
			this.init()
		},

		updateGroupBy() {
			Vue.nextTick(() => {
				this.clearLocal()
				this.$socket.emit('group', {
					dataset: this.$store.selectedTargetDataset,
					format: this.selectedFormat,
					groupBy: this.selectedGroupBy,
				})
			})
		},

		updateFilterPerc() {
			// this.$socket.emit('filter', {
			// 	dataset: this.$store.selectedTargetDataset,
			// 	format: this.selectedFormat,
			// 	filterBy: this.selectedFilterBy,
			// 	filterPerc: this.selectedFilterPerc
			// })
		},

		updateFilterIncTime() {
			this.selectedFilterPerc = (this.selectedIncTime / this.maxIncTime) * 100
			this.$socket.emit('filter', {
				dataset: this.$store.selectedTargetDataset,
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
					dataset: this.$store.selectedTargetDataset,
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
					dataset1: this.$store.selectedTargetDataset,
				})
			} else {
				console.log('The selected module is :', this.$store.selectedNode)
			}
		},

		updateFunctionsInCCT() {
			this.$socket.emit('cct', {
				dataset: this.$store.selectedTargetDataset,
				functionInCCT: this.selectedFunctionsInCCT,
			})
		},

		updateData() {
			this.$store.selectedData = this.selectedData
			this.clear()
			this.init()
		},

		updateDiffNodeAlignment() {
			console.log('Alignment mode: ', this.selectedDiffNodeAlignment)
			this.$store.selectedDiffNodeAlignment = this.selectedDiffNodeAlignment
			EventHandler.$emit('update_diff_node_alignment')
		},

		updateAuxiliarySortBy() {
			this.$store.auxiliarySortBy = this.auxiliarySortBy
			EventHandler.$emit('update_auxiliary_sortBy')
		},

		triggerCompare() {
			this.$socket.emit('compare', {
				targetDataset: this.$store.selectedTargetDataset,
				compareDataset: this.$store.selectedCompareDataset,
			})
		},

		updateCompareDataset() {
			this.$store.selectedCompareDataset = this.selectedCompareDataset
			this.$socket.emit('compare', {
				targetDataset: this.$store.selectedTargetDataset,
				compareDataset: this.$store.selectedCompareDataset,
			})
		},

		updateCompareMode() {
			this.$store.selectedCompareMode = this.selectedCompareMode
			this.$socket.emit('compare', {
				targetDataset: this.$store.selectedTargetDataset,
				compareDataset: this.$store.selectedCompareDataset,
			})
		},

		updateExhibitMode() {
			this.clearLocal()
			this.init()
		},

		fileSelected(e) {
			if (this.selectedCallback) {
				if (e.target.files[0]) {
					this.selectedCallback(e.target.files[0]);
				} else {
					this.selectedCallback(null);
				}
			}
		},

		addEvent(element, eventName, callback) {
			if (element.addEventListener) {
				element.addEventListener(eventName, callback, false);
			} else if (element.attachEvent) {
				element.attachEvent("on" + eventName, callback);
			} else {
				element["on" + eventName] = callback;
			}
		}

	}
}
