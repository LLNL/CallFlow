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
        init(q, targetq) {
            this.$store.selectedMarker = 'target'
            this.q = q
            this.targetq = targetq

            // Get the SVG belonging to this callsite.
            this.svg = d3.select('#' + this.callsiteID)

            this.g = this.svg
                .select('#' + this.id)
                .attrs({
                    "transform": "translate(0, " + this.paddingTop + ")"
                })

            this.height = this.$parent.containerHeight
            this.width = this.$parent.containerWidth

            this.boxHeight = this.height - this.informationHeight/2
            this.boxWidth = this.width

            this.min_x = Math.min(this.q.min, this.targetq.min)
            this.max_x = Math.max(this.q.max, this.targetq.max)

            this.x0 = d3.scaleLinear()
                .domain([this.min_x, this.max_x])
                .range([0, this.boxWidth]);

            this.medianMarker()
            this.extremeMarkers()
            this.qMarkers()
        },

        medianMarker() {
            this.medianLine = this.g
                .append("line")
                .attr("class", "median")
                .attr("y1", 0)
                .attr("x1", this.x0(this.q.q2))
                .attr("y2", this.boxHeight)
                .attr("x2", this.x0(this.q.q2))
                .attr('stroke', 'black')
                .style('stroke-width', '2')
                .style('z-index', 10)
        },

        extremeMarkers() {
            let data = {}
            let fill = ''
            if(this.$store.selectedMarker == 'target'){
                data = this.targetq
                fill = this.$store.color.target
            }
            else if(this.$store.selectedMarker == 'ensemble'){
                data = this.q
                fill = this.$store.color.ensemble
            }

            this.extremeData = [data.min, data.max]
            for (let i = 0; i < this.extremeData.length; i += 1) {
                let d = this.extremeData[i]
                this.g.append("line")
                    .attrs({
                        "class": "whisker",
                        "y1": 0,
                        "x1": this.x0(d),
                        "y2": this.boxHeight,
                        "x2": this.x0(d),
                        'stroke': fill
                    })
                    .style('stroke-width', '1.5')
            }

            this.extremeData = [this.q.min, this.q.max]
            for (let i = 0; i < this.extremeData.length; i += 1) {
                let d = this.extremeData[i]
                this.g.append("line")
                    .attrs({
                        "class": "whisker",
                        "y1": 0,
                        "x1": this.x0(d),
                        "y2": this.boxHeight,
                        "x2": this.x0(d),
                        'stroke': 'black'
                    })
                    .style('stroke-width', '1.5')
            }

            let min_val = this.min_x
            this.g.append("text")
                .attrs({
                    "class": "whiskerText",
                    "x":  0.5 * this.fontSize,
                    "y": this.boxHeight * 1.20,
                    "fill": d3.rgb(fill).darker(1)
                })
                .style('stroke-width', '1')
                .text("Min: " + this.formatRuntime(min_val))

            let max_val = this.max_x
            this.g.append("text")
                .attrs({
                    "class": "whiskerText",
                    "x": this.boxWidth - 8.5 * this.fontSize,
                    "y": this.boxHeight * 1.20,
                    "fill": d3.rgb(fill).darker(1)
                })
                .style('stroke-width', '1')
                .text("Max:" + this.formatRuntime(max_val))

            let median_val = this.q.q2
            this.g.append("text")
                .attrs({
                    "class": "whiskerText",
                    "x": this.boxWidth/2 - 4.5*this.fontSize,
                    "y": this.boxHeight * 1.20,
                    "fill": d3.rgb(fill).darker(1)
                })
                .style('stroke-width', '1')
                .text("Median:" + this.formatRuntime(median_val))
        },


        qMarkers() {
            let data = {}
            let fill = ''
            if(this.$store.selectedMarker == 'target'){
                data = this.targetq
                fill = this.$store.color.target
            }
            else if(this.$store.selectedMarker == 'ensemble'){
                data = this.q
                fill = this.$store.color.ensemble
            }
            this.qData = [data.q1, data.q3]
            this.g.append("text")
                .attrs({
                    "class": "whiskerText",
                    // "x": this.x0(this.qData[0]) - 4.5*this.fontSize,
                    "x": this.boxWidth / 3,
                    "y": (this.informationHeight) * 0.20,
                    "fill": d3.rgb(fill).darker(1)
                })
                .style('stroke-width', '2')
                .text("q1: " + this.formatRuntime(this.qData[0]))

            this.g.append("text")
                .attrs({
                    "class": "whiskerText",
                    // "x": this.x0(this.qData[1]) + 0.5*this.fontSize,
                    "x": ((this.boxWidth / 3) * 2),
                    "y": this.informationHeight * 0.20,
                    "fill": d3.rgb(fill).darker(1)
                })
                .style('stroke-width', '1')
                .text("q3: " + this.formatRuntime(this.qData[1]))
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