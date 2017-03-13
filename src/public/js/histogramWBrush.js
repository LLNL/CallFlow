function Histogram(args){
	console.log('inside histogram')
	var containerID = args.ID || "body",
		containerWidth = args.width || 900,
		containerHeight = args.height || 900,
		margin = args.margin || {top: 10, right: 30, bottom: 10, left: 10},
		data = args.data,
		numbOfBins = args.numbOfBins || 20,
		// spinner = args.spinner,
		brushCallBack = args.brushCallBack,
		clickCallBack = args.clickCallBack;

	var dataSorted = data.slice();
	dataSorted.sort(function(a,b){
		return a - b;
	});

	var dataMin = dataSorted[0];
	var dataMax = dataSorted[ dataSorted.length - 1 ];

	var dataWidth = ((dataMax - dataMin) / numbOfBins);
	var freq = [];
	var axis_x = []
	var binContainsProcID = {};
	var xVals = [];
	for(var i = 0; i < numbOfBins; i++){
		xVals.push(i);
		freq.push(0);
		axis_x.push( dataMin + (i * dataWidth) );
	};

	console.log(axis_x);

	data.forEach(function(val, idx){
		var pos = Math.floor( (val - dataMin) / dataWidth );
		if(pos >= numbOfBins){
			pos = numbOfBins - 1;
		}
		freq[pos] += 1;
		if(binContainsProcID[pos] == null){
			binContainsProcID[pos] = [];
		}
		binContainsProcID[pos].push(idx);
	});


	var width = containerWidth - margin.right - margin.left;
	var height = containerHeight - margin.top - margin.bottom;

	var brush;
	var xFormat = d3.format(".1e")

	var svg;

	var xScale;
	var yScale;

	function visualize(){
		xScale = d3.scale.ordinal().domain(xVals).rangeRoundBands([0, width], 0.05);
		yScale = d3.scale.linear().domain([0, d3.max(freq)]).range([height, 0]);	

		 svg = d3.select(containerID)
				.append('svg')
				.attr("width", width + margin.right + margin.left)
				.attr("height", height + margin.top + margin.bottom)
			  	.append("g")
			  	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		svg.selectAll('.selectBars').data(freq).enter()
				             .append('rect').attr('class', 'selectBars')
				             .attr('x', function(d, i){
				             	return xScale(xVals[i]);
				             })
				             .attr('y', function(d){
				             	// height - y(d);
				             	return yScale(d);
				             })
				             .attr('width', function(d){
				             	// return width/hData.length - 1.0;
				             	return xScale.rangeBand();
				             })
				             .attr('height', function(d){
				             	return height - yScale(d);
				             })
				             .attr('fill', 'steelblue')
				             .attr('opacity', 1)
				             .attr('stroke-width', function(d,i){
				 
				             	return "0.2px";
				             	
				             })
				             .attr('stroke', function(d,i){
				             	return "black"		             	
				             })
				             .on('click', function(d,i){
				             	if(hisCallBack){
				             		hisCallBack(i);
				             	}
				             });	

	    // brush
	    brush = d3.svg.brush()
	    			.x(xScale)
	    			.on('brush', brushing)
	    			// .extent([0,width])
	    			.on('brushend', brushend)
	    var brushG = svg.append('g').attr('class', 'brush').call(brush);
	   	brushG.selectAll('rect').attr('height', height).attr('opacity', 0.2);
	   	var brushStart = 0;
	   	var brushEnd = numbOfBins;
	   	var bExtent;
	   	function brushing(){
	   		bExtent = brush.extent();
	   		var brushScale = d3.scale.linear().domain( xScale.range() ).range( xScale.domain() )
	   		console.log(bExtent)
			var localBrushStart = (brush.empty()) ? brushStart : Math.floor(brushScale(bExtent[0]));
				if(localBrushStart < 0){
					localBrushStart = 0;
				}
	        var localBrushEnd = (brush.empty()) ? brushEnd : Math.floor(brushScale(bExtent[1]));
	        // console.log(localBrushStart, localBrushEnd)

	        svg.select("g.brush").call((brush.empty()) ? brush.clear() : brush.extent([brushScale.invert(localBrushStart), brushScale.invert(localBrushEnd)]));

	        brushStart = localBrushStart;
	        brushEnd = localBrushEnd;
	   	}
	   	function brushend(){
	   		console.log(brushStart, brushEnd)
	   		var processIDList = [];

	   		for(var i = brushStart; i < brushEnd; i++){
	   			if(binContainsProcID[i] != null){
		   			var curList = binContainsProcID[i];
		   			curList.forEach(function(processID){
		   				processIDList.push(processID);
		   			})
	   			}
	   		}

	   		brushCallBack( processIDList);
	   	}

		var xAxis = d3.svg.axis()
		    .scale(xScale)
		    .orient("bottom")
		    // .outerTickSize(0)
		    .ticks(xVals.length)
		    .tickFormat(function(d, i){
	     		// var temp = axis_x[i] + "s";
	     		var temp = axis_x[i];
	     		if(i % 2 == 0)
	     			return xFormat(temp);	
	     		else
	     			return "";	    	
		    	
		    });

		var yAxis = d3.svg.axis()
		    .scale(yScale)
		    .orient("left")
		    .ticks(freq.length)
		    .tickFormat(function(d){
		    	return d
		    })
		    .ticks(5, "%");				             

		var xAxisLine = svg.append("g")
					  .attr("class", "x axis")
					  .attr("transform", "translate(0," + height + ")")
					  .call(xAxis);

		var yAxisLine = svg.append("g")
					  .attr("class", "y axis")
					  .call(yAxis)
		// var yAxisLineText = yAxisLine.append("text")
		// 						  .attr("transform", "rotate(-90)")
		// 						  .attr("y", 6)
		// 						  .attr("dy", ".71em")
		// 						  .style("text-anchor", "end")
		// 						  .text("Frequency");	

	    xAxisLine.selectAll('path')
	                        .style("fill", "none")
	                        .style("stroke", "black")
	                        .style("stroke-width", "1px");
	    xAxisLine.selectAll('line')
	                        .style("fill", "none")
	                        .style("stroke", "#000")
	                        .style("stroke-width", "1px")
	                        .style("opacity", 0.5);
	    xAxisLine.selectAll("text")
	                       .style('font-size', '9px')
	                       .style('font-family', 'sans-serif')
	                       .style('font-weight', 'lighter');	


	    yAxisLine.selectAll('path')
	                        .style("fill", "none")
	                        .style("stroke", "black")
	                        .style("stroke-width", "1px");
	    yAxisLine.selectAll('line')
	                        .style("fill", "none")
	                        .style("stroke", "#000")
	                        .style("stroke-width", "1px")
	                        .style("opacity", 0.2);
	    yAxisLine.selectAll("text")
	                       .style('font-size', '9px')
	                       .style('font-family', 'sans-serif')
	                       .style('font-weight', 'lighter');	

	}

	this.setContainerWidth = function(newWidth){
		containerWidth = newWidth;
		width = containerWidth - margin.left - margin.right;

		console.log(containerWidth);
	}

	this.setContainerHeight = function(newHeight){
		containerHeight = newHeight;
		height = containerHeight - margin.top - margin.bottom;
	}

	this.reDraw = function(){
		$(containerID).empty();

		visualize();
	}

	visualize();

}