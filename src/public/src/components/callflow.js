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
import AuxiliaryFunction from './auxiliaryFunction/auxiliaryFunction'
import EnsembleHistogram from './ensembleHistogram/ensembleHistogram'
import ModuleHierarchy from './moduleHierarchy/moduleHierarchy'
import EnsembleScatterplot from './ensembleScatterplot/ensembleScatterplot'
// import EnsembleDistribution from './ensembleDistribution/ensembleDistribution'
// import ParameterProjection from './parameterProjection/parameterProjection'
// import SimilarityMatrix from './similarityMatrix/similarityMatrix'

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
		formats: ['CCT', 'CallGraph', 'SuperGraph'],
		selectedFormat: 'SuperGraph',
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
		caseStudy: ['Lulesh-Scaling-3-runs', 'Lulesh-Scaling-8-runs', 'Kripke-MPI', 'OSU-Bcast', 'Kripke-Scaling'],
		selectedCaseStudy: 	'Lulesh-Scaling-3-runs',
		// selectedCaseStudy: 'Kripke-MPI',
		// selectedCaseStudy: 'OSU-Bcast',
		// selectedCaseStudy: "Kripke-Scaling"
	}),

	watch: {},

	mounted() {
		var socket = io.connect(this.server, { reconnect: false });
		this.$socket.emit('init', {
			caseStudy: this.selectedCaseStudy
		})
	},

	created() {


	},

	beforeDestroy() {
		//Unsubscribe on destroy
		this.$socket.emit('disconnect');
	},

	sockets: {
		// Assign variables for the store and Callflow ui component.
		// Assign colors and min, max inclusive and exclusive times.
		init(data) {
			this.setupStore(data)
			this.setTargetDataset()
			this.setComponentMap()

			if (this.selectedMode == 'Single') {
				this.$socket.emit('single_callsite_data', {
					dataset: this.$store.selectedTargetDataset,
					sortBy: this.$store.auxiliarySortBy,
					binCount: this.$store.selectedBinCount,
					module: 'all'
				})
			}
			else if(this.selectedMode == 'Ensemble'){
				this.$socket.emit('ensemble_callsite_data', {
					datasets: this.$store.runNames,
					sortBy: this.$store.auxiliarySortBy,
					binCount: this.$store.selectedBinCount,
					module: 'all'
				})
			}
		},

		single_callsite_data(data) {
			console.log("Auxiliary Data: ", data)
			this.dataReady = true

			let module_data = data['module']
			// for (let key of Object.keys(module_data)) {
			// 	if (module_data.hasOwnProperty(key)) {
			// 		module_data[key] = this.processJSON(module_data[key])
			// 	}
			// }

			let callsite_data = data['callsite']
			// for (let key of Object.keys(callsite_data)) {
			// 	if (callsite_data.hasOwnProperty(key)) {
			// 		callsite_data[key] = this.processJSON(callsite_data[key])
			// 	}
			// }

			this.$store.callsites = {}
			let dataset = this.$store.selectedTargetDataset
			this.$store.callsites[dataset] = this.processCallsite(callsite_data[dataset])

			this.$store.modules = {}
			this.$store.modules[dataset] = this.processModule(module_data[dataset])

			console.log("[Socket] Single Callsite data processing done.")
			this.init()
		},

		ensemble_callsite_data(data) {
			console.log("Auxiliary Data: ", data)
			this.dataReady = true

			this.$store.modules = data['module']
			this.$store.callsites = data['callsite']
			this.$store.gradients = data['gradients']
			this.$store.moduleCallsiteMap = data['moduleCallsiteMap']
			this.$store.callsiteModuleMap = data['callsiteModuleMap']
			console.log("[Socket] Ensemble Callsite data processing done.")
			this.init()
		},

		// Reset to the init() function.
		reset(data) {
			console.log("Data for", this.selectedFormat, ": ", data)
			this.init()
		},

		disconnect() {
			console.log('Disconnected.')
		}
	},

	methods: {
		setupStore(data) {
			data = JSON.parse(data)
			console.log("Config file contains: 	", data)
			this.$store.numOfRuns = data['datasets'].length
			this.$store.runNames = data['names']
			this.datasets = this.$store.runNames

			// Enable diff mode only if the number of datasets >= 2
			if (this.numOfRuns >= 2) {
				this.modes = ['Single', 'Ensemble']
				this.selectedMode = 'Ensemble'
			}
			else if (this.numOfRuns == 1) {
				this.enableDist = false
				this.modes = ['Single']
				this.selectedMode = 'Single'
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
			this.$store.selectedScatterMode = 'mean'
			this.$store.auxiliarySortBy = this.auxiliarySortBy
			this.$store.nodeInfo = {}
			this.$store.selectedMetric = this.selectedMetric
		},


		setTargetDataset() {
			let max_inclusive_dataset = '';
			let max_inclusive_time = this.$store.maxIncTime['ensemble']
			let current_max_inclusive_time = 0.0
			for (let dataset in this.$store.maxIncTime) {
				if (this.$store.maxIncTime.hasOwnProperty(dataset)) {
					if (dataset != 'ensemble') {
						if (current_max_inclusive_time < this.$store.maxIncTime[dataset]) {
							current_max_inclusive_time = this.$store.maxIncTime[dataset]
							max_inclusive_dataset = dataset
						}
					}
				}
			}

			this.$store.selectedTargetDataset = max_inclusive_dataset
			this.selectedTargetDataset = max_inclusive_dataset

			console.log('Minimum among all runtimes: ', this.selectedTargetDataset)
		},

		setComponentMap() {
			this.currentSingleCCTComponents = [this.$refs.CCT]
			this.currentSingleCallGraphComponents = []
			this.currentSingleSuperGraphComponents = [
				this.$refs.SuperGraph,
				this.$refs.Histogram,
				this.$refs.Scatterplot,
				this.$refs.Function
			]

			this.currentEnsembleCCTComponents = [this.$refs.EnsembleCCT]
			this.currentEnsembleCallGraphComponents = []
			this.currentEnsembleSuperGraphComponents = [
				this.$refs.EnsembleSuperGraph,
				this.$refs.EnsembleHistogram,
				this.$refs.EnsembleScatterplot,
				this.$refs.AuxiliaryFunction,
				this.$refs.ModuleHierarchy
			]
		},

		setupColors() {
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
			this.selectedColorMinText = this.selectedColorMin.toFixed(3) * 0.000001
			this.selectedColorMaxText = this.selectedColorMax.toFixed(3) * 0.000001
			this.$store.color.highlight = '#AF9B90';//'#4681B4'
			this.$store.color.target = '#4681B4'//'#AF9B90';//'#4681B4'
			this.$store.color.ensemble = '#C0C0C0';//'#4681B4'
			this.$store.color.compare = '#043060'
		},

		clear() {
			if (this.selectedMode == 'Ensemble') {
				if (this.selectedFormat == 'CCT') {
					this.clearComponents(this.currentSingleCallGraphComponents)
				}
				else if (this.selectedFormat == 'Callgraph') {
					this.clearComponents(this.currentSingleCallGraphComponents)
				}
				else if(this.selectedFormat == 'SuperGraph'){
					this.clearComponents(this.currentSingleSuperGraphComponents)
				}
			}
			else if (this.selectedMode == 'Single') {
				if (this.selectedFormat == 'CCT') {
					this.clearComponents(this.currentEnsembleCCTComponents)
				}
				else if (this.selectedFormat == 'CallGraph') {
					this.clearComponents(this.currentEnsembleCallGraphComponents)
				}
				else if (this.selectedFormat == 'SuperGraph'){
					this.clearComponents(this.currentEnsembleSuperGraphComponents)
				}
			}
		},

		clearLocal() {
			if (this.selectedMode == 'Ensemble') {
				if (this.selectedFormat == 'CCT') {
					this.clearComponents(this.currentEnsembleCCTComponents)
				}
				else if (this.selectedFormat == 'CallGraph') {
					this.clearComponents(this.currentEnsembleCallGraphComponents)
				}
				else if(this.selectedFormat == 'SuperGraph'){
					this.clearComponents(this.currentEnsembleSuperGraphComponents)
				}
			}
			else if (this.selectedMode == 'Single') {
				if (this.selectedFormat == 'CCT') {
					this.clearComponents(this.currentSingleCCTComponents)
				}
				else if (this.selectedFormat == 'CallGraph') {
					this.clearComponents(this.currentEnsembleCallGraphComponents)
				}
				else if(this.selectedFormat == 'SuperGraph'){
					this.clearComponents(this.currentEnsembleSuperGraphComponents)
				}
			}
		},

		initComponents(componentList){
			for (let i = 0; i < componentList.length; i++) {
				componentList[i].init()
			}
		},

		clearComponents(componentList){
			for (let i = 0; i < componentList.length; i++) {
				componentList[i].clear()
			}
		},

		init() {
			if (this.selectedExhibitMode == 'Presentation') {
				this.enablePresentationMode()
			}

			// Initialize colors
			this.setupColors()

			console.log("Mode : ", this.selectedMode)
			console.log("Number of runs :", this.$store.numOfRuns)
			console.log("Dataset : ", this.selectedTargetDataset)
			console.log("Format = ", this.selectedFormat)

			// Call the appropriate socket to query the server.
			if (this.selectedMode == 'Single') {

				if(this.selectedFormat == 'SuperGraph'){
					this.initComponents(this.currentSingleSuperGraphComponents)
				}
				else if(this.selectedFormat == 'CallGraph'){
					this.initComponents(this.currentSingleCallGraphComponents)
				}
				else if(this.selectedFormat == 'CCT'){
					this.initComponents(this.currentSingleCCTComponents)
				}
			}
			else if (this.selectedMode == 'Ensemble') {
				if(this.selectedFormat == 'SuperGraph'){
					this.initComponents(this.currentEnsembleSuperGraphComponents)
				}
				else if(this.selectedFormat == 'CallGraph'){
					this.loadComponents(this.currentEnsembleCallGraphComponents)
				}
				else if(this.selectedFormat == 'CCT'){
					this.loadComponents(this.currentEnsembleCCTComponents)
				}
			}
		},

		reset() {
			this.$socket.emit('init', {
				caseStudy: this.selectedCaseStudy
			})
		},

		processJSON(json) {
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

		updateCaseStudy() {
			this.clearLocal()
			console.log("[Update] Case study: ", this.selectedCaseStudy)
			this.$socket.emit('init', {
				caseStudy: this.selectedCaseStudy
			})

			this.init()
		},

		// TODO: Write the ensemble and single version.
		updateDistributionColorMap() {
			this.clearLocal()
			this.setupColors()
			this.init()
		},

		updateRuntimeColorMap() {
			this.clearLocal()
			this.setupColors()
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
			this.$socket.emit('init', {
				caseStudy: this.selectedCaseStudy
			})
			this.init()
		},

		updateTargetDataset() {
			this.clearLocal()
			this.$store.selectedTargetDataset = this.selectedTargetDataset
			console.log("[Update] Target Dataset: ", this.selectedTargetDataset)
			this.init()
		},

		updateMode() {
			this.clear()
			this.init()
		},

		updateMetric() {
			this.$store.selectedMetric = this.selectedMetric
			this.clearLocal()
			this.setupColors()
			this.init()
		},

		updateColor() {
			this.clearLocal()
			this.setupColors()
			this.init()
		},

		updateColorPoint() {
			this.clearLocal()
			this.setupColors()
			this.init()
		},

		updateBinCount() {
			this.$store.selectedBinCount = this.selectedBinCount
			this.clearLocal()
			this.init()
		},

		updateFunctionsInCCT() {
			this.$socket.emit('cct', {
				dataset: this.$store.selectedTargetDataset,
				functionInCCT: this.selectedFunctionsInCCT,
			})
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
	}
}