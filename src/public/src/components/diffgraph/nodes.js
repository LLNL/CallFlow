import tpl from '../../html/diffgraph/nodes.html'
import * as d3 from 'd3'
import ToolTip from './tooltip'
import EventHandler from '../../EventHandler'

export default {
    template: tpl,
    name: 'DiffNodes',
    components: {
        ToolTip
    },
    props: [],
    data: () => ({
        currentNodeLevel: {},
        nodeHeights: {},
        nodeWidth: 50,
        transitionDuration: 1000,
        minHeightForText: 15,
        textTruncForNode: 25,
        id: '',
        graph: null,
    }),
    mounted() {
        this.id = 'diff-nodes-' + this._uid

        let self = this
        EventHandler.$on('update_diff_node_alignment', function () {
            self.clearQuantileLines()
            self.quantileLines()
        })
    },

    methods: {
        init(graph) {
            this.graph = graph
            this.nodes = d3.select('#' + this.id)

            // https://observablehq.com/@geekplux/dragable-d3-sankey-diagram
            this.drag = d3.drag()
                .subject((d) => {
                    return d;
                })
                .on("start", function () {
                    this.parentNode.appendChild(this)
                })
                .on("drag", (d) => {
                    d3.select(`node_${d.mod_index[0]}`).attr("transform",
                        "translate(" + (
                            d.x = Math.max(0, Math.min(this.$parent.width - d.dx, d3.event.x))
                        ) + "," + (
                            d.y = Math.max(0, Math.min(this.$parent.height - d.dy, d3.event.y))
                        ) + ")");
                    // sankey.relayout();
                    // link.attr("d", path);
                })

            this.nodesSVG = this.nodes.selectAll('.diff-node')
                .data(this.graph.nodes)
                .enter().append('g')
                .attr('class', (d) => {
                    return 'diff-node'
                })
                .attr('opacity', 0)
                .attr('id', (d, i) => `diff-node_${d.xid}`)
                .attr('transform', (d) => {
                    return `translate(${d.x},${d.y })`
                })
            // .call(this.drag);

            this.nodes.selectAll('.diff-node')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .attr('opacity', 1)
                .attr('transform', d => `translate(${d.x},${d.y + this.$parent.ySpacing})`)

            this.rectangle()
            this.path()
            this.text()
            this.quantileLines()
            this.$refs.ToolTip.init(this.$parent.id)
        },

        rectangle() {
            let self = this
            this.nodesSVG.append('rect')
                .attr('height', (d) => {
                    this.currentNodeLevel[d.mod_index] = 0;
                    this.nodeHeights[d.n_index] = d.height;
                    return d.height;
                })
                .attr('width', this.nodeWidth)
                .attr('opacity', 0)
                .style('fill', d => {
                    let color = this.$store.color.getColor(d)
                    return color
                })
                .style('fill-opacity', (d) => {
                    return 1
                })
                .style('shape-rendering', 'crispEdges')
                .style('stroke', (d) => {
                    return d3.rgb(this.$store.color.getColor(d)).darker(2);
                })
                .style('stroke-width', (d) => {
                    return 1
                })
                .on('mouseover', function (d) {
                    self.$refs.ToolTip.render(self.graph, d)
                })
                .on('mouseout', function (d) {
                    self.$refs.ToolTip.clear()
                })
                .on('click', (d) => {
                    this.$store.selectedNode = d
                    let selectedModule = ''
                    if (d.id.indexOf(':') > -1) {
                        selectedModule = d.id.split(':')[0]
                    } else {
                        selectedModule = d.id
                    }

                    // this.$socket.emit('diff_hierarchy', {
                    //     module: selectedModule,
                    //     dataset1: this.$store.selectedDataset,
                    // })
                })

            // Transition
            this.nodes.selectAll('rect')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .duration(this.transitionDuration)
                .attr('opacity', d => {
                    // this.quantileLines(rect, d)
                    return 1;
                })
                .attr('height', d => d.height)
                .style('fill', (d) => {
                    return "#fff"
                    // return d.color = this.$store.color.getColor(d);
                })
                .style('stroke', (d) => {
                    return 1;
                });
        },

        clearQuantileLines() {
            d3.selectAll('.quantileLines').remove()
        },

        quantileLines() {
            let mode = this.$store.selectedDiffNodeAlignment
            let count = 0

            for (let i = 0; i < this.$store.graph.nodes.length; i++) {
                let node_data = this.$store.graph.nodes[i]
                let props = JSON.parse(JSON.stringify(node_data['props']))

                for (const [dataset, val] of Object.entries(props)) {
                    let x1 = node_data.x - this.nodeWidth
                    let x2 = node_data.x
                    let y1 = 0
                    let y2 = 0
                    if (mode == 'Middle') {
                        y1 = (node_data.height - val * node_data.height) * 0.5
                        y2 = node_data.height - y1
                    } else if (mode == 'Top') {
                        let gap = 5
                        y1 = 0 //+ count * gap
                        count += 1
                        y2 = node_data.height * val
                    }
                    d3.select('#diff-node_' + node_data.xid).append('line')
                        .attrs({
                            'class': 'quantileLines',
                            'id': 'line-1-' + dataset + '-' + node_data.xid,
                            "x1": 0,
                            "y1": y1,
                            "x2": this.nodeWidth,
                            "y2": y1
                        })
                        .style("stroke", this.$store.color.datasetColor[dataset])
                        .style("stroke-width", 3)

                    d3.select('#diff-node_' + node_data.xid).append('line')
                        .attrs({
                            'class': 'quantileLines',
                            'id': 'line-2-' + dataset + '-' + node_data.xid,
                            "x1": 0,
                            "y1": y2,
                            "x2": this.nodeWidth,
                            "y2": y2
                        })
                        .style("stroke", this.$store.color.datasetColor[dataset])
                        .style("stroke-width", 3)
                        .on('click', (d) => {
                            console.log(d)
                            d3.select(this).style("stroke", "black")
                            let dataset = d.id.split('-')

                            console.log(dataset)
                        })
                }
            }
        },

        path() {
            this.nodesSVG.append('path')
                .attr('d', (d) => {
                    return `m${0} ${0
                        }h ${this.nodeWidth
                        }v ${(1) * 0
                        }h ${(-1) * this.nodeWidth}`;
                })
                .style('fill', (d) => {
                    return this.$store.color.getColor(d);
                })
                .style('fill-opacity', (d) => {
                    return 0;
                })
                .style('stroke-opacity', '0.0');

            this.nodes.selectAll('path')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .delay(this.transitionDuration / 3)
                .style('fill-opacity', (d) => {
                    return 1.0;
                });
        },

        textSize(text) {
            const container = d3.select('#' + this.$parent.id).append('svg');
            container.append('text')
                .attrs({
                    x: -99999,
                    y: -99999
                })
                .text((d) => text);
            const size = container.node().getBBox();
            container.remove();
            return {
                width: size.width,
                height: size.height
            };
        },

        trunc(str, n) {
            return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
        },

        text() {
            this.nodesSVG.append('text')
                .attr('dy', '0.35em')
                .attr('transform', 'rotate(90)')
                .attr('x', '5')
                .attr('y', '-10')
                .style('opacity', 1)
                .text((d) => {
                    if (d.height < this.minHeightForText) {
                        return '';
                    }
                    var textSize = this.textSize(d.name)['width'];
                    if (textSize < d.height) {
                        return d.name[0];
                    } else {
                        return this.trunc(d.name, this.textTruncForNode)
                    }
                })
                .on('mouseover', function (d) {
                    // if (d.name[0] != 'intermediate') {
                    //     view.toolTipList.attr('width', '400px')
                    //         .attr('height', '150px');
                    //     d3.select(this.parentNode).select('rect').style('stroke-width', '2');
                    // }
                })
                .on('mouseout', function (d) {
                    // view.toolTipList.attr('width', '0px')
                    //     .attr('height', '0px');
                    // if (d.name[0] != 'intermediate') {
                    //     d3.select(this.parentNode).select('rect').style('stroke-width', '1');
                    //     //                unFade();
                    // }
                    // view.toolTip.style('opacity', 1)
                    //     .style('left', () => 0)
                    //     .style('top', () => 0);
                    // view.toolTipText.html('');
                    // view.toolTipG.selectAll('*').remove();
                });

            // Transition
            this.nodes.selectAll('text')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .style('opacity', 1)
                .style('fill', d => {
                    return '#000'
                    // return this.$store.color.setContrast(this.$store.color.getColor(d))
                })
                .text((d) => {
                    if (d.name.length == 1) {
                        name = d.name[0]
                    } else {
                        name = d.name
                    }
                    let name_splits = name.split('/').reverse()
                    if (name_splits.length == 1) {
                        d.name = name
                    } else {
                        d.name = name_splits[0]
                    }

                    if (d.name != 'i' && d.name[d.name.length - 1] != '_') {
                        if (d.height < this.minHeightForText) {
                            return '';
                        }
                        var textSize = this.textSize(d.name)['width'];
                        if (textSize < d.height) {
                            return d.name;
                        }
                        return this.trunc(d.name, this.textTruncForNode);
                    } else {
                        return '';
                    }
                });
        },

        clear() {
            d3.selectAll('.diff-node').remove()
            this.$refs.ToolTip.clear()
        },

    }
}