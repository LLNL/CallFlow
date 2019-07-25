import tpl from '../../html/diffgraph/nodes.html'
import * as d3 from 'd3'
import ToolTip from './tooltip'

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
        id: ''
    }),
    mounted() {
        this.id = 'diff-nodes-' + this._uid
    },
 
    methods: {
        init(graph, view) {
            this.graph = graph
            this.nodes = d3.select('#' + this.id)
            const node = this.nodes.selectAll('.diff-node')
                .data(this.graph.nodes)
                .enter().append('g')
                .attr('class', (d) => {
                    return 'diff-node'
                })
                .attr('opacity', 0)
                .attr('id', d => `diff-node_${d.mod_index}`)
                .attr('transform', (d) => {
                    return `translate(${d.x},${d.y })`
                })

            this.nodes.selectAll('.diff-node')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .attr('opacity', 1)
                .attr('transform', d => `translate(${d.x},${d.y + this.$parent.ySpacing})`)

            this.rectangle(node)
            this.path(node)
            this.text(node)
            this.$refs.ToolTip.init(this.$parent.id)
        },

        rectangle(node) {
            let self = this
            const rect = node.append('rect')
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
                    if(d.id.indexOf(':') >  -1 ){
                        selectedModule = d.id.split(':')[0]
                    }
                    else{
                        selectedModule = d.id
                    }
                    this.$socket.emit('diffscatterplot', {
                        module: selectedModule,
                        dataset1: this.$store.selectedDataset,
                    })
                    // this.$socket.emit('icicle', {
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

        quantileLines(rect, data) {
            for (let i = 0; i < data.nrange.length; i += 1) {
                let nrange = data.nrange[i]
                this.nodes.append('line')
                    .attr('id', 'line-' + i)
                    .style("stroke", "black")
                    .style("stroke-width", 2)
                    .attr("x1", data.x)
                    .attr("y1", data.y * (nrange / data.weight))
                    .attr("x2", data.x + this.nodeWidth)
                    .attr("y2", data.y * (nrange / data.weight))
            }
        },

        path(node) {
            node.append('path')
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

        text(node) {
            node.append('text')
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