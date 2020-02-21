import tpl from '../../html/ensembleSupergraph/nodes.html'
import * as d3 from 'd3'
import ToolTip from './tooltip'
import EventHandler from '../EventHandler'

export default {
    template: tpl,
    name: 'DistNodes',
    components: {
        ToolTip
    },
    props: [],
    data: () => ({
        currentNodeLevel: {},
        nodeWidth: 50,
        transitionDuration: 1000,
        nodeHeights: {},
        minHeightForText: 15,
        textTruncForNode: 25,
        id: '',
        graph: null,
        nidNameMap: {},
        renderZeroLine: {},
        stroke_width: 7
    }),
    sockets: {
        compare(data) {
            console.log("[Comparison] Data:", data)
            this.clearGradients()
            this.clearQuantileLines()
            this.clearZeroLine()
            this.renderZeroLine = {}

            this.rank_min = 0
            this.rank_max = 0
            this.mean_min = 0
            this.mean_max = 0
            this.mean_diff_min = 0
            this.mean_diff_max = 0

            for (let i = 0; i < data.length; i += 1) {
                if (this.$store.selectedMetric == 'Inclusive') {
                    this.rank_min = Math.min(this.rank_min, data[i]['hist']['y_min'])
                    this.rank_max = Math.max(this.rank_max, data[i]['hist']['y_max'])
                    this.mean_min = Math.min(this.mean_min, data[i]['hist']['x_min'])
                    this.mean_max = Math.max(this.mean_max, data[i]['hist']['x_max'])
                    this.mean_diff_min = Math.min(this.mean_diff_min, data[i]['mean_diff'])
                    this.mean_diff_max = Math.max(this.mean_diff_max, data[i]['mean_diff'])
                }
                else if (this.$store.selectedMetric == 'Exclusive') {
                    this.rank_min = Math.min(this.rank_min, data[i]['hist']['y_min'])
                    this.rank_max = Math.max(this.rank_max, data[i]['hist']['y_max'])
                    this.mean_min = Math.min(this.mean_min, data[i]['hist']['x_min'])
                    this.mean_max = Math.max(this.mean_max, data[i]['hist']['x_max'])
                    this.mean_diff_min = Math.min(this.mean_diff_min, data[i]['mean_diff'])
                    this.mean_diff_max = Math.max(this.mean_diff_max, data[i]['mean_diff'])
                }
            }

            if (this.$store.selectedCompareMode == 'rankDiff') {
                this.$store.rankDiffColor.setColorScale(this.rank_min, this.rank_max, this.$store.selectedDistributionColorMap, this.$store.selectedColorPoint)
                this.$parent.$refs.DistColorMap.update('rankDiff', data)
                this.setupDiffRuntimeGradients(data)
                this.rankDiffRectangle()
            }
            else if (this.$store.selectedCompareMode == 'meanDiff') {
                console.log(this.mean_diff_min, this.mean_diff_max)
                this.$store.meanDiffColor.setColorScale(this.mean_diff_min, this.mean_diff_max, this.$store.selectedDistributionColorMap, this.$store.selectedColorPoint)
                this.$parent.$refs.DistColorMap.updateWithMinMax('meanDiff', this.mean_diff_min, this.mean_diff_max)
                this.meanDiffRectangle(data)
            }
        }
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
                    sankey.relayout();
                    link.attr("d", path);
                })

            this.zoom = d3.zoom()
                .scaleExtent([0.5, 2])
                .on('zoom', () => {
                    let tx = Math.min(0, Math.min(d3.event.transform.x, this.width * d3.event.transform.k))
                    let ty = Math.min(0, Math.min(d3.event.transform.y, this.height * d3.event.transform.k))
                    this.sankeySVG.attr("transform", "translate(" + [tx, ty] + ")scale(" + d3.event.transform.k + ")")
                });


            this.nodesSVG = this.nodes.selectAll('.dist-node')
                .data(this.graph.nodes)
                .enter().append('g')
                .attr('class', (d) => {
                    return 'dist-node'
                })
                .attr('opacity', 0)
                .attr('id', (d, i) => `dist-node_${this.graph.nodeMap[d['name']]}`)
                .attr('transform', (d) => {
                    return `translate(${d.x},${d.y})`
                })

            this.nodes.selectAll('.dist-node')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .attr('opacity', 1)
                .attr('transform', d => `translate(${d.x},${d.y + this.$parent.ySpacing})`)

            this.meanRectangle()
            this.path()
            this.text()
            // this.drawTargetLine()

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

        setupMeanGradients(data) {
            let method = 'hist'
            this.hist_min = 0
            this.hist_max = 0
            console.log(this.$store.selectedMetric, data)
            for (let d in data) {
                this.hist_min = Math.min(this.hist_min, data[d][this.$store.selectedMetric]['hist']['y_min'])
                this.hist_max = Math.max(this.hist_max, data[d][this.$store.selectedMetric]['hist']['y_max'])
            }
            this.$store.binColor.setColorScale(this.hist_min, this.hist_max, this.$store.selectedDistributionColorMap, this.$store.selectedColorPoint)
            this.$parent.$refs.DistColorMap.updateWithMinMax('bin', this.hist_min, this.hist_max)

            for (let d in data) {
                var defs = d3.select('#ensemble-supergraph-overview')
                    .append("defs");

                this.linearGradient = defs.append("linearGradient")
                    .attr("id", "mean-gradient" + this.nidNameMap[d])
                    .attr("class", 'mean-gradient')

                this.linearGradient
                    .attr("x1", "0%")
                    .attr("y1", "0%")
                    .attr("x2", "0%")
                    .attr("y2", "100%");

                let min_val = data[d][this.$store.selectedMetric][method]['y_min']
                let max_val = data[d][this.$store.selectedMetric][method]['y_max']

                let grid = data[d][this.$store.selectedMetric][method]['x']
                let val = data[d][this.$store.selectedMetric][method]['y']


                for (let i = 0; i < grid.length; i += 1) {
                    let x = (i + i + 1) / (2 * grid.length)
                    let current_value = (val[i])
                    this.linearGradient.append("stop")
                        .attr("offset", 100 * x + "%")
                        .attr("stop-color", this.$store.binColor.getColorByValue(current_value))
                }
            }
        },

        clearRectangle() {
            d3.selectAll('.dist-callsite').remove()
        },

        meanRectangle() {
            let self = this
            this.nodesSVG.append('rect')
                .attr('class', 'dist-callsite')
                .attr('id', (d) => 'callsite-' + d.client_idx)
                .attr('height', (d) => {
                    this.currentNodeLevel[d.mod_index] = 0;
                    this.nodeHeights[d.n_index] = d.height;
                    return d.height;
                })
                .attr('width', this.nodeWidth)
                .attr('opacity', 0)
                .style('fill-opacity', (d) => {
                    if (d.id.split('_')[0] == "intermediate") {
                        return 0.0
                    }
                    else {
                        return 1.0;
                    }
                })
                .style('shape-rendering', 'crispEdges')
                .style('stroke', (d) => {
                    if (d.id.split('_')[0] == "intermediate") {
                        return this.$store.color.ensemble
                    }
                    else {
                        return d3.rgb(this.$store.color.getColor(d));
                    }
                })
                .style('stroke-width', (d) => {
                    if (d.id.split('_')[0] == "intermediate") {
                        return 0
                    }
                    else {
                        return this.stroke_width;
                    }
                })
                .on('click', (d) => {
                    this.$store.selectedNode = d
                    this.$store.selectedModule = d.module
                    this.$store.selectedName = d.name

                    this.$socket.emit('module_hierarchy', {
                        module: this.$store.selectedModule,
                        name: this.$store.selectedName,
                        datasets: this.$store.runNames,
                    })

                    EventHandler.$emit('ensemble_histogram', {
                        module: this.$store.selectedModule,
                        datasets: this.$store.runNames,
                    })

                    EventHandler.$emit('ensemble_distribution', {
                        module: this.$store.selectedModule,
                        datasets: this.$store.runNames,
                    })

                    this.$socket.emit('ensemble_auxiliary', {
                        module: this.$store.selectedModule,
                        datasets: this.$store.runNames,
                        sortBy: this.$store.auxiliarySortBy,
                    })
                })
                .on('mouseover', (d) => {
                    self.$refs.ToolTip.render(self.graph, d)
                    this.$store.selectedNode = d
                })
                .on('mouseout', (d) => {
                    self.$refs.ToolTip.clear()
                })

            // Transition
            this.nodes.selectAll('rect')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .attr('opacity', d => {
                    if (d.id.split('_')[0] == "intermediate") {
                        return 0.0
                    }
                    else {
                        return 1.0;
                    }
                })
                .attr('height', d => d.height)
                .style("fill", (d, i) => {
                    if (d.id.split('_')[0] == "intermediate") {
                        return this.$store.color.ensemble
                    }
                    else{
                        return "url(#mean-gradient" + d.client_idx + ")"
                    }
                })
        },

        rankDiffRectangle() {
            // Transition
            this.nodes.selectAll('.dist-callsite')
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
                    return "url(#diff-gradient" + d.client_idx + ")"
                })
        },

        //Gradients
        clearGradients() {
            d3.selectAll('.mean-gradient').remove()
        },

        clearZeroLine() {
            d3.selectAll('.zeroLine').remove()
            d3.selectAll('.zeroLineText').remove()
        },

        zeroLine(node, y1) {
            if (this.renderZeroLine[node] == undefined) {
                d3.select('#dist-node_' + this.nidNameMap[node])
                    .append('line')
                    .attrs((d) => {
                        return {
                            'class': 'zeroLine',
                            "x1": 0,
                            "y1": y1 * d.height,
                            "x2": this.nodeWidth,
                            "y2": y1 * d.height
                        }
                    })
                    .style('opacity', (d) => {
                        return 1
                    })
                    .style("stroke", '#000')
                    .style("stroke-width", (d) => {
                        return 5
                    })

                d3.select('#dist-node_' + this.nidNameMap[node])
                    .append('text')
                    .attr('class', 'zeroLineText')
                    .attr('dy', '0')
                    .attr('x', this.nodeWidth / 2 - 10)
                    .attr('y', (d) => y1 * d.height - 5)
                    .style('opacity', 1)
                    .style('font-size', '20px')
                    .text((d) => {
                        return 0
                    })
                this.renderZeroLine[node] = true
            }
            else {
            }
        },

        setupDiffRuntimeGradients(data) {
            let method = 'hist'
            for (let i = 0; i < data.length; i += 1) {
                let d = data[i]
                var defs = d3.select('#ensemble-supergraph-overview')
                    .append("defs");

                this.diffGradient = defs.append("linearGradient")
                    .attr("id", "diff-gradient" + this.nidNameMap[d['name']])
                    .attr("class", 'linear-gradient')

                this.diffGradient
                    .attr("x1", "0%")
                    .attr("y1", "0%")
                    .attr("x2", "0%")
                    .attr("y2", "100%");

                let min_val = d[method]['y_min']
                let max_val = d[method]['y_max']

                let grid = d[method]['x']
                let val = d[method]['y']

                for (let i = 0; i < grid.length; i += 1) {
                    let x = (i + i + 1) / (2 * grid.length)

                    if (grid[i + 1] > 0) {
                        let zero = (i + i + 3) / (2 * grid.length)
                        this.zeroLine(d['name'], zero)
                    }
                    this.diffGradient.append("stop")
                        .attr("offset", 100 * x + "%")
                        .attr("stop-color", this.$store.rankDiffColor.getColorByValue((val[i])))
                }
            }
        },

        normalize(min, max) {
            var delta = max - min;
            return function (val) {
                return (val - min) / delta;
            };
        },

        meanDiffRectangle(diff) {
            let self = this
            let mean_diff = {}
            let max_diff = 0
            let min_diff = 0
            for (let i = 0; i < diff.length; i += 1) {
                let d = diff[i]['mean_diff']
                let callsite = diff[i]['name']
                mean_diff[callsite] = d
                max_diff = Math.max(d, max_diff)
                min_diff = Math.min(d, min_diff)
            }

            // Transition
            this.nodes.selectAll('.dist-callsite')
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
                    if (max_diff == 0 && min_diff == 0) {
                        return this.$store.meanDiffColor.getColorByValue(0.5)
                    }
                    return this.$store.meanDiffColor.getColorByValue((mean_diff[d.name]))
                })
        },

        // Lines
        // Not being used.
        clearQuantileLines() {
            d3.selectAll('.quantileLines').remove()
        },

        quantileLines() {
            let mode = this.$store.selectedDiffNodeAlignment
            for (let i = 0; i < this.$store.graph.nodes.length; i++) {
                let node_data = this.$store.graph.nodes[i]
                let props = JSON.parse(JSON.stringify(node_data['props']))
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
                        this.drawBottomLine(y1, y2, node_data, dataset)
                    }
                }
            }
        },

        quantileLine(d) {
            let mode = this.$store.selectedDiffNodeAlignment
            for (let i = 0; i < this.$store.graph.nodes.length; i++) {
                if (d == this.$store.graph.nodes[i]) {
                    let node_data = this.$store.graph.nodes[i]
                    let props = JSON.parse(JSON.stringify(node_data['props']))
                    for (const [dataset, val] of Object.entries(props)) {
                        if (dataset != 'xid' && dataset != 'union') {
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
                                y2 = node_data.height * val
                                this.drawBottomLine(y1, y2, node_data, dataset)
                            }
                        }
                    }
                }
            }
        },

        // come back and remove the dependence on node_data from this.$graph.
        drawTargetLine(d) {
            let mode = this.$store.selectedDiffNodeAlignment
            let dataset = this.$store.selectedTargetDataset
            for (let i = 0; i < this.$store.graph.nodes.length; i++) {
                let callsite_name = this.$store.graph.nodes[i].name
                let node_data = this.$store.graph.nodes[i]
                console.log(this.$store.callsites)
                if (this.$store.callsites[dataset][callsite_name] != undefined) {
                    console.log(callsite_name)
                    let mean_inclusive_data = this.$store.callsites[dataset][callsite_name]['mean_time (inc)']
                    let max_inclusive_data = this.$store.callsites['ensemble'][callsite_name]['max_time (inc)']

                    let x1 = node_data.x - this.nodeWidth
                    let x2 = node_data.x
                    let y1 = 0
                    let y2 = (node_data.height * mean_inclusive_data) / max_inclusive_data

                    d3.select('#dist-node_' + this.graph.nodeMap[node_data['name']])
                        .append('line')
                        .attr("class", 'targetLines')
                        .attr("id", 'line-2-' + dataset + '-' + node_data['client_idx'])
                        .attr("x1", 0)
                        .attr("y1", y2)
                        .attr("x2", this.nodeWidth)
                        .attr("y2", y2)
                        .attr("stroke-width", 5)
                        .attr("stroke", this.$store.color.target)
                }
            }

        },

        path() {
            this.nodesSVG.append('path')
                .attr('d', (d) => {
                    if (d.id.split('_')[0] == "intermediate") {
                        return "m" + 0 + " " + 0
                            + "h " + this.nodeWidth
                            + "v " + (1) * d.height
                            + "h " + (-1) * this.nodeWidth;
                    }
                })
                .style('fill', (d) => {
                    if (d.id.split('_')[0] == "intermediate") {
                        return this.$store.color.ensemble
                    }
                })
                .style('fill-opacity', (d) => {
                    if (d.id.split('_')[0] == "intermediate") {
                        return 0.0;
                    }
                    else {
                        return 0;
                    }
                })
                .style("stroke", function (d) {
                    if (d.id.split('_')[0] == "intermediate") {
                        return 'grey'
                    }
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
                    return '';
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
                })
                .text((d) => {
                    if (d.id.split('_')[0] != "intermediate") {

                        if (d.height < this.minHeightForText) {
                            return '';
                        }
                        var textSize = this.textSize(d.id.split('=')[0])['width'];
                        if (textSize < d.height) {
                            return d.id.split('=')[0];
                        }
                        return this.trunc(d.id.split('=')[0], Math.floor(d.height / 14));
                    }
                });
        },

        clear() {
            d3.selectAll('.dist-node').remove()
            d3.selectAll('.targetLines').remove()
            this.clearGradients()
            this.$refs.ToolTip.clear()
        },

    }
}