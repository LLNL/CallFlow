import tpl from '../../html/diffgraph/edges.html'
import * as d3 from 'd3'

export default {
    template: tpl,
    name: 'DiffEdges',
    components: {
    },
    props: [],
    data: () => ({
        transitionDuration: 1000,
        id: ''
    }),
    watch: {

    },
    mounted() {
        this.id = 'diff-edges-' + this._uid
    },

    methods: {
        init(graph) {
            this.edges = d3.select('#' + this.id)

            this.links = graph.links.filter((link) => {
                return link.type != "callback"
            })

            this.$store.selectedAlignmentShow = 'Union'

            let datasets = this.$store.actual_dataset_names
            if (this.$store.selectedAlignmentShow == 'All') {
                for (let i = 0; i < datasets.length; i += 1) {
                    let dataset = datasets[i]
                    let client_dataset_name = this.$store.datasetMap[dataset]
                    this.initEdges(client_dataset_name)
                }
            }
            else {
                let client_dataset_name = this.$store.datasetMap[this.$store.selectedDataset]
                this.initEdges('union')
            }

            if (this.$store.selectedDiffNodeAlignment == 'Middle') {
                if (this.$store.selectedAlignmentShow == 'All') {
                    for (let i = 0; i < datasets.length; i += 1) {
                        let dataset = datasets[i]
                        this.drawMiddleEdges(dataset)
                    }
                }
                else if (this.$store.selectedAlignmentShow == 'Single') {
                    this.drawMiddleEdges(this.$store.selectedDataset)
                }
                // this.drawMiddleEdges2()
            }
            else if (this.$store.selectedDiffNodeAlignment == 'Top') {
                if (this.$store.selectedAlignmentShow == 'All') {
                    for (let i = 0; i < datasets.length; i += 1) {
                        let dataset = datasets[i]
                        this.drawTopEdges('union')
                    }
                }
                else if (this.$store.selectedAlignmentShow == 'Union') {
                    this.drawTopEdges('union')
                }
            }

            this.showEdges()
        },

        showEdges() {
            let dataset = this.$store.datasets
            this.edges.selectAll('.diff-edge-' + dataset[0])
                .data(this.links)
                .transition()
                .duration(this.transitionDuration)
                .delay(this.transitionDuration / 3)
                // .style('fill-opacity', 0.3);

            this.edges.selectAll('.diff-edge-' + dataset[1])
                .data(this.links)
                .transition()
                .duration(this.transitionDuration)
                .delay(this.transitionDuration / 3)
                // .style('fill-opacity', 0.5);

            this.edges.selectAll('.diff-edge-' + dataset[2])
                .data(this.links)
                .transition()
                .duration(this.transitionDuration)
                .delay(this.transitionDuration / 3)
                // .style('fill-opacity', 0.7);
        },

        initEdges(dataset) {
            this.edges.selectAll('.diff-edge-' + dataset)
                .data(this.links)
                .enter().append('path')
                .attr('class', (d) => {
                    return 'diff-edge-' + dataset;
                })
                // .attr('d', (d) => {
                //     let Tx0 = d.source.x + d.source.height,
                //         Tx1 = d.target.x,
                //         Txi = d3.interpolateNumber(Tx0, Tx1),
                //         Tx2 = Txi(0.4),
                //         Tx3 = Txi(1 - 0.4),
                //         Ty0 = d.source.y + d.sy,
                //         Ty1 = d.target.y + d.ty

                //     // note .ty is the y point that the edge meet the target(for top)
                //     //		.sy is the y point of the source  (for top)
                //     //		.dy is width of the edge

                //     let Bx0 = d.source.x + d.source.height,
                //         Bx1 = d.target.x,
                //         Bxi = d3.interpolateNumber(Bx0, Bx1),
                //         Bx2 = Bxi(0.4),
                //         Bx3 = Bxi(1 - 0.4),
                //         By0 = d.source.y + d.height + d.sy, //+ 100,
                //         By1 = d.target.y + d.ty + d.height

                //     const rightMoveDown = By1 - Ty1;
                //     // console.log(d.source)
                //     // console.log(d.source.name, d.target.name, Tx0, Ty0, Tx2, Ty0, Tx3, Ty1)

                //     return `M${Tx0},${Ty0}
                //         C${Tx2},${Ty0} 
                //         ${Tx3}, ${Ty1} 
                //         ${Tx1}, ${Ty1} 
                //         ` + ` v ${rightMoveDown}
                //         C${Bx3},${By1} 
                //         ${Bx2},${By0} 
                //         ${Bx0},${By0}`;
                // })
                .style('fill', (d) => {
                    return this.$store.color.grey
                    // return this.$store.color.datasetColor[this.$store.selectedDataset]
                })
                .style('stroke', (d) => {
                    // return "url(#" + getGradID(d) + ")";
                })
                .style('fill-opacity', (d) => {
                    return d.number_of_runs/this.$store.datasets.length
                })
                .on("mouseover", function () {
                    d3.select(this).style("stroke-opacity", "1.0")
                    // d3.select(this).style("fill-opacity", "1.0")
                })
                .on("mouseout", function () {
                    // d3.select(this).style("fill-opacity", "0.7")
                })
                .sort(function (a, b) {
                    return b.dy - a.dy;
                });
        },

        drawMiddleEdges(dataset) {
            this.edges.selectAll('.diff-edge-' + dataset)
                .data(this.links)
                .attr('d', (d) => {
                    if (d.sy == undefined) {
                        d.sy = 0
                        return
                    }
                    if (d.ty == undefined) {
                        d.ty = 0
                        return
                    }

                    let ratio = d.source.value / d.weight
                    let extend = 1
                    if (ratio > 1) {
                        extend = d.target.value / d.weight
                    } else {
                        extend = ratio
                    }

                    d.ssy = 0
                    if (ratio > 1) {
                        d.ssy = d.weight * (d.source.height / d.source.value) * (d.source.props[dataset])
                    }

                    d.sy = d.source.height * (1 - d.source.props[dataset]) / 2
                    d.ty = d.weight * (d.target.height / d.target.value) * (1 - d.target.props[dataset]) / 2

                    let Tx0 = d.source.x + d.source.dx,
                        Tx1 = d.target.x,
                        Txi = d3.interpolateNumber(Tx0, Tx1),
                        Tx2 = Txi(0.4),
                        Tx3 = Txi(1 - 0.4),
                        Ty0 = d.source.y + d.sy + this.$parent.ySpacing,// + d.ssy,
                        Ty1 = d.target.y + d.ty + this.$parent.ySpacing

                    // note .ty is the y point that the edge meet the target(for top)
                    //		.sy is the y point of the source  (for top)
                    //		.dy is width of the edge

                    // var rightMoveDown = d.target.y + d.sy/2
                    ratio = d.source.value / d.weight
                    extend = 1
                    if (ratio > 1) {
                        extend = d.target.value / d.weight
                    } else {
                        extend = ratio
                    }

                    let source_unit = d.source.height / d.source.value
                    let target_unit = d.target.height / d.target.value

                    d.ssy = d.source.value * (source_unit) * (1 - d.source.props[dataset]) / 2
                    d.ty = d.target.value * (target_unit) * (1 - d.target.props[dataset]) / 2

                    d._sy = d.source.value * (source_unit) * d.source.props[dataset]
                    d._ty = d.target.value * (target_unit) * d.target.props[dataset]

                    if (ratio > 1) {
                        // d.__sy = d.weight * (source_unit) * d.source.props[dataset]/2
                        d.__sy = 0
                        d.__ty = 0
                    }
                    else {
                        d.__sy = 0
                        d.__ty = 0
                    }

                    let Bx0 = d.source.x + d.source.dx,
                        Bx1 = d.target.x,
                        Bxi = d3.interpolateNumber(Bx0, Bx1),
                        Bx2 = Bxi(0.4),
                        Bx3 = Bxi(1 - 0.4),
                        By0 = d.source.y + this.$parent.ySpacing + d.sy + d._sy - d.__sy + d.ssy,
                        By1 = d.target.y + this.$parent.ySpacing + d.ty + d._ty - d.__ty;

                    const rightMoveDown = By1 - Ty1
                    return `M${Tx0},${Ty0
                        }C${Tx2},${Ty0
                        } ${Tx3},${Ty1
                        } ${Tx1},${Ty1
                        } ` + ` v ${rightMoveDown
                        }C${Bx3},${By1
                        } ${Bx2},${By0
                        } ${Bx0},${By0}`;
                })
                // .style('fill', (d) => {
                //     return this.$store.color.datasetColor[dataset]
                // })
        },

        drawTopEdges(dataset) {
            let client_dataset_name = ''
            if (dataset == 'union'){
                client_dataset_name = dataset
            }
            else{
                client_dataset_name = this.$store.datasetMap[dataset]
            }
            this.edges.selectAll('.diff-edge-' + client_dataset_name)
                .data(this.links)
                .attr('d', (d) => {
                    let Tx0 = d.source.x + d.source.dx,
                        Tx1 = d.target.x,
                        Txi = d3.interpolateNumber(Tx0, Tx1),
                        Tx2 = Txi(0.4),
                        Tx3 = Txi(1 - 0.4),
                        Ty0 = d.source.y + this.$parent.ySpacing + d.sy,
                        Ty1 = d.target.y + this.$parent.ySpacing + d.ty

                    // note .ty is the y point that the edge meet the target(for top)
                    //		.sy is the y point of the source  (for top)
                    //		.dy is width of the edge

                    let Bx0 = d.source.x + d.source.dx,
                        Bx1 = d.target.x,
                        Bxi = d3.interpolateNumber(Bx0, Bx1),
                        Bx2 = Bxi(0.4),
                        Bx3 = Bxi(1 - 0.4);

                    let By0 = 0, By1 = 0;

                    if(d.height[dataset] > d.source.height){
                        d.source_adjust = d.source.height
                    }
                    else{
                        d.source_adjust = d.height[dataset]
                    }

                    if(d.ty > 0){
                        d.target_adjust = (d.target.height - d.ty)
                    }
                    else{
                        d.target_adjust = 0
                    }

                    // console.log(d.height, dataset, d.height[dataset])
                    By0 = d.source.y + this.$parent.ySpacing + d.sy + d.source_adjust// d.target.value*(d.source.height/d.source.value)
                    By1 = d.target.y + this.$parent.ySpacing + d.target_adjust + d.height[dataset] //+ d.target.value*(d.target.height/d.target.value)

                    // console.log(d)
                    const rightMoveDown = By1 - Ty1
                    // console.log(d.source.y, d.target.y, d.sy, d.source_adjust, d.target_adjust)
                    return `M${Tx0},${Ty0
                        }C${Tx2},${Ty0
                        } ${Tx3},${Ty1
                        } ${Tx1},${Ty1
                        } ` + ` v ${rightMoveDown
                        }C${Bx3},${By1
                        } ${Bx2},${By0
                        } ${Bx0},${By0}`;
                })
                // .style('fill', (d) => {
                //     return this.$store.color.datasetColor[client_dataset_name]
                // })
        },

        drawMiddleEdges2() {
            let source_prop_ratio = (d.source.props[dataset])
            let target_prop_ratio = (d.target.props[dataset])
            if (source_prop_ratio == 0) {
                source_prop_ratio = 1
            }
            if (target_prop_ratio == 0) {
                target_prop_ratio = 1
            }

            let source_unit = d.source.height / d.source.value
            let target_unit = d.target.height / d.target.value
            console.log(d.target.in)
            let s_top_offset = d.target['in'] * source_unit
            let t_top_offset = d.target['in'] * target_unit

            console.log(d.source, d.target)
            console.log(d.source['time (inc)'], d.target['time (inc)'], s_top_offset, t_top_offset)
            let additional = 0
            if (d.source['time (inc)'] - d.target['time (inc)'] > 0) {
                additional = d.target['in'] * target_unit / 8
            }
            else {
                additional = 0
            }

            additional = 0

            d.sy = (s_top_offset + additional) * source_prop_ratio// + d.source.height/4
            d.ty = (t_top_offset + additional) * target_prop_ratio //+ d.target.height/4 

            let Tx0 = d.source.x + d.source.dx,
                Tx1 = d.target.x,
                Txi = d3.interpolateNumber(Tx0, Tx1),
                Tx2 = Txi(0.4),
                Tx3 = Txi(1 - 0.4),
                Ty0 = d.source.y + d.sy + this.$parent.ySpacing,
                Ty1 = d.target.y + d.ty + this.$parent.ySpacing

            // note .ty is the y point that the edge meet the target(for top)
            //		.sy is the y point of the source  (for top)
            //		.dy is width of the edge

            // var rightMoveDown = d.target.y + d.sy/2


            d.fsy = (d.source.height - s_top_offset - additional) * source_prop_ratio + d.source.height / 4
            d.fty = (d.target.height - t_top_offset - additional) * target_prop_ratio + d.target.height / 4
            console.log(d.sy, d.ty, d.fsy, d.fty)
            let Bx0 = d.source.x + d.source.dx,
                Bx1 = d.target.x,
                Bxi = d3.interpolateNumber(Bx0, Bx1),
                Bx2 = Bxi(0.4),
                Bx3 = Bxi(1 - 0.4),
                By0 = d.source.y + this.$parent.ySpacing + d.fsy, //+ d.source['out']/2*source_unit*source_prop_ratio,
                By1 = d.target.y + this.$parent.ySpacing + d.fty; // + d.target['in']*target_unit*target_prop_ratio;

            console.log(By0, By1, Ty0, Ty1)
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
            for (let i = 0; i < this.$store.datasets.length; i += 1) {
                this.edges.selectAll('.diff-edge-' + dataset).remove()
            }
        },
    }
}