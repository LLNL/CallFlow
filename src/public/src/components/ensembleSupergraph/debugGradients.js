// Debugging the gradients using a line plot.
cleardebugGradients() {
    d3.selectAll('.debugLine').remove()
    d3.selectAll('.axisLabel').remove()
    d3.selectAll('.axis').remove()
}

debugGradients(data, node, mode) {
    this.toolbarHeight = document.getElementById('toolbar').clientHeight
    this.footerHeight = document.getElementById('footer').clientHeight
    this.width = window.innerWidth * 0.3
    this.height = (window.innerHeight - this.toolbarHeight - this.footerHeight) * 0.5

    this.margin = {
        top: 15,
        right: 10,
        bottom: 10,
        left: 15
    }
    this.scatterWidth = this.width - this.margin.right - this.margin.left;
    this.scatterHeight = this.height - this.margin.top - this.margin.bottom;

    this.debugsvg = d3.select('#debug')
        .attrs({
            'width': this.width - this.margin.left - this.margin.right,
            'height': this.height - this.margin.top - this.margin.bottom,
            'transform': "translate(" + this.margin.left + "," + this.margin.top + ")"
        })

    this.xMin = data[node][mode]['x_min']
    this.xMax = data[node][mode]['x_max']
    this.yMin = data[node][mode]['y_min']
    this.yMax = data[node][mode]['y_max']
    this.xScale = d3.scaleLinear().domain([this.xMin, this.xMax]).range([0, this.scatterWidth])
    this.yScale = d3.scaleLinear().domain([this.yMin, this.yMax]).range([this.scatterHeight - this.margin.top - this.margin.bottom, 0])

    var xAxis = d3.axisBottom(this.xScale)
    // .ticks(5)
    // .tickFormat((d, i) => {
    //     console.log(d)
    //     if (i % 2 == 0 || i == 0 ) {
    //         return d
    //     }
    //     else{
    //         return ''
    //     }
    // });

    var yAxis = d3.axisLeft(this.yScale)
    // .ticks(5)
    // .tickFormat((d, i) => {
    //     console.log(i)
    //     if (i % 2 == 0 || i == 0) {
    //         return d
    //         return `${this.yMin + i*d/(this.yMax - this.yMin)}`
    //     }
    //     else{
    //         return ''
    //     }
    // });

    let xAxisHeightCorrected = this.scatterHeight - this.margin.top - this.margin.bottom
    var xAxisLine = this.debugsvg.append('g')
        .attrs({
            'class': 'axis',
            'id': 'xAxis',
            "transform": "translate(" + 3 * this.margin.left + "," + xAxisHeightCorrected + ")"
        })
        .call(xAxis)

    this.debugsvg.append('text')
        .attrs({
            'class': 'axisLabel',
            'x': this.scatterWidth,
            'y': this.yAxisHeight - this.margin.left * 1.5
        })
        .style('font-size', '10px')
        .style('text-anchor', 'end')
        .text("Diff")

    var yAxisLine = this.debugsvg.append('g')
        .attrs({
            'id': 'yAxis',
            'class': 'axis',
            'transform': "translate(" + 2 * this.margin.left + ", 0)"
        })
        .call(yAxis)

    this.debugsvg.append("text")
        .attrs({
            'class': 'axisLabel',
            'transform': 'rotate(-90)',
            'x': 0,
            'y': 1 * this.margin.left
        })
        .style("text-anchor", "end")
        .style("font-size", "10px")
        .text("Histogram count");

    let self = this
    var plotLine = d3.line()
        .curve(d3.curveMonotoneX)
        .x(function (d) {
            return self.xScale(d.x);
        })
        .y(function (d) {
            return self.yScale(d.y);
        });

    let kde_data = data[node][mode]
    let data_arr = []
    for (let i = 0; i < kde_data['x'].length; i++) {
        data_arr.push({
            'x': kde_data['x'][i],
            'y': kde_data['y'][i]
        })
    }
    var line = this.debugsvg.append("path")
        // .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
        .data([data_arr])
        .attrs({
            'class': 'debugLine',
            "d": plotLine,
            "stroke": (d) => {
                if (mode == 'hist')
                    return "blue"
                else
                    return 'red'
            },
            "stroke-width": "2",
            "fill": "none"
        })
    }
}
