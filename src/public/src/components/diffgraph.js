import tpl from '../html/diffgraph.html'

import * as  d3 from 'd3'
import dagreD3 from 'dagre-d3/dist/dagre-d3';

import Color from '../old_components/callflow/color'

export default {
    name: 'Diffgraph',
    template: tpl,
    components: {
    },
    props: [

    ],
    data: () => ({
        graph: null,
        id: 'diffgraph_overview',
        margin: {
            top: 30, right: 30, bottom: 10, left: 10
        },
        view: {
            color: null,
        },
        width: null,
        height: null,
        treeHeight: null,
        color: null,
        colorOption: null,
    }),

    watch: {

    },

    mounted() {
        this.id = this.id
    },

    methods: {
        init(data) {
            this.width = document.getElementById('vis').clientWidth - this.margin.left - this.margin.right
            this.height = window.innerHeight * 0.89 - this.margin.top - this.margin.bottom
            d3.select('#' + this.id)
                .attr('class', 'diffgraph')
                .attr('width', this.width + this.margin.left + this.margin.right)
                .attr('height', this.height + this.margin.top + this.margin.bottom)

            // Set color scales
            // this.view.color = new Color(this.colorOption)
            // this.view.color.setColorScale(this.data.stat.minInc, this.data.stat.maxInc, this.data.stat.minExc, this.data.stat.maxExc)

            this.render(data)
        },

        updateColor(option) {
            // this.colorOption = option
            // this.view.color = new Color(this.colorOption)
            // this.view.color.setColorScale(this.data.stat.minInc, this.data.stat.maxInc, this.data.stat.minExc, this.data.stat.maxExc)
            // this.render()
        },

        removeDuplicates(arr){
            let mapper = []
            for (let i = 0 ; i < arr.length; i += 1){
                if(! mapper.includes(arr[i])){
                    mapper.push(arr[i])
                }
            }
            return mapper.toString()
        },

        render(data) {
            // Create a new directed graph
            var g = new dagreD3.graphlib.Graph().setGraph({});

            // States and transitions from RFC 793
            var states = data.nodes
            // Automatically label each of the nodes
            states.forEach(function (state) { g.setNode(state['name'], { label: state['name'] }); });

            let nodeMarker = {}
            // Set up the edges
            for(let i = 0; i < data.edges.length; i += 1){
                let graphIDs = this.removeDuplicates(data.edges[i]['graphID'])
                nodeMarker[data.edges[i]['source']] = graphIDs
                nodeMarker[data.edges[i]["target"]] = graphIDs
                g.setEdge(data.edges[i]['source'], data.edges[i]['target'], { label: graphIDs });
            }
            
            // Set some general styles
            g.nodes().forEach(function (v) {
                var node = g.node(v);
                if(nodeMarker[node.label].split(',').length >= 2){
                    node.style = "stroke: 3px"
                    node.style = "fill: #f77"
                }
                else{
                    node.style = "fill: #fff"
                }
            
                node.rx = node.ry = 5;
            });

            g.edges().forEach( (e) => {
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
            this.$refs.Nodes.clear()
            this.$refs.Edges.clear()
        },

        update(data) {
            this.render()
        },
    }
}
