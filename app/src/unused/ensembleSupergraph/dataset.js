import tpl from '../../html/ensembleSupergraph/dataset.html'
import * as d3 from 'd3'
import EventHandler from '../EventHandler'

export default {
    template: tpl,
    name: 'Dataset',
    data: () => ({
        id: '',
        graph: null,
        nidNameMap: {},
    }),
    sockets: {

    },
    mounted() {
        EventHandler.$on('highlight_datasets', (datasets) => {
            console.log("[Interaction] Highlighting the datasets :", datasets)
            self.highlight(datasets)
        })
    },

    methods: {
        init() {
            this.svg =
            this.text()
        },

        clear(){
            // d3.
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
            this.svg.append('text')
                .attr('dy', '0.35em')
                .attr('transform', 'rotate(90)')
                .attr('x', '5')
                .attr('y', '-10')
                .style('opacity', 1)
                .style('font-size', '14px')
                .text((d) => {
                    if (d.height < this.minHeightForText) {
                        return '';
                    }
                    var textSize = this.textSize(d.name)['width'];
                    if (textSize < d.height) {
                        return d.name[0];
                    } else {
                        return this.trunc(d.name, Math.floor(d.height / 14))
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
                    if (d.height < this.minHeightForText) {
                        return '';
                    }
                    var textSize = this.textSize(d.id.split('=')[0])['width'];
                    if (textSize < d.height) {
                        return d.id.split('=')[0];
                    }
                    return this.trunc(d.id.split('=')[0], Math.floor(d.height / 14));
                });
        },
    }
}