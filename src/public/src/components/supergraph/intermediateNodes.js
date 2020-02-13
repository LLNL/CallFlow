import tpl from '../../html/supergraph/intermediateNodes.html'
import * as  d3 from 'd3'

export default {
    template: tpl,
    name: 'IntermediateNodes',
    components: {
    },

    props: [

    ],

    data: () => ({
        nodeHeights: {},
        nodeWidth: 50,
        transitionDuration: 1000,
        view: {},
    }),

    watch: {

    },

    mounted() {
    },

    methods: {
        init(graph, view) {
            this.graph = graph
            this.view = view
            this.nodes = d3.select('#intermediate-nodes')
            const node = this.nodes.selectAll('.node')
                .data(this.graph.nodes)
                .enter().append('g')
                .attr('class', (d) => {
                    return 'intermediate-node';
                })
                .attr('opacity', 0)
                .attr('id', d => `n${d.n_index}`)
                .attr('transform', (d) => {
                    return 'translate(0,0)';
                });

            this.nodes.selectAll('.intermediate-node')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .attr('opacity', 1)
                .attr('transform', d => `translate(${d.x},${d.y})`);

            this.rectangle(node);
            this.path(node);
        },

        rectangle(node) {
            const rect = node.append('rect')
                .attr('height', (d) => {
                    this.currentNodeLevel[d.mod_index] = 0;
                    this.nodeHeights[d.n_index] = d.height;
                    return Math.log(d.height);
                })
                .attr('width', this.nodeWidth)
                .attr('opacity', 0)
                .style('fill', d => this.view.color.getColor(d))
                .style('fill-opacity', (d) => {
                    if (d.name == 'intermediate' || d.name[d.name.length - 1] == '_') {
                        return 0;
                    }
                })
                .style('shape-rendering', 'crispEdges')
                .style('stroke', (d) => {
                    return '#e1e1e1';
                })
                .style('stroke-width', (d) => {
                    return 1;
                })


            // Transition
            this.nodes.selectAll('rect')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .attr('opacity', d => {
                    return 1;
                })
                .attr('height', d => d.height)
                .style('fill', (d) => {
                    return '#e1e1e1';
                })
                .style('stroke', (d) => {
                    return 0;
                });



        },
        path(node) {
            node.append('path')
                .attr('d', (d) => {
                    return `m${0} ${0
                        }h ${view.sankey.nodeWidth()
                        }v ${(1) * 0
                        }h ${(-1) * view.sankey.nodeWidth()}`;
                })
                .style('fill', (d) => {
                    return 'grey';
                })
                .style('fill-opacity', (d) => {
                    return 0;
                })
                .style('stroke', (d) => {
                    return 'grey';
                })
                .style('stroke-opacity', '0.0');

            this.nodes.selectAll('path')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .delay(this.transitionDuration / 3)
                .style('fill-opacity', (d) => {
                    return 0;
                });
        },

        text(node) {
            const textTruncForNode = 10;
            node.append('text')
                .attr('dy', '0.35em')
                .attr('transform', 'rotate(90)')
                .attr('x', '5')
                .attr('y', '-10')
                .style('opacity', 1)




        },

        clear() {
            d3.selectAll('.intermediate-node').remove()
        },

    }
}
