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
    }),

    mounted() {
        this.id = 'markers'
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
                    "transform": "translate(0, " + this.paddingTop + ")"
                })

            this.informationHeight = 30

            this.height = this.$parent.containerHeight
            this.width = this.$parent.containerWidth

            this.boxHeight = this.height - this.paddingTop - this.informationHeight
            this.boxWidth = this.width

            let min_x = Math.min(this.q.min, this.targetq.min)
            let max_x = Math.max(this.q.max, this.targetq.max)

            this.x0 = d3.scaleLinear()
                .domain([min_x, max_x])
                .range([0, this.boxWidth]);

        //    this.outliers()
        //    this.targetOutliers()
        },

        groupByBand(data, band) {
            let ret = []
            let temp_x = 0
            let j = 0
            let count = 0
            let time = []
            let x = []
            let max_count = 0
            for (let i = 0; i < data.length; i += 1) {
                let d = data[i]
                if (i == 0) {
                    temp_x = d.x
                    count += 1
                    time.push(d.d)
                    x.push(d.x)
                }
                else {
                    if (Math.abs(d.x - temp_x) <= band) {
                        count += 1
                        time.push(d.d)
                        x.push(d.x)
                    }
                    else if (d.x - temp_x > band || i == data.length - 1) {
                        ret[j] = {
                            data: time,
                            x: x,
                            count: count
                        }
                        j += 1
                        if (count > max_count) {
                            max_count = count
                        }
                        count = 0
                        time = []
                        x = []
                        temp_x = d.x
                    }
                }
            }
            return {
                circles: ret,
                max_count: max_count
            }
        },

        groupOutliers(data, radius) {
            let self = this
            const radius2 = radius ** 2;

            const circles = data.map(d => {
                let x = self.x0(d)
                if (x == undefined) {
                    x = 0
                }
                else {
                    x = parseInt(x.toFixed(2))
                }
                return {
                    x: x,
                    d: d
                }
            })
                .sort((a, b) => a.x - b.x);

            const epsilon = 1e-3;
            let head = null, tail = null;

            // Returns true if circle ⟨x,y⟩ intersects with any circle in the queue.
            function intersects(x, y) {
                let a = head;
                while (a) {
                    if (radius2 - epsilon > (a.x - x) ** 2 + (a.y - y) ** 2) {
                        return true;
                    }
                    a = a.next;
                }
                return false;
            }

            // Place each circle sequentially.
            for (const b of circles) {

                // Remove circles from the queue that can’t intersect the new circle b.
                while (head && head.x < b.x - radius2) head = head.next;

                // Choose the minimum non-intersecting tangent.
                if (intersects(b.x, b.y = 0)) {
                    let a = head;
                    b.y = Infinity;
                    do {
                        let y = a.y + Math.sqrt(radius2 - (a.x - b.x) ** 2);
                        if (y < b.y && !intersects(b.x, y)) {
                            b.y = y;
                        }
                        a = a.next;
                    } while (a);
                }

                // Add b to the queue.
                b.next = null;
                if (head === null) head = tail = b;
                else tail = tail.next = b;
            }

            let temp = this.groupByBand(circles, 10)
            this.max_count = temp['max_count']
            let group_circles = temp['circles']

            return group_circles;
        },

        outliers() {
            let outlierList = []
            for (let i = 0; i < this.whiskerIndices[0]; i += 1) {
                outlierList.push(this.d[i])
            }

            for (let i = this.whiskerIndices[1] + 1; i < this.d.length; i += 1) {
                outlierList.push(this.d[i])
            }

            this.outlier = this.svg
                .selectAll(".outlier")
                .data(this.groupOutliers(outlierList, this.outlierRadius))
                .join("circle")
                .attr("r", d => (d.count / this.max_count) * 4 + 4)
                .attr("cx", d => d.x[0])
                .attr("cy", d => this.height / 2 + this.boxHeight / 2)
                .attr("class", "outlier")
                .style("opacity", 1e-6)
                .transition()
                .duration(this.duration)
                .attr("cx", d => d.x[0])
                .style("fill", this.$store.color.ensemble)
                .style("opacity", 1);
        },

        targetOutliers() {
            let targetOutlierList = []
            for (let i = 0; i < this.whiskerIndices_target[0]; i += 1) {
                targetOutlierList.push(this.targetd[i])
            }

            for (let i = this.whiskerIndices_target[1] + 1; i < this.targetd.length; i += 1) {
                targetOutlierList.push(this.targetd[i])
            }

            this.outlier = this.svg
                .selectAll(".target-outlier")
                .data(this.groupOutliers(targetOutlierList, this.outlierRadius))
                .join("circle")
                .attrs({
                    "r": d => (d.count / this.max_count) * 4 + 4,
                    "cx": d => d.x[0],
                    "cy": d => this.height / 2 - this.boxHeight / 2,
                    "class": "target-outlier"
                })
                .style("opacity", 1e-6)
                .style("fill", this.$store.color.target)
                .on('click', (d) => {
                    console.log(d)
                })
                .on('mouseover', (d) => {
                    console.log(d)
                })
                .on('mouseout', (d) => {
                    console.log(d)
                })
                .transition()
                .duration(this.duration)
                .style("opacity", 1)
                .attr("cx", d => d.x[0])

        },





    }
}