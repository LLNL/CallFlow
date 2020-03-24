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
    }),

    mounted() {
    },

    created() {
        this.id = 'box-' + this.callsiteID
    },

    methods: {
        init(q, targetq, xScale) {
            this.q = q
            this.targetq = targetq
            this.xScale = xScale

            // Get the SVG belonging to this callsite.
            this.svg = d3.select('#' + this.callsiteID)
            this.g = this.svg
                .select('#' + this.id)
                .attrs({
                    "transform": "translate(0, " + this.$parent.boxPosition + ")"
                })

            this.ensembleBox()
            this.targetBox()
            this.centerLine()
            this.$parent.$refs.ToolTip.init(this.callsiteID)
        },

        ensembleBox() {
            let self = this
            this.boxSVG = this.g
                .append("rect")
                .attrs({
                    "class": "box",
                    "y": 0,
                    "x": this.xScale(this.q.q1),
                    "height": this.$parent.rectHeight,
                    'fill': this.$store.color.ensemble,
                    "width": this.xScale(this.q.q3) - this.xScale(this.q.q1),
                    "stroke": '#202020',
                    "stroke-width": 0.5
                })
                .style('z-index', 1)
                .on('mouseover', (d) => {
                    self.$parent.$refs.ToolTip.renderQ(self.q)
                })
                .on('mouseout', (d) => {
                    self.$parent.$refs.ToolTip.clear()
                })
        },

        targetBox() {
            let self = this
            this.targetBoxSVG = this.g
                .append("rect")
                .attr("class", "targetbox")
                .attrs({
                    "y": 0,
                    "x": this.xScale(this.targetq.q1),
                    "height": this.$parent.rectHeight,
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
                .on('mouseover', (d) => {
                    self.$parent.$refs.ToolTip.renderQ(self.targetq)
                })
                .on('mouseout', (d) => {
                    self.$parent.$refs.ToolTip.clear()
                })
        },

        centerLine() {
            let self = this
            this.centerLineSVG = this.g
                .insert("line", "rect")
                .attrs({
                    "class": "centerLine",
                    "y1": this.$parent.centerLinePosition,
                    "x1": this.xScale(this.q.min),
                    "y2": this.$parent.centerLinePosition,
                    "x2": this.xScale(this.q.max),
                    'stroke': 'black'
                })
                .style('stroke-width', '1.5')
                .style('z-index', 10)
               
        },
    }
}