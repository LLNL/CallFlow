/* eslint-disable no-undef */
import { getHistogramData } from '../../routes';

export default function drawHistogram(graph, view) {
    drawHist(graph, view);
}

function drawHist(graph, view) {
    graph.nodes.forEach((node) => {
	    if (node.name != 'intermediate') {
	        getHistogramData(node, (histoData) => {
	    	    if (histoData != undefined) {
                    const xScale = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
                    const yScale = 100;
                    const minimapXScale = d3.scale.ordinal().domain(xScale).rangeRoundBands([0, view.nodeWidth], 0.05);
                    const minimapYScale = d3.scale.linear().domain([0, yScale]).range([view.ySpacing - 5, 5]);

	    	        const myXvals = histoData.xVals;
	    	        const myFreq = histoData.freq;
	    	        const myHist = view.histograms.append('g')
						.attr('transform', () => `translate(${node.x},${node.y - view.ySpacing})`);
					console.log(myHist)
	    	        myHist.selectAll('.histobars')
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
	        });
        }
    });
}
