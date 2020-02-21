import tpl from '../../html/function/index.html'
import * as  d3 from 'd3'

export default {
    name: 'Function',
    template: tpl,
    components: {
    },

    data: () => ({
        graph: null,
        id: 'function-overview',
        padding: {
            top: 10, right: 10, bottom: 10, left: 10
        },
        width: null,
        height: null,
        id: '',
        textxOffset: 10,
        textyOffset: 10,
        textPadding: 0,
        textCount:0,
        textSize: 15,
        message: "Callsite Information",
        number_of_callsites: 0,
    }),

    watch: {

    },

    sockets: {
        function(data) {
            data = JSON.parse(data)
            console.log("Function data: ", data)
            this.render(data)
        },

        splitcaller(data){
            console.log("Split caller graph", data)
        }
    },

    mounted() {
        this.id = 'function-overview-' + this._uid
    },

    methods: {
        init() {
            this.toolbarHeight = document.getElementById('toolbar').clientHeight
			this.footerHeight = document.getElementById('footer').clientHeight

            this.width = window.innerWidth*0.3
            this.height = window.innerHeight*0.5 - this.toolbarHeight - this.footerHeight

            this.boxWidth = this.width - this.padding.right - this.padding.left;
            this.boxHeight = this.height - this.padding.top - this.padding.bottom;
            this.functionHeight = this.boxHeight - this.histogramOffset;
            this.functionWidth = this.boxWidth;
            this.funcitonSVG = d3.select('#' + this.id)
                .attrs({
                    "width": this.boxWidth,// + this.padding.right + this.padding.left,
                    "height": this.boxHeight,
                    "transform": `translate(${this.padding.left}, ${this.padding.top})`
                })
            this.textPadding  = 1.5* this.textSize
        },

        addText(text, isBold=false) {
            this.textCount += 1
            this.toolTipText = d3.select('#'+this.id)
                .data([text])
                .append('text')
                // .attr('type', 'checkbox')
                .style('font-family', 'sans-serif')
                .style('font-weight', (d,i) => {
                    if(isBold){
                        return '700'
                    }
                    return '400'
                })
                .style('font-size', this.textSize)
                .attrs({
                    'class': 'functionContent',
                    'x': (d, i) => {
                        return this.textxOffset + "px"
                    },
                    'y': () => {
                        return this.textyOffset + this.textPadding * this.textCount + "px";
                    }
                })
                .text((d) => {
                    return d
                })
                .style('pointer-events', 'auto')
                .on('click', (d) => {
                    console.log("Selected split-caller", d)
                    this.$socket.emit('splitcaller',{
                        "name": "split-caller",
                        "dataset1": this.$store.selectedDataset,
                        "split": d
                    })
                })
        },

        render(data) {
            this.clear()

            this.addText('Module: ', true)
            this.addText(this.$store.selectedNode['id'])

            this.addText('Entry functions: ', true)
            let entry_functions = data['entry_functions'][0]
            let callees = data['callees']
            for(const [key, value] of Object.entries(callees[0])){
                this.addText(key)
            }

            this.addText('Callees: ', true)
            // let callees = data['callees']
            for(const [key, value] of Object.entries(callees[0])){
                let text = value + '  ->  ' + key
                this.addText(text)
            }

            this.addText('Callers: ', true)
            let callers = data['callers']
            for(const [key, value] of Object.entries(callers[0])){
                let text = value + '  ->  ' + key
                this.addText(text)
            }
            this.addText('Other Functions: ', true)
            let other_functions = data['other_functions'][0]
            for(let i = 0; i < other_functions.length; i += 1){
                this.addText(other_functions[i])
            }
        },

        clear() {
            this.textCount = 0
            d3.selectAll('.functionContent').remove()
        },

        update(data) {

        },
    }
}