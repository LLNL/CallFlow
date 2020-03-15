import tpl from '../../html/auxiliaryFunction/markers.html'
import * as d3 from 'd3'

export default {
    name: "Markers",
    template: tpl,
    props: [
        "callsiteID"
    ],
    data: () => ({
        id: 'markers',
        paddingTop: 10,
        textOffset: 40,
        fontSize: 10,
        informationHeight: 70,
        outlierHeight: 20,
    }),

    mounted() {
        this.id = 'markers'
    },

    methods: {
        init(q, targetq, xScale) {
            this.$store.selectedMarker = 'target'
            this.q = q
            this.targetq = targetq
            this.xScale = xScale

            // Get the SVG belonging to this callsite.
            this.svg = d3.select('#' + this.callsiteID)

            this.g = this.svg
                .select('#' + this.id)
                .attrs({
                    "transform": "translate(0, " + this.paddingTop + ")"
                })

            this.height = this.$parent.containerHeight
            this.width = this.$parent.containerWidth

            this.boxHeight = this.height - this.informationHeight / 2
            this.boxWidth = this.width

            this.medianMarker()
            this.extremeMarkers()
            this.qTexts()
        },

        medianMarker() {
            let y1 = this.$parent.$parent.informationHeight/4
            let y2 = this.boxHeight - this.$parent.$parent.informationHeight/8
            this.medianLine = this.g
                .append("line")
                .attrs({
                    "class": "median",
                    "y1": y1,
                    "x1": this.xScale(this.q.q2),
                    "y2": y2,
                    "x2": this.xScale(this.q.q2),
                    'stroke': 'black'
                })
                .style('stroke-width', '2')
                .style('z-index', 10)
        },

        extremeMarkers() {
            if (this.$store.selectedMarker == 'target') {
                this.data = this.targetq
                this.fill = this.$store.color.target
            }
            else if (this.$store.selectedMarker == 'ensemble') {
                this.data = this.q
                this.fill = this.$store.color.ensemble
            }

            this.minMaxEnsembleMarker()
            this.minMaxTargetMarker()
            this.minText()
            this.maxText()
            this.medianText()
        },

        minMaxEnsembleMarker() {
            let y1 = this.$parent.$parent.informationHeight/2
            let y2 = this.boxHeight - this.$parent.$parent.informationHeight/4
            this.g.append("line")
                .attrs({
                    "class": "whisker",
                    "y1": y1,
                    "x1": this.xScale(this.q.min),
                    "y2": y2,
                    "x2": this.xScale(this.q.min),
                    'stroke': this.$store.color.ensemble
                })
                .style('stroke-width', '1.5')

            this.g.append("line")
                .attrs({
                    "class": "whisker",
                    "y1": y1,
                    "x1": this.xScale(this.q.max),
                    "y2": y2,
                    "x2": this.xScale(this.q.max),
                    'stroke': this.$store.color.ensemble
                })
                .style('stroke-width', '1.5')
        },

        minMaxTargetMarker() {
            let y1 = this.$parent.$parent.informationHeight/2
            let y2 = this.boxHeight - this.$parent.$parent.informationHeight/4
            this.g.append("line")
                .attrs({
                    "class": "whisker",
                    "y1": y1,
                    "x1": this.xScale(this.data.min),
                    "y2": y2,
                    "x2": this.xScale(this.data.min),
                    'stroke': this.fill
                })
                .style('stroke-width', '1.5')

            this.g.append("line")
                .attrs({
                    "class": "whisker",
                    "y1": y1,
                    "x1": this.xScale(this.data.max),
                    "y2": y2,
                    "x2": this.xScale(this.data.max),
                    'stroke': this.fill
                })
                .style('stroke-width', '1.5')
        },

        minText() {
            let min_val = this.data.min
            this.g.append("text")
                .attrs({
                    "class": "whiskerText",
                    "x": 0.5 * this.fontSize,
                    "y": this.boxHeight * 1.20,
                    "fill": d3.rgb(this.fill).darker(1)
                })
                .style('stroke-width', '1')
                .text("Min: " + this.formatRuntime(min_val))
        },

        maxText() {
            let max_val = this.data.max
            this.g.append("text")
                .attrs({
                    "class": "whiskerText",
                    "x": this.boxWidth - 8.5 * this.fontSize,
                    "y": this.boxHeight * 1.20,
                    "fill": d3.rgb(this.fill).darker(1)
                })
                .style('stroke-width', '1')
                .text("Max:" + this.formatRuntime(max_val))
        },

        medianText() {
            let median_val = this.data.q2
            this.g.append("text")
                .attrs({
                    "class": "whiskerText",
                    "x": this.boxWidth / 2 - 4.5 * this.fontSize,
                    "y": this.boxHeight * 1.20,
                    "fill": d3.rgb(this.fill).darker(1)
                })
                .style('stroke-width', '1')
                .text("Median:" + this.formatRuntime(median_val))
        },

        qTexts() {
            this.q1Text()
            this.q3Text()
        },

        q1Text() {
            this.g.append("text")
                .attrs({
                    "class": "whiskerText",
                    // "x": this.xScale(this.qData[0]) - 4.5*this.fontSize,
                    "x": this.boxWidth / 3,
                    "y": (this.informationHeight) * 0.10,
                    "fill": d3.rgb(this.fill).darker(1)
                })
                .style('stroke-width', '2')
                .text("q1: " + this.formatRuntime(this.q.q1))
        },

        q3Text() {
            this.g.append("text")
                .attrs({
                    "class": "whiskerText",
                    // "x": this.xScale(this.qData[1]) + 0.5*this.fontSize,
                    "x": ((this.boxWidth / 3) * 2),
                    "y": this.informationHeight * 0.10,
                    "fill": d3.rgb(this.fill).darker(1)
                })
                .style('stroke-width', '1')
                .text("q3: " + this.formatRuntime(this.q.q3))
        },

        formatName(name) {
            if (name.length < 20) {
                return name
            }
            let ret = this.trunc(name, 20)
            return ret
        },

        formatRuntime(val) {
            let ret = (val * 0.000001).toFixed(2)
            return ret
        },
    }
}