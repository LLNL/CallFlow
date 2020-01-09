import tpl from '../../html/distgraph/colormap.html'
import * as d3 from 'd3'
import 'd3-selection-multi'
import { thresholdScott, mean } from 'dagre-d3/dist/dagre-d3'
import Color from '../color'

export default {
    template: tpl,
    name: 'DistColorMap',
    components: {},

    props: [],

    data: () => ({
        transitionDuration: 1000,
        width: 200,
        height: 20,
        colorScaleHeight: 30,
        colorMin: 0,
        colorMax: 0,
        padding: {
            bottom: 30,
            right: 250,
        },
        id: ''
    }),

    watch: {

    },

    mounted() {
        this.id = 'dist-colormap-' + this._uid
    },

    methods: {
        init() {
            this.colorMin = this.$store.color.colorMin
            this.colorMax = this.$store.color.colorMax
            this.innerHTMLText = [this.$store.colorMin, this.$store.colorMax];
            this.colorMap = this.$store.color.colorMap
            this.colorPoint = this.$store.colorPoint

            this.parentID = this.$parent.id
            this.containerWidth = this.$parent.width
            this.containerHeight = this.$parent.height

            this.scaleG = d3.select('#' + this.parentID)
                .append('g')
                .attrs({
                    'id': 'dist-colormap',
                })

            this.drawMeanColorMap()
            this.drawMeanText()
        },

        drawMeanColorMap() {
            this.color = this.$store.color
            if (this.color.option == "Module") {

            } else {
                let splits = this.$store.colorPoint
                let color = this.color.getScale(this.color.option)

                for (let i = 0; i < splits; i += 1) {
                    let splitColor = this.colorMin + ((i * this.colorMax) / (splits))
                    this.scaleG.append('rect')
                        .attrs({
                            'width': this.width / splits,
                            'height': this.height,
                            'x': i * (this.width / splits),
                            'class': 'dist-colormap-rect',
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
                let color = this.color.getScale(this.color.option)
                for (let i = 0; i < splits; i += 1) {
                    let splitColor = this.colorMin + ((i * this.colorMax) / (splits))
                    this.scaleG.append('rect')
                        .attrs({
                            'width': this.width / splits,
                            'height': this.height,
                            'x': i * (this.width / splits),
                            'class': 'dist-colormap-rect',
                            'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - this.padding.bottom})`,
                            'fill': color(splitColor)
                        })
                }
            }
        },

        drawMeanDiffColorMap() {
            this.color = this.$store.meanDiffColor

            if (this.color.option == "Module") {

            } else {
                let splits = this.$store.colorPoint
                let color = this.color.getScale('MeanDiff')
                for (let i = 0; i < splits; i += 1) {
                    let splitColor = this.colorMin + ((i * (this.colorMax - this.colorMin)) / (splits))
                    this.scaleG.append('rect')
                        .attrs({
                            'width': this.width / splits,
                            'height': this.height,
                            'x': i * (this.width / splits),
                            'class': 'dist-colormap-rect',
                            'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - this.padding.bottom})`,
                            'fill': color(splitColor)
                        })
                }
            }
        },

        drawMeanText() {
            // draw the element
            this.scaleG.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    "text-anchor": "middle",
                    'class': 'dist-colormap-text',
                    'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 2*this.padding.bottom})`,
                })
                .text((this.colorMin * 0.000001).toFixed(3) + 's');

            this.scaleG.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    "text-anchor": "middle",
                    "class": "dist-colormap-text",
                    'transform': `translate(${this.containerWidth - this.padding.right +  this.width}, ${this.containerHeight - 2*this.padding.bottom})`,
                })
                .text((this.colorMax * 0.000001).toFixed(3) + "s");

        },

        drawRankDiffText() {
            // draw the element
            this.scaleG.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    "text-anchor": "middle",
                    'class': 'dist-colormap-text',
                    'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 2*this.padding.bottom})`,
                })
                .text(this.colorMin);

            this.scaleG.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    "text-anchor": "middle",
                    "class": "dist-colormap-text",
                    'transform': `translate(${this.containerWidth - this.padding.right +  this.width}, ${this.containerHeight - 2*this.padding.bottom})`,
                })
                .text(this.colorMax);

        },

        drawMeanDiffText() {
            // draw the element
            this.scaleG.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    "text-anchor": "middle",
                    'class': 'dist-colormap-text',
                    'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 2*this.padding.bottom})`,
                })
                .text((this.colorMin * 0.000001).toFixed(3) + 's');

            this.scaleG.append("text")
                .style("fill", "black")
                .style("font-size", "14px")
                .attrs({
                    "dy": ".35em",
                    "text-anchor": "middle",
                    "class": "dist-colormap-text",
                    'transform': `translate(${this.containerWidth - this.padding.right +  this.width}, ${this.containerHeight - 2*this.padding.bottom})`,
                })
                .text((this.colorMax * 0.000001).toFixed(3) + "s");

        },

        clear() {
            d3.selectAll('.dist-colormap-text').remove()
            d3.selectAll('.dist-colormap-rect').remove()
        },

        update(mode, data){
            this.clear()
            let rank_min = 0
            let rank_max = 0
            let mean_min = 0
            let mean_max = 0
            for(let i = 0; i < data.length; i += 1){
                rank_min = Math.min(rank_min, data[i]['hist']['y_min'])
                rank_max = Math.max(rank_max, data[i]['hist']['y_max'])
                mean_min = Math.min(mean_min, data[i]['hist']['x_min'])
                mean_max = Math.max(mean_max, data[i]['hist']['x_max'])
            }
            if(mode == 'rankDiff'){
                this.colorMin = rank_min
                this.colorMax = rank_max
                this.drawRankDiffColorMap()
                this.drawRankDiffText()
            }
            else if(mode == 'meanDiff'){
                this.colorMin = mean_min
                this.colorMax = mean_max
                this.drawMeanDiffColorMap()
                this.drawMeanDiffText()
            }
        }
    }
}