import * as d3 from 'd3'
import { lasso } from '../thirdParty/lasso';
import template from '../html/projection.html'
import EventHandler from './EventHandler.js'

export default {
    name: 'Projection',
    template: template,
    props: [],
    data: () => ({
        id: null,
        ts: null,
        config: null,
        vis: null,
        colorBy: null,
        zoomed: false,
        xMin: 0,
        xMax: 0,
        yMin: 0,
        yMax: 0,
        message: 'Parameter Projection',
        showMessage: false,
    }),
    sockets: {
        dist_projection(data) {
            data = JSON.parse(data)
            console.log("Projections: ", data)
            this.visualize(data)
        }
    },
    mounted() {
        this.id = 'dim-overview' + this._uid
        let self = this
        EventHandler.$on('highlight_dataset', (dataset) => {
            console.log("[Projection] Highlighting the dataset :", dataset)
            self.highlight(dataset)
        })
    },
    methods: {
        init() {
            let visContainer = document.getElementById(this.id)
            let dashboardHeight = document.getElementById('diffgraph-dashboard').clientHeight
            let toolbarHeight = document.getElementById('toolbar').clientHeight

            this.width = visContainer.clientWidth
            this.height = (dashboardHeight - toolbarHeight) / 3 - 80

            this.padding = { left: 50, top: 0, right: 50, bottom: 30 }
            this.x = d3.scaleLinear().range([0, this.width]);
            this.y = d3.scaleLinear().range([this.height, 0]);
            // this.d3zoom = d3.zoom()
            //     .on("zoom", this.zoom())
            this.svg = d3.select('#' + this.id).append('svg')
                .attrs({
                    width: this.width,
                    height: this.height,
                    transform: 'translate(0, 0)'
                })
                .style('stroke-width', 1)
                .style('stroke', '#aaaaaa')

            // set the transition
            this.t = this.svg
                .transition()
                .duration(750);

            this.axis()
        },

        axis() {
            this.xAxis = d3.axisBottom(this.x)
                .tickFormat((d, i) => {
                    return ''
                    // return d
                })

            this.yAxis = d3.axisLeft(this.y)
                .tickFormat((d, i) => {
                    return ''
                    // return d
                })

            this.yDom = [0, 0]

            this.xAxisSVG = this.svg.append('g')
                .attrs({
                    transform: `translate(${this.padding.left}, ${this.height - this.padding.bottom})`,
                    class: 'x-axis',
                    // 'stroke-width': '1px',
                    'color': '#fff',
                    // 'color': '#000',
                    // 'stroke': '#999',
                })
                .call(this.xAxis);

            this.yAxisSVG = this.svg.append('g')
                .attrs({
                    transform: `translate(${this.padding.left}, ${this.padding.top})`,
                    class: 'y-axis',
                    // 'stroke-width': '1px',
                    color: '#fff'
                    // 'color': '#000',
                    // 'stroke': '#999',
                })
                .call(this.yAxis);
        },

        label() {

        },

        initVis(ts) {

        },

        reset(ts) {
            this.visualize(ts)
        },

        preprocess(data) {
            let ret = []
            this.numberOfPoints = Object.entries(data['x']).length

            for (let id = 0; id < this.numberOfPoints; id += 1) {
                ret[id] = []
                ret[id].push(data['x'][id])
                ret[id].push(data['y'][id])
                ret[id].push(data['dataset'][id])
                ret[id].push(id)
                ret[id].push(data['label'][id])
                ret[id].push(data['max_inclusive_time'][id])
                ret[id].push(data['max_exclusive_time'][id])

                let x = data['x'][id]
                let y = data['y'][id]

                if (x < this.xMin) {
                    this.xMin = x
                }
                if (x > this.xMax) {
                    this.xMax = x
                }
                if (y < this.yMin) {
                    this.yMin = y
                }
                if (y > this.yMax) {
                    this.yMax = y
                }
            }
            return ret
        },

        preprocess_2(data) {
            let ret = {}
            this.numberOfPoints = Object.entries(data['x']).length

            for (let id = 0; id < this.numberOfPoints; id += 1) {
                let dataset = data['dataset'][id]
                ret[dataset] = []
                ret[dataset].push(data['x'][id])
                ret[dataset].push(data['y'][id])
                ret[dataset].push(data['dataset'][id])
                ret[dataset].push(id)
                ret[dataset].push(data['label'][id])

                let x = data['x'][id]
                let y = data['y'][id]

                if (x < this.xMin) {
                    this.xMin = x
                }
                if (x > this.xMax) {
                    this.xMax = x
                }
                if (y < this.yMin) {
                    this.yMin = y
                }
                if (y > this.yMax) {
                    this.yMax = y
                }
            }
            return ret
        },

        visualize(ts) {
            this.$store.projection = this.preprocess(ts)
            this.$store.projection_results = this.preprocess_2(ts)
            this.x.domain([2.0 * this.xMin, 2.0 * this.xMax])
            this.y.domain([2.0 * this.yMin, 2.0 * this.yMax])

            this.xAxisSVG
                .call(this.xAxis)

            this.yAxisSVG
                .call(this.yAxis)

            d3.selectAll('.circle' + this.id).remove()
            d3.selectAll('.lasso' + this.id).remove()

            // Define the div for the tooltip
            var tooltip = d3.select("#" + this.id)
                .append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

            let self = this
            let selected = undefined
            this.circles = this.svg.selectAll('circle')
                .data(this.$store.projection)
                .enter()
                .append('circle')
                .attrs({
                    class: (d) => { return 'dot' + ' circle' + this.id },
                    id: (d) => { return 'dot-' + self.$store.datasetMap[d[2]] },
                    r: (d) => {
                        return 6.0
                    },
                    'stroke-width': 2.0,
                    fill: (d) => { return this.$store.colorset[d[4]] },
                    cx: (d, i) => { return self.x(d[0]) },
                    cy: (d) => { return self.y(d[1]) },
                })


            // Outer circle.
            this.outerCircles = this.svg.selectAll('.outer-circle')
                .data(this.$store.projection)
                .enter()
                .append('circle')
                .attrs({
                    class: (d) => { return 'outer-dot' + ' outer-circle' + this.id },
                    id: (d) => { return 'outer-dot-' + self.$store.datasetMap[d[2]] },
                    r: (d) => {
                        return 8.0
                    },
                    'stroke-width': 3.0,
                    stroke: (d) => {
                        if (d[2] == this.$store.selectedTargetDataset) {
                            return d3.rgb(this.$store.color.target).darker(5)
                        }
                        else {
                            return d3.rgb(this.$store.color.ensemble).darker()
                        }
                    },
                    "fill-opacity": 0,
                    cx: (d, i) => { return self.x(d[0]) },
                    cy: (d) => { return self.y(d[1]) },
                })
                .on('mouseover', (d) => {
                    let dataset_name = d[2]
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9)
                        .style("left", 10)
                    let split_dataset = dataset_name.split('.')
                    let timestamp = split_dataset[split_dataset.length - 1]
                    tooltip.html("Run: " + timestamp + "<br/>" +
                        "Inclusive time: " + d[5] + " ms<br/>" +
                        "Exclusive time: " + d[6] + " ms")
                        .style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");
                })
                .on('click', (d) => {
                    this.selectedRun = d[2]
                    d3.selectAll('.dot')
                        .attr('stroke', self.$store.color.ensemble)
                        .attr('stroke-width', 3)

                    d3.select('#dot-' + self.$store.datasetMap[d[2]])
                        .attr('stroke', self.$store.color.compare)
                        .attr('stroke-width', 3)
                    d3.select('#outer-dot' + self.$store.datasetMap[self.$store.selectedTargetDataset])
                        .attr('stroke', self.$store.color.target)
                        .attr('stroke-width', 3)

                    this.compareDataset = d[2]

                    this.$socket.emit('compare', {
                        targetDataset: self.$store.selectedTargetDataset,
                        compareDataset: this.compareDataset,
                    })
                    this.$store.selectedCompareDataset = this.compareDataset

                })
                .on('dblclick', (d) => {
                    let dataset_name = d[2]
                    this.$socket.emit('dist_group_highlight', {
                        datasets: [dataset_name],
                        groupBy: this.$store.selectedGroupBy
                    })

                    this.$socket.emit('dist_auxiliary', {
                        datasets: [dataset_name],
                        sortBy: this.$store.auxiliarySortBy,
                        module: 'all'
                    })
                    this.$store.selectedTargetDataset = dataset_name;
                    // this.select(dataset_name)
                    EventHandler.$emit('highlight_datasets', this.$store.selectedTargetDataset)
                })


            this.lasso = lasso()
                .className('lasso' + this.id)
                .closePathSelect(true)
                .closePathDistance(100)
                .items(this.circles)
                .targetArea(this.svg)
                .on("start", this.lassoStart)
                .on("draw", this.lassoDraw)
                .on("end", this.lassoEnd);

            // this.svg.call(this.lasso)

            this.highlight(this.$store.selectedTargetDataset)
        },

        // ====================================
        // Interaction functions
        // ====================================
        lassoStart() {
            d3.selectAll('.dot')
                .attrs({
                    opacity: 1,
                })

            this.lasso.items()
                .attr("r", (d) => {
                    return 4.5
                }) // reset size
                .classed("not_possible", true)
                .classed("selected", false);
        },

        lassoDraw() {
            // Style the possible dots
            this.lasso.possibleItems()
                .classed("not_possible", false)
                .classed("possible", true);

            // Style the not possible dot
            this.lasso.notPossibleItems()
                .classed("not_possible", true)
                .classed("possible", false);
        },

        lassoEnd() {
            d3.selectAll('.dot')
                .attrs({
                    opacity: 0.3,
                })

            this.selectedDatasets = []
            // Reset the color of all dots
            this.lasso.items()
                .classed("not_possible", false)
                .classed("possible", false)

            // Style the selected dots
            this.lasso.selectedItems()
                .classed("selected", true)
                .attr("r", (d) => {
                    return 6.0
                })
                .attr("id", (d) => { this.selectedDatasets.push(d[2]) })
                .attr("opacity", 1)

            // Reset the style of the not selected dots
            this.lasso.notSelectedItems()
                .attr("r", 4.5)
                .attr("opacity", 0.5);

            EventHandler.$emit('highlight_datasets', this.selectedDatasets)
            EventHandler.$emit('clear_summary_view')

            this.$socket.emit('dist_group_highlight', {
                datasets: this.selectedDatasets,
                groupBy: this.$store.selectedGroupBy
            })

            this.$socket.emit('dist_auxiliary', {
                datasets: this.selectedDatasets,
                sortBy: this.$store.auxiliarySortBy,
                module: 'all'
            })
        },

        zoom() {
            // for unzoom button; Needs fix
            this.zoomed = true

            // // adjust the scales
            // this.svg.select(".x-axis").transition(this.t).call(this.xAxis)
            // this.svg.select(".y-axis").transition(this.t).call(this.yAxis)

            // Put circles back in view
            let self = this
            this.svg.selectAll(".circle" + this.id).transition(this.t)
                .attr("cx", function (d) { return self.x(d['PC0'][0]) })
                .attr("cy", function (d) { return self.y(d['PC1'][0]) })

            // Clear brush selection box
            this.svg.selectAll(".selection")
                .attrs({
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0
                })
        },

        unzoom() {
            // Untoggle the unzoom button.
            this.zoomed = false

            // reset the scale domains
            this.x.domain([2.0 * this.xMin, 2.0 * this.xMax])
            this.y.domain([2.0 * this.yMin, 2.0 * this.yMax])

            // // adjust the scale
            // this.svg.select(".x-axis").transition(this.t).call(this.xAxis)
            // this.svg.select(".y-axis").transition(this.t).call(this.yAxis)

            // Put circles back
            let self = this
            this.svg.selectAll(".circle" + this.id).transition(this.t)
                .attr("cx", function (d) { return self.x(d['PC0'][0]) })
                .attr("cy", function (d) { return self.y(d['PC1'][0]) })
        },

        brushended() {
            let idleDelay = 350
            let s = d3.event.selection
            if (!s) {
                if (!this.idleTimeout)
                    return this.idleTimeout = setTimeout(this.idled, idleDelay)
                this.x.domain([2.0 * xMin, 2.0 * xMax])
                this.y.domain([2.0 * yMin, 2.0 * yMax])
            }
            else {
                let d0 = s.map(this.x.invert)
                let d1 = s.map(this.y.invert)

                this.selectedIds = this.findIdsInRegion(d0[0], d0[1], d1[0], d1[1])

                // set the scale domains based on selection
                this.x.domain([s[0][0], s[1][0]].map(this.x.invert, this.x))
                this.y.domain([s[1][1], s[0][1]].map(this.y.invert, this.y))


                // console.log(d3.brushSelection(this.brushSvg.node()))

                // https://github.com/d3/d3-brush/issues/10
                if (!d3.event.sourceEvent) return

                // to set the brush movement to null. But doesnt do the required trick.
                // Reason: maybe webpack
                // https://github.com/d3/d3-brush/issues/10
                d3.select(".brush").call(this.brush.move, null)
            }
            this.zoom()
            this.select()
        },

        idled() {
            this.idleTimeout = null;
        },

        highlight(dataset) {
            let datasetID = this.$store.datasetMap[dataset]
            let self = this

            // this.circles = this.svg.selectAll('#dot-' + datasetID)
            // .attrs({
            //     opacity: 1.0
            //     stroke: (d) => { return self.$store.color.highlight },
            //     'stroke-width': 3.0,
            // })

            // this.circles = this.svg.selectAll('#dot-' + datasetID)
            //     .attrs({
            //         opacity: 1.0,
            //         stroke: (d) => { return self.$store.color.highlight },
            //         'stroke-width': 3.0,
            //     })

        },

        clear() {

        }
    },
}


