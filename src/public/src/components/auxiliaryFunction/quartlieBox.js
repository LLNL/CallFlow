import tpl from '../../html/auxiliaryFunction/quartileBox.html'
import * as d3 from 'd3'

export default {
    name: "QuartileBox",
    template: tpl,
    props: [
        "callsiteID"
    ],
    data: () => ({
        id: 'box',
        paddingTop: 10,
        textOffset: 40,
        fontSize: 10,
        informationHeight: 70
    }),

    mounted() {
        this.id = 'box'
    },

    created() {
    },

    methods: {
        init(q, targetq) {
            this.q = q
            this.targetq = targetq

            // Get the SVG belonging to this callsite.
            this.svg = d3.select('#' + this.callsiteID)

            this.g = this.svg
                .select('#' + this.id)
                .attrs({
                    "transform": "translate(0, " + this.informationHeight/2 + ")"
                })

            this.height = this.$parent.containerHeight
            this.width = this.$parent.containerWidth

            this.boxHeight = this.height - this.informationHeight
            this.boxWidth = this.width

            let min_x = Math.min(this.q.min, this.targetq.min)
            let max_x = Math.max(this.q.max, this.targetq.max)

            this.x0 = d3.scaleLinear()
                .domain([min_x, max_x])
                .range([0, this.boxWidth]);

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
                    "x": this.x0(this.q.q1),
                    "height": this.boxHeight - this.informationHeight/4,
                    'fill': this.$store.color.ensemble,
                    "width": this.x0(this.q.q3) - this.x0(this.q.q1),
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
                    "x": this.x0(this.targetq.q1),
                    "height": this.boxHeight - this.informationHeight/4,
                    'fill': this.$store.color.target,
                    "width": (d) => {
                        if (self.targetq.q1 == self.targetq.q3) {
                            return 3
                        }
                        return self.x0(self.targetq.q3) - self.x0(self.targetq.q1)
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
                .attr("y1", (this.boxHeight - this.informationHeight/4)/2)
                .attr("x1", this.x0(this.q.min))
                .attr("y2", (this.boxHeight - this.informationHeight/4)/2)
                .attr("x2", this.x0(this.q.max))
                .attr('stroke', 'black')
                .style('stroke-width', '1.5')
                .style('z-index', 10)
        },
    }
}