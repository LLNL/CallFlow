import tpl from '../html/cct.html'
import Nodes from './cct/nodes'
import Edges from './cct/edges'
import ColorMap from './cct/colormap'

import * as d3 from 'd3'
import dagreD3 from 'dagre-d3/dist/dagre-d3';

export default {
    name: 'CCT',
    template: tpl,
    components: {
        Nodes,
        Edges,
        ColorMap
    },

    data: () => ({
        graph: null,
        id: 'cct-overview',
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

    sockets: {
        cct(data) {
            console.log("CCT data: ", data)
            this.data = data
            if (this.firstRender) {
                this.init()
                this.render()
            }
            else {
                this.render()
            }
        },
    },

    mounted() {
        this.id = this.id
    },

    methods: {
        init() {
            this.toolbarHeight = document.getElementById('toolbar').clientHeight
            this.footerHeight = document.getElementById('footer').clientHeight
            this.width = window.innerWidth - this.margin.left - this.margin.right
            this.height = window.innerHeight - this.margin.bottom - this.margin.top - this.toolbarHeight - this.footerHeight

            this.svg = d3.select('#' + this.id)
                .attrs({
                    'width': this.width,
                    'height': this.height,
                })
            console.log("init")

            // Create a new directed graph
            this.firstRender = false
        },


        render() {
            console.log("render")
            this.g = new dagreD3.graphlib.Graph().setGraph({});

            let graph = this.data
            let nodes = graph.nodes
            let links = graph.links

            nodes.forEach((node, i) => {
                this.g.setNode(node['id'], {
                    label: node['module'] + ':' + node['id'],
                    exclusive: node['time'],
                    value: node['time (inc)'],
                    module: node['module'],
                    imbalance_perc: node['imbalance_perc'],
                })
            });

            // Set up the edges
            for (let i = 0; i < links.length; i += 1) {
                let edge_label = ''
                if (links[i]['count'] != 1) {
                    edge_label = '' + links[i]['count']
                }
                else {
                    edge_label = ''
                }
                this.g.setEdge(links[i]['source'], links[i]['target'], {
                    label: edge_label
                });

            }

            let self = this
            // Set some general styles
            this.g.nodes().forEach(function (v) {
                let node = self.g.node(v);
                if (node != undefined) {
                    let color = self.$store.color.getColor(node)
                    // node.style = "stroke:" + self.$store.color.setContrast(color)
                    node.style = "fill:" + color
                    node.rx = node.ry = 4;
                    node.id = 'cct-node'
                }
            });

            this.g.edges().forEach((e) => {
                var edge = self.g.edge(e)
                edge.id = 'cct-edge'
                // g.edge(e).style = "stroke: 1.5px "
            })

            let inner = this.svg.select('#container');

            // Set up zoom support
            var zoom = d3.zoom().on("zoom", function () {
                inner.attr("transform", d3.event.transform);
            });
            this.svg.call(zoom);

            // Create the renderer
            var render = new dagreD3.render();

            // Run the renderer. This is what draws the final graph.
            render(inner, this.g);

            // Center the graph
            var initialScale = 1;
            this.svg.call(zoom.transform, d3.zoomIdentity.translate((this.svg.attr("width") - this.g.graph().width * initialScale) / 2, 20).scale(initialScale))

            this.$refs.ColorMap.init()
        },

        clear() {
            d3.selectAll('#cct-node').remove()
            d3.selectAll('#cct-edge').remove()
            this.$refs.ColorMap.clear()
        },
    }
}