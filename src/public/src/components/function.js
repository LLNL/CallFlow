import tpl from '../html/function.html'
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
            top: 30, right: 30, bottom: 10, left: 10
        },
        width: null,
        height: null,
        id: '',
        textxOffset: 10,
        textyOffset: 10,
        textPadding: 0,
        textCount:0,
        textSize: 15
    }),

    watch: {

    },

    sockets: {
        function(data) {
            console.log("Function data: ", data)
            this.render(data)
        },
    },

    mounted() {
        this.id = 'function-overview-' + this._uid
    },

    methods: {
        init() {
            this.toolbarHeight = document.getElementById('toolbar').clientHeight
			this.footerHeight = document.getElementById('footer').clientHeight
			this.footerHeight = document.getElementById('footer').clientHeight
            this.width = window.innerWidth*0.3
            this.height = (window.innerHeight - this.toolbarHeight - 2* this.footerHeight)*0.5

            this.boxWidth = this.width - this.padding.right - this.padding.left;
            this.boxHeight = this.height - this.padding.top - this.padding.bottom - 20;
            this.functionHeight = this.boxHeight - this.histogramOffset;
            this.functionWidth = this.boxWidth;
            this.funcitonSVG = d3.select('#' + this.id)
                .attrs({    
                    "width": this.boxWidth + this.padding.right + this.padding.left,
                    "height": this.boxHeight + this.padding.top + this.padding.bottom,
                    "transform": `translate(${this.padding.left}, ${this.padding.top})`
                })
            this.textPadding  = 1.5* this.textSize
        },

        addText(text) {
            this.textCount += 1
            this.toolTipText = d3.select('#'+this.id)
                .append('text')
                .style('font-family', 'sans-serif')
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
                .text(text)
        },

        render(data) {
            this.addText('Entry functions: ')
            this.addText('Callees: ')
            this.addText('Callers: ')
            this.addText('Other Functions: ')
        },

        clear() {

        },

        update(data) {
         
        },
    }
}