import tpl from '../../html/callgraph/miniHistograms.html'
import * as  d3 from 'd3'

export default {
    template: tpl,
    name: 'Histograms',
    components: {
    },
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
    }),

    sockets: {
        histogram(data) {
			data = JSON.parse(data)
            this.drawHistogram(data)
        }
    },

    methods: {
        init(graph, view) {
            this.view = view
            console.log(this.view)
            this.xScale = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
            this.yScale = 100;
            this.minimapXScale = d3.scaleBand().domain(this.xScale).rangeRound([0, view.nodeWidth], 0.05);
            this.minimapYScale = d3.scaleLinear().domain([0, this.yScale]).range([view.ySpacing - 5, 5]);
            for(let i = 0; i < graph.nodes.length; i += 1) {
                let node = graph.nodes[i]
                this.$socket.emit('histogram', {
                    'dataset1': 'hpctoolkit-osu_bw',
                    'format': 'Callgraph',
                    'n_index': node['n_index'],
                    'module': node['name']
                })               
            }
        },

        drawHistogram(data) {

            this.vals = data.xVals;
            this.freq = data.freq;
            this.histogram = this.view.histograms.append('g')
                .attr('transform', () => `translate(${node.x},${node.y - view.ySpacing})`);
            this.histogram.selectAll('.histobars')
                .data(myFreq)
                .enter()
                .append('rect')
                .attr('class', 'histobars')
                .attr('x', (d, i) => minimapXScale(myXvals[i]))
                .attr('y', d => minimapYScale(d))
                .attr('width', () => minimapXScale.rangeBand())
                .attr('height', d => (view.ySpacing - 5) - minimapYScale(d))
                .attr('fill', 'steelblue')
                .attr('opacity', 1)
                .attr('stroke-width', () => '0.2px')
                .attr('stroke', () => 'black')
                .style('font-size', '1px');
        }
    }
}

