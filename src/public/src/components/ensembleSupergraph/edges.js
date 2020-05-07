import tpl from '../../html/ensembleSupergraph/edges.html'
import * as d3 from 'd3'
import ToolTip from './edgeTooltip'

export default {
    template: tpl,
    name: 'EnsembleEdges',
    components: {
        ToolTip
    },
    props: [],
    data: () => ({
        transitionDuration: 1000,
        id: '',
        offset: 4,
    }),
    watch: {

    },
    mounted() {
        this.id = 'ensemble-edges'
    },

    methods: {
        init(graph) {
            this.graph = graph
            this.edges = d3.select('#' + this.id)

            this.links = graph.links.filter((link) => {
                return link.type != "callback"
            })

            this.$store.selectedEdgeAlignment = 'Top'


            this.initEdges('ensemble')
            // if (this.$store.selectedEdgeAlignment == 'Middle') {
            //     this.drawMiddleEdges('ensemble')
            // }
            // else if (this.$store.selectedEdgeAlignment == 'Top') {
            this.drawTopEdges('ensemble')
            this.drawTopEdges('target')
            // }

            if (this.$store.showTarget && this.$store.comparisonMode == false) {
                this.initEdges('target')

                // if (this.$store.selectedEdgeAlignment == 'Middle') {
                // this.drawMiddleEdges('target')
                // }
                // else if (this.$store.selectedEdgeAlignment == 'Top') {
                this.drawTopEdges('ensemble')
                this.drawTopEdges('target')
                // }
            }


            this.$refs.ToolTip.init(this.$parent.id)
        },

        initEdges(dataset) {
            let self = this
            this.edges.selectAll('#ensemble-edge-' + dataset)
                .data(this.links)
                .enter().append('path')
                .attrs({
                    'class': (d) => { return 'ensemble-edge' },
                    'id': (d) => {
                        return 'ensemble-edge-' + dataset;
                    }
                })
                .style('fill', (d) => {
                    if (dataset == 'ensemble') {
                        return this.$store.color.ensemble
                    }
                    else {
                        return this.$store.color.target
                    }
                })
                // .style('fill-opacity', (d) => {
                //     return d.number_of_runs / this.$store.numOfRuns
                // })

                .style('opacity', 0.5)
                .on("mouseover", function (d) {
                    d3.select(this).style("stroke-opacity", "1.0")
                    // self.clearEdgeLabels()
                    // self.drawEdgeLabels(d)
                })
                .sort(function (a, b) {
                    return b.dy - a.dy;
                });
        },

        group() {
            this.total_weight = d3.nest()
                .key(function (d) { return d.level; })
                .key(function (d) { return d.sourceLinks.length; })
                .rollup(function (d) {
                    return d3.sum(d, function (g) { return g['time (inc)']; });
                }).entries(this.graph.nodes)
        },

        drawPath(d, linkHeight, edge_source_offset, edge_target_offset, dataset) {
            let Tx0 = d.source_data.x + d.source_data.dx + edge_source_offset,
                Tx1 = d.target_data.x - edge_target_offset,
                Txi = d3.interpolateNumber(Tx0, Tx1),
                Tx2 = Txi(0.4),
                Tx3 = Txi(1 - 0.4),
                Ty0 = d.source_data.y + this.$parent.ySpacing + d.sy,
                Ty1 = d.target_data.y + this.$parent.ySpacing + d.ty

            // note .ty is the y point that the edge meet the target(for top)
            //		.sy is the y point of the source  (for top)
            //		.dy is width of the edge

            let Bx0 = d.source_data.x + d.source_data.dx + edge_source_offset,
                Bx1 = d.target_data.x - edge_target_offset,
                Bxi = d3.interpolateNumber(Bx0, Bx1),
                Bx2 = Bxi(0.4),
                Bx3 = Bxi(1 - 0.4)

            let By0 = 0, By1 = 0;
            By0 = d.source_data.y + this.$parent.ySpacing + d.sy + linkHeight
            By1 = d.target_data.y + this.$parent.ySpacing + d.ty + linkHeight

            let rightMoveDown = By1 - Ty1

            if (d.source == 'LeapFrog' && d.target == 'intermediate_CalcLagrange' && dataset == 'target') {
                By0 = 398.074532
            }
            else if (d.source == 'LeapFrog' && d.target == 'intermediate_CalcLagrange' && dataset == 'ensemble') {
                By0 = 415.328692
            }

            return `M${Tx0},${Ty0
                }C${Tx2},${Ty0
                } ${Tx3},${Ty1
                } ${Tx1},${Ty1
                } ` + ` v ${rightMoveDown
                }C${Bx3},${By1
                } ${Bx2},${By0
                } ${Bx0},${By0}`;
        },

        drawMiddlePath(d, linkHeight, edge_source_offset, edge_target_offset, dataset) {
            let Tx0 = d.source_data.x + d.source_data.dx + edge_source_offset,
                Tx1 = d.target_data.x - edge_target_offset,
                Txi = d3.interpolateNumber(Tx0, Tx1),
                Tx2 = Txi(0.4),
                Tx3 = Txi(1 - 0.4),
                Ty0 = d.source_data.y + this.$parent.ySpacing + d.sy + (d.source_data.height - linkHeight) * 0.5,
                Ty1 = d.target_data.y + this.$parent.ySpacing + d.ty + (d.target_data.height - linkHeight) * 0.5

            // note .ty is the y point that the edge meet the target(for top)
            //		.sy is the y point of the source  (for top)
            //		.dy is width of the edge

            let Bx0 = d.source_data.x + d.source_data.dx + edge_source_offset,
                Bx1 = d.target_data.x - edge_target_offset,
                Bxi = d3.interpolateNumber(Bx0, Bx1),
                Bx2 = Bxi(0.4),
                Bx3 = Bxi(1 - 0.4)

            let By0 = 0, By1 = 0;
            By0 = d.source_data.y + this.$parent.ySpacing + d.sy + linkHeight //- (d. - linkHeight) * 0.5
            By1 = d.target_data.y + this.$parent.ySpacing + d.ty + linkHeight// - (d.target_data.height - linkHeight) * 0.5

            let rightMoveDown = By1 - Ty1

            return `M${Tx0},${Ty0
                }C${Tx2},${Ty0
                } ${Tx3},${Ty1
                } ${Tx1},${Ty1
                } ` + ` v ${rightMoveDown
                }C${Bx3},${By1
                } ${Bx2},${By0
                } ${Bx0},${By0}`;
        },

        drawTopEdges(dataset) {
            let self = this
            this.edges.selectAll('#ensemble-edge-' + dataset)
                .data(this.links)
                .attrs({
                    'd': (d) => {
                        // Set link height
                        let link_height = 0
                        if (dataset == 'ensemble') {
                            link_height = d.height
                        }
                        else if (dataset == 'target') {
                            link_height = d.targetHeight
                        }

                        // Set source offset
                        let edge_source_offset = 0
                        if (d.source.split('_')[0] == "intermediate") {
                            edge_source_offset = 0
                        }
                        else if (dataset == 'target') {
                            edge_source_offset = 0//this.offset
                        }

                        // Set target offset
                        let edge_target_offset = 0
                        if (d.target.split('_')[0] == "intermediate") {
                            edge_target_offset = 0
                        }
                        else if (dataset == 'target') {
                            edge_target_offset = 0
                        }

                        if (this.$store.selectedEdgeAlignment == 'Top') {
                            return this.drawPath(d, link_height, edge_source_offset, edge_target_offset, dataset)
                        }
                        else if (this.$store.selectedEdgeAlignment == 'Middle') {
                            return this.drawMiddlePath(d, link_height, edge_source_offset, edge_target_offset, dataset)
                        }

                    },
                    'fill': (d) => {
                        if (dataset == 'ensemble') {
                            return this.$store.color.ensemble
                        }
                        else if (dataset == 'target') {
                            return this.$store.color.target
                        }
                    },
                    'stroke': this.$store.color.edgeStrokeColor,
                })
                .on('mouseover', (d) => {
                    self.$refs.ToolTip.render(self.graph, d)
                })
                .on('mouseout', (d) => {
                    self.$refs.ToolTip.clear()
                })
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
            this.edges.selectAll('.ensemble-edge').remove()
            this.edges.selectAll('.target-edge').remove()
            this.edges.selectAll('.edgelabel').remove()
            this.edges.selectAll('.edgelabelText').remove()
        },

        clearEdgeLabels() {
            d3.selectAll('edgelabelhover').remove()
            d3.selectAll('edgelabelTexthover').remove()
        },

        drawEdgeLabels(d) {
            this.labelContainer = this.edges.selectAll('label')
                .data([d])
                .enter()
                .append('g')

            this.labelContainer
                .append('circle')
                .attrs({
                    'class': 'edgelabelhover',
                    'id': 'label-' + d.client_idx,
                    'r': 15,
                    'stroke': 'black',
                    'fill': 'white',
                    'cx': d.target_data.x - 20,
                    'cy': d.target_data.y + this.$parent.ySpacing + d.target_data.height / 2,
                })

            this.labelContainer.append("text")
                .attrs({
                    "x": d.target.x - 20,
                    "dx": -5,
                    "dy": +5,
                    "y": d.target.y + this.$parent.ySpacing + d.target.height / 2,
                    "class": 'edgelabelTexthover'
                })
                .text((d, i) => d.number_of_runs)
        },

        clearAllEdgeLabels() {
            d3.selectAll('edgelabel').remove()
            d3.selectAll('edgelabelText').remove()
        },

        drawAllEdgeLabels() {
            this.labelContainer = this.edges.selectAll('label')
                .data(this.links)
                .enter()
                .append('g')

            this.labelContainer
                .append('circle')
                .attrs({
                    'class': 'edgelabel',
                    'id': (d, i) => { return 'label-' + d.client_idx },
                    'r': 10,
                    'stroke': 'black',
                    'fill': 'white',
                    'cx': (d, i) => {
                        // return (d.source.x + d.target.x)/2
                        return d.target.x - 20
                    },
                    'cy': (d, i) => {
                        // let y_offset = d.target.y
                        // if(d.source.y > d.target.y){
                        //     y_offset = d.source.y
                        // }
                        // let y_height = d.ty
                        // if(d.sy > d.ty){
                        //     y_height = d.sy
                        // }
                        // return y_offset + this.$parent.ySpacing
                        return d.target.y + this.$parent.ySpacing + d.target.height / 2
                    }
                })

            this.labelContainer.append("text")
                .attrs({
                    "x": (d, i) => {
                        // return (d.source.x + d.target.x)/2
                        return d.target.x - 20
                    },
                    "dx": (d) => -5,
                    "dy": (d) => +5,
                    "y": (d, i) => {
                        // let y_offset = d.target.y
                        // if(d.source.y > d.target.y){
                        //     y_offset = d.source.y
                        // }
                        // let y_height = d.ty
                        // if(d.sy > d.ty){
                        //     y_height = d.sy
                        // }
                        // return y_offset + this.$parent.ySpacing

                        return d.target.y + this.$parent.ySpacing + d.target.height / 2
                    },
                    "class": 'edgelabelText'
                })
                .text((d, i) => d.number_of_runs)
        },
    }
}