import tpl from '../../html/auxiliaryFunction/index.html'
import EventHandler from '../EventHandler'
import Settings from '../settings/settings'
import BoxPlot from './boxplot'

export default {
    name: 'AuxiliaryFunction',
    template: tpl,
    components: {
        Settings,
        BoxPlot
    },
    data: () => ({
        selected: {},
        id: 'auxiliary-function-overview',
        people: [],
        message: "Callsite Information",
        callsites: [],
        dataReady: false,
        number_of_callsites: 0,
        firstRender: true,
        padding: { top: 0, right: 10, bottom: 0, left: 5 },
        textOffset: 25,
        boxplotHeight: 300,
        boxplotWidth: 0,
        duration: 300,
        iqrFactor: 0.15,
        outlierRadius: 4,
        targetOutlierList: {},
        outlierList: {},
        module_data: {},
        callsite_data: {},
        callsiteIDMap: {},
        settings: [
            { 'title': 'Sort by Inclusive runtime' },
            { 'title': 'Sort by Exclusive Runtime' }],
        compareMode: false,
        selectedModule: '',
        selectedCallsite: '',
        informationHeight: 70,
        reveal_callsites: [],

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
            self.selectCallsitesByModule(thismodule)
        })

        EventHandler.$on('unhighlight_module', (data) => {
            self.unhighlightCallsitesByModule()
        })

        EventHandler.$on('highlight_dataset', (data) => {
            let dataset = data['dataset']
            self.highlightCallsitesByDataset(dataset)
        })
    },

    methods: {
        formatModule(module){
            if(module.length < 10){
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
            let ret = (val * 0.000001).toFixed(2)
            return ret
        },

        init() {
            if (!this.firstRender) {
                this.clear()
            }
            else {
                this.firstRender = false
            }

            this.toolbarHeight = document.getElementById('toolbar').clientHeight
            this.footerHeight = document.getElementById('footer').clientHeight

            this.width = document.getElementById('auxiliary-function-overview').clientWidth
            this.height = 0.66 * this.$store.viewHeight
            this.boxplotWidth = this.width - this.padding.left - this.padding.right

            document.getElementById('auxiliary-function-overview').style.maxHeight = this.height + "px"
            this.setInfo()
        },

        clear() {

        },

        setInfo(){
            this.number_of_callsites = Object.keys(this.$store.callsites['ensemble']).length
            this.callsites = this.$store.callsites['ensemble']
            this.selectedModule = this.$store.selectedModule
            this.selectedCallsite = this.$store.selectedCallsite
        },

        dataset(idx) {
            return this.labels[idx]
        },

        clickCallsite(event) {
            event.stopPropagation()
            let callsite = event.currentTarget.id
            this.reveal_callsites.push(callsite)
            console.log(this.reveal_callsites)
            this.$socket.emit('reveal_callsite', {
                reveal_callsites: this.reveal_callsites,
                datasets: this.$store.runNames,
            })
        },

        trunc(str, n) {
            str = str.replace(/<unknown procedure>/g, 'proc ')
            return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
        },

        selectCallsitesByModule(thismodule) {
            this.selectedModule = thismodule
            this.selectedCallsite = ''  

            let all_callsites = Object.keys(this.$store.callsites[this.$store.selectedTargetDataset])
            let ensemble_callsites = this.$store.callsites['ensemble']

            for (let callsite in all_callsites) {
                if(ensemble_callsites.hasOwnProperty(callsite)){
                    document.getElementById(ensemble_callsites[callsite].id).style.opacity = 0.2
                    document.getElementById(ensemble_callsites[callsite].id).style.borderStyle = 'solid'
                }
            }

            let highlight_callsites = this.$store.moduleCallsiteMap[thismodule]
            for (let callsite in highlight_callsites) {
                if(ensemble_callsites.hasOwnProperty(callsite)){
                    document.getElementById(ensemble_callsites[callsite].id).style.opacity = 1
                    document.getElementById(ensemble_callsites[callsite].id).style.borderStyle = 'dotted'
                }
            }
        },

        highlightCallsitesByModule(thismodule) {
            let all_callsites = this.$store.callsites[this.$store.selectedTargetDataset]
            let ensemble_callsites = this.$store.callsites['ensemble']

            for (let callsite in all_callsites) {
                if(ensemble_callsites.hasOwnProperty(callsite)){
                    document.getElementById(ensemble_callsites[callsite].id).style.opacity = 0.2
                    document.getElementById(ensemble_callsites[callsite].id).style.borderStyle = 'dotted'
                }
            }

            let highlight_callsites = this.$store.moduleCallsiteMap[thismodule]
            for (let callsite in highlight_callsites) {
                if(ensemble_callsites.hasOwnProperty(callsite)){
                    document.getElementById(ensemble_callsites[callsite].id).style.opacity = 1
                }
            }

            let selected_callsites = this.$store.moduleCallsiteMap[this.$store.selectedModule]
            for (let callsite in selected_callsites) {
                if(ensemble_callsites.hasOwnProperty(callsite)){
                    document.getElementById(ensemble_callsites[callsite].id).style.borderStyle = 'solid'
                }
            }

        },

        unhighlightCallsitesByModule() {
            let ensemble_callsites = this.$store.callsites['ensemble']
            let all_callsites = this.$store.callsites[this.$store.selectedTargetDataset]

            for (let callsite in all_callsites) {
                if(ensemble_callsites.hasOwnProperty(callsite)){
                    document.getElementById(ensemble_callsites[callsite].id).style.opacity = 1
                    document.getElementById(ensemble_callsites[callsite].id).style.borderStyle = 'dotted'
                }
            }

            let selected_callsites = this.$store.moduleCallsiteMap[this.$store.selectedModule]
            for (let callsite in selected_callsites) {
                if(ensemble_callsites.hasOwnProperty(callsite)){
                    document.getElementById(ensemble_callsites[callsite].id).style.borderStyle = 'solid'
                }
            }
        },

        highlightCallsitesByDataset(dataset) {
            let callsites = this.$store.callsites[dataset]
            let ensemble_callsites = this.$store.callsites['ensemble']

            for(let callsite in callsites){
                if(ensemble_callsites.hasOwnProperty(callsite)){
                    document.getElementById(ensemble_callsites[callsite].id).style.borderColor = this.$store.color.target
                }
            }
        }
    }
}

