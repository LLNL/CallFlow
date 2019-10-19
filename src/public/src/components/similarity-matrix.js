import * as d3 from 'd3'
import "d3-selection-multi";
import adjacencyMatrixLayout from '../thirdParty/d3-adjacency-matrix-layout'
import template from '../html/similarity-matrix.html'
// import EventHandler from './EventHandler'
// import LiveMatrixColormap from './LiveMatrixColormap'

// https://bl.ocks.org/Fil/6d9de24b31cb870fed2e6178a120b17d
// https://github.com/d3/d3-brush/blob/master/src/brush.js
// https://bl.ocks.org/mbostock/6232537
// https://bl.ocks.org/Fil/2d43867ba1f36a05459c7113c7f6f98a

export default {
    name: 'SimilarityMatrix',
    template: template,
    props: [],
    components: {
        // LiveMatrixColormap
    },
    data: () => ({
        id: null,
        data: null,
        view: null,
        vis: null,
        container: null,
        height: 0,
        width: 0,
        message: "Similarity view",
        matrix: null,
        matrixScale: 0.85,
        offset: 30,
        clusterIds: [],
        scaleKpCount: 16,
        pes: 0,
        max_weight: 0,
        min: 100,
        firstRender: true,
    }),

    watch: {
    },

    mounted() {
        this.id = 'similarity-overview'
    },

    methods: {
        init() {
            let visContainer = document.getElementById(this.id)
            this.containerWidth = visContainer.clientWidth

            let dashboardHeight = document.getElementById('dashboard').clientHeight
            let toolbarHeight = document.getElementById('toolbar').clientHeight
            this.chipContainerHeight = document.getElementById('chip-container').clientHeight
            this.colormapHeight = 40
            this.containerHeight = (dashboardHeight - toolbarHeight - this.chipContainerHeight) / 3 - this.colormapHeight + 13

            this.matrixLength = Math.min(this.containerHeight, this.containerWidth)
            this.matrixWidth = this.matrixLength * this.matrixScale
            this.matrixHeight = this.matrixLength * this.matrixScale
            this.$refs.LiveMatrixColormap.init('live-kpmatrix-overview')
        },

        reset() {
            if (this.firstRender) {
                this.initSVG()
                this.firstRender = false
            }
            // this.visualize()
        },

        change() {

        },

        initSVG() {
            let kpMatrixHeight = document.getElementsByClassName('.KpMatrix0').clientHeight
            this.svg = d3.select('#' + this.id)
                .append('svg')
                .attrs({
                    transform: `translate(${0}, ${0})`,
                    width: this.matrixLength,
                    height: 0.5 * (this.containerHeight - this.matrixHeight - this.chipContainerHeight),
                })
        },

        visualize(idx) {
            idx = 'live'
            this.pes = this.matrix.length
            this.nodeWidth = Math.ceil(this.matrixWidth / this.pes) + 0.5
            this.nodeHeight = Math.ceil(this.matrixHeight / this.pes) + 0.5

            if (this.pes < this.scaleKpCount) {
                this.clusterNodeOffset = this.nodeWidth / 2
            }
            else {
                this.clusterNodeOffset = this.nodeHeight * 3
            }

            let adjacencyMatrix = adjacencyMatrixLayout()
                .size([this.matrixWidth, this.matrixHeight])
                .useadj(true)
                .adj(this.matrix)

            this.$store.liveMatrix = adjacencyMatrix()
            let matrixData = this.$store.liveMatrix


            if (!Number.isNaN(matrixData[0].x)) {
                this.max_weight = matrixData[0]['maxComm']
                this.min_weight = matrixData[0]['minComm']

                this.$refs.LiveMatrixColormap.clear()
                this.min_weight = 0
                this.$refs.LiveMatrixColormap.render(this.min_weight, 2048)


                d3.selectAll('.KpMatrix' + idx).remove()
                this.svg = d3.select('#' + this.id)
                    .append('svg')
                    .attrs({
                        transform: `translate(${5}, ${0})`,
                        width: this.matrixWidth + this.clusterNodeOffset,
                        height: this.matrixHeight + this.clusterNodeOffset,
                        class: 'KpMatrix' + idx,
                    })

                // console.log("Maximum communication in the GVT", this.max_weight)
                this.$store.liveMax = this.max_weight
                this.svg.selectAll('.live-rect-' + idx)
                    .data(matrixData)
                    .enter()
                    .append('rect')
                    .attrs({
                        class: (d, i) => 'live-rect live-rect-' + idx + ' live-rect-kp-' + d.kpid,
                        'id': (d, i) => 'live-rect-pe-' + d.peid,
                        'width': (d) => this.nodeWidth,
                        'height': (d) => this.nodeHeight,
                        'x': (d) => d.x + this.clusterNodeOffset,
                        'y': (d) => d.y + this.clusterNodeOffset,
                    })
                    .style('stroke', (d, i) => {
                        if (d.target % this.scaleKpCount == this.scaleKpCount - 1 || d.source % this.scaleKpCount == this.scaleKpCount - 1)
                            return '#black'
                        else
                            return '#white'
                    })
                    .style('stroke-width', (d, i) => {
                        if (d.target % this.scaleKpCount == this.scaleKpCount - 1 || d.source % this.scaleKpCount == this.scaleKpCount - 1)
                            return '0.1px'
                        else
                            return '0px'
                    })
                    .style('stroke-opacity', 1)
                    .style('fill', d => {
                        let val = Math.pow((d.weightAggr / this.max_weight), 0.33)
                        return d3.interpolateGreys(val)
                    })
                    .on('click', (d) => {
                        let peid = d.peid
                        this.granularity_level[d.peid] = 'kp'
                        let max_kp_in_pe = 0
                        let top_perc = 0.75
                        d3.selectAll('#live-rect-pe-' + peid)
                            .style('fill', d => {
                                max_kp_in_pe = Math.max(d.weight, max_kp_in_pe)
                                d.max_kp_in_pe = max_kp_in_pe
                                return d3.interpolateGreys(Math.pow((d.weight) / (this.max_weight), 0.33)) 
                            })                       
                        this.$refs.LiveMatrixColormap.render(this.min_weight, 100)
                    })

                    this.clusterNodeWidth = this.matrixWidth / this.pes
                    this.clusterNodeHeight = this.matrixHeight / this.pes

                // Append the kp value indicators:
                this.svg.selectAll('.clusterrectY' + idx)
                    .data(this.clusterIds)
                    .enter()
                    .append('rect')
                    .attrs({
                        class: 'clusterrectY' + idx + ' liveMatrix',
                        "id": (d, i) => 'clusterrect-' + i,
                        'width': (d) => this.clusterNodeOffset,
                        'height': (d) => this.clusterNodeHeight ,
                        'x': (d) => 0,
                        'y': (d, i) => this.clusterNodeHeight * (i) + this.clusterNodeOffset,
                    })
                    .style('stroke-opacity', .3)
                    .style('fill', (d, i) => this.$store.colorset[this.clusterIds[i]])
                    .on('click', (d, i) => {
                    })

                this.svg.selectAll('.clusterrectX' + idx)
                    .data(this.clusterIds)
                    .enter()
                    .append('rect')
                    .attrs({
                        class: 'clusterrectY' + idx + ' liveMatrix',
                        "id": (d, i) => 'clusterrect-' + i,
                        'width': (d) => this.clusterNodeWidth,
                        'height': (d) => this.clusterNodeOffset,
                        'x': (d, i) => this.clusterNodeWidth * (i) + this.clusterNodeOffset,
                        'y': (d, i) => 0,
                    })
                    .style('stroke-opacity', .3)
                    .style('fill', (d, i) => this.$store.colorset[this.clusterIds[i]])

                d3.select('.KpMatrix')
                    .call(adjacencyMatrix.xAxis);

                d3.select('.KpMatrix')
                    .call(adjacencyMatrix.yAxis);
            }

        },

        clear() {
            d3.select('')
        },
    }
}

