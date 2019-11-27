import tpl from '../html/runInformation.html'
import EventHandler from './EventHandler'

export default {
    name: 'RunInformation',
    template: tpl,
    data: () => ({
        selected: {},
        id: '',
        message: "Run Information View",
        runs: [],
    }),
    mounted() {
        let self = this
        EventHandler.$on('highlight_dataset', (datasets) => {
            console.log("[Interaction] Highlighting the datasets :", datasets)
            self.highlight(datasets)
        })
    },
    sockets: {
        run_information(data) {
            data = JSON.parse(data)
            this.init(data)
        },
    },

    methods: {
        init(data) {
            this.labels = Object.keys(data[0])
            this.runs = data
        },

        getClass: ({ id }) => ({
            'md-primary': id === 2,
            'md-accent': id === 3
        }),

        onSelect(item) {
            this.selected = item
            console.log(item['dataset'])
            this.$store.highlight_dataset = item['dataset']
            EventHandler.$emit('highlight_dataset', item['dataset'])

        },

        getLabel(id){
            return this.labels[id]
        },

        dataset(idx){
            return this.labels[idx]
        },

        changeText(idx){
            return this.labels[idx]
        },

        highlight(){
            console.log("[Run information] highlight. ")
        },
    }
}