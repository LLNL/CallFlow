import tpl from '../../html/callgraph/tooltip.html'
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
                    "width": "300",
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
            this.times()
            // this.paths()
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

        times() {
            let self = this
            this.addText('Name: ' + this.node.name)
            this.addText('Inclusive Time: ' + (this.node.inclusive * 0.000001).toFixed(3) + "s - " + Math.floor(((this.node.inclusive / this.$store.maxIncTime[this.$store.selectedDataset]) * 100).toFixed(3)) + "%")
            this.addText('Exclusive Time: ' + (this.node.inclusive * 0.000001).toFixed(3) + "s - " + Math.floor(((this.node.inclusive / this.$store.maxIncTime[this.$store.selectedDataset]) * 100).toFixed(3)) + "%")
        },

        paths() {
            var textLength = 100
            var rectWidth = "5px"

            this.toolTipG.selectAll('*').remove();
            for (var tIndex = 0; tIndex < numberOfConn; tIndex++) {
                var yOffset = tIndex * 10;
                this.toolTipG.append('rect')
                    .attr('width', rectWidth)
                    .attr('height', '5px')
                    .attr('y', yOffset + 'px')
                    .style('fill', color(fromProcToProc[tIndex]["fromLM"]))
                var fpName = fromProcToProc[tIndex]["fromProc"];
                toolTipG.append('text')
                    .attr('x', "10")
                    .attr('y', (yOffset + 5) + "px")
                    .text(fpName.trunc(20))
                toolTipG.append('text')
                    .attr('x', "150")
                    .attr('y', (yOffset + 5) + "px")
                    .text("->")
                toolTipG.append('rect')
                    .attr('width', rectWidth)
                    .attr('height', '5px')
                    .attr('x', '170px')
                    .attr('y', yOffset + 'px')
                    .style('fill', color(fromProcToProc[tIndex]["toLM"]))
                toolTipG.append('text')
                    .attr('x', "180px")
                    .attr('y', (yOffset + 5) + "px")
                    .text(fromProcToProc[tIndex]["toProc"].trunc(20))
                // var timeInfo = fromProcToProc[0]["value"] + " (" + (fromProcToProc[0]["value"] / 36644360084 * 100 ) + "%)"
                var timeInfo = (fromProcToProc[tIndex]["value"] / rootRunTime * 100).toFixed(3) + '%'
                toolTipG.append('text')
                    .attr('x', "320")
                    .attr('y', (yOffset + 5) + "px")
                    .text(timeInfo)
            }
        },

        clear() {
            this.textCount = 0
            d3.selectAll('.toolTipContent').remove()
        },

    }
}