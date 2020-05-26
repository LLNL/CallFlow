import * as d3 from 'd3'
import "d3-selection-multi";
import adjacencyMatrixLayout from '../../thirdParty/d3-adjacency-matrix-layout'
import template from '../../html/ensembleDistribution/index.html'
import EventHandler from '../EventHandler'


export default {
    name: 'EnsembleDistribution',
    template: template,
    props: [],
    components: {

    },
    data: () => ({
        id: 'ensemble-distribution-view',
        svg_id: 'ensemble-distribution-view-svg',
        data: null,
        view: null,
        vis: null,
        container: null,
        height: 0,
        width: 0,
        message: "Mean Distribution matrix",
        matrix: null,
        matrixScale: 0.7,
        offset: 10,
        colorSet: ["#5576A5", "#E8CA4F", "#AB769F"],
        clusterIds: [],
        scaleKpCount: 16,
        pes: 0,
        max_weight: 0,
        min: 100,
        firstRender: true,
        margin: {
            top: 10,
            right: 10,
            bottom: 10,
            left: 15
        },
    }),

    mounted() {
        let self = this
        EventHandler.$on('ensemble_distribution', function (data) {
            self.clear()
            console.log("Ensemble Distribution: ", data['module'])
            self.visualize(data['module'])
        })
    },

    methods: {
        init() {
            this.toolbarHeight = document.getElementById('toolbar').clientHeight
            this.footerHeight = document.getElementById('footer').clientHeight
            this.width = window.innerWidth * 0.2
            this.height = (window.innerHeight - this.toolbarHeight - this.footerHeight) * 0.33

            this.containerWidth = this.width - this.margin.right - this.margin.left;
            this.containerHeight = this.height - this.margin.top - this.margin.bottom;

            this.svg = d3.select('#' + this.svg_id)
                .attr('width', this.width - this.margin.left - this.margin.right)
                .attr('height', this.height - this.margin.top - this.margin.bottom)
                .attr('transform', "translate(" + this.margin.left + "," + this.margin.top + ")")

            this.matrixLength = Math.min(this.containerHeight, this.containerWidth)
            this.matrixWidth = this.matrixLength * this.matrixScale
            this.matrixHeight = this.matrixLength * this.matrixScale
            // this.$refs.LiveMatrixColormap.init('live-kpmatrix-overview')

            let modules_arr = Object.keys(this.$store.modules['ensemble'])

            EventHandler.$emit('ensemble_distribution', {
                'module': modules_arr[0],
                'datasets': this.$store.runNames
            })
        },

        isConnection(row, column){
            return true
        },

        setupMeanGradients(data, callsite, row, column) {
            let method = 'hist'

            var defs = d3.select('#' + this.svg_id)
                .append("defs");

            this.linearGradient = defs.append("linearGradient")
                .attr("id", "mean-distribution-gradient-" + row + '-' + column)
                .attr("class", 'mean-distribution-gradient')

            this.linearGradient
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "0%");

            if ((callsite in data)) {
                let grid = [], val = []
                if (row != column && column < row && this.isConnection(row, column)) {
                    grid = data[callsite]["Inclusive"][method]['x']
                    val = data[callsite]['Inclusive'][method]['y']
                }
                else if(row == column) {
                    grid = data[callsite]["Exclusive"][method]['x']
                    val = data[callsite]["Exclusive"][method]['y']
                }
                else{
                    grid = []
                    val = []
                }

                for (let i = 0; i < grid.length; i += 1) {
                    let x = (i + i + 1) / (2 * grid.length)
                    let current_value = (val[i])
                    this.linearGradient.append("stop")
                        .attr("offset", 100 * x + "%")
                        .attr("stop-color", this.$store.binColor.getColorByValue(current_value))
                }
            }
            console.log("done")
        },

        process(selectedModule) {
            let ret = []

            let callsites = Object.keys(this.$store.callsites['ensemble'])

            for (let i = 0; i < callsites.length; i += 1) {
                for (let j = 0; j < callsites.length; j += 1) {
                    if (ret[i] == undefined) {
                        ret[i] = []
                    }
                    let callsite = callsites[i]
                    let data = this.$store.callsites['ensemble'][callsite]

                    this.setupMeanGradients(this.$store.gradients['callsite'], callsites[i], i, j)
                    ret[i][j] = {
                        x: i,
                        j: j,
                        z: data["max_time"],
                    }
                }
            }
            return ret
        },


        reset() {
            if (this.firstRender) {
                this.addDummySVG()
                this.firstRender = false
            }
            this.visualize()
        },

        brush() {
            this.x = d3.scaleLinear()
                .domain([0, this.pes])
                .range([0, this.matrixWidth])

            this.y = d3.scaleLinear()
                .domain([this.pes, 0])
                .range([this.matrixHeight, 0])

            this.drag = d3.brush()
                .extent([[0, 0], [this.matrixWidth, this.matrixHeight]])
                .on('brush', this.brushing)
                .on('end', this.brushend)
        },

        visualize(selectedModule) {
            this.matrix = this.process(selectedModule)
            this.nodeWidth = (this.matrixWidth / this.matrix.length)
            this.nodeHeight = (this.matrixHeight / this.matrix.length)

            let adjacencyMatrix = adjacencyMatrixLayout()
                .size([this.matrixWidth, this.matrixHeight])
                .useadj(true)
                .adj(this.matrix)

            let matrixData = adjacencyMatrix()

            if (!Number.isNaN(matrixData[0].x)) {
                this.max_weight = 0
                this.min_weight = 0
                for (let i = 0; i < matrixData.length; i += 1) {
                    this.max_weight = Math.max(this.max_weight, matrixData[i].weight)
                    this.min_weight = Math.min(this.min_weight, matrixData[i].weight)
                }

                this.svg.selectAll('.rect')
                    .data(matrixData)
                    .enter()
                    .append('rect')
                    .attrs({
                        class: (d, i) => 'ensemble-distribution-rect',
                        // id: (d, i) => 'similarityRect-' + d.source,
                        'width': (d) => this.nodeWidth,
                        'height': (d) => this.nodeHeight,
                        'x': (d) => d.x,
                        'y': (d) => d.y,
                    })
                    .style('stroke', (d, i) => {
                        return 'black'
                    })
                    .style('stroke-width', (d, i) => {
                        return '0.1px'
                    })
                    .style('stroke-opacity', 1)
                    .style('fill', d => {
                        return "url(#mean-distribution-gradient-" + d.source + "-" + d.target + ")"

                    })
                    .style('fill-opacity', d => {
                        return 1
                    })
                    .on('click', d => {
                        let highlight_datasets = []
                        let source_dataset = this.$store.actual_dataset_names[d.source]
                        let target_dataset = this.$store.actual_dataset_names[d.target]
                        highlight_datasets.push(source_dataset)
                        highlight_datasets.push(target_dataset)
                        })
                    .on('mouseover', d => {

                    })
                    .on('mouseout', (d) => {

                    })

                // this.highlight_dataset(this.$store.selectedTargetDataset)
            }
        },

        highlight_dataset(dataset) {
            let dataset_idx = this.datasetMap[dataset]
            let self = this
            d3.selectAll('.similarityRect-' + dataset_idx)
                .style('stroke', (d, i) => {
                    return self.$store.color.target
                })
                .style('stroke-width', (d, i) => {
                    return this.nodeWidth / 3
                })

        },

        clear() {
            d3.selectAll('.ensemble-distribution-rect').remove()
            d3.selectAll('.mean-distribution-gradient').remove()
        },
    }
}

