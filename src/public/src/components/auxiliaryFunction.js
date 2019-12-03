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
            console.log(data)
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
            else{
                this.firstRender=false
            }
            this.callsites = []
            this.number_of_callsites = index.length

            for (let i = 0; i < index.length; i += 1) {
                let callsite = {}

                for (let column of columns) {
                    callsite[column] = data[i][columnMap[column]]
                }

                this.callsites.push(callsite)
                this.boxPlotContainerUI(callsite, 'inc')
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
            let checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.name = dat.name;
            checkbox.node_name = dat['name']
            checkbox.setAttribute('class', "list_checkbox");
            let textNode = document.createTextNode('Reveal in Ensemble graph');
            container.appendChild(textNode)
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


        boxPlotContainerUI(dat, type) {
            let container = document.createElement('div')
            let div = document.createElement('div')
            div.setAttribute('id', dat.id)
            div.setAttribute('class', 'auxiliary-node')

            let checkbox = this.createCheckbox(dat)
            let call_site = this.createLabel("".concat("Call site: ", this.trunc(dat.name, 30)))

            let time_inc = dat["mean_time (inc)"].toFixed(2)
            let inclusive_runtime = this.createLabel("".concat("Inclusive Runtime (mean): ", time_inc));
            let time = dat["mean_time"].toFixed(2)
            let exclusive_runtime = this.createLabel("".concat("Exclusive Runtime (mean): ", time));


            div.appendChild(checkbox);
            div.appendChild(call_site);
            div.appendChild(inclusive_runtime);
            div.appendChild(exclusive_runtime);

            container.appendChild(div)
            document.getElementById('auxiliary-function-overview').append(container);
            this.boxPlotUI(dat, type)
        },

        boxPlotUI(data, type) {
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
            this.height = 50;
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
                .range([0, this.width - 200]);

            svg.selectAll(".box")
                .data([val])
                .enter().append("g")
                .attr("width", this.width)
                .attr("height", this.height)
                // .attr("transform", function (d) {
                //     return "translate(" + x(d[0]) + "," + 0 + ")";
                // })
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
        }

    }
}

function functionListUI() {
    var listViewDiv = document.createElement('table');
    listViewDiv.setAttribute("id", "list_view");
    document.getElementById('fList_view').appendChild(listViewDiv);

    $("#list_view").width($("#fList_view").width());
    $("#list_view").height($("#fList_view").height() - 50);
    $("#list_view").css("overflow-y", "scroll");
    $('#list_view').css('max-height', '100')
    //    document.getElementById("splitNodeByParentBtr").disabled = true;
}

function displayFunctions(listData) {
    $('#list_view').empty();

    var button = $('<button/>', {
        text: 'Split Caller',
        id: "splitNodeBtr"
    });


    $("#list_view").append(button);
    document.getElementById("splitNodeBtr").disabled = true;
    var button2 = $('<button/>', {
        text: 'Split Callee',
        id: "splitNodeByParentBtr"
    });
    $("#list_view").append(button2);


    let entry_funcs = listData['entry_funcs']
    let other_funcs = listData['other_funcs']

    entry_funcs.sort(function (a, b) {
        return b["value_exc"] - a["value_exc"];
    })

    let divHead = document.createElement('label');
    divHead.appendChild(document.createTextNode("Entry functions: "))
    document.getElementById('list_view').appendChild(divHead)

    let text = document.createTextNode(' ' + entry_funcs.length + ' in count')
    divHead.appendChild(text)

    entry_funcs.forEach(function (dat) {
        boxPlotContainerUI(dat, 'inc')
    });
    document.getElementById('list_view').appendChild(document.createElement('br'));
    document.getElementById('list_view').appendChild(document.createElement('br'));

    // For other_funcs
    other_funcs.sort(function (a, b) {
        return b["value_exc"] - a["value_exc"];
    })

    let otherHead = document.createElement('label');
    otherHead.appendChild(document.createTextNode("Inside functions: "))
    document.getElementById('list_view').appendChild(otherHead)

    let othertext = document.createTextNode(' ' + other_funcs.length + ' in count')
    otherHead.appendChild(othertext)

    let other_funcs_count = 0
    other_funcs.forEach(function (dat) {
        boxPlotContainerUI(dat, 'inc')
    });

    document.getElementById("splitNodeBtr").disabled = false;
    $('#splitNodeBtr').click(() => {
        let idList = $('input:checkbox:checked.list_checkbox').map(function () {
            return this.df_index
        }).get();
        splitCaller(idList).then((data) => {
            self.state = data
            //                this.render()
        })

    })
}

