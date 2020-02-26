import tpl from '../../html/auxiliaryFunction/index.html'
import EventHandler from '../EventHandler'
import * as d3 from 'd3'

export default {
    name: 'AuxiliaryFunction',
    template: tpl,
    data: () => ({
        selected: {},
        id: 'auxiliary-function-overview',
        people: [],
        message: "Callsite Information",
        callsites: [],
        dataReady: false,
        number_of_callsites: 0,
        firstRender: true,
        margin: { top: 0, right: 10, bottom: 0, left: 5 },
        textOffset: 25,
        height: 60,
        width: 100,
        duration: 300,
        iqrFactor: 0.15,
        outlierRadius: 4,
        targetOutlierList: {},
        outlierList: {},
        module_data: {},
        callsite_data: {}
    }),
    mounted() {
        let self = this
        EventHandler.$on('highlight_datasets', (datasets) => {
            console.log("[Interaction] Highlighting the datasets :", datasets)
            self.highlight(datasets)
        })

        EventHandler.$on('update_auxiliary_sortBy', (sortBy) => {
            self.updateSortBy(sortBy)
        })
    },

    methods: {
        init() {
            if (!this.firstRender) {
                this.clear()
            }
            else {
                this.firstRender = false
            }

            this.toolbarHeight = document.getElementById('toolbar').clientHeight
			this.footerHeight = document.getElementById('footer').clientHeight

            document.getElementById('auxiliary-function-overview').style.maxHeight = window.innerHeight - this.toolbarHeight - this.footerHeight + "px"
            console.log(document.getElementById('auxiliary-function-overview').style)

            this.number_of_callsites = Object.keys(this.$store.callsites['ensemble']).length
            for (const [idx, callsite] of Object.entries(this.$store.callsites['ensemble'])) {
                this.ui(callsite.name)
                this.visualize(callsite.name)
            }
        },

        clear() {
            var els = document.querySelectorAll('.auxiliary-node')
            for (var i = 0; i < els.length; i++) {
                els[i].parentNode.innerHTML = ''
            }
        },

        dataset(idx) {
            return this.labels[idx]
        },

        ui(callsite_name) {
            let callsite = this.$store.callsites['ensemble'][callsite_name]

            let container = document.createElement('div')
            let div = document.createElement('div')
            div.setAttribute('id', callsite.id)
            div.setAttribute('class', 'auxiliary-node')

            let checkbox = this.createCheckbox(callsite)
            let callsite_label = this.createLabel("".concat(this.trunc(callsite.name, 30)))

            let time_inc = callsite["mean_time (inc)"].toFixed(2)
            let inclusive_runtime = this.createLabel("".concat("Inclusive Runtime (mean): ", (time_inc*0.000001).toFixed(2), "s"));
            let time = callsite["mean_time"].toFixed(2)
            let exclusive_runtime = this.createLabel("".concat("Exclusive Runtime (mean): ", (time*0.000001).toFixed(2), "s"));


            div.appendChild(checkbox);
            div.appendChild(callsite_label);
            div.appendChild(inclusive_runtime);
            div.appendChild(exclusive_runtime);

            container.appendChild(div)
            document.getElementById('auxiliary-function-overview').append(container);
        },

        // UI supportign functions.
        createLabel(text) {
            let div = document.createElement('div')
            let label = document.createElement("div");
            let textNode = document.createTextNode(text);
            label.appendChild(textNode);
            div.appendChild(label)
            return label
        },

        createCheckbox(callsite) {
            let div = document.createElement('div')
            let container = document.createElement("div");
            let checkbox = document.createElement("button");
            checkbox.name = callsite.name
            checkbox.module = callsite.module
            checkbox.node_name = callsite.name
            checkbox.setAttribute('class', "reveal-button");
            checkbox.innerHTML = 'Reveal'
            // container.appendChild(textNode)
            checkbox.onclick = function (event) {
                event.stopPropagation()
                let modules = this.module
                let callsite = this.name

                this.$socket.emit('dist_hierarchy', {
                    module: modules,
                    datasets: this.$store.runNames,
                })

                this.$socket.emit('ensemble_histogram', {
                    datasets: this.$store.runNames,
                    module: modules,
                    name: callsite
                })

            }
            container.appendChild(checkbox);
            div.appendChild(container)
            return div
        },

        drawLine() {
            let div = document.createElement('div')
            var newLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            newLine.setAttribute('id', 'line2');
            newLine.setAttribute('x1', '0');
            newLine.setAttribute('y1', '0');
            newLine.setAttribute('x2', '200');
            newLine.setAttribute('y2', '200');
            newLine.setAttribute("stroke", "black")
            div.appendChild(newLine);
            return newLine
        },

        trunc(str, n) {
            str = str.replace(/<unknown procedure>/g, 'proc ')
            return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
        },


        // boxPlot visualization.
        visualize(callsite_name) {
            this.width = document.getElementById('auxiliary-function-overview').clientWidth - 50

            let ensemble_callsite_data = this.$store.callsites['ensemble'][callsite_name]

            let target_callsite_data = this.$store.callsites[this.$store.selectedTargetDataset][callsite_name]

            if (target_callsite_data == undefined) {
                target_callsite_data = {
                    'dataset': [this.$store.selectedTargetDataset],
                    'id': ensemble_callsite_data.id,
                    'max_time': 0,
                    'max_time (inc)': 0,
                    'module': ensemble_callsite_data.module,
                    'name': ensemble_callsite_data.name,
                    'rank': [],
                    'time': [],
                    'time (inc)': []
                }
            }

            this.boxWidth = this.width - this.margin.left - this.margin.right
            this.boxHeight = this.height - this.margin.top - this.margin.bottom
            this.svg = d3.select('#' + ensemble_callsite_data.id)
                .append('svg')
                .attr('class', 'box')
                .attr("width", this.boxWidth)
                .attr("height", this.boxHeight)

            this.boxPlot(ensemble_callsite_data, target_callsite_data)
            this.box()
            this.targetBox()
            this.centerLine()
            this.whiskers()
            this.outliers()
            this.targetOutliers()
            this.medianLine()
        },

        boxPlot(ensemble_data, target_data) {
            let inc_arr = ensemble_data['time (inc)']
            let exc_arr = ensemble_data['time']

            let inc_arr_target = target_data['time (inc)']
            let exc_arr_target = target_data['time']

            this.d = [];
            if (this.$store.selectedMetric == 'Inclusive') {
                this.raw_d = inc_arr
                this.d = inc_arr.sort(d3.ascending)
                this.q = this.quartiles(this.d)

                this.raw_target_d = inc_arr_target
                this.targetd = inc_arr_target.sort(d3.ascending)
                this.targetq = this.quartiles(this.targetd)
            }
            else if (this.$store.selectedMetric == 'Exclusive') {
                this.raw_d = exc_arr
                this.d = exc_arr.sort(d3.ascending)
                this.q = this.quartiles(this.d)

                this.raw_target_d = exc_arr_target
                this.targetd = exc_arr_target.sort(d3.ascending)
                this.targetq = this.quartiles(this.targetd)
            }

            this.whiskerIndices = this.iqrScore(this.d, this.q)
            this.whiskerIndices_target = this.iqrScore(this.targetd, this.targetq)

            // Compute the new x-scale.
            this.x1 = d3.scaleLinear()
                .domain([this.q.min, this.q.max])
                .range([0, this.boxWidth]);

            // Retrieve the old x-scale, if this is an update.
            this.x0 = d3.scaleLinear()
                .domain([this.q.min, this.q.max])
                .range([0, this.boxWidth]);
        },

        iqrScore(data, q) {
            let q1 = q.q1
            let q3 = q.q3
            let iqr = (q3 - q1) * this.iqrFactor
            let i = 0
            let j = data.length - 1
            while (data[i] < q1 - iqr) {
                i++
            }
            while (data[j] > q3 + iqr) {
                j--
            }
            return [i, j];
        },

        avg(arr) {
            let sum = 0;
            for (let i = 0; i < arr.length; i++) {
                sum += arr[i]
            }
            return sum / arr.length
        },

        median(arr) {
            if (arr.length == 0) return 0
            if (arr.length == 1) return [0]
            let mid = Math.floor(arr.length / 2)
            if (mid % 2) {
                return [mid]
            }
            else {
                return [mid - 1, mid]
            }
        },

        quartiles(arr) {
            let result = {}
            if (arr.length == 0) {
                result = {
                    "q1": 0,
                    "q2": 0,
                    "q3": 0,
                    "q4": 0,
                    "min": 0,
                    "max": 0
                }
            }
            else {
                arr.sort(function (a, b) {
                    return a - b;
                })

                let med_pos = this.median(arr)

                let med = 0
                if (med_pos.length == 2) {
                    med = (arr[med_pos[0]] + arr[med_pos[1]]) / 2
                }
                else {
                    med = arr[med_pos[0]]
                }
                let min = arr[0]
                let max = arr[arr.length - 1]

                let q1 = (min + med) / 2;
                let q2 = med
                let q3 = (max + med) / 2
                let q4 = max

                var v1 = Math.floor(q1),
                    v2 = Math.floor(q2),
                    v3 = Math.floor(q3),
                    v4 = Math.floor(q4);

                var rowMax = Math.max(v1, Math.max(v2, Math.max(v3, v4)));
                var rowMin = Math.min(v1, Math.min(v2, Math.min(v3, v4)));

                if (rowMax > max) max = rowMax;
                if (rowMin < min) min = rowMin;

                result = {
                    "q1": v1,
                    "q2": v2,
                    "q3": v3,
                    "q4": v4,
                    "min": min,
                    "max": max
                }
            }
            return result
        },

        box() {
            // Update innerquartile box.
            this.boxHeight = this.height / 2
            this.boxSVG = this.svg
                .append("rect")
                .attr("class", "box")
                .attr("y", 12.5)
                .attr("x", this.x0(this.q.q1))
                .attr("height", this.boxHeight)
                .attr('fill', this.$store.color.ensemble)
                .attr("width", this.x0(this.q.q3) - this.x0(this.q.q1))
                .style('z-index', 1)
                .transition()
                .duration(this.duration)
                .attr("x", this.x1(this.q.q1))
                .attr("width", this.x1(this.q.q3) - this.x1(this.q.q1));

            this.boxSVG.transition()
                .duration(this.duration)
                .attr("x", this.x1(this.q.q1))
                .attr("width", this.x1(this.q.q3) - this.x1(this.q.q1));
        },

        targetBox() {
            let self = this
            this.boxHeight = this.height / 2
            this.targetBoxSVG = this.svg
                .append("rect")
                .attr("class", "targetbox")
                .attr("y", 12.5)
                .attr("x", this.x0(this.targetq.q1))
                .attr("height", this.boxHeight)
                .attr('fill', this.$store.color.target)
                .attr("width", (d) => {
                    if(self.targetq.q1 == self.targetq.q3){
                        return 3
                    }
                    return self.x0(self.targetq.q3) - self.x0(self.targetq.q1)
                })
                .style('z-index', 1)
                .transition()
                .duration(this.duration)
                .attr("x", this.x1(this.targetq.q1))
                .attr("width", this.x1(this.targetq.q3) - this.x1(this.targetq.q1));

            this.targetBoxSVG.transition()
                .duration(this.duration)
                .attr("x", this.x1(this.targetq.q1))
                .attr("width", (d) => {
                    if(self.targetq.q1 == self.targetq.q3){
                        return 3
                    }
                    return self.x1(self.targetq.q3) - self.x1(self.targetq.q1)
                })
            },

        centerLine() {
            this.centerLineSVG = this.svg
                .insert("line", "rect")
                .attr("class", "centerLine")
                .attr("y1", this.height / 2)
                .attr("x1", this.x0(this.q.min))
                .attr("y2", this.height / 2)
                .attr("x2", this.x0(this.q.max - 1))
                .attr('stroke', 'black')
                .style('border', '1px dotted')
                .style("opacity", 1e-6)
                .style('z-index', 10)
                .transition()
                .duration(this.duration)
                .style("opacity", 1)
                .attr("x1", this.x1(this.q.min))
                .attr("x2", this.x1(this.q.max - 1));

            this.centerLineSVG.transition()
                .duration(this.duration)
                .style("opacity", 1)
                .attr("x1", this.x1(this.q.min))
                .attr("x2", this.x1(this.q.max));

            // this.centerLineSVG.exit().transition()
            //     .duration(this.duration)
            //     .style("opacity", 1e-6)
            //     .attr("x1", this.x1(this.q.min))
            //     .attr("x2", this.x1(this.q.max))
            //     .remove();
        },

        medianLine() {
            // Update median line.
            var medianLine = this.svg
                .append("line")
                .attr("class", "median")
                .attr("y1", 0)
                .attr("x1", this.x0(this.q.q2))
                .attr("y2", this.boxWidth)
                .attr("x2", this.x0(this.q.q2))
                .transition()
                .duration(this.duration)
                .attr("x1", this.x1(this.q.q2))
                .attr("x2", this.x1(this.q.q2));

            medianLine.transition()
                .duration(this.duration)
                .attr("x1", this.x1(this.q.q2))
                .attr("x2", this.x1(this.q.q2));
        },

        whiskers() {
            this.whiskerData = [this.q.min, this.q.max]
            for (let i = 0; i < this.whiskerData.length; i += 1) {
                let d = this.whiskerData[i]
                let whisker = this.svg
                    .append("line")
                    .attr("class", "whisker")
                    .attr("y1", 0)
                    .attr("x1", this.x0(d))
                    .attr("y2", this.width)
                    .attr("x2", this.x0(d))
                    .style("opacity", 1e-6)
                    .transition()
                    .duration(this.duration)
                    .attr("x1", this.x1(d))
                    .attr("x2", this.x1(d))
                    .style("opacity", 1);

                whisker.transition()
                    .duration(this.duration)
                    .attr("x1", this.x1(d))
                    .attr("x2", this.x1(d))
                    .style("opacity", 1);
            }

            // this.whisker.exit().transition()
            //     .duration(this.duration)
            //     .attr("x1", this.x1)
            //     .attr("x2", this.x1)
            //     .style("opacity", 1e-6)
            //     .remove();
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
                .attr("r", d => (d.count / this.max_count) * 4 + 4)
                .attr("cx", d => d.x[0])
                .attr("cy", d => this.height / 2 - this.boxHeight / 2)
                .attr("class", "target-outlier")
                .style("opacity", 1e-6)
                .style("fill", this.$store.color.target)
                .transition()
                .duration(this.duration)
                .attr("cx", d => d.x[0])
                .style("opacity", 1);
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

        select(node) {

        },

        highlight(datasets) {

        },
    }
}

