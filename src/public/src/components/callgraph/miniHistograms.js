import tpl from '../../html/callgraph/miniHistograms.html'
import * as d3 from 'd3'
import 'd3-selection-multi'

export default {
    template: tpl,
    name: 'MiniHistograms',
    components: {},
    props: [],
    data: () => ({
        view: {},
        xScale: [],
        yScale: [],
        vals: [],
        freq: {},
        data: [],
        minimapXScale: null,
        minimapYScale: null,
        selectedColorBy: "Inclusive",
        numbOfBins: 5,
        padding: {
            top: 0, left: 0, right: 0, bottom: 10
        },
        nodeScale: 0.99,
    }),

    sockets: {
        miniHistogram(data) {
            data = JSON.parse(data)
            for (const [key, value] of Object.entries(data)) {
                let node = this.getNode(key)
                data = JSON.parse(value)
                this.drawHistogram(data, node)
            }

        }
    },

    methods: {
        init(graph, view) {
            this.graph = graph
            this.view = view
            this.$socket.emit('miniHistogram', {
                'dataset1': 'osu_bw',
            })

        },

        getNode(node_name) {
            let ret = {}
            for (let i = 0; i < this.graph.nodes.length; i += 1) {
                let node = this.graph.nodes[i]
                if (node.name == node_name) {
                    return node
                }
            }
        },

        array_unique(arr) {
            return arr.filter(function (value, index, self) { 
              return self.indexOf(value) === index;
            })
        },

        dataProcess(data) {
            const xVals = [];
            const freq = [];
            const dataSorted = []
            let attr_data = {}

            if (this.selectedColorBy == 'Inclusive') {
                attr_data = data['time (inc)']
            } else if (this.selectedColorBy == 'Exclusive') {
                attr_data = data['time']
            } else if (this.selectedColorBy == 'Name') {
                attr_data = data['rank']
            } else if (this.selectedColorBy == 'Imbalance') {
                attr_data = data['imbalance']
            }

            let ranks = data['rank'][0]
            this.MPIcount = this.array_unique(ranks).length
            for (let i = 0; i < attr_data[0].length; i += 1) {
                for (const [key, value] in Object.entries(attr_data)) {
                    if (dataSorted[i] == undefined) {
                        dataSorted[i] = 0
                    }
                    dataSorted[i] += attr_data[0][i]
                }
            }

            dataSorted.sort((a, b) => a - b)
            const dataMin = dataSorted[0];
            const dataMax = dataSorted[dataSorted.length - 1];

            const dataWidth = ((dataMax - dataMin) / this.numbOfBins);
            for (let i = 0; i < this.numbOfBins; i++) {
                xVals.push(i);
                freq.push(0);
            }

            dataSorted.forEach((val, idx) => {
                let pos = Math.floor((val - dataMin) / dataWidth);
                if (pos >= this.numbOfBins) {
                    pos = this.numbOfBins - 1;
                }
                freq[pos] += 1;
            });

            return [xVals, freq];
        },

        clear() {
            d3.selectAll('#histobars').remove()
        },

        drawHistogram(data, node) {
            const temp = this.dataProcess(data)
            let xVals = temp[0]
            let freq = temp[1]

            this.minimapXScale = d3.scaleBand()
                .domain(xVals)
                .rangeRound([0, this.$parent.nodeWidth])

            this.minimapYScale = d3.scaleLinear()
                .domain([0, d3.max(freq)])
                .range([this.$parent.ySpacing, 0]);

            for(let i = 0; i < freq.length; i += 1){
                d3.select('#histograms')
                .append('rect')
                .attrs({
                    'id': 'histobars',
                    'width': () => this.minimapXScale.bandwidth(),
                    'height': (d) => {
                        return (this.$parent.nodeWidth) - this.minimapYScale(freq[i])
                    },
                    'x': (d) => node.x + this.minimapXScale(xVals[i]),
                    'y': (d) => node.y + this.minimapYScale(freq[i]),
                    'opacity': 1,
                    'stroke-width': '0.2px',
                    'stroke': 'black',
                    'fill': 'steelblue',
                })
            }
        }
    }
}