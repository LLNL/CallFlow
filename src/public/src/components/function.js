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
        },

        addText(text) {
            this.textCount += 1
            this.toolTipText = d3.select('#'+this.id)
                .append('text')
                .style('font-family', 'sans-serif')
                .style('font-size', '')
                .attrs({
                    'class': 'toolTipContent',
                    'x': () => {
                        if (this.mousePosX + this.halfWidth > this.callgraphOverviewWidth) {
                            return (this.mousePosX - 200) + this.textxOffset + 'px';
                        } else if (this.mousePosX < 100) {
                            return (this.mousePosX) + this.textxOffset + 'px'
                        } else {
                            return (this.mousePosX - 200) + this.textxOffset + 'px';
                        }
                    },
                    'y': () => {
                        return (this.mousePosY + 50) + this.textyOffset + this.textPadding * this.textCount + "px";
                    }
                })
                .text(text)
        },

        render(data) {
            this.addText('Callees: ')
            this.addText('Callees: ')

        },

        clear() {

        },

        update(data) {
         
        },
    }
}