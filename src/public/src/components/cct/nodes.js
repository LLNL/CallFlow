import tpl from '../../html/cct/nodes.html'
import * as  d3 from 'd3'

export default {
    template: tpl,
    name: 'Nodes',
    components: {

    },

    props: [

    ],

    data: () => ({
        currentNodeLevel: {},
        nodeHeights: {},
        nodeWidth: 50,
        transitionDuration: 1000,
        minHeightForText: 10,
        view: {},
        id: '',
    }),

    watch: {

    },

    mounted() {
        this.id = 'nodes-' + this._uid
    },

    methods: {
        init(data, view) {
            this.graph = data
            this.view = view
            this.nodes = d3.select('#' + this.id)
            const node = this.nodes.selectAll('.node')
                .data(this.graph.nodes)
                .enter().append('g')
                .attr('class', (d) => {
                    // if (d.name == 'intermediate' || d.name[0][d.name[0].length - 1] == '_') {
                    //     return 'node intermediate';
                    // }
                    return 'node';
                })
                .attr('opacity', 0)
                .attr('id', d => `n${d.n_index}`)
                .attr('transform', (d) => {
                    if (d.name != 'intermediate') {
                        return `translate(${d.x},${d.y})`;
                    }

                    return 'translate(0,0)';
                });

            this.nodes.selectAll('.node')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .attr('opacity', 1)
                .attr('transform', d => `translate(${d.x},${d.y})`);

            this.rectangle(node);
            this.path(node);
            this.text(node);
        },

        rectangle(node) {
            const rect = node.append('rect')
                .attr('height', (d) => {
                    this.currentNodeLevel[d.mod_index] = 0;
                    this.nodeHeights[d.n_index] = d.height;
                    return this.nodeWidth/2;
                })
                .attr('width', this.nodeWidth)
                .attr('opacity', 0)
                .style('fill', d => this.view.color.getColor(d))
                .style('fill-opacity', (d) => {
                    if (d.name == 'intermediate' || d.name[d.name.length - 1] == '_') {
                        if (d.name[0] == 'intermediate') {
                            return 0;
                        }
                        return 1;
                    }
                })
                .style('shape-rendering', 'crispEdges')
                .style('stroke', (d) => {
                    if (d.name != 'intermediate') {
                        return d3.rgb(this.view.color.getColor(d)).darker(2);
                    }
                    return '#e1e1e1';
                })
                .style('stroke-width', (d) => {
                    // if (d.name[0] == 'intermediate' || d.name[0][d.name[0].length - 1] == '_') {
                    //     if (d.name[0] == 'intermediate') {
                    //         return 0;
                    //     }
                        return 1;
                    // }
                })
                .on('mouseover', function (d) {
                    if (d.name != 'intermediate') {
                        // this.view.toolTipList.attr('width', '400px')
                        //     .attr('height', '150px');
                        // var res = getFunctionListOfNode(graph, d);
                        // toolTipTexts(d,res, rootRunTime1)
                        // d3.select(this).style('stroke-width', '2');
                        // fadeUnConnected(d);
                        // svg.selectAll(".link").style('fill-opacity', 0.0)
                        // svg.selectAll('.node').style('opacity', '0.0')
                    }
                })
                .on('mouseout', function (d) {
                    // this.view.toolTipList.attr('width', '0px')
                    //     .attr('height', '0px');
                    // if (d.name[0] == 'intermediate' || d.name[0][d.name[0].length - 1] == '_') {
                    //     d3.select(this).style('stroke-width', '1');
                    //     //                unFade();
                    // }
                    // this.view.toolTip.style('opacity', 0)
                    //     .style('left', () => 0)
                    //     .style('top', () => 0);
                    // this.view.toolTipText.html('');
                    // this.view.toolTipG.selectAll('*').remove();
                })
                .on('click', (d) => {
                    console.log(this)
                    // this.view.selectedModule = d;
                    // getHierarchy(d).then((data) => {
                    //     drawIcicleHierarchy(this.view, data);
                    //     // getFunctionLists(view.selectedModule).then((data) => {

                    //     // });
                    // });
                });
            // .on('contextmenu', function(d){
            //     return view.svgBase.contextMenu(d);
            // })

            // Transition
            this.nodes.selectAll('rect')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .attr('opacity', 1)
                .attr('height', d => this.nodeWidth/2)
                .style('fill', (d) => {
                    if (d.name == 'intermediate') {
                        return '#e1e1e1';
                    }
                    return d.color = this.view.color.getColor(d);
                })
                .style('stroke', (d) => {
                    if (d.name == 'intermediate') {
                        return 0;
                    }
                    return 1;
                });
        },

        path(node) {
            node.append('path')
                .attr('d', (d) => {
                    if (d.name == 'intermediate') {
                        return `m${0} ${0
                            }h ${view.sankey.nodeWidth()
                            }v ${(1) * 0
                            }h ${(-1) * view.sankey.nodeWidth()}`;
                    }
                })
                .style('fill', (d) => {
                    if (d.name == 'intermediate') {
                        return 'grey';
                    }

                    return this.view.color.getColor(d);
                })
                .style('fill-opacity', (d) => {
                    if (d.name == 'intermediate') {
                        return 0.0;
                    }

                    return 0;
                })
                .style('stroke', (d) => {
                    if (d.name == 'intermediate') {
                        return 'grey';
                    }
                })
                .style('stroke-opacity', '0.0');

            this.nodes.selectAll('path')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .delay(this.transitionDuration / 3)
                .style('fill-opacity', (d) => {
                    if (d.name[0] == 'intermediate') {
                        return 0;
                    }
                });
        },

        textSize(text) {
            if (!d3) return;
            const container = d3.select('body').append('svg');
            container.append('text').attr({ x: -99999, y: -99999 }).text(text);
            const size = container.node().getBBox();
            container.remove();
            return { width: size.width, height: size.height };
        },

        trunc(str, n){
            return (str.length > n) ? str.substr(0, n-1) + '...' : str;
        },

        text(node) {
            const textTruncForNode = 10;
            node.append('text')
                .attr('dy', '0.35em')
                .attr('transform', 'rotate(90)')
                .attr('x', '5')
                .attr('y', '-10')
                .style('opacity', 1)
                .text((d) => {
                    // if (d.name != 'intermediate' && d.name[0][d.name[0].length - 1] != '_') {
                    //     if (d.height < this.minHeightForText) {
                    //         return '';
                    //     }
                    //     // var textSize = this.textSize(d.name)['width'];
                    //     // if (textSize < d.height) {
                    //     //     return d.name[0];
                    //     // }
                    //     // else {
                             return this.trunc(d.name[0], textTruncForNode)
                        // }

                    // }
                    // return '';
                })
                .on('mouseover', function (d) {
                    if (d.name[0] != 'intermediate') {
                        view.toolTipList.attr('width', '400px')
                            .attr('height', '150px');
                        d3.select(this.parentNode).select('rect').style('stroke-width', '2');
                    }
                })
                .on('mouseout', function (d) {
                    view.toolTipList.attr('width', '0px')
                        .attr('height', '0px');
                    if (d.name[0] != 'intermediate') {
                        d3.select(this.parentNode).select('rect').style('stroke-width', '1');
                        //                unFade();
                    }
                    view.toolTip.style('opacity', 1)
                        .style('left', () => 0)
                        .style('top', () => 0);
                    view.toolTipText.html('');
                    view.toolTipG.selectAll('*').remove();
                });


            // Transition
            this.nodes.selectAll('text')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .style('opacity', 1)
                .style('fill', d => this.view.color.setContrast(this.view.color.getColor(d)))
                .text((d) => {
                    let name_splits = d.name[0].split('/').reverse()
                    if (name_splits.length == 1) {
                        d.name = d.name[0]
                    }
                    else {
                        d.name = name_splits[0]
                    }

                    if (d.name != 'i' && d.name[d.name.length - 1] != '_') {
                        if (d.height < this.minHeightForText) {
                            return '';
                        }
                        // var textSize = this.textSize(d.name)['width'];
                        // if (textSize < d.height) {
                        //     return d.name;
                        // }
                        return this.trunc(d.name, textTruncForNode);
                    }
                    else {
                        return '';
                    }
                });
        },

        clear() {
            d3.selectAll('.node').remove()
        },

        update() {
            //   this.$refs.Sankey.tick()
        },
    }
}
