import tpl from '../../html/auxiliaryFunction/markers.html'
import * as d3 from 'd3'

export default {
    name: "Outliers",
    template: tpl,
    props: [
        "callsiteID"
    ],
    data: () => ({
        paddingTop: 10,
        textOffset: 40,
        fontSize: 10,
        outlierRadius:4,
        informationHeight: 70
    }),

    created() {
        this.id = 'outliers-' + this.callsiteID
    },

    methods: {
        init(q, targetq, ensembleWhiskerIndices, targetWhiskerIndices, d, targetd, xScale) {
            this.q = q
            this.targetq = targetq
            this.ensembleWhiskerIndices = ensembleWhiskerIndices
            this.targetWhiskerIndices = targetWhiskerIndices
            this.d = d
            this.targetd = targetd
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

            this.boxHeight = this.height - this.paddingTop - this.informationHeight
            this.boxWidth = this.width

           this.ensembleOutliers()
           this.targetOutliers()
           this.$parent.$refs.ToolTip.init(this.id)
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
            const radius2 = radius ** 2;

            const circles = data.map(d => {
                let x = this.xScale(d)
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

        cleanUpEmptyOutliers(data){
            let ret = []
            for(let i = 0; i < data.length; i += 1){
                if(data[i].count != 0){
                    ret.push(data[i])
                }
            }
            return ret
        },

        ensembleOutliers() {
            let self = this
            let outlierList = []
            for (let i = 0; i < this.ensembleWhiskerIndices[0]; i += 1) {
                outlierList.push(this.d[i])
            }

            for (let i = this.ensembleWhiskerIndices[1] + 1; i < this.d.length; i += 1) {
                outlierList.push(this.d[i])
            }

            this.data = this.groupOutliers(outlierList, this.outlierRadius)
            this.data = this.cleanUpEmptyOutliers(this.data)
            this.outlier = this.g
                .selectAll(".ensemble-outlier")
                .data(this.data)
                .join("circle")
                .attrs({
                    "r": d => (d.count / this.max_count) * 4 + 4,
                    "cx": d => {
                        return d.x[0]
                    },
                    "cy": d => this.boxHeight / 2 + this.informationHeight,
                    "class": "ensemble-outlier",
                
                })
                .style("opacity", 1)
                .style("fill", this.$store.color.ensemble)
                .on('click', (d) => {
                    console.log(d)
                })
                .on('mouseover', (d) => {
                    self.$parent.$refs.ToolTip.renderOutliers(d)
                })
                .on('mouseout', (d) => {
                    self.$parent.$refs.ToolTip.clear()
                })
        },

        targetOutliers() {
            let self = this
            let targetOutlierList = []
            for (let i = 0; i < this.targetWhiskerIndices[0]; i += 1) {
                targetOutlierList.push(this.targetd[i])
            }

            for (let i = this.targetWhiskerIndices[1] + 1; i < this.targetd.length; i += 1) {
                targetOutlierList.push(this.targetd[i])
            }

            this.data = this.groupOutliers(targetOutlierList, this.outlierRadius)
            this.data = this.cleanUpEmptyOutliers(this.data)

            this.outlier = this.g
                .selectAll(".target-outlier")
                .data(this.data)
                .join("circle")
                .attrs({
                    "r": d => (d.count / this.max_count) * 4 + 4,
                    "cx": d => d.x[0],
                    "cy": d => this.boxHeight/2 - this.informationHeight/4,
                    "class": "target-outlier"
                })
                .style("opacity", 1)
                .style("fill", this.$store.color.target)
                .on('click', (d) => {
                    console.log(d)
                })
                .on('mouseover', (d) => {
                    self.$parent.$refs.ToolTip.renderOutliers(d)
                })
                .on('mouseout', (d) => {
                    self.$parent.$refs.ToolTip.clear()
                })
        },
    }
}