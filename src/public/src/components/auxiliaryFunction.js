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
        dataReady: false
    }),
    mounted() {
        EventHandler.$on('highlight_datasets', (datasets) => {
            console.log("[Interaction] Highlighting the datasets :", datasets)
            self.highlight(datasets)
        })
    },

    sockets: {
        auxiliary(data) {
            data = JSON.parse(data)
            this.dataReady = true
            this.init(data)
        },
    },

    methods: {
        init(data) {
            this.callsites = []
            let index = Object.keys(data['name'])

            for (let i = 0; i < index.length; i += 1) {
                let callsite = {}
                let name = data['name'][index[i]]

                callsite = {
                    'time (inc)': data['time (inc)'][index[i]],
                    'time': data['time'][index[i]],
                    'rank': data['rank'][index[i]],
                    'id': data['id'][index[i]],
                    'name': name
                }
                this.callsites.push(callsite)
            }

            for (let i = 0; i < this.callsites.length; i += 1) {
                let callsite = this.callsites[i]
                this.boxPlotContainerUI(callsite, 'inc')
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

        boxPlotContainerUI(dat, type) {
            let div = document.createElement('div')
            div.setAttribute('id', dat.id)
            let label = document.createElement("div");
            let description = document.createTextNode(dat.name);
            let checkbox = document.createElement("input");

            checkbox.type = "checkbox";
            checkbox.name = dat.name;
            checkbox.node_name = dat['name']
            checkbox.setAttribute('class', "list_checkbox");

            label.appendChild(checkbox);
            label.appendChild(description);

            div.appendChild(label)
            document.getElementById('auxiliary-function-overview').append(div);
            this.boxPlotUI(dat, type)
        },

        boxPlotUI(data, type) {
            let inc_arr = data['time (inc)']
            let exc_arr = data['time']

            let q = [];
            let val = [];
            if (type == 'inc') {
                val = inc_arr
                q = this.quartiles(inc_arr)
            }
            else {
                val = exc_arr
                q = this.quartiles(exc_arr)
            }
            var margin = { top: 0, right: 10, bottom: 0, left: 5 };
            this.width = document.getElementById('auxiliary-function-overview').clientWidth
            this.height = 50;
            let labels = true;

            let textOffset = 25
            var chart = boxPlot()
                .width(this.width - textOffset)
                .whiskers(this.iqr(1.5))
                .domain([q[4], q[5]])
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

