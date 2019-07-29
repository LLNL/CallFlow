import tpl from '../html/diffcct.html'
import DiffColorMap from './diffcct/colormap'

import * as d3 from 'd3'
import dagreD3 from 'dagre-d3/dist/dagre-d3';

export default {
    name: 'DiffCCT',
    template: tpl,
    components: {
        DiffColorMap
    },

    data: () => ({
        graph: null,
        id: 'diff-cct-overview',
        sankey: {
            nodeWidth: 50,
            xSpacing: 0,
            ySpacing: 50,
            nodeScale: 1.0,
        },
        margin: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        },
        view: {
            color: null,
        },
        width: null,
        height: null,
        treeHeight: null,
        color: null,
        firstRender: true,
    }),

    watch: {

    },

    sockets: {
    },

    mounted() {
    },

    methods: {
        init(data, id) {
            console.log(data)
            if (this.firstRender) {
                this.firstRender = false
            }
            this.id = 'diff-cct-' + id
            this.data = data
            this.toolbarHeight = document.getElementById('toolbar').clientHeight
            this.footerHeight = document.getElementById('footer').clientHeight
            this.width = window.innerWidth/2 - this.margin.left - this.margin.right
            this.height = window.innerHeight - this.margin.bottom - this.margin.top - this.toolbarHeight - this.footerHeight

            d3.select('#' + this.id)
                .append('svg')
                .attrs({
                    'id': this.id + '-svg',
                    'class': 'diff-cct',
                    'width': this.width,
                    'height': this.height,
                })

            this.render()

            // this.$refs.DiffColorMap.init()
        },

        render() {
            // Create a new directed graph
            let g = new dagreD3.graphlib.Graph().setGraph({});

            let graph = this.data
            let nodes = graph.nodes
            let links = graph.links

            nodes.forEach((node, i) => {
                g.setNode(node['id'], {
                    label: node['module'] + ':' + node['id'],
                    exclusive: node['time'],
                    value: node['time (inc)'],
                    module: node['module'],
                    imbalance_perc: node['imbalance_perc'],
                })
            });

            // Set up the edges
            for (let i = 0; i < links.length; i += 1) {
                g.setEdge(links[i]['source'], links[i]['target'], {
                    label: ''
                });
            }

            let self = this
            // Set some general styles
            g.nodes().forEach(function (v) {
                let node = g.node(v);
                if (node != undefined) {
                    let color = self.$store.color.getColor(node)
                    // node.style = "stroke:" + self.$store.color.setContrast(color) 
                    node.style = "fill:" + color
                    node.rx = node.ry = 4;
                }
            });

            g.edges().forEach((e) => {
                var edge = g.edge(e)
                // g.edge(e).style = "stroke: 1.5px "
            })

            let svg = d3.select('#' + this.id + '-svg')
            console.log('#' + this.id + '-svg')
            let inner = svg.append('g');

            // Set up zoom support
            var zoom = d3.zoom().on("zoom", function () {
                inner.attr("transform", d3.event.transform);
            });
            svg.call(zoom);

            // Create the renderer
            var render = new dagreD3.render()

            // Run the renderer. This is what draws the final graph.
            render(inner, g)

            // Center the graph
            var initialScale = 1;
            svg.call(zoom.transform, d3.zoomIdentity.translate((svg.attr("width") - g.graph().width * initialScale) / 2, 20).scale(initialScale));

            // svg.attr('height', g.graph().height * initialScale + 40);
        },

        clear() {
            // d3.select('#' + this.id).remove()
        },

        update(data) {

        },
    }
}