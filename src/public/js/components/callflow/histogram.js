import { getHistogramData } from '../../routes'

export default function drawHistogram(graph, view){
    let maxFreq = 0
    let globalXVals = 0
    let count = 0
    drawHist(graph, view)
    // graph.nodes.forEach(function(node){
    // 	console.log(node.name)
    // 	if(node.name != "intermediate"){
    // 	    console.log(node)
    // 	    getHistogramData(node, function(histoData){
    // 		console.log(histoData)
    // 		if (histoData != undefined){
    // 		    globalXVals = Math.max(globalXVals, histoData['xVals'].length)
    // 		    console.log(histoData['xVals'])
    // 		    console.log(globalXVals)
    // 		    for(let i = 0; i < histoData['freq'].length; i++){
    // 			maxFreq = Math.max(maxFreq, histoData['freq'][i])
    // 		    }
    // 		    count += 1;
    // 		    if(count == graph.nodes.length - 1 ){
    // 			console.log('end')
    // 		    }
    // 		}
    // 	    });
    // 	}
    // });
}

function drawHist(graph, view){
    let xScale = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    let yScale = 45
    let minimapXScale = d3.scale.ordinal().domain(xScale).rangeRoundBands([0, view.nodeWidth], 0.05);
    let minimapYScale = d3.scale.linear().domain([0, yScale]).range([view.ySpacing - 5, 5]);

    graph.nodes.forEach(function(node){
	    if(node.name != 'intermediate'){
	        getHistogramData(node, function(histoData){
	    	    if (histoData != undefined){
	    	        var myXvals = histoData["xVals"];
	    	        var myFreq = histoData["freq"];
	    	        var myHist = view.histograms.append('g')
	    		        .attr('transform', function(){
	    		            return "translate(" + node.x + "," + (node.y - view.ySpacing) + ")";
	    		        });
	    	        myHist.selectAll('.histobars')
	    		        .data(myFreq)
	    		        .enter()
	    		        .append('rect')
	    		        .attr('class', 'histobars')
	    		        .attr('x', function(d, i){
	    		            return minimapXScale(myXvals[i]);
	    		        })
	    		        .attr('y', function(d){
	    		            return minimapYScale(d);
	    		        })
	    		        .attr('width', function(d){
	    		            return minimapXScale.rangeBand();
	    		        })                    
                        .attr('height', function(d){
	    		            return (view.ySpacing - 5) - minimapYScale(d);
	    		        })
	    		        .attr('fill', 'steelblue')
	    		        .attr('opacity', 1)
	    		        .attr('stroke-width', function(d,i){			
	    		            return "0.2px";			
	    		        })
	    		        .attr('stroke', function(d,i){
	    		            return "black"		             	
	    		        })
                        .style("font-size", "1px");                    
	    	    }		
	        })
	    }
    })
}
