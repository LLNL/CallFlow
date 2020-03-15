import tpl from '../../html/auxiliaryFunction/quartileBox.html'
import * as d3 from 'd3'
import EventHandler from '../EventHandler'

export default {
    name: "Box",
    template: tpl,
    props: [
        "callsiteID"
    ],
    data: () => ({
        id: 'box',
        paddingTop: 10,
        textOffset: 40,
        fontSize: 10,
        informationHeight: 70,
        outlierHeight: 20,
    }),

    mounted() {
        this.id = 'box'
    },

    created() {
    },

    methods: {
        init(q, targetq, xScale) {
            this.q = q
            this.targetq = targetq
            this.xScale = xScale

            // Get the SVG belonging to this callsite.
            this.svg = d3.select('#' + this.callsiteID)

            let translateY = this.informationHeight/2 + this.outlierHeight/2
            this.g = this.svg
                .select('#' + this.id)
                .attrs({
                    "transform": "translate(0, " + translateY + ")"
                })

            this.height = this.$parent.containerHeight
            this.width = this.$parent.containerWidth

            this.boxHeight = this.height - this.informationHeight
            this.boxWidth = this.width

            this.ensembleBox()
            this.targetBox()
            this.centerLine()
        },

        ensembleBox() {
            this.boxSVG = this.g
                .append("rect")
                .attrs({
                    "class": "box",
                    "y": 0,
                    "x": this.xScale(this.q.q1),
                    "height": this.boxHeight - this.informationHeight/4 - this.outlierHeight/4,
                    'fill': this.$store.color.ensemble,
                    "width": this.xScale(this.q.q3) - this.xScale(this.q.q1),
                    "stroke": '#202020',
                    "stroke-width": 0.5
                })
                .style('z-index', 1)

            },

        targetBox() {
            let self = this
            this.targetBoxSVG = this.g
                .append("rect")
                .attr("class", "targetbox")
                .attrs({
                    "y": 0,
                    "x": this.xScale(this.targetq.q1),
                    "height": this.boxHeight - this.informationHeight/4 - this.outlierHeight/4,
                    'fill': this.$store.color.target,
                    "width": (d) => {
                        if (self.targetq.q1 == self.targetq.q3) {
                            return 3
                        }
                        return self.xScale(self.targetq.q3) - self.xScale(self.targetq.q1)
                    },
                    "stroke": '#202020',
                    "stroke-width": 0.5
                })
                .style('z-index', 1)
        },

        centerLine() {
            this.centerLineSVG = this.g
                .insert("line", "rect")
                .attr("class", "centerLine")
                .attr("y1", (this.boxHeight - this.informationHeight/8)/2)
                .attr("x1", this.xScale(this.q.min))
                .attr("y2", (this.boxHeight - this.informationHeight/4)/2)
                .attr("x2", this.xScale(this.q.max))
                .attr('stroke', 'black')
                .style('stroke-width', '1.5')
                .style('z-index', 10)
        },
    }
}