import * as d3 from 'd3'
import 'd3-selection-multi'
import * as utils from '../utils'
import EventHandler from '../EventHandler'

export default {
    template: '<g :id="id"></g>',
    name: 'EnsembleColorMap',
    components: {},

    props: [],

    data: () => ({
        transitionDuration: 1000,
        width: 200,
        height: 20,
        colorScaleHeight: 30,
        colorMin: 0,
        colorMax: 0,
        offset: 30,
        padding: {
            bottom: 30,
            right: 400,
        },
        id: ''
    }),

    mounted() {
        this.id = 'ensemble-colormap'

        EventHandler.$on('show_target_auxiliary', (data) => {
            this.init()
        })
    },

    methods: {
        init() {
            this.colorMin = this.$store.color.colorMin
            this.colorMax = this.$store.color.colorMax
            this.innerHTMLText = [this.$store.colorMin, this.$store.colorMax];
            this.colorMap = this.$store.color.colorMap
            this.colorPoint = this.$store.colorPoint

            this.parentID = this.$parent.id
            this.containerWidth = this.$store.viewWidth / 2
            this.containerHeight = this.$store.viewHeight - this.$parent.margin.top - this.$parent.margin.bottom

            this.clearColorMap()
            this.svg = d3.select('#' + this.parentID)
                .append('g')
                .attrs({
                    'id': 'dist-colormap',
                })

            this.clearTargetLegends()
            if (this.$store.showTarget == true) {
                this.drawTargetLegend()
            }
            this.clearEnsembleLegends()
            this.drawEnsembleLegend()
            this.drawMeanColorMap()
            this.drawMeanText()
        },

        drawEnsembleLegend() {
            this.svg.append('circle')
                .attrs({
                    'r': 10,
                    'cx': 10,
                    'cy': 10,
                    'class': 'ensemble-circle-legend',
                    'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 3 * this.padding.bottom})`,
                    'fill': this.$store.color.ensemble
                })

            this.svg.append('text')
                .attrs({
                    'x': 30,
                    'y': 15,
                    'class': 'ensemble-circle-legend-text',
                    'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 3 * this.padding.bottom})`,
                })
                .text('Ensemble of runs')
                .style('font-size', 14)
                .style('fill', '#444444');


        },

        drawTargetLegend() {
            this.svg.append('circle')
                .attrs({
                    'r': 10,
                    'cx': 10,
                    'cy': 10,
                    'class': 'target-circle-legend',
                    'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 4 * this.padding.bottom})`,
                    'fill': this.$store.color.target
                })

            this.svg.append('text')
                .attrs({
                    'x': 30,
                    'y': 15,
                    'class': 'target-circle-legend-text',
                    'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 4 * this.padding.bottom})`,
                })
                .text('Target run')
                .style('font-size', 14)
                .style('fill', '#444444');
        },

        drawMeanColorMap() {
            this.color = this.$store.color
            if (this.color.option == "Module") {

            } else {
                let splits = this.$store.colorPoint
                let color = this.color.getScale(this.color.option)

                for (let i = 0; i < splits; i += 1) {
                    let splitColor = this.colorMin + ((i * this.colorMax) / (splits))
                    this.svg.append('rect')
                        .attrs({
                            'width': this.width / splits,
                            'height': this.height,
                            'x': i * (this.width / splits),
                            'class': 'dist-colormap-rect-metric',
                            'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - this.padding.bottom})`,
                            'fill': color(splitColor)
                        })
                }
            }
        },

        drawRankDiffColorMap() {
            this.color = this.$store.rankDiffColor

            if (this.color.option == "Module") {

            } else {
                let splits = this.$store.colorPoint
                let color = this.color.getScale("RankDiff")
                for (let i = 0; i < splits; i += 1) {
                    let splitColor = this.colorMin + ((i * this.colorMax) / (splits))
                    this.svg.append('rect')
                        .attrs({
                            'width': this.width / splits,
                            'height': this.height,
                            'x': i * (this.width / splits),
                            'class': 'dist-colormap-rect',
                            'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 2 * this.padding.bottom})`,
                            'fill': color(splitColor)
                        })
                }
            }
        },

        drawMeanDiffColorMap(splits, colorscale) {
            this.color = this.$store.meanDiffColor

            if (this.color.option == "Module") {

            } else {
                // let splits = this.$store.colorPoint
                let splits = 9
                let color = this.color.getScale('MeanDiff')
                let domain = color.domain()
                let colorMin = domain[0]
                let colorMax = domain[1]
                let dcolor = (colorMax - colorMin) / (splits - 1)
                for (let i = 0; i < splits; i += 1) {
                    let splitColor = colorMin + dcolor * (splits - 1 - i)

                    this.svg.append('rect')
                        .attrs({
                            'width': this.width / splits,
                            'height': this.height,
                            'x': i * (this.width / splits),
                            'class': 'dist-colormap-rect',
                            'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 2 * this.padding.bottom})`,
                            'fill': color(splitColor)
                        })
                }
            }
        },

        drawBinColorMap() {
            this.color = this.$store.binColor

            if (this.color.option == "Module") {

            } else {
                let splits = this.$store.colorPoint
                let color = this.color.getScale("Bin")
                for (let i = 0; i < splits; i += 1) {
                    let splitColor = this.colorMin + ((i * this.colorMax) / (splits))
                    this.svg.append('rect')
                        .attrs({
                            'width': this.width / splits,
                            'height': this.height,
                            'x': i * (this.width / splits),
                            'class': 'dist-colormap-rect',
                            'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 2 * this.padding.bottom})`,
                            'fill': color(splitColor)
                        })
                }
            }
        },

        drawMeanText() {
            this.svg.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    "y": 10,
                    'x': -125,
                    "text-anchor": "middle",
                    'class': 'dist-colormap-text-metric',
                    'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - this.padding.bottom})`,
                })
                .text("Exc. Runtime colormap");

            // draw the element
            this.svg.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    "text-anchor": "middle",
                    'y': 10,
                    'x': -40,
                    'class': 'dist-colormap-text-metric',
                    'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - this.padding.bottom})`,
                })
                .text(utils.formatRuntimeWithUnits(this.colorMin))

            this.svg.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    "text-anchor": "middle",
                    'y': 10,
                    'x': 30,
                    "class": "dist-colormap-text-metric",
                    'transform': `translate(${this.containerWidth - this.padding.right + this.width + this.offset}, ${this.containerHeight - this.padding.bottom})`,
                })
                .text(utils.formatRuntimeWithUnits(this.colorMax))

        },

        drawRankDiffText() {
            // draw the element
            this.svg.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    'y': 10,
                    'x': -40,
                    "text-anchor": "middle",
                    'class': 'dist-colormap-text',
                    'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 2 * this.padding.bottom})`,
                })
                .text(this.colorMin);

            this.svg.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    "y": 10,
                    'x': 30,
                    "text-anchor": "middle",
                    "class": "dist-colormap-text",
                    'transform': `translate(${this.containerWidth - this.padding.right + this.width}, ${this.containerHeight - 2 * this.padding.bottom})`,
                })
                .text(this.colorMax);

        },

        drawMeanDiffText() {
            this.svg.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    "y": 10,
                    'x': -160,
                    "text-anchor": "middle",
                    'class': 'dist-colormap-text',
                    'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 2 * this.padding.bottom})`,
                })
                .text("Mean Difference colormap");

            // draw the element
            this.svg.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    'y': 10,
                    'x': -40,
                    "text-anchor": "middle",
                    'class': 'dist-colormap-text',
                    'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 2 * this.padding.bottom})`,
                })
                .text(utils.formatRuntimeWithUnits(this.colorMin));

            this.svg.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    'y': 10,
                    'x': 30,
                    "text-anchor": "middle",
                    "class": "dist-colormap-text",
                    'transform': `translate(${this.containerWidth - this.padding.right + this.width + this.offset}, ${this.containerHeight - 2 * this.padding.bottom})`,
                })
                .text(utils.formatRuntimeWithUnits(this.colorMax));
        },

        drawBinText() {
            this.svg.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    "y": 10,
                    'x': -120,
                    "text-anchor": "middle",
                    'class': 'dist-colormap-text',
                    'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 2 * this.padding.bottom})`,
                })
                .text("Distribution colormap");

            this.svg.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    "y": 10,
                    'x': -30,
                    "text-anchor": "middle",
                    'class': 'dist-colormap-text',
                    'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 2 * this.padding.bottom})`,
                })
                .text(this.colorMin);

            this.svg.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    "y": 10,
                    'x': 10,
                    "text-anchor": "middle",
                    "class": "dist-colormap-text",
                    'transform': `translate(${this.containerWidth - this.padding.right + this.width + this.offset}, ${this.containerHeight - 2 * this.padding.bottom})`,
                })
                .text(this.colorMax);

        },

        clearColorMap() {
            d3.selectAll('.dist-colormap').remove()
        },

        clear() {
            d3.selectAll('.dist-colormap-text').remove()
            d3.selectAll('.dist-colormap-rect').remove()
        },

        clearMetric() {
            d3.selectAll('.dist-colormap-text-metric').remove()
            d3.selectAll('.dist-colormap-rect-metric').remove()
        },

        clearTargetLegends() {
            d3.selectAll('.target-circle-legend').remove()
            d3.selectAll('.target-circle-legend-text').remove()
        },

        clearEnsembleLegends() {
            d3.selectAll('.ensemble-circle-legend').remove()
            d3.selectAll('.ensemble-circle-legend-text').remove()
        },

        update(mode, data) {
            this.clear()
            let rank_min = 0
            let rank_max = 0
            let mean_min = 0
            let mean_max = 0
            for (let i = 0; i < data.length; i += 1) {
                rank_min = Math.min(rank_min, data[i]['hist']['y_min'])
                rank_max = Math.max(rank_max, data[i]['hist']['y_max'])
                mean_min = Math.min(mean_min, data[i]['hist']['x_min'])
                mean_max = Math.max(mean_max, data[i]['hist']['x_max'])
            }
            if (mode == 'rankDiff') {
                this.colorMin = rank_min
                this.colorMax = rank_max
                this.drawRankDiffColorMap()
                this.drawRankDiffText()
            }
            else if (mode == 'meanDiff') {
                this.colorMin = Math.min(this.colorMin, data[i]['hist']['mean_diff'])
                this.colorMax = mean_max
                this.drawMeanDiffColorMap()
                this.drawMeanDiffText()
            }
        },

        updateWithMinMax(mode, min, max) {
            this.clear()
            this.colorMin = min
            this.colorMax = max
            if (mode == 'bin') {
                this.drawBinColorMap()
                this.drawBinText()
            }
            if (mode == 'meanDiff') {
                this.colorMin = -1 * Math.max(Math.abs(min), Math.abs(max))
                this.colorMax = 1 * Math.max(Math.abs(min), Math.abs(max))
                this.drawMeanDiffColorMap()
                this.drawMeanDiffText()
            }
        }
    }
}