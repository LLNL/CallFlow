import tpl from '../html/auxiliaryfunction.html'
import boxPlot from '../thirdParty/boxPlot'
import EventHandler from './EventHandler'
import * as d3 from 'd3'
import Vue from 'vue'

export default {
    name: 'AuxiliaryFunction',
    template: tpl,
    data: () => ({
        selected: {},
        id: 'auxiliary-function-overview',
        people: [],
        message: "Auxiliary Call Sites",
        callsites: [],
        dataReady: false,
        number_of_callsites: 0,
        firstRender: true,
        type: 'inc',
        margin: { top: 0, right: 10, bottom: 0, left: 5 },
        textOffset: 25,
        height: 60,
        width: 100,
        duration: 300,
        iqrFactor: 1.5,
        outlierRadius: 4
    }),
    mounted() {
        EventHandler.$on('highlight_datasets', (datasets) => {
            console.log("[Interaction] Highlighting the datasets :", datasets)
            self.highlight(datasets)
        })

        EventHandler.$on('update_auxiliary_sortBy', (sortBy) => {
            self.updateSortBy(sortBy)
        })
    },

    sockets: {
        auxiliary(data) {
            this.dataReady = true

            this.preprocess_data = {}
            for (let dataset of Object.keys(data)){
                if(data.hasOwnProperty(dataset)){
                    this.preprocess_data[dataset] = this.preprocess(data[dataset])
                }
            }

            this.init()
        },
    },

    methods: {
        preprocess(data){
            let json = JSON.parse(data)
            let d = json.data
            let index = json.index
            let columns = json.columns

            let columnMap = {}
            let idx = 0
            for (let column of columns) {
                columnMap[column] = idx
                idx += 1
            }
            return {
                data: d,
                index: index,
                columns: columns,
                columnMap: columnMap
            }
        },

        init() {

            if (!this.firstRender) {
                this.clear()
            }
            else {
                this.firstRender = false
            }

            this.callsites = []

            let ensemble_data = this.preprocess_data['ensemble']
            let target_data = this.preprocess_data[this.$store.selectedTargetDataset]

            this.number_of_callsites = ensemble_data['index'].length

            for (let i = 0; i < ensemble_data.index.length; i += 1) {
                let callsite = {}
                let target_callsite = {}

                for (let column of ensemble_data.columns) {
                    callsite[column] = ensemble_data.data[i][ensemble_data.columnMap[column]]
                    target_callsite[column] = target_data.data[i][target_data.columnMap[column]]
                }

                this.callsites.push(callsite)
                this.ui(callsite)
                this.visualize(callsite, target_callsite)
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

        ui(data) {
            let container = document.createElement('div')
            let div = document.createElement('div')
            div.setAttribute('id', data.id)
            div.setAttribute('class', 'auxiliary-node')

            let checkbox = this.createCheckbox(data)
            let call_site = this.createLabel("".concat("Call site: ", this.trunc(data.name, 30)))

            let time_inc = data["mean_time (inc)"].toFixed(2)
            let inclusive_runtime = this.createLabel("".concat("Inclusive Runtime (mean): ", time_inc));
            let time = data["mean_time"].toFixed(2)
            let exclusive_runtime = this.createLabel("".concat("Exclusive Runtime (mean): ", time));


            div.appendChild(checkbox);
            div.appendChild(call_site);
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

        createCheckbox(dat) {
            let div = document.createElement('div')
            let container = document.createElement("div");
            let checkbox = document.createElement("button");
            checkbox.name = dat.name;
            checkbox.node_name = dat['name']
            checkbox.setAttribute('class', "reveal-button");
            checkbox.innerHTML = 'Reveal'
            // container.appendChild(textNode)
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
            str = str.replace(/<unknown procedure>/g,'proc ')
            return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
        },


        // boxPlot visualization.
        visualize(ensemble_data, target_data) {
            this.width = document.getElementById('auxiliary-function-overview').clientWidth - 50

            this.boxPlot(ensemble_data, target_data)

            this.boxWidth = this.width - this.margin.left - this.margin.right
            this.boxHeight = this.height - this.margin.top - this.margin.bottom
            this.svg = d3.select('#' + ensemble_data.id)
                .append('svg')
                .attr('class', 'box')
                .attr("width", this.boxWidth)
                .attr("height", this.boxHeight)

            this.box()
            this.targetBox()
            this.centerLine()
            this.whiskers()
            this.outliers()
            this.medianLine()
        },

        boxPlot(ensemble_data, target_data) {
            let inc_arr = ensemble_data['time (inc)']
            let exc_arr = ensemble_data['time']

            let inc_arr_target = target_data['time (inc)']
            let exc_arr_target = target_data['time']

            this.d = [];
            if (this.type == 'inc') {
                this.raw_d = inc_arr
                this.d = inc_arr.sort(d3.ascending)
                this.q = this.quartiles(this.d)

                this.raw_target_d = inc_arr_target
                this.targetd = inc_arr_target.sort(d3.ascending)
                this.targetq = this.quartiles(this.targetd)
            }
            else if (this.type == 'exc') {
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
            this.x0 = this.x1 || d3.scaleLinear()
                .domain([this.q.min, this.q.max])
                .range(x1.range());
        },

        iqrScore(data, q, factor) {
            let q1 = q.q1
            let q3 = q.q3
            let iqr = (q3 - q1) * factor
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
            let mid = Math.floor(arr.length / 2)
            if (mid % 2) {
                return [mid]
            }
            else {
                return [mid - 1, mid]
            }
        },

        quartiles(arr) {
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

            let result = {
                "q1": v1,
                "q2": v2,
                "q3": v3,
                "q4": v4,
                "min": min,
                "max": max
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

        targetBox(){
            this.boxHeight = this.height / 2
            this.targetBoxSVG = this.svg
                .append("rect")
                .attr("class", "targetbox")
                .attr("y", 12.5)
                .attr("x", this.x0(this.targetq.q1))
                .attr("height", this.boxHeight)
                .attr('fill', this.$store.color.target)
                .attr("width", this.x0(this.targetq.q3) - this.x0(this.targetq.q1))
                .style('z-index', 1)
                .transition()
                .duration(this.duration)
                .attr("x", this.x1(this.targetq.q1))
                .attr("width", this.x1(this.targetq.q3) - this.x1(this.targetq.q1));

            this.targetBoxSVG.transition()
                .duration(this.duration)
                .attr("x", this.x1(this.targetq.q1))
                .attr("width", this.x1(this.targetq.q3) - this.x1(this.targetq.q1));
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
            let self = this
            this.whiskerData = this.whiskerIndices ? this.whiskerIndices.map(function (i) {
                return self.d[i];
            })
                : [this.q.min, this.q.max]
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

            for (let i = 0; i < outlierList.length; i += 1) {
                this.outlier = this.svg
                    .insert("circle", "text")
                    .attr("class", "outlier")
                    .attr("r", this.outlierRadius)
                    .attr("cy", this.height / 2 )
                    .attr("cx", this.x0(outlierList[i] - this.outlierRadius*i))
                    .style("opacity", 1e-6)
                    .transition()
                    .duration(this.duration)
                    .attr("cx", this.x1(outlierList[i]))
                    .style("opacity", 1);

                this.outlier.transition()
                    .duration(this.duration)
                    .attr("cx", this.x1(outlierList[i]))
                    .style("opacity", 1);

                // this.outlier.exit().transition()
                //     .duration(this.duration)
                //     .attr("cx", this.x1(outlierList[i]))
                //     .style("opacity", 1e-6)
                //     .remove();
            }
        },

        select(node) {

        },

        highlight(datasets) {

        },
    }
}

