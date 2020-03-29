import tpl from '../../html/auxiliaryFunction/index.html'
import EventHandler from '../EventHandler'
import Settings from '../settings/settings'
import BoxPlot from './boxplot'
import * as d3 from 'd3'

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
        message: "Callsite Information",
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
        selectedMetric: ''
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
            if(self.$store.showTarget){
                self.highlightCallsitesByDataset(dataset)
            }
        })

        EventHandler.$on('callsite_information_sort', (data) => {
            let attribute = self.$store.selectedRuntimeSortBy
            self.sortByAttribute(attribute)
        })

        EventHandler.$on('show_target_auxiliary', (data) => {
            console.log('aa')
            self.callsites = []
            // self.init()
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
            if (name.length < 15) {
                return name
            }
            let ret = this.trunc(name, 15)
            return ret
        },

        formatRuntime(val) {
            let format = d3.format('.2')
            let ret = format(val) + ' \u03BCs'
            return ret
        },

        init() {
            if (!this.firstRender) {
                this.clear()
            }
            else {
                this.firstRender = false
            }

            this.width = document.getElementById(this.id).clientWidth
            this.height = 0.66 * this.$store.viewHeight
            this.boxplotWidth = this.width - this.padding.left - this.padding.right

            document.getElementById(this.id).style.maxHeight = this.height + "px"
            this.setInfo()
        },

        clear(){

        },

        setInfo() {
            this.numberOfCallsites = Object.keys(this.$store.callsites['ensemble']).length
            this.callsites = this.$store.callsites['ensemble']
            this.sortByAttribute(this.$store.selectedRuntimeSortBy)
            this.selectedModule = this.$store.selectedModule
            this.selectedCallsite = this.$store.selectedCallsite
            this.selectedMetric = this.$store.selectedMetric
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
                datasets: this.$store.runNames,
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

        sortByAttribute(attribute) {
            // Create items array
            let self = this
            let items = Object.keys(this.callsites).map(function (key) {
                return [key, self.callsites[key]];
            });

            // Sort the array based on the second element
            if(attribute == 'Exclusive' || attribute == 'Inclusive'){
                items.sort(function (first, second) {
                    return second[1][attribute]['mean_time'] - first[1][attribute]['mean_time'];
                });    
            }
            else if(attribute == 'Variance'){
                items.sort(function (first, second) {
                    return second[1][self.$store.selectedMetric]['variance_time'] - first[1][self.$store.selectedMetric]['variance_time'];
                });       
            }

            this.callsites = items.reduce(function(map, obj) {
                map[obj[0]] = obj[1];
                return map;
            }, {});
        },

    }
}

