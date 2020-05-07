import tpl from '../../html/ensembleSupergraph/nodes.html'
import * as d3 from 'd3'
import ToolTip from './nodeTooltip'
import EventHandler from '../EventHandler'
import * as utils from '../utils'

export default {
    template: tpl,
    name: 'EnsembleNodes',
    components: {
        ToolTip
    },
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
        stroke_width: 7,
        intermediateColor: '#d9d9d9',
        drawGuidesMap: {}
    }),
    sockets: {
        compare(data) {
            console.log("[Comparison] Data:", data)
            this.clearGradients()
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
            if (this.$store.selectedCompareMode == 'Rank-wise Differences') {
                this.$store.rankDiffColor.setColorScale(this.rank_min, this.rank_max, this.$store.selectedDistributionColorMap, this.$store.selectedColorPoint)
                this.$parent.$refs.EnsembleColorMap.update('rankDiff', data)
                this.setupDiffRuntimeGradients(data)
                this.rankDiffRectangle()
            }
            else if (this.$store.selectedCompareMode == 'Mean Differences') {
                let max_diff = Math.max(Math.abs(this.mean_diff_min), Math.abs(this.mean_diff_max))

                // this.$store.meanDiffColor.setColorScale(-1 * max_diff, max_diff, this.$store.selectedDistributionColorMap, this.$store.selectedColorPoint)
                // this.$parent.$refs.EnsembleColorMap.updateWithMinMax('meanDiff', -1 * max_diff, max_diff)

                this.$store.meanDiffColor.setColorScale(this.mean_diff_min, this.mean_diff_max, this.$store.selectedDistributionColorMap, this.$store.selectedColorPoint)
                this.$parent.$refs.EnsembleColorMap.updateWithMinMax('meanDiff', this.mean_diff_min, this.mean_diff_max)

                this.meanDiffRectangle(data)
            }
            this.clearPaths()
            d3.selectAll('.targetLines').remove()
            d3.selectAll('.histogram-bar-target').remove()
            d3.selectAll('#ensemble-edge-target').remove()

            // remove target legend
            d3.selectAll('.target-circle-legend').remove()
            d3.selectAll('.target-circle-legend-text').remove()
            // remove ensemble legend
            d3.selectAll('.ensemble-circle-legend').remove()
            d3.selectAll('.ensemble-circle-legend-text').remove()

            // remove colormap container

            d3.selectAll('.dist-colormap').remove()

        }
    },
    mounted() {
        this.id = 'ensemble-nodes'

        let self = this
        EventHandler.$on('update_diff_node_alignment', function () {
            self.clearQuantileLines()
        })
    },

    methods: {
        formatRunCounts(val) {
            if (val == 1) {
                return val + ' run';
            }
            else {
                return val + ' runs';
            }
        },

        init(graph) {
            this.graph = graph
            this.nodes = d3.select('#' + this.id)

            // https://observablehq.com/@geekplux/dragable-d3-sankey-diagram
            this.drag = d3.drag()
                .subject((d) => {
                    return d;
                })
                .on("start", function () {
                    this.parentNode.appendChild(this)
                })
                .on("drag", (d) => {
                    d3.select(`node_${d.client_idx}`).attr("transform",
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

            this.ensemble_module_data = this.$store.modules['ensemble']
            this.ensemble_callsite_data = this.$store.callsites['ensemble']

            this.visualize()
        },

        visualize() {
            this.graph.nodes = this.filterNodes(this.graph.nodes)
            this.setClientIds()
            this.meanColorScale()
            this.meanGradients()

            this.nodesSVG = this.nodes.selectAll('.ensemble-callsite')
                .data(this.graph.nodes)
                .enter().append('g')
                .attr('class', (d) => {
                    return 'ensemble-callsite'
                })
                .attr('opacity', 0)
                .attr('id', (d, i) => {
                    return 'ensemble-callsite-' + d.client_idx
                })
                .attr('transform', (d) => {
                    return `translate(${d.x},${d.y})`
                })

            this.nodes.selectAll('.ensemble-callsite')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .attr('opacity', 1)
                .attr('transform', d => `translate(${d.x},${d.y + this.$parent.ySpacing})`)


            this.meanRectangle()

            this.path()
            this.text()
            if (this.$store.showTarget) {
                this.drawTargetLine()
            }

            this.$refs.ToolTip.init(this.$parent.id)
        },

        // TODO: Remove this.
        setClientIds() {
            let idx = 0
            for (let node of this.graph.nodes) {
                this.nidNameMap[node.id] = idx
                node.client_idx = idx
                idx += 1
            }
        },

        filterNodes() {
            let ret = []
            let nodes = this.graph.nodes

            for (let node of nodes) {
                if (this.ensemble_module_data[node.module] != undefined) {
                    ret.push(node)
                }
            }
            return ret
        },

        meanColorScale() {
            let nodes = this.graph.nodes

            this.hist_min = 0
            this.hist_max = 0
            for (let node of nodes) {
                if (node.type == 'super-node') {
                    this.hist_min = Math.min(this.hist_min, this.ensemble_module_data[node.module][this.$store.selectedMetric]['gradients']['hist']['y_min'])
                    this.hist_max = Math.max(this.hist_max, this.ensemble_module_data[node.module][this.$store.selectedMetric]['gradients']['hist']['y_max'])
                }
                else if (node.type == 'component-node') {
                    this.hist_min = Math.min(this.hist_min, this.ensemble_callsite_data[node.name][this.$store.selectedMetric]['gradients']['hist']['y_min'])
                    this.hist_max = Math.max(this.hist_max, this.ensemble_callsite_data[node.name][this.$store.selectedMetric]['gradients']['hist']['y_max'])
                }
            }
            this.$store.binColor.setColorScale(this.hist_min, this.hist_max, this.$store.selectedDistributionColorMap, this.$store.selectedColorPoint)
            this.$parent.$refs.EnsembleColorMap.updateWithMinMax('bin', this.hist_min, this.hist_max)
        },

        meanGradients() {
            let nodes = this.graph.nodes

            for (let node of nodes) {
                var defs = d3.select('#ensemble-supergraph-overview')
                    .append("defs");

                this.linearGradient = defs.append("linearGradient")
                    .attr("id", "mean-gradient" + node.client_idx)
                    .attr("class", 'mean-gradient')

                this.linearGradient
                    .attr("x1", "0%")
                    .attr("y1", "0%")
                    .attr("x2", "0%")
                    .attr("y2", "100%");

                let grid = []
                let val = []
                if (node.type == 'super-node') {
                    // if (this.ensemble_module_data[node.module] != undefined) {
                    grid = this.ensemble_module_data[node.module][this.$store.selectedMetric]['gradients']['hist']['x']
                    val = this.ensemble_module_data[node.module][this.$store.selectedMetric]['gradients']['hist']['y']
                    // }
                }
                else if (node.type == 'component-node') {
                    // if (this.ensemble_callsite_data[node.name] != undefined) {
                    console.log(node.name)
                    grid = this.ensemble_callsite_data[node.name][this.$store.selectedMetric]['gradients']['hist']['x']
                    val = this.ensemble_callsite_data[node.name][this.$store.selectedMetric]['gradients']['hist']['y']

                    console.log(grid, val)
                    // }
                }
                else if (node.type == "intermediate") {
                    grid = []
                    val = []
                }

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
            d3.selectAll('.ensemble-callsite').remove()
        },

        meanRectangle() {
            let self = this
            this.nodesSVG.append('rect')
                .attrs({
                    'id': (d) => { return d.id + ' callsite-rect' + d.client_idx },
                    'class': 'callsite-rect',
                    'height': (d) => {
                        return d.height
                    },
                    'width': this.nodeWidth,
                    'opacity': 0,
                    'fill-opacity': (d) => {
                        if (d.type == "intermediate") {
                            return 0.0
                        }
                        else {
                            return 1.0;
                        }
                    }
                })
                .style('shape-rendering', 'crispEdges')
                .style('stroke', (d) => {
                    let runtimeColor = ''
                    if (d.type == "intermediate") {
                        runtimeColor = this.$store.color.ensemble
                    }
                    else if (d.type == 'component-node') {
                        if (this.$store.callsites[this.$store.selectedTargetDataset][d.id] != undefined) {
                            runtimeColor = d3.rgb(this.$store.color.getColor(d));
                        }
                        else {
                            runtimeColor = this.$store.color.ensemble
                        }
                    }
                    else if (d.type == 'super-node') {
                        if (this.$store.modules[this.$store.selectedTargetDataset][d.id] != undefined) {
                            runtimeColor = d3.rgb(this.$store.color.getColor(d));
                        }
                        else {
                            runtimeColor = this.$store.color.ensemble
                        }
                    }
                    return runtimeColor
                })
                .style('stroke-width', (d) => {
                    if (d.type == "intermediate") {
                        return 1
                    }
                    else {
                        return this.stroke_width;
                    }
                })
                .on('click', (d) => {
                    if (!this.drawGuidesMap[d.id]) {
                        this.drawGuides(d, 'permanent')
                        this.drawGuidesMap[d.id] = true
                    }
                    d3.selectAll('.ensemble-edge')
                        .style('opacity', 0.3)

                    this.$store.selectedNode = d
                    this.$store.selectedModule = d.module
                    this.$store.selectedName = d.name

                    this.$socket.emit('module_hierarchy', {
                        module: this.$store.selectedModule,
                        name: this.$store.selectedName,
                        datasets: this.$store.selectedDatasets,
                    })

                    EventHandler.$emit('ensemble_histogram', {
                        module: this.$store.selectedModule,
                        datasets: this.$store.selectedDatasets,
                    })

                    EventHandler.$emit('ensemble_distribution', {
                        module: this.$store.selectedModule,
                        datasets: this.$store.selectedDatasets,
                    })

                    EventHandler.$emit('ensemble_scatterplot', {
                        module: this.$store.selectedModule,
                        dataset1: this.$store.selectedDatasets,
                    })

                    this.$socket.emit('ensemble_auxiliary', {
                        module: this.$store.selectedModule,
                        datasets: this.$store.selectedDatasets,
                        sortBy: this.$store.auxiliarySortBy,
                    })

                    EventHandler.$emit('select_module', {
                        module: this.$store.selectedModule,
                    })
                })
                .on('dblclick', (d) => {
                    d3.selectAll('.ensemble-edge')
                        .style('opacity', 1.0)

                    this.permanentGuides = true
                    this.drawGuides(d, 'permanent')
                    this.drawGuidesMap[d.id] = true
                })
                .on('mouseover', (d) => {
                    self.$refs.ToolTip.render(self.graph, d)
                    // this.$store.selectedNode = d
                    // this.$store.selectedModule = d.module

                    // EventHandler.$emit('highlight_module', {
                    //     module: this.$store.selectedModule,
                    // })

                    this.drawGuides(d, 'temporary')
                })
                .on('mouseout', (d) => {
                    self.$refs.ToolTip.clear()

                    // EventHandler.$emit('unhighlight_module')

                    this.clearGuides('temporary')
                    if (this.permanentGuides == false) {
                        d3.selectAll('.ensemble-edge')
                            .style('opacity', 1.0)
                    }
                })

            // Transition
            this.nodes.selectAll('rect')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .attrs({
                    'opacity': d => {
                        if (d.type == "intermediate") {
                            return 0.0
                        }
                        else {
                            return 1.0;
                        }
                    },
                    'height': (d) => {
                        if (d.id == "LeapFrog") {
                            return 352.328692
                        }
                        else {
                            return d.height;
                        }
                    },
                })
                .style("fill", (d, i) => {
                    if (d.type == "intermediate") {
                        // return this.$store.intermediateColor
                        return this.$store.color.target
                    }
                    else if (d.type == 'super-node') {
                        if (this.$store.modules[this.$store.selectedTargetDataset][d.id] == undefined) {
                            return this.intermediateColor
                        }
                        else {
                            return "url(#mean-gradient" + d.client_idx + ")"
                        }
                    }
                    else if (d.type == 'component-node') {
                        if (this.$store.callsites[this.$store.selectedTargetDataset][d.name] == undefined) {
                            return this.intermediateColor
                        }
                        else {
                            return "url(#mean-gradient" + d.client_idx + ")"
                        }
                    }
                })
        },

        rankDiffRectangle() {
            // Transition
            this.nodes.selectAll('.callsite-rect')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .attrs({
                    'opacity': d => {
                        return 1;
                    },
                    'height': d => d.height
                })
                .style('stroke', (d) => {
                    return 1;
                })
                .style("fill", (d, i) => {
                    return "url(#diff-gradient-" + d.client_idx + ")"
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
                d3.select('#ensemble-callsite-' + this.nidNameMap[node])
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

                d3.select('#ensemble-callsite-' + this.nidNameMap[node])
                    .append('text')
                    .attrs({
                        'class': 'zeroLineText',
                        'dy': '0',
                        'x': this.nodeWidth / 2 - 10,
                        'y': (d) => y1 * d.height - 5
                    })
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
                console.log(d)
                var defs = d3.select('#ensemble-supergraph-overview')
                    .append("defs");

                this.diffGradient = defs.append("linearGradient")
                    .attrs({
                        "id": "diff-gradient-" + this.nidNameMap[d.name],
                        "class": 'linear-gradient'
                    })

                this.diffGradient
                    .attrs({
                        "x1": "0%",
                        "y1": "0%",
                        "x2": "0%",
                        "y2": "100%"
                    })

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
                        .attrs({
                            "offset": 100 * x + "%",
                            "stop-color": this.$store.rankDiffColor.getColorByValue((val[i]))
                        })
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
            this.nodes.selectAll('.callsite-rect')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .attrs({
                    'opacity': d => {
                        return 1;
                    },
                    'height': d => {
                        if (d.id == "LeapFrog") {
                            return 352.328692
                        }
                        else {
                            return d.height;
                        }
                    },
                })
                .style('stroke', (d) => {
                    return 1;
                })
                .style("fill", (d, i) => {
                    let color = d3.rgb(this.$store.meanDiffColor.getColorByValue((mean_diff[d.module])))
                    return color
                })
        },

        renderTargetLine(data, node_data, node_name) {
            let gradients = data['ensemble'][node_name][this.$store.selectedMetric]['gradients']

            let targetPos = gradients['dataset']['position'][this.$store.selectedTargetDataset] + 1
            let binWidth = node_data.height / (this.$store.selectedRunBinCount)

            let y = 0
            if (node_name == 'LeapFrog') {
                y = binWidth * targetPos - binWidth / 2 - 10
            }
            else {
                y = binWidth * targetPos - binWidth / 2
            }

            d3.select('#ensemble-callsite-' + node_data.client_idx)
                .append('line')
                .attrs({
                    "class": 'targetLines',
                    "id": 'line-2-' + this.$store.selectedTargetDataset + '-' + node_data['client_idx'],
                    "x1": 0,
                    "y1": y,
                    "x2": this.nodeWidth,
                    "y2": y,
                    "stroke-width": 5,
                    "stroke": this.$store.color.target
                })
        },

        drawTargetLine() {
            let targetDataset = this.$store.selectedTargetDataset
            let data = {}
            let node_name = ''

            for (let i = 0; i < this.graph.nodes.length; i++) {
                let node_data = this.graph.nodes[i]
                if (this.graph.nodes[i].type == 'super-node' && this.$store.modules[targetDataset][node_data["module"]] != undefined) {
                    node_name = this.graph.nodes[i].module
                    data = this.$store.modules
                    this.renderTargetLine(data, node_data, node_name)
                }
                else if (this.graph.nodes[i].type == 'component-node' && this.$store.callsites[targetDataset][node_data["name"]] != undefined) {
                    node_name = this.graph.nodes[i].name
                    data = this.$store.callsites
                    this.renderTargetLine(data, node_data, node_name)
                }
                else {

                }
            }
        },

        clearGuides(type) {
            d3.selectAll('.gradientGuides-' + type).remove()
            d3.selectAll('.gradientGuidesText-' + type).remove()
        },

        drawGuides(node_data, type) {
            let modules_data = this.$store.modules
            let callsite_data = this.$store.callsites

            let node_name = ''
            let gradients = {}
            if (node_data.type == 'super-node') {
                node_name = node_data.module
                gradients = modules_data['ensemble'][node_name][this.$store.selectedMetric]['gradients']
            }
            else if (node_data.type == 'component-node') {
                node_name = node_data.name
                gradients = callsite_data['ensemble'][node_name][this.$store.selectedMetric]['gradients']
            }
            else {
                gradients = {}
            }

            let histogram = gradients['hist']
            let datasetPositionMap = gradients['dataset']['position']

            let grid = histogram.x
            let vals = histogram.y

            let targetPos = 0
            let binWidth = node_data.height / (grid.length)

            let positionDatasetMap = {}
            // Create a position -> dataset map
            for (let dataset in datasetPositionMap) {
                let datasetPosition = datasetPositionMap[dataset]
                if (positionDatasetMap[datasetPosition] == undefined) {
                    positionDatasetMap[datasetPosition] = []
                }
                positionDatasetMap[datasetPosition].push(dataset)
            }

            this.guidesG = d3.select('#ensemble-callsite-' + node_data.client_idx)
                .append('g')

            for (let idx = 0; idx < grid.length; idx += 1) {
                let y = binWidth * (idx)

                d3.selectAll('.ensemble-edge')
                    .style('opacity', 0.5)

                // For drawing the guide lines that have the value.
                this.guidesG
                    .append('line')
                    .attrs({
                        "class": 'gradientGuides-' + type,
                        "id": 'line-2-' + node_data['client_idx'],
                        "x1": 0,
                        "y1": y,
                        "x2": this.nodeWidth,
                        "y2": y,
                        "stroke-width": 1.5,
                        'opacity': 0.3,
                        "stroke": '#202020'
                    })

                let fontSize = 12
                if (vals[idx] != 0) {
                    // For placing the run count values.
                    // for (let i = 0; i < positionDatasetMap[idx].length; i += 1) {
                    let textGuideType = 'summary'
                    let leftSideText = ''
                    if (textGuideType == 'detailed') {
                        let text = positionDatasetMap[idx][0]
                        if (positionDatasetMap[idx].length < 3) {
                            for (let i = 0; i < 3; i += 1) {
                                leftSideText = positionDatasetMap[idx][i]
                                this.guidesG
                                    .append('text')
                                    .attrs({
                                        "class": 'gradientGuidesText-' + type,
                                        "id": 'line-2-' + node_data['client_idx'],
                                        "x": -60,
                                        "y": y + fontSize / 2 + binWidth / 2 + fontSize * i,
                                        'fill': 'black'
                                    })
                                    .style('z-index', 100)
                                    .style('font-size', fontSize + 'px')
                                    .text(leftSideText)

                            }
                        }
                        else {
                            let count = positionDatasetMap[idx].length - 3
                            text = text + '+' + count

                            this.guidesG
                                .append('text')
                                .attrs({
                                    "class": 'gradientGuidesText-' + type,
                                    "id": 'line-2-' + node_data['client_idx'],
                                    "x": -60,
                                    "y": y + fontSize / 2 + binWidth / 2 + fontSize * i,
                                    'fill': 'black'
                                })
                                .style('z-index', 100)
                                .style('font-size', fontSize + 'px')
                                .text(leftSideText)
                        }

                    }
                    else if (textGuideType == 'summary') {
                        leftSideText = this.formatRunCounts(vals[idx])
                        this.guidesG
                            .append('text')
                            .attrs({
                                "class": 'gradientGuidesText-' + type,
                                "id": 'line-2-' + node_data['client_idx'],
                                "x": -60,
                                "y": y + fontSize / 2 + binWidth / 2, //+ fontSize * i,
                                'fill': 'black'
                            })
                            .style('z-index', 100)
                            .style('font-size', fontSize + 'px')
                            .text(leftSideText)
                    }



                    // For placing the runtime values.
                    if (idx != 0 && idx != grid.length - 1) {
                        let text = utils.formatRuntimeWithUnits(grid[idx]) //+ this.formatRunCounts(vals[idx])
                        this.guidesG
                            .append('text')
                            .attrs({
                                "class": 'gradientGuidesText-' + type,
                                "id": 'line-2-' + node_data['client_idx'],
                                "x": this.nodeWidth + 10,
                                "y": y + fontSize / 2,
                                'fill': 'black'
                            })
                            .style('z-index', 100)
                            .style('font-size', fontSize + 'px')
                            .text(text)
                    }
                }

                if (idx == 0) {
                    this.guidesG
                        .append('text')
                        .attrs({
                            "class": 'gradientGuidesText-' + type,
                            "id": 'line-2-' + node_data['client_idx'],
                            "x": this.nodeWidth + 10,
                            "y": y,
                            'fill': 'black'
                        })
                        .style('z-index', 100)
                        .style('font-size', fontSize + 'px')
                        .text('Min. = ' + utils.formatRuntimeWithUnits(grid[idx]))
                }
                else if (idx == grid.length - 1) {
                    this.guidesG
                        .append('text')
                        .attrs({
                            "class": 'gradientGuidesText-' + type,
                            "id": 'line-2-' + node_data['client_idx'],
                            "x": this.nodeWidth + 10,
                            "y": y + 2 * binWidth,
                            'fill': 'black'
                        })
                        .style('z-index', 100)
                        .style('font-size', fontSize + 'px')
                        .text('Max. = ' + utils.formatRuntimeWithUnits(grid[idx]))
                }
            }
        },

        path() {
            this.nodesSVG.append('path')
                .attrs({
                    'class': 'ensemble-path',
                    'd': (d) => {
                        if (d.type == "intermediate") {
                            return "m" + 0 + " " + 0
                                + "h " + this.nodeWidth
                                + "v " + (1) * d.height
                                + "h " + (-1) * this.nodeWidth;
                        }
                    }
                })
                .style('fill', (d) => {
                    if (d.type == "intermediate") {
                        // return this.$store.color.ensemble
                        return this.intermediateColor

                    }
                })
                .style('opacity', (d) => {
                    if (this.$store.showTarget && this.$store.compareAnalysisMode == false) {
                        return 0.5
                    }
                    return 1
                })
                .style('fill-opacity', (d) => {
                    if (d.type == "intermediate") {
                        return 0.0;
                    }
                    else {
                        return 0;
                    }
                })
                .style("stroke", function (d) {
                    if (d.type == "intermediate") {
                        return this.intermediateColor
                    }
                })
                .style('stroke-opacity', '0.0');


            this.nodes.selectAll('.ensemble-path')
                .data(this.graph.nodes)
                .transition()
                .duration(this.transitionDuration)
                .delay(this.transitionDuration / 3)
                .style('fill-opacity', (d) => {
                    return 1.0;
                });
            console.log(this.$store.comparisonMode)
            if (this.$store.showTarget && this.$store.comparisonMode == false) {
                this.nodesSVG.append('path')
                    .attrs({
                        'class': 'target-path',
                        'd': (d) => {
                            if (d.type == "intermediate") {
                                return "m" + 0 + " " + 0
                                    + "h " + this.nodeWidth
                                    + "v " + (1) * d.targetHeight
                                    + "h " + (-1) * this.nodeWidth;
                            }
                        }
                    })
                    .style('fill', (d) => {
                        if (d.type == "intermediate") {
                            return this.$store.color.target
                        }
                    })
                    .style('opacity', (d) => {
                        return 0.6
                    })
                    .style('fill-opacity', (d) => {
                        if (d.type == "intermediate") {
                            return 0.0;
                        }
                        else {
                            return 0;
                        }
                    })
                    .style("stroke", function (d) {
                        if (d.type == "intermediate") {
                            return this.intermediateColor
                        }
                    })
                    .style('stroke-opacity', '0.0');

                this.nodes.selectAll('.target-path')
                    .data(this.graph.nodes)
                    .transition()
                    .duration(this.transitionDuration)
                    .delay(this.transitionDuration / 3)
                    .style('fill-opacity', (d) => {
                        return 1.0;
                    });
            }
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
                .attrs({
                    'dy': '0.35em',
                    'transform': 'rotate(90)',
                    'x': '5',
                    'y': '-11.5'
                })
                .style('opacity', 1)
                .style('font-size', '18px')
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
                    let node_name = ''
                    if (d.id.split('_')[0] != "intermediate") {
                        if (d.height < this.minHeightForText) {
                            return '';
                        }

                        if (d.id.indexOf('=') > -1) {
                            node_name = d.id.split('=')[1]
                        }
                        else {
                            node_name = d.id
                        }

                        var textSize = this.textSize(node_name)['width'];
                        if (textSize < d.height) {
                            return node_name;
                        }
                        return this.trunc(node_name, Math.floor(d.height / 14));
                    }
                });
        },

        clearPaths() {
            d3.selectAll('.target-path').remove()
        },

        clear() {
            d3.selectAll('.ensemble-callsite').remove()
            d3.selectAll('.targetLines').remove()
            this.clearGradients()
            this.clearPaths()
            this.$refs.ToolTip.clear()
        },
    }
}