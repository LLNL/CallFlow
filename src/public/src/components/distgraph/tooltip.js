import tpl from '../../html/distgraph/tooltip.html'
import * as d3 from 'd3'

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
        textPadding: 13,
    }),
    sockets: {
        tooltip(data) {
            this.render(data)
        },
    },
    watch: {

    },

    mounted() {},
    methods: {
        init(id) {
            this.id = id
            this.toolTipDiv = d3.select('#' + this.id)
            this.toolTipG = this.toolTipDiv.append('g')
            this.callgraphOverviewWidth = window.innerWidth
            this.halfWidth = this.callgraphOverviewWidth / 2
        },

        render(graph, node) {
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
                    'fill': 'white',
                    "stroke": "black",
                    "rx": "10px",
                    "fill-opacity": 1,
                    "width": "375",
                    "height": "150",
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
            this.node = node

            if (this.mousePosX + this.halfWidth > this.callgraphOverviewWidth) {
                this.xOffset = this.mousePosX - 200 + this.textxOffset
            } else if (this.mousePosX < 100) {
                this.xOffset = this.mousePosX + this.textxOffset
            } else {
                this.xOffset = this.mousePosX - 200 + this.textxOffset
            }

            this.times()
            this.paths()
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
            this.addText('Name: ' + this.node.id.trunc(40))
            this.addText('Inclusive Time: ' + (this.node['time (inc)'] * 0.000001).toFixed(3) + "s - " + Math.floor(((this.node['time (inc)'] / this.$store.maxIncTime[this.$store.selectedDataset]) * 100).toFixed(3)) + "%")
            this.addText('Exclusive Time: ' + (this.node.inclusive * 0.000001).toFixed(3) + "s - " + Math.floor(((this.node.inclusive / this.$store.maxIncTime[this.$store.selectedDataset]) * 100).toFixed(3)) + "%")
        },

        paths() {
            console.log(this.node.callees)
            let entry_functions = this.node.callees

            this.rectWidth = "10px"

            this.addText('')
            this.addText('Entry Functions: ')

            for (var tIndex = 0; tIndex < entry_functions.length; tIndex++) {
                this.textCount += 1
                let fromColor = this.$store.color.getColor(this.node)
                let toColor = this.$store.color.getColorByValue(entry_functions['time (inc)'])
                let fromFunc = this.node.id
                let toFunc = entry_functions[tIndex]
                let xOffset = this.xOffset
                let yOffset = this.mousePosY + 50 + this.textyOffset + this.textPadding * this.textCount

                this.toolTipG
                    .append('rect')
                    .attrs({
                        'width': this.rectWidth,
                        'height': this.rectWidth,
                        'x': xOffset + 'px',
                        'y': yOffset - 10 + 'px',
                        'class': 'toolTipContent'
                    })
                    .style('fill', fromColor)

                this.toolTipG
                    .append('text')
                    .attrs({
                        'x': xOffset + 15 + 'px',
                        'y': yOffset + "px",
                        'class': 'toolTipContent',
                    })
                    .text(fromFunc.trunc(15))

                this.toolTipG
                    .append('text')
                    .attrs({
                        'x': xOffset + 120 + 'px',
                        'y': yOffset + "px",
                        'class': 'toolTipContent',
                    })
                    .text("->")

                this.toolTipG
                    .append('rect')
                    .attrs({
                        'width': this.rectWidth,
                        'height': this.rectWidth,
                        'x': xOffset + 140 + 'px',
                        'y': yOffset - 10 + 'px',
                        'class': 'toolTipContent',
                    })
                    .style('fill', toColor)
                this.toolTipG
                    .append('text')
                    .attrs({
                        'x': xOffset + 155 + 'px',
                        'y': yOffset + "px",
                        'class': 'toolTipContent',
                    })
                    .text(toFunc.trunc(15))
                let timeInfo = (entry_functions['time (inc)'] / this.$store.maxIncTime[this.$store.selectedDataset] * 100).toFixed(3) + '%'
                this.toolTipG.append('text')
                    .attrs({
                        'x': xOffset + 270 + 'px',
                        'y': (yOffset) + "px",
                        'class': 'toolTipContent',
                    })
                    .text(timeInfo)
            }
        },

        clear() {
            this.textCount = 0
            d3.selectAll('.toolTipContent').remove()
        },

    }
}