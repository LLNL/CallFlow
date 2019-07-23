import tpl from '../html/cct.html'
import Nodes from './cct/nodes'
import Edges from './cct/edges'

import * as  d3 from 'd3'
import dagreD3 from 'dagre-d3/dist/dagre-d3';

export default {
    name: 'CCT',
    template: tpl,
    components: {
        Nodes,
        Edges,
    },

    data: () => ({
        graph: null,
        id: 'cct_overview',
        sankey: {
            nodeWidth: 50,
            xSpacing: 0,
            ySpacing: 50,
            nodeScale: 1.0,
        },
        margin: {
            top: 10, right: 30, bottom: 10, left: 10
        },
        view: {
            color: null,
        },
        width: null,
        height: null,
        treeHeight: null,
        color: null,
    }),

    watch: {

    },

    sockets: {
        cct(data) {
            console.log("CCT data: ", data)
            this.init(data)
        },
    },

    mounted() {
        this.id = this.id
    },

    methods: {
        init(data) {
            this.data = data
            this.width = window.innerWidth - this.margin.left - this.margin.right
            this.height = window.innerHeight - this.margin.bottom - this.margin.top
            d3.select('#' + this.id)
                .attr('class', 'cct')
                .attr('width', this.width + this.margin.left + this.margin.right)
                .attr('height', this.height + this.margin.top + this.margin.bottom)
            this.render(data)
        },

        render() {
            // Create a new directed graph
            let g = new dagreD3.graphlib.Graph().setGraph({});

            let nodes = JSON.parse(JSON.stringify(this.data.nodes))
            let links = JSON.parse(JSON.stringify(this.data.links))
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
            for (let i = 0; i < links.length - 2; i += 1) {
                g.setEdge(links[i]['source'], links[i]['target'], { label: '' });
            }

            let self = this 
            // Set some general styles
            g.nodes().forEach(function (v) {
                let node = g.node(v);
                if (node != undefined) {
                    let color = self.$store.color.getColor(node)
                    // node.style = "stroke:" + self.$store.color.setContrast(color) 
                    node.style = "fill:" + color
                    node.rx = node.ry = 5;
                }
            });

            g.edges().forEach((e) => {
                var edge = g.edge(e)
                // g.edge(e).style = "stroke: 1.5px "
            })

            let svg = d3.select("#" + this.id)
            svg.append('g')
            let inner = svg.select('g');

            // Set up zoom support
            var zoom = d3.zoom().on("zoom", function () {
                inner.attr("transform", d3.event.transform);
            });
            svg.call(zoom);

            // Create the renderer
            var render = new dagreD3.render();

            // Run the renderer. This is what draws the final graph.
            render(inner, g);

            // Center the graph
            var initialScale = 1;
            svg.call(zoom.transform, d3.zoomIdentity.translate((svg.attr("width") - g.graph().width * initialScale) / 2, 20).scale(initialScale));

            svg.attr('height', g.graph().height * initialScale + 40);
        },

        clear() {

        },

        update(data) {
         
        },
    }
}