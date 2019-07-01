import tpl from '../../html/callgraph/miniHistograms.html'
import * as  d3 from 'd3'

export default {
    template: tpl,
    name: 'MiniHistograms',
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
        miniHistogram(data) {
            console.log(data)
            for (const [key, value] of Object.entries(data)) {
                let node = this.getNode(key)
                console.log(value)
                // this.drawHistogram(value, node)
            }
            
        }
    },

    methods: {
        init(graph, view) {
            this.graph = graph
            this.view = view
            this.xScale = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
            this.yScale = 100;
            this.minimapXScale = d3.scaleBand().domain(this.xScale).rangeRound([0, view.nodeWidth], 0.05);
            this.minimapYScale = d3.scaleLinear().domain([0, this.yScale]).range([view.ySpacing - 5, 5]);
            this.$socket.emit('miniHistogram', {
                'dataset1': 'osu_bw',
            })

        },
        
        getNode(node_name){
            let ret = {}
            for(let i = 0; i < this.graph.nodes.length; i += 1){
                let node = this.graph.nodes[i]
                if(node.name == node_name){
                    return node
                }
            }
        },

        drawHistogram(data, node) {
            this.vals = data.xVals;
            this.freq = data.freq;
            let minihistogram = d3.select('#node_'+ node.mod_index)
                .append('g')
                .attr('id', 'a')
                .attr('transform', () => `translate(${node.x},${node.y - this.view.ySpacing})`)
            
            minihistogram.selectAll('#a')
                .data(this.freq)
                .enter()
                .append('rect')
                .attr('class', 'histobars')
                .attr('x', (d, i) => minimapXScale(this.vals[i]))
                .attr('y', d => minimapYScale(d))
                .attr('width', () => minimapXScale.rangeBand())
                .attr('height', d => (this.view.ySpacing - 5) - minimapYScale(d))
                .attr('fill', 'steelblue')
                .attr('opacity', 1)
                .attr('stroke-width', () => '0.2px')
                .attr('stroke', () => 'black')
                .style('font-size', '1px');
        }
    }
}

