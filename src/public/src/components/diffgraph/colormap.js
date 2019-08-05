import tpl from '../../html/callgraph/colormap.html'
import * as d3 from 'd3'
import 'd3-selection-multi'

export default {
    template: tpl,
    name: 'ColorMap',
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
            bottom: 10,
            right: 250,
        },
        id: ''
    }),

    watch: {

    },

    mounted() {},

    methods: {
        init() {
            this.color = this.$store.color
            this.innerHTMLText = [this.$store.colorMin, this.$store.colorMax];
            this.colorMap = this.color.colorMap
            this.colorPoints = this.color.colorPoints

            this.parentID = this.$parent.id
            this.containerWidth = this.$parent.width
            this.containerHeight = this.$parent.height

            this.scaleG = d3.select('#' + this.parentID)
                .append('g')
                .attrs({
                    'id': 'colormap',
                    'width': this.width
                })

            this.render()
            // this.drawText()
        },

        render() {
            let count = 0
            let gap = 15
            for (let [dataset, color] of Object.entries(this.$store.color.datasetColor)) {
                this.scaleG.append('rect')
                    .attrs({
                        'width': 30,
                        'height': 5,
                        'x': this.width/2,
                        'y': count*gap - 10 ,
                        'class': 'colormap-rect',
                        'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - this.padding.bottom})`,
                        'fill': color
                    })

                this.scaleG.append("text")
                    .style("fill", "black")
                    .style("font-size", "14px")
                    .attrs({
                        "dy": ".5em",
                        'y': count*gap,
                        "text-anchor": "middle",
                        'class': 'colormap-text',
                        'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - 2*this.padding.bottom})`,
                    })
                    .text(dataset);
                count += 1
            }
        },

        clear() {
            d3.selectAll('.colormap-text').remove()
            d3.selectAll('.colormap-rect').remove()
        },
    }
}