import Vue from 'vue'
import { mapState, mapActions } from 'vuex';
import VueSlider from 'vue-slider-component'
import 'vue-slider-component/theme/antd.css'

import Color from './color/color';
import Splitpanes from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

import EventHandler from './EventHandler'

// Template import
import tpl from '../html/callflow.html'

// Single mode imports
import SuperGraph from './supergraph/supergraph'
import CCT from './cct/cct'
import RuntimeScatterplot from './runtimeScatterplot/runtimeScatterplot'
import SingleHistogram from './histogram/histogram'
import Function from './function/function'

// Ensemble mode imports
import EnsembleSuperGraph from './ensembleSupergraph/ensembleSupergraph'
import EnsembleCCT from './ensembleCCT/ensembleCCT'
// import SimilarityMatrix from './similarityMatrix/similarityMatrix'
// import ParameterProjection from './parameterProjection/parameterProjection'
import AuxiliaryFunction from './auxiliaryFunction/auxiliaryFunction'
import EnsembleHistogram from './ensembleHistogram/ensembleHistogram'
import ModuleHierarchy from './moduleHierarchy/moduleHierarchy'
import EnsembleScatterplot from './ensembleScatterplot/ensembleScatterplot'
// import EnsembleDistribution from './ensembleDistribution/ensembleDistribution'

import io from 'socket.io-client'

export default {
	name: 'CallFlow',
	template: tpl,
	components: {
		Splitpanes,
		VueSlider,
		SuperGraph,
		CCT,
		RuntimeScatterplot,
		Function,
		SingleHistogram,
		ModuleHierarchy,
		EnsembleSuperGraph,
		EnsembleCCT,
		// SimilarityMatrix,
		// ParameterProjection,
		AuxiliaryFunction,
		EnsembleHistogram,
		EnsembleScatterplot,
		// EnsembleDistribution
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
		metrics: ['Module', 'Exclusive', 'Inclusive', 'Imbalance'],
		selectedMetric: 'Exclusive',
		runtimeColorMap: [],
		distributionColorMap: [],
		selectedRuntimeColorMap: "Reds",
		selectedDistributionColorMap: "Greens",
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
		selectedBinCount: 20,
		selectedFunctionsInCCT: 70,
		selectedDiffNodeAlignment: 'Top',
		diffNodeAlignment: ['Middle', 'Top'],
		isCallgraphInitialized: false,
		isCCTInitialized: false,
		datas: ['Dataframe', 'Graph'],
		selectedData: 'Dataframe',
		firstRender: false,
		summaryChip: 'Ensemble SuperGraph',
		auxiliarySortBy: 'time (inc)',
		ranks: [],
		selectedTargetDataset: '',
		initLoad: true,
		comparisonMode: false,
		selectedCompareDataset: null,
		compareModes: ['meanDiff', 'rankDiff'],
		selectedCompareMode: 'meanDiff',
		selectedOutlierBand: 4,
		defaultCallSite: '<program root>',
		modes: ['Ensemble', 'Single'],
		selectedMode: 'Ensemble',
		// Presentation mode variables
		exhibitModes: ['Presentation', 'Default'],
		selectedExhibitMode: 'Default',
		presentationPage: 0,
		presentationOrder: [
			"run_information",
			"ensemble_supergraph",
			"ensemble_gradients",
			"ensemble_mini_histogram",
			"module_hierarchy",
			"ensemble_auxiliary",
			"ensemble_similarity",
			"ensemble_projection",
		],
		parameter_analysis: true,
		caseStudy: 'Lulesh-Scaling'
		// caseStudy: 'Kripke-MPI'
	}),

	watch: {},

	mounted() {
		var socket = io.connect(this.server, { reconnect: false });
	},

	created() {
		this.$socket.emit('config')
	},

	beforeDestroy() {
		//Unsubscribe on destroy
		this.$socket.emit('disconnect');
	},

	sockets: {
		// Assign variables for the store and Callflow ui component.
		// Assign colors and min, max inclusive and exclusive times.
		config(data) {
			data = JSON.parse(data)
			console.log("Config file contains: ", data)
			this.$store.numOfRuns = data['datasets'].length
			this.$store.runNames = data['names']
			this.datasets = this.$store.runNames

			// Enable diff mode only if the number of datasets >= 2
			if (this.numOfRuns >= 2) {
				this.modes = ['Single', 'Ensemble']
				this.selectedMode = 'Ensemble'
				this.selectedTargetDataset = data['names'][0]
				this.$store.selectedTargetDataset = data['names'][0]
			}
			else if (this.numOfRuns == 1) {
				this.enableDist = false
				this.modes = ['Single']
				this.selectedMode = 'Single'
				this.$store.selectedTargetDataset = data['names'][0]
				this.selectedTargetDataset = data['names'][0]
			}

			this.$store.maxExcTime = data['max_excTime']
			this.$store.minExcTime = data['min_excTime']
			this.$store.maxIncTime = data['max_incTime']
			this.$store.minIncTime = data['min_incTime']
			this.$store.numOfRanks = data['numOfRanks']
			this.$store.moduleCallsiteMap = data['module_callsite_map']
			this.$store.callsiteModuleMap = data['callsite_module_map']
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
			this.$store.selectedMetric = this.selectedMetric
			this.setTargetDataset()

			this.init()
		},

		single_callsite_data(data) {
			console.log("Auxiliary Data: ", data)
			this.dataReady = true

			let module_data = data['module']
			for (let key of Object.keys(module_data)) {
				if (module_data.hasOwnProperty(key)) {
					module_data[key] = this.processJSON(module_data[key])
				}
			}

			let callsite_data = data['callsite']
			for (let key of Object.keys(callsite_data)) {
				if (callsite_data.hasOwnProperty(key)) {
					callsite_data[key] = this.processJSON(callsite_data[key])
				}
			}

			this.$store.callsites = {}
			let dataset = this.$store.selectedTargetDataset
			this.$store.callsites[dataset] = this.processCallsite(callsite_data[dataset])

			this.$store.modules = {}
			this.$store.modules[dataset] = this.processModule(module_data[dataset])

			console.log(this.$store)
			console.log("[Socket] Single Callsite data processing done.")
		},

		ensemble_callsite_data(data) {
			console.log("Auxiliary Data: ", data)
			this.dataReady = true

			let module_data = data['module']
			for (let key of Object.keys(module_data)) {
				if (module_data.hasOwnProperty(key)) {
					module_data[key] = this.processJSON(module_data[key])
				}
			}

			let callsite_data = data['callsite']
			for (let key of Object.keys(callsite_data)) {
				if (callsite_data.hasOwnProperty(key)) {
					callsite_data[key] = this.processJSON(callsite_data[key])
				}
			}
			this.$store.callsites = {}
			let ensemble = this.processCallsite(callsite_data['ensemble'])
			this.$store.callsites['ensemble'] = ensemble
			for (let i = 0; i < this.$store.runNames.length; i += 1) {
				let dataset = this.$store.runNames[i]
				this.$store.callsites[dataset] = this.processCallsite(callsite_data[dataset])
			}

			this.$store.modules = {}
			this.$store.modules['ensemble'] = this.processModule(module_data['ensemble'])

			for (let i = 0; i < this.$store.runNames.length; i += 1) {
				let dataset = this.$store.runNames[i]
				this.$store.modules[dataset] = this.processModule(module_data[dataset])
			}

			this.$store.gradients = data['gradients']
			console.log("[Socket] Ensemble Callsite data processing done.")

		},

		// Reset to the init() function.
		reset(data) {
			console.log("Data for", this.selectedFormat, ": ", data)
			this.init()
		},

		// Fetch aggregated graph for single mode.
		single_supergraph(data) {
			data = JSON.parse(data)
			console.log("Data for", this.selectedFormat, ": ", data)

			this.$refs.SuperGraph.init(data)
			this.$refs.SingleHistogram.init()
			this.$refs.Function.init()
			this.$refs.RuntimeScatterplot.init()
		},

		// Fetch aggregated graph (Super graph) for distribution mode.
		ensemble_supergraph(data) {
			console.log(data)
			data = JSON.parse(data)
			console.log("Data for", this.selectedFormat, ": [", this.selectedMode, "]", data)
			if (this.initLoad) {
				// this.$refs.ParameterProjection.init()
				this.$refs.EnsembleSuperGraph.init(data)
				this.$refs.AuxiliaryFunction.init()
				this.$refs.EnsembleHistogram.init()
				// this.$refs.RunInformation.init()
				this.$refs.ModuleHierarchy.init()
				this.$refs.EnsembleScatterplot.init()
				// this.$refs.SimilarityMatrix.init()
// 				this.$refs.EnsembleDistribution.init()

				// this.initLoad = false
			}
		},

		compare() {
			this.selectedCompareDataset = this.$store.selectedCompareDataset
		},

		disconnect() {
			console.log('Disconnected.')
		}
	},

	methods: {
		socketPromise(socket_name, socket_params) {
			return new Promise((resolve) => {
				this.$socket.emit(socket_name, socket_params, resolve)
				console.log(this.$socket)
				this.$socket.on(socket_name, (data) => {
					console.log(data)
				})
			});
		},

		clear() {
			if (this.selectedMode == 'Ensemble') {
				if (this.selectedFormat == 'Callgraph') {
					this.$refs.EnsembleCCT.clear()
				} else if (this.selectedFormat == 'CCT') {
					this.$refs.EnsembleSuperGraph.clear()
					this.$refs.EnsembleHistogram.clear()
					// this.$refs.EnsembleDistribution.clear()
					this.$refs.EnsembleScatterplot.clear()
					this.$refs.Scatterplot.clear()
					this.$refs.AuxiliaryFunction.clear()
					this.$refs.ModuleHierarchy.clear()
				}
			}
			else if (this.selectedMode == 'Single') {
				if (this.selectedFormat == 'Callgraph') {
					this.$refs.CCT.clear()
				}
				else if (this.selectedFormat == 'CCT') {
					this.$refs.SuperGraph.clear()
					this.$refs.Function.clear()
					this.$refs.SingleHistogram.clear()
					this.$refs.RuntimeScatterplot.clear()
				}
			}
		},

		clearLocal() {
			if (this.selectedMode == 'Ensemble') {
				if (this.selectedFormat == 'CCT') {
					this.$refs.EnsembleCCT.clear()
				} else if (this.selectedFormat == 'Callgraph') {
					this.$refs.EnsembleSuperGraph.clear()
					this.$refs.ModuleHierarchy.clear()
					this.$refs.EnsembleHistogram.clear()
					// this.$refs.EnsembleDistribution.clear()
					// this.$refs.Projection.clear()
					// this.$refs.RunInformation.clear()
					this.$refs.AuxiliaryFunction.clear()
				}
			}
			else if (this.selectedMode == 'Single') {
				if (this.selectedFormat == 'CCT') {
					this.$refs.CCT.clear()
				}
				else if (this.selectedFormat == 'Callgraph') {
					this.$refs.SuperGraph.clear()
					this.$refs.Function.clear()
					this.$refs.SingleHistogram.clear()
					this.$refs.RuntimeScatterplot.clear()
				}
			}
		},

		init() {
			if (this.selectedExhibitMode == 'Presentation') {
				this.enablePresentationMode()
			}

			// Initialize colors
			this.colors()

			console.log("Mode : ", this.selectedMode)
			console.log("Number of runs :", this.$store.numOfRuns)
			console.log("Dataset : ", this.selectedTargetDataset)
			console.log("Format = ", this.selectedFormat)

			// Call the appropriate socket to query the server.
			if (this.selectedMode == 'Single') {
				this.initSingleMode()
			}
			else if (this.selectedMode == 'Ensemble') {
				this.initEnsembleMode()
			}
		},

		initSingleMode() {
			console.log("Single mode")
			if (this.selectedFormat == 'CCT') {
				this.$socket.emit('single_cct', {
					dataset: this.$store.selectedTargetDataset,
					functionsInCCT: this.selectedFunctionsInCCT,
					selectedMetric: this.selectedMetric,
				})
			} else if (this.selectedFormat == 'Callgraph') {
				this.$socket.emit('single_callsite_data', {
					dataset: this.$store.selectedTargetDataset,
					sortBy: this.$store.auxiliarySortBy,
					binCount: this.$store.selectedBinCount,
					module: 'all'
				})

				this.$socket.emit('single_supergraph', {
					dataset: this.$store.selectedTargetDataset,
					format: this.selectedFormat,
					groupBy: this.selectedGroupBy
				})

			}
		},

		initEnsembleMode() {
			console.log("Ensemble mode")
			if (this.selectedFormat == 'CCT') {
				console.log("[Mode = Ensemble]")
				this.$socket.emit('ensemble_cct', {
					datasets: this.$store.runNames,
					functionsInCCT: this.selectedFunctionsInCCT,
				})
			} else if (this.selectedFormat == 'Callgraph' && this.selectedExhibitMode == 'Default') {

				this.$socket.emit('ensemble_callsite_data', {
					datasets: this.$store.runNames,
					sortBy: this.$store.auxiliarySortBy,
					binCount: this.$store.selectedBinCount,
					module: 'all'
				})

				this.$socket.emit('ensemble_supergraph', {
					datasets: this.$store.runNames,
					groupBy: this.selectedGroupBy
				})


				this.$socket.emit('ensemble_similarity', {
					datasets: this.$store.runNames,
					algo: 'deltacon',
					module: 'all'
				})



				// if(this.parameter_analysis){
				// 	this.$socket.emit('dist_projection', {
				// 		datasets: this.$store.actual_dataset_names,
				// 		algo: 'tsne'
				// 	})
				// }
			}
		},

		colors() {
			this.$store.color = new Color(this.selectedMetric)
			this.$store.zeroToOneColor = new Color(this.selectedMetric)
			this.$store.binColor = new Color('Bin')
			this.$store.rankDiffColor = new Color('RankDiff')
			this.$store.meanDiffColor = new Color('MeanDiff')

			this.runtimeColorMap = this.$store.color.getAllColors()
			this.distributionColorMap = this.$store.color.getAllColors()
			if (this.selectedMode == 'Ensemble') {
				if (this.selectedMetric == 'Inclusive') {
					this.selectedColorMin = this.$store.minIncTime['ensemble']
					this.selectedColorMax = this.$store.maxIncTime['ensemble']
				}
				else if (this.selectedMetric == 'Exclusive') {
					this.selectedColorMin = this.$store.minExcTime['ensemble']
					this.selectedColorMax = this.$store.maxExcTime['ensemble']
				}
				else if (this.selectedMetric == 'Imbalance') {
					this.selectedColorMin = 0.0
					this.selectedColorMax = 1.0
				}
			}
			else if (this.selectedMode == 'Single') {
				if (this.selectedMetric == 'Inclusive') {
					this.selectedColorMin = this.$store.minIncTime[this.selectedTargetDataset]
					this.selectedColorMax = this.$store.maxIncTime[this.selectedTargetDataset]
				}
				else if (this.selectedMetric == 'Exclusive') {
					console.log(this.$store.minExcTime[this.selectedTargetDataset])
					this.selectedColorMin = this.$store.minExcTime[this.selectedTargetDataset]
					this.selectedColorMax = this.$store.maxExcTime[this.selectedTargetDataset]
				}
				else if (this.selectedMetric == 'Imbalance') {
					this.selectedColorMin = 0.0
					this.selectedColorMax = 1.0
				}
			}

			this.$store.color.setColorScale(this.selectedColorMin, this.selectedColorMax, this.selectedRuntimeColorMap, this.selectedColorPoint)
			this.$store.zeroToOneColor.setColorScale(0, 1, this.selectedRuntimeColorMap, this.selectedColorPoint)

			this.$store.colorPoint = this.selectedColorPoint
			console.log("Datasets are :", this.datasets)

			this.$store.selectedColorMin = this.selectedColorMin
			this.$store.selectedColorMax = this.selectedColorMax
			this.$store.selectedRuntimeColorMap = this.selectedRuntimeColorMap
			this.$store.selectedDistributionColorMap = this.selectedDistributionColorMap
			this.$store.selectedColorPoint = this.selectedColorPoint
			console.log(this.selectedColorMin)
			this.selectedColorMinText = this.selectedColorMin.toFixed(3) * 0.000001
			this.selectedColorMaxText = this.selectedColorMax.toFixed(3) * 0.000001
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

		processJSON(data) {
			let json = JSON.parse(data)
			let d = json.data
			let index = json.index
			let columns = json.columns

			let columnMap = {}
			let idx = 0
			for (let column of columns) {
				columnMap[column] = idx
				idx += 1
			}
			return {
				d: d,
				index: index,
				columns: columns,
				columnMap: columnMap
			}
		},

		processCallsite(data) {
			let callsites = {}
			for (let i = 0; i < data.index.length; i += 1) {
				let callsite = {}
				let callsite_name = data.d[i][data.columnMap['name']]
				for (let column of data.columns) {
					callsite[column] = data.d[i][data.columnMap[column]]
				}
				callsites[callsite_name] = callsite
			}
			return callsites
		},

		processModule(data) {
			let modules = {}
			for (let i = 0; i < data.index.length; i += 1) {
				let module_dict = {}
				let module_name = data.d[i][data.columnMap['module']]
				for (let column of data.columns) {
					module_dict[column] = data.d[i][data.columnMap[column]]
				}
				modules[module_name] = module_dict
			}
			return modules
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

			if (this.caseStudy == 'Lulesh-Scaling') {
				this.$store.selectedTargetDataset = '1-core'
				this.selectedTargetDataset = '1-core'
			}
			else if (this.caseStudy == 'Kripke-MPI') {
				this.$store.selectedTargetDataset = 'impi'
				this.selectedTargetDataset = 'impi'
			}
			else if (this.caseStudy == 'Kripke-Scaling') {
				this.$store.selectedTargetDataset = 'hpctoolkit-kripke-database-2589460'
				this.selectedTargetDataset = 'hpctoolkit-kripke-database-2589460'
			}
			else if (this.caseStudy == 'OSU-Bcast') {
				this.$store.selectedTargetDataset = 'osu_bcast.1.10.2019-09-03_20-45-50'
				this.selectedTargetDataset = 'osu_bcast.1.10.2019-09-03_20-45-50'
			}

			console.log('Minimum among all runtimes: ', this.selectedTargetDataset)
		},

		// TODO: Write the ensemble and single version.
		updateDistributionColorMap() {
			this.clearLocal()
			this.colors()
			if (this.selectedFormat == 'CCT') {
				this.$socket.emit('ensemble_cct', {
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

		updateRuntimeColorMap() {
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
			this.$store.color.setColorScale(this.selectedColorMin, this.selectedColorMax, this.selectedRuntimeColorMap, this.selectedColorPoint)
			if (this.selectedFormat == 'Callgraph') {
				this.$refs.Callgraph.render()
			} else if (this.selectedFormat == 'CCT') {
				this.$refs.CCT.render()
			}
		},

		updateFormat() {
			this.clear()
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
			this.clear()
			this.init()
		},

		updateMetric() {
			this.$store.selectedMetric = this.selectedMetric
			this.clearLocal()
			this.colors()
			this.init()
		},

		updateFilterBy() {
			Vue.nextTick(() => {

			})
		},

		updateColor() {
			this.clearLocal()
			this.colors()
			this.init()

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

		// updateBinCount() {
		// 	// Update the binCount in the store
		// 	this.$store.selectedBinCount = this.selectedBinCount
		// 	// Clear the existing histogram if there is one.
		// 	if (this.$store.selectedNode != null) {
		// 		this.$refs.Histogram.clear()
		// 		let d = this.$store.selectedNode
		// 		this.$socket.emit('histogram', {
		// 			mod_index: d.mod_index[0],
		// 			module: d.module[0],
		// 			dataset: this.$store.selectedTargetDataset,
		// 		})
		// 	}
		// 	// Call updateMiniHistogram inside callgraph.js
		// 	this.$refs.Callgraph.updateMiniHistogram()
		// 	// TODO: Call updateHistogram for diffCallgraph when needed.
		// },

		updateBinCount() {
			this.$store.selectedBinCount = this.selectedBinCount
			this.clearLocal()
			this.init()
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
				selectedMetric: this.$store.selectedMetric
			})
		},

		updateCompareDataset() {
			this.$store.selectedCompareDataset = this.selectedCompareDataset
			this.$socket.emit('compare', {
				targetDataset: this.$store.selectedTargetDataset,
				compareDataset: this.$store.selectedCompareDataset,
				selectedMetric: this.$store.selectedMetric
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

		// Presentation mode.
		addEvent(element, eventName, callback) {
			if (element.addEventListener) {
				element.addEventListener(eventName, callback, false);
			} else if (element.attachEvent) {
				element.attachEvent("on" + eventName, callback);
			} else {
				element["on" + eventName] = callback;
			}
		},

		enablePresentationMode() {
			let self = this
			this.addEvent(document, "keypress", function (e) {
				e = e || window.event;
				if (e.keyCode == '97') {
					self.sendPresentationRequest(self.presentationOrder[self.presentationPage])
					self.presentationPage += 1
				}
			});
		},

		sendPresentationRequest(request) {
			console.log(request)
			switch (request) {
				case 'run_information':
					this.$socket.emit('run_information', {
						datasets: this.$store.runNames,
					})
					break;
				case 'dist_group':
					this.$socket.emit('dist_group', {
						datasets: this.$store.runNames,
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
						datasets: this.$store.runNames,
						algo: 'deltacon',
						module: 'all'
					})
					break;
				case 'dist_gradients':
					this.$socket.emit('dist_gradients', {
						datasets: this.$store.runNames,
						plot: 'kde'
					})
					break;
				case 'dist_projection':
					this.$socket.emit('dist_projection', {
						datasets: this.$store.runNames,
						algo: 'tsne'
					})
					break;
				case 'dist_auxiliary':
					this.$socket.emit('dist_auxiliary', {
						datasets: this.$store.runNames,
						sortBy: this.$store.auxiliarySortBy,
						module: 'all'
					})
					break;
				case 'dist_hierarchy':
					this.$socket.emit('dist_hierarchy', {
						module: 'libpsm_infinipath.so.1.16=41:<unknown procedure> 0x188fe [libpsm_infinipath.so.1.16]',
						datasets: this.$store.runNames,
					})
					break;
			}
		}

	}
}
