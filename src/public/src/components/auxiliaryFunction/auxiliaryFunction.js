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
        boxplotHeight: 250,
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
        formatName(name) {
            if (name.length < 20) {
                return name
            }
            let ret = this.trunc(name, 20)
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
            this.height = window.innerHeight - this.toolbarHeight - this.footerHeight
            this.boxplotWidth = this.width - this.padding.left - this.padding.right

            document.getElementById('auxiliary-function-overview').style.maxHeight =  this.height + "px"

            this.number_of_callsites = Object.keys(this.$store.callsites['ensemble']).length

            this.callsites = this.$store.callsites['ensemble']
            // EventHandler.$emit('highlight_dataset', {
            //     dataset: this.$store.selectedTargetDataset
            // })

        },

        clear() {
            var els = document.querySelectorAll('.auxiliary-node')
            for (var i = 0; i < els.length; i++) {
                els[i].parentNode.innerHTML = ''
            }
        },

        dataset(idx) {
            return this.labels[idx]
        },

        clickCallsite(event) {
            event.stopPropagation()
            let modules = this.module
            let callsite = this.name

            this.$socket.emit('dist_hierarchy', {
                module: modules,
                datasets: this.$store.runNames,
            })

            this.$socket.emit('ensemble_histogram', {
                datasets: this.$store.runNames,
                module: modules,
                name: callsite
            })
        },

        trunc(str, n) {
            str = str.replace(/<unknown procedure>/g, 'proc ')
            return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
        },

        selectCallsitesByModule(thismodule) {
            let all_callsites = Object.keys(this.$store.callsites[this.$store.selectedTargetDataset])

            for (let i = 0; i < all_callsites.length; i += 1) {
                document.getElementById(this.callsiteIDMap[all_callsites[i]]).style.opacity = 0.2
                document.getElementById(this.callsiteIDMap[all_callsites[i]]).style.borderStyle = 'solid'
            }

            let highlight_callsites = this.$store.moduleCallsiteMap[thismodule]
            for (let i = 0; i < highlight_callsites.length; i += 1) {
                document.getElementById(this.callsiteIDMap[highlight_callsites[i]]).style.opacity = 1
                document.getElementById(this.callsiteIDMap[highlight_callsites[i]]).style.borderStyle = 'dotted'
            }
        },

        highlightCallsitesByModule(thismodule) {
            let all_callsites = Object.keys(this.$store.callsites[this.$store.selectedTargetDataset])

            for (let i = 0; i < all_callsites.length; i += 1) {
                document.getElementById(this.callsiteIDMap[all_callsites[i]]).style.opacity = 0.2
                document.getElementById(this.callsiteIDMap[all_callsites[i]]).style.borderStyle = 'dotted'
            }

            let highlight_callsites = this.$store.moduleCallsiteMap[thismodule]
            for (let i = 0; i < highlight_callsites.length; i += 1) {
                document.getElementById(this.callsiteIDMap[highlight_callsites[i]]).style.opacity = 1
            }

            let selected_callsites = this.$store.moduleCallsiteMap[this.$store.selectedModule]
            for (let i = 0; i < selected_callsites.length; i += 1) {
                document.getElementById(this.callsiteIDMap[selected_callsites[i]]).style.borderStyle = 'solid'
            }

        },

        unhighlightCallsitesByModule() {
            let all_callsites = Object.keys(this.$store.callsites[this.$store.selectedTargetDataset])

            for (let i = 0; i < all_callsites.length; i += 1) {
                document.getElementById(this.callsiteIDMap[all_callsites[i]]).style.opacity = 1
                document.getElementById(this.callsiteIDMap[all_callsites[i]]).style.borderStyle = 'dotted'
            }

            let selected_callsites = this.$store.moduleCallsiteMap[this.$store.selectedModule]
            for (let i = 0; i < selected_callsites.length; i += 1) {
                document.getElementById(this.callsiteIDMap[selected_callsites[i]]).style.borderStyle = 'solid'
            }
        },

        highlightCallsitesByDataset(dataset) {
            let callsites = Object.keys(this.$store.callsites[dataset])

            for (let i = 0; i < callsites.length; i += 1) {
                document.getElementById(this.callsiteIDMap[callsites[i]]).style.borderColor = this.$store.color.target
            }
        }
    }
}

