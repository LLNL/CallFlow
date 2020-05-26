drawMiddleEdges(dataset) {
    this.edges.selectAll('#ensemble-edge-' + dataset)
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
    let s_top_offset = d.target['in'] * source_unit
    let t_top_offset = d.target['in'] * target_unit

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