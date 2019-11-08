import tpl from '../html/auxiliaryfunction.html'

export default {
    name: 'AuxiliaryFunction',
    template: tpl,
    data: () => ({
        selected: {},
        id: '',
        people: [],
        message: "Auxiliary Function View",
    }),

    sockets: {
        auxiliary_function(data) {
            data = JSON.parse(data)
            this.init(data)
        },
    },

    methods: {
        getClass: ({ id }) => ({
            'md-primary': id === 2,
            'md-accent': id === 3
        }),

        onSelect(item) {
            this.selected = item
        },

        getLabel(id){
            console.log(id)
            return this.labels[id]
        },

        init(data) {
            // console.log(data)
            // this.labels = Object.keys(data[0])
            // console.log(this.labels)
            // this.people = data
        },

        dataset(idx){
            return this.labels[idx]
        },

        changeText(idx){
            console.log(idx)
            return this.labels[idx]
        }
    }
}