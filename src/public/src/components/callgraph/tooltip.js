    import tpl from '../../html/callgraph/tooltip.html'
    import * as d3 from 'd3'
    import EventHandler from '../../EventHandler'

    export default {
        template: tpl,
        name: 'ToolTip',
        components: {},

        props: [

        ],

        data: () => ({
            id: ''
        }),
        sockets: {
            tooltip(data) {
                this.render(data)
            },
        },
        watch: {

        },

        mounted() {
        },
        methods: {
            init(id) {
                this.id = id
                this.toolTipDiv = d3.select('#' + this.id)
                    .append('svg')
                    .attr('class', 'toolTipSVG')

                this.toolTipG = this.toolTipDiv.append('g')
            },

            render(graph, node) {
                this.clear()
                var svgScale = d3.scaleLinear().domain([2, 11]).range([50, 150]);
                this.toolTipG.attr('height', svgScale(10) + "px")
                var mousePos = d3.mouse(d3.select('#' + this.id).node());
                this.toolTipRect = this.toolTipG
                    .append('rect')
                    .attrs({
                        "class": "toolTip",
                        'fill': 'white',
                        "stroke": "black",
                        "rx": "10px",
                        "fill-opacity": 1,
                        "width": "300",
                        "height": "150",
                    })
                    .attrs({
                        'x': () => {
                            let halfWidth = document.getElementById('callgraph_overview').clientWidth/2
                            if (mousePos[0] + 10 + halfWidth > document.getElementById('callgraph_overview').clientWidth) {
                                return (mousePos[0] - 200) + 'px';
                            } else if (mousePos[0] < 100) {
                                return (mousePos[0]) + 'px'
                            } else {
                                return (mousePos[0] - 200) + 'px';
                            }
                        },
                        'y': () => {
                            return (mousePos[1] + 50) + "px";
                        }
                    })
                this.graph = graph
                this.node = node
                this.times()
                // this.paths()
            },

            addText(text) {
                this.toolTipText = this.toolTipG
                    .append('text')
                    .style('font-family', 'sans-serif')
                    .style('font-size', '13px')
                    .attrs({
                        'y': () => {},
                        'x': () => {}
                    })
                    .text(text)
            },

            times() {
                let self = this
                this.addText('Name: ' + this.node.name)
                // .text("Name: " + self.node.name +
                //     "<br> Inclusive Time: " + (self.node['inclusive'] * 0.000001).toFixed(3) + "s - " + (self.node['inclusive']).toFixed(3) + "%" +
                //     "<br> Exclusive Time: " + (self.node['exclusive'] * 0.000001).toFixed(3) + "s - " + (self.node["exclusive"]).toFixed(3) + "%");
            },

            paths() {
                var textLength = 100;
                var rectWidth = "5px";

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
                d3.selectAll('.toolTip').remove()
            },

        }
    }