import tpl from '../../html/auxiliaryFunction/index.html'
import EventHandler from '../EventHandler'
import Settings from '../settings/settings'
import BoxPlot from './boxplot'
import * as d3 from 'd3'
import * as utils from '../utils'

export default {
    name: 'AuxiliaryFunction',
    template: tpl,
    components: {
        Settings,
        BoxPlot,
    },
    data: () => ({
        selected: {},
        id: 'auxiliary-function-overview',
        people: [],
        message: "Call site Correspondence",
        callsites: [],
        dataReady: false,
        numberOfCallsites: 0,
        firstRender: true,
        padding: { top: 0, right: 10, bottom: 0, left: 10 },
        textOffset: 25,
        boxplotHeight: 300,
        boxplotWidth: 0,
        duration: 300,
        iqrFactor: 0.15,
        outlierRadius: 4,
        targetOutlierList: {},
        outlierList: {},
        callsiteIDMap: {},
        settings: [
            { 'title': 'Sort by Inclusive runtime' },
            { 'title': 'Sort by Exclusive Runtime' }],
        compareMode: false,
        selectedModule: '',
        selectedCallsite: '',
        informationHeight: 70,
        revealCallsites: [],
        selectedMetric: '',
        means: {},
        variance: {},
        targetColor: '',
        differenceCallsites: {},
        intersectionCallsites: {}
    }),
    mounted() {
        let self = this
        EventHandler.$on('highlight_datasets', (datasets) => {
            console.log("[Interaction] Highlighting the datasets :", datasets)
            self.highlight(datasets)
        })

        EventHandler.$on('update_auxiliary_sortBy', (sortBy) => {
            self.updateSortBy(sortBy)
        })

        EventHandler.$on('highlight_module', (data) => {
            let thismodule = data['module']
            self.highlightCallsitesByModule(thismodule)
        })

        EventHandler.$on('select_module', (data) => {
            let thismodule = data['module']
            // self.selectCallsitesByModule(thismodule)
            self.selectModule(thismodule)
        })

        EventHandler.$on('unhighlight_module', (data) => {
            self.unhighlightCallsitesByModule()
        })

        EventHandler.$on('highlight_dataset', (data) => {
            let dataset = data['dataset']
            if (self.$store.showTarget) {
                self.highlightCallsitesByDataset(dataset)
            }
        })

        EventHandler.$on('callsite_information_sort', (data) => {
            let attribute = self.$store.selectedRuntimeSortBy
            self.sortByAttribute(attribute)
        })
    },

    methods: {
        formatModule(module) {
            if (module.length < 10) {
                return module
            }
            return this.trunc(module, 10)
        },

        formatName(name) {
            if (name.length < 40) {
                return name
            }
            let ret = this.trunc(name, 40)
            return ret
        },

        formatRuntime(val) {
            let format = d3.format('.2')
            let ret = format(val) + ' \u03BCs'
            return ret
        },

        KNC() {
            let callsites = new Set(Object.keys(this.$store.callsites['ensemble']))
            let targetCallsites = new Set(Object.keys(this.$store.callsites[this.$store.selectedTargetDataset]))
            let difference = new Set(
                [...callsites].filter(x => !targetCallsites.has(x)));

            let intersection = new Set(
                [...callsites].filter(x => targetCallsites.has(x)));

            return {
                'difference': Array.from(difference),
                'intersection': Array.from(intersection)
            }
        },

        init() {
            if (this.firstRender) {
                this.width = document.getElementById(this.id).clientWidth
                this.height = 0.66 * this.$store.viewHeight
                this.boxplotWidth = this.width - this.padding.left - this.padding.right
                document.getElementById(this.id).style.maxHeight = this.height + "px"
                this.firstRender = false
            }

            this.callsites = this.$store.callsites['ensemble']
            this.targetCallsites = this.$store.callsites[this.$store.selectedTargetDataset]

            this.knc = this.KNC()
            console.log(this.knc['difference'], this.knc['intersection'])

            this.numberOfDifferenceCallsites = Object.keys(this.knc['difference']).length
            this.numberOfIntersectionCallsites = Object.keys(this.knc['intersection']).length

            this.differenceCallsites = this.sortByAttribute(this.knc['difference'], this.$store.selectedMetric)
            this.intersectionCallsites = this.sortByAttribute(this.knc['intersection'], this.$store.selectedMetric)

            this.selectedModule = this.$store.selectedModule
            this.selectedCallsite = this.$store.selectedCallsite
            this.selectedMetric = this.$store.selectedMetric
            this.targetColor = d3.rgb(this.$store.color.target).darker(1)

            for (let callsite in this.callsites) {
                if (this.targetCallsites[callsite] != undefined) {
                    this.means[callsite] = utils.formatRuntimeWithoutUnits(this.targetCallsites[callsite][this.$store.selectedMetric]['mean_time'])
                    this.variance[callsite] = utils.formatRuntimeWithoutUnits(this.targetCallsites[callsite][this.$store.selectedMetric]['variance_time'])
                }
                else {
                    this.means[callsite] = '-'
                    this.variance[callsite] = '-'
                }
            }
        },

        clear() {

        },

        dataset(idx) {
            return this.labels[idx]
        },

        clickCallsite(event) {
            event.stopPropagation()
            let callsite = event.currentTarget.id
            this.revealCallsites.push(callsite)
            this.$socket.emit('reveal_callsite', {
                reveal_callsites: this.revealCallsites,
                datasets: this.$store.selectedDatasets,
            })

            EventHandler.$emit('reveal_callsite')
        },

        trunc(str, n) {
            str = str.replace(/<unknown procedure>/g, 'proc ')
            return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
        },

        selectModule(thismodule) {
            let module_callsites = this.$store.moduleCallsiteMap['ensemble'][thismodule]
            this.callsites = {}
            let all_callsites = Object.keys(this.$store.callsites['ensemble'])
            for (let callsite of all_callsites) {
                if (module_callsites.indexOf(callsite) > -1) {
                    this.callsites[callsite] = this.$store.callsites['ensemble'][callsite]
                }
            }
            this.numberOfCallsites = Object.keys(this.callsites).length
        },

        selectCallsitesByModule(thismodule) {
            this.selectedModule = thismodule
            this.selectedCallsite = ''

            let all_callsites = Object.keys(this.$store.callsites[this.$store.selectedTargetDataset])
            let ensemble_callsites = this.$store.callsites['ensemble']

            for (let callsite in all_callsites) {
                if (ensemble_callsites.hasOwnProperty(callsite)) {
                    document.getElementById(ensemble_callsites[callsite].id).style.opacity = 0.2
                    document.getElementById(ensemble_callsites[callsite].id).style.borderStyle = 'solid'
                }
            }

            let highlight_callsites = this.$store.moduleCallsiteMap[thismodule]
            for (let callsite in highlight_callsites) {
                if (ensemble_callsites.hasOwnProperty(callsite)) {
                    document.getElementById(ensemble_callsites[callsite].id).style.opacity = 1
                    document.getElementById(ensemble_callsites[callsite].id).style.borderStyle = 'dotted'
                }
            }
        },

        highlightCallsitesByModule(thismodule) {
            let all_callsites = this.$store.callsites[this.$store.selectedTargetDataset]
            let ensemble_callsites = this.$store.callsites['ensemble']

            for (let callsite in all_callsites) {
                if (ensemble_callsites.hasOwnProperty(callsite)) {
                    document.getElementById(ensemble_callsites[callsite].id).style.opacity = 0.2
                    document.getElementById(ensemble_callsites[callsite].id).style.borderStyle = 'dotted'
                }
            }

            let highlight_callsites = this.$store.moduleCallsiteMap[thismodule]
            for (let callsite in highlight_callsites) {
                if (ensemble_callsites.hasOwnProperty(callsite)) {
                    document.getElementById(ensemble_callsites[callsite].id).style.opacity = 1
                }
            }

            let selected_callsites = this.$store.moduleCallsiteMap[this.$store.selectedModule]
            for (let callsite in selected_callsites) {
                if (ensemble_callsites.hasOwnProperty(callsite)) {
                    document.getElementById(ensemble_callsites[callsite].id).style.borderStyle = 'solid'
                }
            }

        },

        unhighlightCallsitesByModule() {
            let ensemble_callsites = this.$store.callsites['ensemble']
            let all_callsites = this.$store.callsites[this.$store.selectedTargetDataset]

            for (let callsite in all_callsites) {
                if (ensemble_callsites.hasOwnProperty(callsite)) {
                    document.getElementById(ensemble_callsites[callsite].id).style.opacity = 1
                    document.getElementById(ensemble_callsites[callsite].id).style.borderStyle = 'dotted'
                }
            }

            let selected_callsites = this.$store.moduleCallsiteMap[this.$store.selectedModule]
            for (let callsite in selected_callsites) {
                if (ensemble_callsites.hasOwnProperty(callsite)) {
                    document.getElementById(ensemble_callsites[callsite].id).style.borderStyle = 'solid'
                }
            }
        },

        highlightCallsitesByDataset(dataset) {
            let callsites = this.$store.callsites[dataset]
            let ensemble_callsites = this.$store.callsites['ensemble']

            for (let callsite in callsites) {
                if (ensemble_callsites.hasOwnProperty(callsite)) {
                    document.getElementById(ensemble_callsites[callsite].id).style.borderColor = this.$store.color.target
                }
            }
        },

        sortByAttribute(callsites, attribute) {
            // Create items array
            let self = this
            let items = callsites.map(function (key) {
                return [key, self.callsites[key]];
            });
            // Sort the array based on the second element
            if (attribute == 'Exclusive' || attribute == 'Inclusive') {
                items = items.sort(function (first, second) {
                    return second[1][attribute]['mean_time'] - first[1][attribute]['mean_time'];
                });
            }
            else if (attribute == 'Variance') {
                items.sort(function (first, second) {
                    return second[1][self.$store.selectedMetric]['variance_time'] - first[1][self.$store.selectedMetric]['variance_time'];
                });
            }

            callsites = items.reduce(function (map, obj) {
                map[obj[0]] = obj[1];
                return map;
            }, {});

            return callsites
        },

    }
}

