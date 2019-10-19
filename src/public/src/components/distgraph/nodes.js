import tpl from '../../html/distgraph/nodes.html'
import * as d3 from 'd3'
import ToolTip from './tooltip'
import EventHandler from '../../EventHandler'


export default {
    template: tpl,
    name: 'DistNodes',
    components: {
        ToolTip
    },
    props: [],
    data: () => ({
        currentNodeLevel: {},
        nodeHeights: {},
        nodeWidth: 50,
        transitionDuration: 1000,
        minHeightForText: 15,
        textTruncForNode: 25,
        id: '',
        graph: null,
        nidNameMap: {},
    }),
    sockets: {
        dist_gradients(data) {
            console.log("Gradient data:", data)
            this.data = data
            this.setupGradients2(data)
            // this.quantileLines(data, 'max')
        },
    },
    mounted() {
        this.id = 'dist-nodes-' + this._uid

        let self = this
        EventHandler.$on('update_diff_node_alignment', function () {
            self.clearQuantileLines()
        })
    },

    methods: {
        group() {
            this.total_weight = d3.nest()
                .key(function (d) { return d.level; })
                .key(function (d) { return d.sourceLinks.length; })
                .rollup(function (d) {
                    return d3.sum(d, function (g) { return g['time (inc)']; });
                }).entries(this.graph.nodes)
            },

        init(graph) {
            this.graph = graph
            this.nodes = d3.select('#' + this.id)
            this.group()
            this.setNodeIds()

            // https://observablehq.com/@geekplux/dragable-d3-sankey-diagram
            this.drag = d3.drag()
                .subject((d) => {
                    return d;
                })
                .on("start", function () {
                    this.parentNode.appendChild(this)
                })
                .on("drag", (d) => {
                    d3.select(`node_${d.mod_index[0]}`).attr("transform",
                        "translate(" + (
                            d.x = Math.max(0, Math.min(this.$parent.width - d.dx, d3.event.x))
                        ) + "," + (
                            d.y = Math.max(0, Math.min(this.$parent.height - d.dy, d3.event.y))
                        ) + ")");
                    // sankey.relayout();
                    // link.attr("d", path);
                })

            this.nodesSVG = this.nodes.selectAll('.dist-node')
                .data(this.graph.nodes)
                .enter().append('g')
                .attr('class', (d) => {
                    return 'dist-node'
                })
                .attr('opacity', 0)
                .attr('id', (d, i) => `dist-node_${d.client_idx}`)
                .attr('transform', (d) => {
                    return `translate(${d.x},${d.y})`
                })
            // .call(this.drag);

            this.nodes.selectAll('.dist-node')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .attr('opacity', 1)
                .attr('transform', d => `translate(${d.x},${d.y + this.$parent.ySpacing})`)

            this.rectangle()
            this.path()
            this.text()

            this.$refs.ToolTip.init(this.$parent.id)
        },

        setNodeIds() {
            let idx = 0
            for (let node of this.graph.nodes) {
                this.nidNameMap[node.name] = idx
                node.client_idx = idx
                idx += 1
            }
        },

        rectangle() {
            let self = this
            this.nodesSVG.append('rect')
                .attr('height', (d) => {
                    this.currentNodeLevel[d.mod_index] = 0;
                    this.nodeHeights[d.n_index] = d.height;
                    return d.height;
                })
                .attr('width', this.nodeWidth)
                .attr('opacity', 0)
                // .style('fill', d => {
                //     let color = this.$store.color.getColor(d)
                //     return color
                // })
                // .style('fill-opacity', (d) => {
                //     return 1
                // })
                .style('shape-rendering', 'crispEdges')
                .style('stroke', (d) => {
                    return d3.rgb(this.$store.color.getColor(d)).darker(2);
                })
                .style('stroke-width', (d) => {
                    return 1
                })
                .on('mouseover', function (d) {
                    self.$refs.ToolTip.render(self.graph, d)
                })
                .on('mouseout', function (d) {
                    self.$refs.ToolTip.clear()
                })
                .on('click', (d) => {
                    this.$store.selectedNode = d
                    console.log(d)
                    let selectedModule = d.id

                    // this.cleardebugGradients()
                    // this.debugGradients(this.data, selectedModule, 'hist')
                    // this.debugGradients(this.data, selectedModule, 'kde')
                    // this.clearQuantileLines()
                    this.clearLineGradients()
                    this.quantileLines()

                    // this.$socket.emit('hierarchy', {
                    //     module: selectedModule,
                    //     dataset1: this.$store.selectedDataset,
                    // })
                })

            // Transition
            this.nodes.selectAll('rect')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .attr('opacity', d => {
                    return 1;
                })
                .attr('height', d => d.height)
                .style('stroke', (d) => {
                    return 1;
                })
                .style("fill", (d, i) => {
                    return "url(#linear-gradient" + d.client_idx + "-up)"
                })
        },

        //Gradients
        clearLineGradients() {
            d3.selectAll('.linear-gradient').remove()
        },

        setupGradients2(data) {
            let method = 'hist'
            for (let d in data) {
                if (this.nidNameMap[d] != undefined) {
                    var defs = d3.select('#distgraph-overview-')
                        .append("defs");

                    this.linearGradient = defs.append("linearGradient")
                        .attr("id", "linear-gradient" + this.nidNameMap[d] + '-up')
                        .attr("class", 'linear-gradient')

                    this.linearGradient
                        .attr("x1", "0%")
                        .attr("y1", "0%")
                        .attr("x2", "0%")
                        .attr("y2", "100%");

                    let root_d = 'libmonitor.so.0.0.0=<program root>'
                    let min_val = data[d][method]['y_min']
                    let max_val = data[d][method]['y_max']

                    let grid = data[d][method]['x']
                    let val = data[d][method]['y']

                    for (let i = 0; i < grid.length; i += 1) {
                        // console.log(d, ':', i, " -- ", 100 * (i / grid.length), (val[i] / (max_val - min_val)))
                        let x = (i + i + 1) / (2 * grid.length)
                        this.linearGradient.append("stop")
                            .attr("offset", 100 * x + "%")
                            .attr("stop-color", d3.interpolateReds((val[i] / (max_val - min_val))))
                    }
                }
            }
        },

        cleardebugGradients() {
            d3.selectAll('.debugLine').remove()
            d3.selectAll('.axisLabel').remove()
            d3.selectAll('.axis').remove()
        },

        debugGradients(data, node, mode) {
            this.toolbarHeight = document.getElementById('toolbar').clientHeight
            this.footerHeight = document.getElementById('footer').clientHeight
            this.width = window.innerWidth * 0.3
            this.height = (window.innerHeight - this.toolbarHeight - this.footerHeight) * 0.5

            this.margin = {
                top: 15,
                right: 10,
                bottom: 10,
                left: 15
            }
            this.scatterWidth = this.width - this.margin.right - this.margin.left;
            this.scatterHeight = this.height - this.margin.top - this.margin.bottom;

            this.debugsvg = d3.select('#debug')
                .attr('width', this.width - this.margin.left - this.margin.right)
                .attr('height', this.height - this.margin.top - this.margin.bottom)
                .attr('transform', "translate(" + this.margin.left + "," + this.margin.top + ")")

            this.xMin = data[node][mode]['x_min']
            this.xMax = data[node][mode]['x_max']
            this.yMin = data[node][mode]['y_min']
            this.yMax = data[node][mode]['y_max']
            this.xScale = d3.scaleLinear().domain([this.xMin, this.xMax]).range([0, this.scatterWidth])
            this.yScale = d3.scaleLinear().domain([this.yMin, this.yMax]).range([this.scatterHeight - this.margin.top - this.margin.bottom, 0])

            var xAxis = d3.axisBottom(this.xScale)
            // .ticks(5)
            // .tickFormat((d, i) => {
            //     console.log(d)
            //     if (i % 2 == 0 || i == 0 ) {
            //         return d
            //     }
            //     else{
            //         return ''
            //     }
            // });

            var yAxis = d3.axisLeft(this.yScale)
            // .ticks(5)
            // .tickFormat((d, i) => {
            //     console.log(i)
            //     if (i % 2 == 0 || i == 0) {
            //         return d
            //         // return `${this.yMin + i*d/(this.yMax - this.yMin)}`
            //     }
            //     else{
            //         return ''
            //     }
            // });

            let xAxisHeightCorrected = this.scatterHeight - this.margin.top - this.margin.bottom
            var xAxisLine = this.debugsvg.append('g')
                .attr('class', 'axis')
                .attr('id', 'xAxis')
                .attr("transform", "translate(" + 3 * this.margin.left + "," + xAxisHeightCorrected + ")")
                .call(xAxis)

            this.debugsvg.append('text')
                .attr('class', 'axisLabel')
                .attr('x', this.scatterWidth)
                .attr('y', this.yAxisHeight - this.margin.left * 1.5)
                .style('font-size', '10px')
                .style('text-anchor', 'end')
                .text("Diff")

            var yAxisLine = this.debugsvg.append('g')
                .attr('id', 'yAxis')
                .attr('class', 'axis')
                .attr('transform', "translate(" + 2 * this.margin.left + ", 0)")
                .call(yAxis)

            this.debugsvg.append("text")
                .attr('class', 'axisLabel')
                .attr('transform', 'rotate(-90)')
                .attr('x', 0)
                .attr('y', 1 * this.margin.left)
                .style("text-anchor", "end")
                .style("font-size", "10px")
                .text("Histogram count");

            let self = this
            var plotLine = d3.line()
                .curve(d3.curveMonotoneX)
                .x(function (d) {
                    return self.xScale(d.x);
                })
                .y(function (d) {
                    return self.yScale(d.y);
                });

            let kde_data = data[node][mode]
            let data_arr = []
            for (let i = 0; i < kde_data['x'].length; i++) {
                data_arr.push({
                    'x': kde_data['x'][i],
                    'y': kde_data['y'][i]
                })
            }
            var line = this.debugsvg.append("path")
                // .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
                .data([data_arr])
                .attr('class', 'debugLine')
                .attr("d", plotLine)
                .attr("stroke", (d) => {
                    if (mode == 'hist')
                        return "blue"
                    else
                        return 'red'
                })
                .attr("stroke-width", "2")
                .attr("fill", "none");
        },

        // Lines
        clearQuantileLines() {
            d3.selectAll('.quantileLines').remove()
        },

        quantileLines() {
            console.log("Drawing quantiles")
            let mode = this.$store.selectedDiffNodeAlignment
            let count = 0
            console.log(this.$store.graph.nodes)
            for (let i = 0; i < this.$store.graph.nodes.length; i++) {
                let node_data = this.$store.graph.nodes[i]
                let props = JSON.parse(JSON.stringify(node_data['props']))
                console.log(props)
                for (const [dataset, val] of Object.entries(props)) {
                    let x1 = node_data.x - this.nodeWidth
                    let x2 = node_data.x
                    let y1 = 0
                    let y2 = 0
                    if (mode == 'Middle') {
                        y1 = (node_data.height - val * node_data.height) * 0.5
                        y2 = node_data.height - y1
                        this.drawUpLine(y1, y2, node_data, dataset)
                        this.drawBottomLine(y1, y2, node_data, dataset)
                    } else if (mode == 'Top') {
                        let gap = 5
                        y1 = 0
                        count += 1
                        y2 = node_data.height * val
                        console.log(y1, y2)
                        this.drawBottomLine(y1, y2, node_data, dataset)
                    }
                }
            }
        },

        // Distance measure is either mean or max
        // quantileLines(data, dist_measure) {
        // let nodes = this.$store.graph.nodes
        // for (let i = 0; i < nodes.length; i += 1) {
        //     let node_name = nodes[i].name
        //     console.log(data, node_name, dist_measure)
        //     let dist_measure_data = data[node_name][dist_measure]
        //     let max_inc_time = Math.max.apply(null, data[node_name]['data_max'])
        //     for (let val in dist_measure_data) {
        //         if (dist_measure_data.hasOwnProperty(val)) {
        //             let y1 = 0
        //             let y2 = (dist_measure_data[val]*nodes[i].height)/max_inc_time
        //             console.log(y1, y2)
        //             this.drawBottomLine(y1, y2, nodes[i], val)
        //         }
        //     }
        // }
        // },

        drawUpLine(y1, y2, node_data, dataset) {
            d3.select('#dist-node_' + node_data['client_idx']).append('line')
                .attrs({
                    'class': 'quantileLines',
                    'id': 'line-1-' + dataset + '-' + node_data['client_idx'],
                    "x1": 0,
                    "y1": y1,
                    "x2": this.nodeWidth,
                    "y2": y1
                })
                .style('opacity', (d) => {
                    return 1
                })
                .style("stroke", this.$store.color.datasetColor[dataset])
                .style("stroke-width", (d) => {
                    return 3
                })

        },

        drawBottomLine(y1, y2, node_data, dataset) {
            d3.select('#dist-node_' + node_data['client_idx']).append('line')
                .attr("class", 'quantileLines')
                .attr("id", 'line-2-' + dataset + '-' + node_data['client_idx'])
                .attr("x1", 0)
                .attr("y1", y2)
                .attr("x2", this.nodeWidth)
                .attr("y2", y2)
                .attr("width", 10)

                // .style('opacity', (d) => {
                //     if (this.$store.selectedDataset == dataset) {
                //         return 1
                //     } else {
                //         return 0.8
                //     }
                // })
                .style("stroke", '#67a9cf')
                .style("stroke-width", (d) => {
                    if (this.$store.selectedDataset == dataset) {
                        return 3
                    } else {
                        return 3
                    }
                })
        },

        path() {
            this.nodesSVG.append('path')
                .attr('d', (d) => {
                    return `m${0} ${0
                        }h ${this.nodeWidth
                        }v ${(1) * 0
                        }h ${(-1) * this.nodeWidth}`;
                })
                .style('fill', (d) => {
                    return this.$store.color.getColor(d);
                })
                .style('fill-opacity', (d) => {
                    return 0;
                })
                .style('stroke-opacity', '0.0');

            this.nodes.selectAll('path')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .delay(this.transitionDuration / 3)
                .style('fill-opacity', (d) => {
                    return 1.0;
                });
        },

        textSize(text) {
            const container = d3.select('#' + this.$parent.id).append('svg');
            container.append('text')
                .attrs({
                    x: -99999,
                    y: -99999
                })
                .text((d) => text);
            const size = container.node().getBBox();
            container.remove();
            return {
                width: size.width,
                height: size.height
            };
        },

        trunc(str, n) {
            return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
        },

        text() {
            this.nodesSVG.append('text')
                .attr('dy', '0.35em')
                .attr('transform', 'rotate(90)')
                .attr('x', '5')
                .attr('y', '-10')
                .style('opacity', 1)
                .style('font-size', '14px')
                .text((d) => {
                    if (d.height < this.minHeightForText) {
                        return '';
                    }
                    var textSize = this.textSize(d.name)['width'];
                    console.log(d.name, textSize, d.height)
                    if (textSize < d.height) {
                        return d.name[0];
                    } else {
                        return this.trunc(d.name, Math.floor(d.height / 14))
                    }
                })
                .on('mouseover', function (d) {
                    // if (d.name[0] != 'intermediate') {
                    //     view.toolTipList.attr('width', '400px')
                    //         .attr('height', '150px');
                    //     d3.select(this.parentNode).select('rect').style('stroke-width', '2');
                    // }
                })
                .on('mouseout', function (d) {
                    // view.toolTipList.attr('width', '0px')
                    //     .attr('height', '0px');
                    // if (d.name[0] != 'intermediate') {
                    //     d3.select(this.parentNode).select('rect').style('stroke-width', '1');
                    //     //                unFade();
                    // }
                    // view.toolTip.style('opacity', 1)
                    //     .style('left', () => 0)
                    //     .style('top', () => 0);
                    // view.toolTipText.html('');
                    // view.toolTipG.selectAll('*').remove();
                });

            // Transition
            this.nodes.selectAll('text')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .style('opacity', 1)
                .style('fill', d => {
                    return '#000'
                    // return this.$store.color.setContrast(this.$store.color.getColor(d))
                })
                .text((d) => {
                    if (d.height < this.minHeightForText) {
                        return '';
                    }
                    var textSize = this.textSize(d.id.split('=')[0])['width'];
                    if (textSize < d.height) {
                        return d.id.split('=')[0];
                    }
                    return this.trunc(d.id.split('=')[0], Math.floor(d.height / 14));
                });
        },

        clear() {
            d3.selectAll('.dist-node').remove()
            this.$refs.ToolTip.clear()
        },

    }
}