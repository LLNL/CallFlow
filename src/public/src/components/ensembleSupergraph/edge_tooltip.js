import tpl from '../../html/ensembleSupergraph/tooltip.html'
import * as d3 from 'd3'
import * as utils from '../utils'

export default {
    template: tpl,
    name: 'ToolTip',
    components: {},
    props: [

    ],

    data: () => ({
        id: '',
        textCount: 0,
        textxOffset: 20,
        textyOffset: 20,
        textPadding: 15,
    }),
    sockets: {
        tooltip(data) {
            this.render(data)
        },
    },
    watch: {

    },

    mounted() { },
    methods: {
        init(id) {
            this.id = id
            this.toolTipDiv = d3.select('#' + this.id)
            this.toolTipG = this.toolTipDiv.append('g')
            this.callgraphOverviewWidth = window.innerWidth
            this.halfWidth = this.callgraphOverviewWidth / 2
        },

        render(graph, edge) {
            this.clear()
            var svgScale = d3.scaleLinear().domain([2, 11]).range([50, 150]);
            this.mousePos = d3.mouse(d3.select('#' + this.id).node())
            this.mousePosX = this.mousePos[0]
            this.mousePosY = this.mousePos[1]
            this.toolTipG.attr('height', svgScale(10) + "px")
            this.toolTipRect = this.toolTipG
                .append('rect')
                .attrs({
                    "class": "toolTipContent",
                    'fill': '#e0e0e0',
                    "stroke": "black",
                    "rx": "10px",
                    "fill-opacity": 1,
                    "width": "250",
                    "height": "100",
                })
                .attrs({
                    'x': () => {
                        if (this.mousePosX + this.halfWidth > this.callgraphOverviewWidth) {
                            return (this.mousePosX - 200) + 'px';
                        } else if (this.mousePosX < 100) {
                            return (this.mousePosX) + 'px'
                        } else {
                            return (this.mousePosX - 200) + 'px';
                        }
                    },
                    'y': () => {
                        return (this.mousePosY + 50) + "px";
                    }
                })
            this.graph = graph
            this.edge = edge

            if (this.mousePosX + this.halfWidth > this.callgraphOverviewWidth) {
                this.xOffset = this.mousePosX - 200 + this.textxOffset
            } else if (this.mousePosX < 100) {
                this.xOffset = this.mousePosX + this.textxOffset
            } else {
                this.xOffset = this.mousePosX - 200 + this.textxOffset
            }

            this.times()
        },

        addText(text) {
            this.textCount += 1
            this.toolTipText = this.toolTipG
                .append('text')
                .style('font-family', 'sans-serif')
                .style('font-size', '')
                .attrs({
                    'class': 'toolTipContent',
                    'x': () => {
                        return this.xOffset + 'px'
                    },
                    'y': () => {
                        return (this.mousePosY + 50) + this.textyOffset + this.textPadding * this.textCount + "px";
                    }
                })
                .text(text)
        },

        times() {
            this.addText('Source: ' + this.edge.source)
            this.addText('Target: ' + this.edge.target)
            this.addText('Edge weight: ' + utils.formatRuntimeWithUnits(this.edge.weight))
            this.addText('Edge height: ' + this.edge.height.toFixed(2) + 'px')

        },

        clear() {
            this.textCount = 0
            d3.selectAll('.toolTipContent').remove()
        },

    }
}