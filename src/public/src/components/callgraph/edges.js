import tpl from '../../html/callgraph/edges.html'
import * as d3 from 'd3'

export default {
    template: tpl,
    name: 'Edges',
    components: {

    },

    props: [

    ],

    data: () => ({
        transitionDuration: 1000,
        id: '',
    }),

    watch: {

    },

    mounted() {
        this.id = 'edges-' + this._uid
    },

    methods: {
        init(graph, view) {
            this.edges = d3.select('#' + this.id)
            this.view = view

            let links = graph.links.filter((link) => {
                return link.type != "callback"
            })

            this.edges.selectAll('.edge')
                .data(links)
                .enter().append('path')
                .attr('class', (d) => {
                    return 'edge';
                })
                .attr('d', (d) => {
                    console.log(d.source.x, d.source.height, d.target.x, d.source.y, d.sy, d.target.y, d.ty)
                    let Tx0 = d.source.x + d.source.height,
                        Tx1 = d.target.x,
                        Txi = d3.interpolateNumber(Tx0, Tx1),
                        Tx2 = Txi(0.4),
                        Tx3 = Txi(1 - 0.4),
                        Ty0 = d.source.y + d.sy,
                        Ty1 = d.target.y + d.ty

                    // note .ty is the y point that the edge meet the target(for top)
                    //		.sy is the y point of the source  (for top)
                    //		.dy is width of the edge

                    let Bx0 = d.source.x + d.source.height,
                        Bx1 = d.target.x,
                        Bxi = d3.interpolateNumber(Bx0, Bx1),
                        Bx2 = Bxi(0.4),
                        Bx3 = Bxi(1 - 0.4),
                        By0 = d.source.y + d.height + d.sy,
                        By1 = d.target.y + d.ty + d.height

                    const rightMoveDown = By1 - Ty1;
                    console.log(d)
                    return `M${Tx0},${Ty0}
		                    C${Tx2},${Ty0} 
		                    ${Tx3}, ${Ty1} 
		                    ${Tx1}, ${Ty1} 
		                    ` + ` v ${rightMoveDown}
		                    C${Bx3},${By1} 
		                    ${Bx2},${By0} 
		                    ${Bx0},${By0}`;
                })
                .style('fill', d => {
                    return '#202020'
                })
                .style('fill-opacity', 0)
                .style('stroke', (d) => {
                    // return "url(#" + getGradID(d) + ")";
                })
                .style('stroke-opacity', '0.4');
            // .on("mouseover", function() {
            // 	// d3.select(this).style("stroke-opacity", "0.7")
            // 	d3.select(this).style("fill-opacity", "0.7")

            // } )
            // .on("mouseout", function() {
            // 	// d3.select(this).style("stroke-opacity", "0.4")
            // 	d3.select(this).style("fill-opacity", "0.4")
            // } )
            // .sort(function (a, b) {
            //     return b.dy - a.dy;
            // });

            this.edges.selectAll('.edge')
                .data(links)
                .style('fill-opacity', 0)
                .attr('d', (d) => {
                    if (d.sy == undefined) {
                        d.sy = 0
                        return
                    }
                    if (d.ty == undefined) {
                        d.ty = 0
                        return
                    }
                    let Tx0 = d.source.x + d.source.dx,
                        Tx1 = d.target.x,
                        Txi = d3.interpolateNumber(Tx0, Tx1),
                        Tx2 = Txi(0.4),
                        Tx3 = Txi(1 - 0.4),
                        Ty0 = d.source.y + d.sy + this.$parent.ySpacing,
                        Ty1 = d.target.y + d.ty + this.$parent.ySpacing;

                    // note .ty is the y point that the edge meet the target(for top)
                    //		.sy is the y point of the source  (for top)
                    //		.dy is width of the edge

                    // var rightMoveDown = d.target.y + d.dy / 2;

                    let Bx0 = d.source.x + d.source.dx,
                        Bx1 = d.target.x,
                        Bxi = d3.interpolateNumber(Bx0, Bx1),
                        Bx2 = Bxi(0.4),
                        Bx3 = Bxi(1 - 0.4),
                        By0 = d.source.y + d.height + d.sy + this.$parent.ySpacing,
                        By1 = d.target.y + d.ty + d.height + this.$parent.ySpacing;

                    const rightMoveDown = By1 - Ty1
                    return `M${Tx0},${Ty0
                        }C${Tx2},${Ty0
                        } ${Tx3},${Ty1
                        } ${Tx1},${Ty1
                        } ` + ` v ${rightMoveDown
                        }C${Bx3},${By1
                        } ${Bx2},${By0
                        } ${Bx0},${By0}`;
                });

            this.edges.selectAll('.edge')
                .data(graph.links)
                .transition()
                .duration(this.transitionDuration)
                .delay(this.transitionDuration / 3)
                .style('fill-opacity', 0.3);
        },

        //hide all links not connected to selected node
        fadeUnConnected(g) {
            let thisLink = this.graph.links.selectAll(".link");
            thisLink.filter(function (d) {
                    return d.source !== g && d.target !== g;
                })
                .transition()
                .duration(500)
                .style("opacity", 0.05);
        },

        clear() {
            d3.selectAll('.edge').remove()
        },
    }
}