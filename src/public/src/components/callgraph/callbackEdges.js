import tpl from '../../html/callgraph/callbackEdges.html'
import * as d3 from 'd3'

export default {
    template: tpl,
    name: 'CallbackEdges',
    components: {

    },

    props: [

    ],

    data: () => ({
        transitionDuration: 1000,
        id: 'callback-edges',
    }),

    watch: {

    },

    mounted() {
        this.id = 'callback-edges'
    },

    methods: {
        init(graph, view) {
            this.edges = d3.select('#' + this.id)
            this.view = view
            let self = this

            let links = graph.links.filter((d) => {
                return d.type == "callback"
            })

            // build the arrow.
            this.edges
                .append("svg:defs").selectAll("marker")
                .data(["end"])
                .enter().append("svg:marker")
                .attr("id", String)
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 5)
                .attr("refY", 0)
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("orient", "auto")
                .append("svg:path")
                .attr("d", "M0,-5L10,0L0,5");

            // add the links and the arrows
            var path = this.edges.append("svg:g").selectAll("path")
                .data(links)
                .enter().append("svg:path")
                .attr("class", "link")
                .attr("marker-end", "url(#end)")
                .attr('d', (d) => {
                    let Tx0 = d.source.x + self.$parent.nodeWidth / 2,
                        Tx1 = d.target.x + self.$parent.nodeWidth / 2,
                        Txi = d3.interpolateNumber(Tx0, Tx1),
                        Tx2 = Txi(0.4),
                        Tx3 = Txi(1 - 0.4),
                        Ty0 = d.source.y + d.source.height + self.$parent.nodeWidth,
                        Ty1 = d.target.y + d.target.height + self.$parent.nodeWidth;

                    let Dx0 = d.source.x + self.$parent.nodeWidth / 2,
                        Dx1 = d.target.x + self.$parent.nodeWidth / 2,
                        Dxi = d3.interpolateNumber(Tx0, Tx1),
                        Dx2 = Txi(0.4),
                        Dx3 = Txi(1 - 0.4),
                        Dy0 = d.source.y + d.source.height + self.$parent.nodeWidth,
                        Dy1 = d.target.y + d.target.height + self.$parent.nodeWidth;

                    // note .ty is the y point that the edge meet the target(for top)
                    //		.sy is the y point of the source  (for top)
                    //		.dy is width of the edge

                    let Bx0 = d.source.x + self.$parent.nodeWidth / 2,
                        Bx1 = d.target.x + self.$parent.nodeWidth / 2,
                        Bxi = d3.interpolateNumber(Bx0, Bx1),
                        Bx2 = Bxi(0.4),
                        Bx3 = Bxi(1 - 0.4),
                        By0 = d.source.y + d.source.height + self.$parent.nodeWidth,
                        By1 = d.target.y + d.source.height + self.$parent.nodeWidth

                    const rightMoveDown = By1 - Ty1;

                    return `M${Dx0},${Dy0}
                            T${Dx2},${Dy0} 
                            T${Dx3}, ${Dy1} 
                            T${Dx1}, ${Dy1}`
                           
                            // M103.34,790
                            // L-35,815
                            // L-35,857
                            // L-35,899
                            // L66.03,924
                })
        },

        clear() {
            this.edges.selectAll('.edge').remove()
        },
    }
}