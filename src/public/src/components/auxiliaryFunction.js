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
            data = JSON.parse(data)
            this.dataReady = true
            let d = data.data
            let index = data.index
            let columns = data.columns

            let columnMap = {}
            let idx = 0
            for (let column of columns) {
                columnMap[column] = idx
                idx += 1
            }
            this.init(d, index, columns, columnMap)
        },
    },

    methods: {
        init(data, index, columns, columnMap) {

            if (!this.firstRender) {
                this.clear()
            }
            else {
                this.firstRender = false
            }
            this.callsites = []
            this.number_of_callsites = index.length

            for (let i = 0; i < index.length; i += 1) {
                let callsite = {}

                for (let column of columns) {
                    callsite[column] = data[i][columnMap[column]]
                }

                this.callsites.push(callsite)
                this.ui(callsite)
                this.visualize(callsite, this.type)

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

        changeText(idx) {
            return this.labels[idx]
        },

        select(node) {

        },

        highlight(datasets) {

        },

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
            return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
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

        visualize(data, type) {
            let inc_arr = data['time (inc)']
            let exc_arr = data['time']

            let q = [];
            let val = [];
            let max = 0, min = 0;
            if (type == 'inc') {
                val = inc_arr
                q = this.quartiles(inc_arr)
                max = data['max_time (inc)']
                min = data['min_time (inc)']
            }
            else {
                val = exc_arr
                q = this.quartiles(exc_arr)
                max = data['max_time']
                min = data['min_time']
            }
            var margin = { top: 0, right: 10, bottom: 0, left: 5 };
            this.width = document.getElementById('auxiliary-function-overview').clientWidth - 50
            this.height = 60;
            let labels = true;

            let textOffset = 25
            var chart = boxPlot()
                .width(this.width - textOffset)
                .whiskers(this.iqr(1.5))
                .domain([min, max])
                .showLabels(labels);

            let offset = margin.right;

            let svg = d3.select('#' + data.id)
                .append('svg')
                .attr('class', 'box')
                .attr("width", this.width)
                .attr("height", this.height)
                .attr("transform", "translate(" + offset + "," + margin.top + ")")


            let x = d3.scaleOrdinal()
                .domain(val)
                .range([0, this.width]);

            svg.selectAll(".box")
                .data([val])
                .enter().append("g")
                .attr("width", this.width)
                .attr("height", this.height - 10)
                .attr("transform", function (d) {
                    return "translate(" + x(d[0]) + "," + 0 + ")";
                })
                .call(chart.height(this.height));
        },

        iqr(k) {
            return function (d, i) {
                var q1 = d.quartiles[0],
                    q3 = d.quartiles[2],
                    iqr = (q3 - q1) * k,
                    i = -1,
                    j = d.length;
                while (d[++i] < q1 - iqr);
                while (d[--j] > q3 + iqr);
                return [i, j];
            };
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

            return [v1, v2, v3, v4, min, max]
        },

        box() {
            // Update innerquartile box.
            var box = g.selectAll("rect.box")
                .data([quartileData]);

            box.enter().append("rect")
                .attr("class", "box")
                .attr("y", 12.5)
                .attr("x", function (d) { return x0(d[0]); })
                .attr("height", height - 25)
                .attr('fill', '#c0c0c0')
                .attr("width", function (d) { return - x0(d[0]) + x0(d[2]); })
                .style('z-index', 1)
                .transition()
                .duration(duration)
                .attr("x", function (d) { return x1(d[0]); })
                .attr("width", function (d) { return - x1(d[0]) + x1(d[2]); });

            box.transition()
                .duration(duration)
                .attr("x", function (d) { return x1(d[0]); })
                .attr("width", function (d) { return - x1(d[0]) + x1(d[2]); });

        },

        centerLine() {
            var center = g.selectAll("line.center")
                .data(whiskerData ? [whiskerData] : []);

            //horizontal line
            center.enter().insert("line", "rect")
                .attr("class", "center")
                .attr("y1", height / 2 - 5)
                .attr("x1", function (d) { return x0(d[0]); })
                .attr("y2", height / 2 - 5)
                .attr("x2", function (d) { return x0(d[1]); })
                .style("opacity", 1e-6)
                .style('z-index', 10)
                .transition()
                .duration(duration)
                .style("opacity", 1)
                .attr("x1", function (d) { return x1(min); })
                .attr("x2", function (d) { return x1(max); });

            center.transition()
                .duration(duration)
                .style("opacity", 1)
                .attr("x1", function (d) { return x1(min); })
                .attr("x2", function (d) { return x1(max); });

            center.exit().transition()
                .duration(duration)
                .style("opacity", 1e-6)
                .attr("x1", function (d) { return x1(min); })
                .attr("x2", function (d) { return x1(max); })
                .remove();
        },

        medianLine() {
            // Update median line.
            var medianLine = g.selectAll("line.median")
                .data([quartileData[1]]);

            medianLine.enter().append("line")
                .attr("class", "median")
                .attr("y1", 0)
                .attr("x1", x0)
                .attr("y2", width)
                .attr("x2", x0)
                .transition()
                .duration(duration)
                .attr("x1", x1)
                .attr("x2", x1);

            medianLine.transition()
                .duration(duration)
                .attr("x1", x1)
                .attr("x2", x1);
        },

        whiskers() {
            var whisker = g.selectAll("line.whisker")
                .data([min, max]);

            whisker.enter().insert("line", "circle, text")
                .attr("class", "whisker")
                .attr("y1", 0)
                .attr("x1", x0)
                .attr("y2", 0 + width)
                .attr("x2", x0)
                .style("opacity", 1e-6)
                .transition()
                .duration(duration)
                .attr("x1", x1)
                .attr("x2", x1)
                .style("opacity", 1);

            whisker.transition()
                .duration(duration)
                .attr("x1", x1)
                .attr("x2", x1)
                .style("opacity", 1);

            whisker.exit().transition()
                .duration(duration)
                .attr("x1", x1)
                .attr("x2", x1)
                .style("opacity", 1e-6)
                .remove();
        },

        outliers() {
            var outlier = g.selectAll("circle.outlier")
                .data(outlierIndices, Number);

            outlier.enter().insert("circle", "text")
                .attr("class", "outlier")
                .attr("r", 5)
                .attr("cy", height / 2 - 5)
                .attr("cx", function (i) { return x0(d[i]); })
                .style("opacity", 1e-6)
                .transition()
                .duration(duration)
                .attr("cx", function (i) { return x1(d[i]); })
                .style("opacity", 1);

            outlier.transition()
                .duration(duration)
                .attr("cx", function (i) { return x1(d[i]); })
                .style("opacity", 1);

            outlier.exit().transition()
                .duration(duration)
                .attr("cx", function (i) { return x1(d[i]); })
                .style("opacity", 1e-6)
                .remove();
        }

    }
}

