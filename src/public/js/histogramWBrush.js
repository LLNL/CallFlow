function Histogram(args){
	// console.log('inside histogram')
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
	var height = containerHeight - margin.top - margin.bottom - 20;

	var histogramOffset = Math.floor( height / 3 );

	var histogramHeight = height - histogramOffset;

	var brush;
	var xFormat = d3.format(".1e")

	var svg;

	var xScale;
	var yScale;

	var logScaleBool = false;

	function visualize(){
		xScale = d3.scale.ordinal().domain(xVals).rangeRoundBands([0, width], 0.05);

		if(d3.max(freq) < 50){
			yScale = d3.scale.linear().domain([0, d3.max(freq)]).range([histogramHeight, 0]);
			logScaleBool = false;
		}
		else{
			yScale = d3.scale.log().domain([1, d3.max(freq)]).range([histogramHeight, 10]);
			logScaleBool = true;
		}	


		 svg = d3.select(containerID)
				.append('svg')
				.attr("width", width + margin.right + margin.left)
				.attr("height", height + margin.top + margin.bottom)
			  	.append("g")
			  	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		//Tool Tip
		var toolTip = d3.select(containerID)
										.append('div')
										.attr('class', 'toolTip')
										.style('position', 'absolute')
										.style('padding', '5px 10px 0px 10px')
										.style('opacity', 0)
										.style('background', 'white')
										.style('height', 'auto')
										.style('width', 'auto')
										.style('border-radius', '10px')
										.style('border-width', '1px')
										.style('border-style', 'solid')
										.style('position', 'absolute');
		var toolTipText = toolTip
							.append('p')
							.style('font-family', 'sans-serif')
							.style('font-size', '13px');

	    // brush
	    brush = d3.svg.brush()
	    			.x(xScale)
	    			.on('brush', brushing)
	    			// .extent([0,width])
	    			.on('brushend', brushend)
	    var brushG = svg.append('g').attr('class', 'brush').call(brush);

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
				             	var histFreq = d;
				             	if( d < 1 && logScaleBool){
				             		histFreq = 1;
				             		return 0;
				             	}
				             	return histogramHeight - yScale(d);
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

				             })
				             .on('mouseover', function(d,i){
	             				d3.select(this)
				             		.attr('fill', 'red')
				             	d3.selectAll('.lineRank_' + i)
				             		.style('fill', 'orange')
				             		.style('fill-opacity', 1);
				             	var groupProcStr = groupProcess( binContainsProcID[i] )["string"];
						    	var mousePos = d3.mouse(d3.select(containerID).node()); 
						    	toolTip.style('opacity', 1)
										.style('left', function(){
											var xPos = mousePos[0]  + 10;
											if(xPos >= width - 25){
												return (xPos - 100) + 'px;'
											}
											else{
												return (mousePos[0]  + 10) + 'px';
											}
											
										})
										.style('top', function(){
											return mousePos[1] + "px";
										})
										.style('height', 'auto')
										.style('width', 'auto');
						    	toolTipText.html("Processes: " + groupProcStr);					             	
				             })
				             .on('mouseout', function(d,i){
				             	d3.select(this)
				             		.attr('fill', 'steelblue');
				             	d3.selectAll('.lineRank_' + i)
				             		.style('fill', 'grey')
				             		.style('fill-opacity', 0.4);

								toolTip.style('opacity', 0)
										.style('left', function(){
											return '0px';
										})
										.style('top', function(){
											return "0px";
										})
										.style('height', 'auto')
										.style('width', 'auto');

				             	toolTipText.html("");	

				             });	

	   	brushG.selectAll('rect').attr('height', histogramHeight).attr('opacity', 0.2);
	   	var brushStart = 0;
	   	var brushEnd = numbOfBins;
	   	var bExtent;
	   	function brushing(){
	   		bExtent = brush.extent();
	   		var brushScale = d3.scale.linear().domain( xScale.range() ).range( xScale.domain() )
	   		
			var localBrushStart = (brush.empty()) ? brushStart : Math.floor(brushScale(bExtent[0]));
				if(localBrushStart < 0){
					localBrushStart = 0;
				}
	        var localBrushEnd = (brush.empty()) ? brushEnd : Math.floor(brushScale(bExtent[1]));
	        // console.log(localBrushStart, localBrushEnd)

	        svg.select("g.brush").call((brush.empty()) ? brush.clear() : brush.extent([brushScale.invert(localBrushStart), brushScale.invert(localBrushEnd)]));

	        brushStart = localBrushStart;
	        brushEnd = localBrushEnd;

	        //highlight rank lines that is brush
	        svg.selectAll('.binRank').attr('opacity', 0);
	        for(var i = brushStart; i < brushEnd; i++){

	        	 svg.selectAll('.bin_' + i).attr('opacity', 1);

	        }	

	        if(brushStart == brushEnd){
	        	svg.selectAll('.binRank').attr('opacity', 1);
	        }        
	   	}
	   	function brushend(){

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
	     		if(i % 4 == 0){
	     			var value = temp * 0.000001;
	     			return xFormat(value) + "s";
	     			// return value;
	     		}
	
	     		else
	     			return "";	    	
		    	
		    });

		var yAxis = d3.svg.axis()
		    .scale(yScale)
		    .orient("left")
		    .ticks(freq.length)
		    .tickFormat(function(d, i){
		    	// console.log(d, logScaleBool);
		    	if(logScaleBool){
		    		if( d % 4 == 0 ){
		    			return d;
		    		}
		    		else{
		    			return "";
		    		}
		    	}
		    	else{
		    		return d;
		    	}
		    })
		    .ticks(5, "%");				             

		var xAxisLine = svg.append("g")
					  .attr("class", "x axis")
					  .attr("transform", "translate(0," + histogramHeight + ")")
					  .call(xAxis);

		var yAxisLine = svg.append("g")
					  .attr("class", "y axis")
					  .call(yAxis)
		var yAxisLineText = yAxisLine.append("text")
								  .attr("transform", "rotate(-90)")
								  .attr("y", -30)
								  .attr('x', -histogramHeight + 50)
								  .attr("dy", ".71em")
								  .style("text-anchor", "end")
								  .text("Frequency");	

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


	    var rankLineScale = d3.scale.linear().domain([0, data.length]).range([0, width]);
	    // var rankLinesG = svg.append('g');
	    freq.forEach(function(fregVal, idx){
	    	if(binContainsProcID[idx] != null){
	    		var rankLinesG = svg.append('g')
	    							.attr('class', "binRank bin_" + idx)
	    							.attr('data-name', idx);
		    	var processIDs = binContainsProcID[idx];

		    	processIDs.sort(function(a,b){
		    		return a - b;
		    	});



				var groupArray = groupProcess(processIDs)["array"];

		    	var binWidth = xScale.rangeBand();
		    	var widthPerRank = binWidth / processIDs.length;
		    	var binLocation = xScale(idx);
		    	// console.log(widthPerRank);
		    	var cumulativeBinSpace = 0;
		    	groupArray.forEach(function(group){
		    		var line;
		    		if(group.length == 1){
		    			var start = group[0];
		    			var end = start+1;
		    			var topX1 = cumulativeBinSpace + binLocation;
		    			var topX2 = cumulativeBinSpace + binLocation + ( 1 ) * widthPerRank;

		    			var botX3 = rankLineScale(start);
		    			var botX4 = rankLineScale(start);

		    			var topY = height - histogramOffset;
		    			var botY = height;
		    			cumulativeBinSpace = cumulativeBinSpace + ( 1 ) * widthPerRank;

		    			line = "M" + topX1 + " " + topY
		    						+ "L " + topX2 + " " + topY
		    						+ "L " + botX4 + " " + botY
		    						+ "L " + botX3 + " " + botY;		
		    		}
		    		else{
		    		// 	console.log(group);
		    			var start = group[0];
		    			var end = group[1];

		    			var topX1 = cumulativeBinSpace + binLocation;
		    			var topX2 = cumulativeBinSpace + ( end - start + 1 ) * widthPerRank + binLocation;

		    			var botX3 = rankLineScale(start);
		    			var botX4 = rankLineScale(end);

		    			var topY = height - histogramOffset;
		    			var botY = height;

		    			cumulativeBinSpace = cumulativeBinSpace + ( end - start + 1 ) * widthPerRank;

		    			line = "M" + topX1 + " " + topY
		    						+ "L " + topX2 + " " + topY
		    						+ "L " + botX4 + " " + botY
		    						+ "L " + botX3 + " " + botY;
		    		}

					rankLinesG.append('path')
		    					.attr('d', line)
		    					.attr('class', "lineRank_" + idx)
		    					.style("fill", function(d){
				    				return "grey";
				    			})
				    			.style('fill-opacity', 0.4);    
		    	})
	    	}
	    })

	    var rankLineAxis = d3.svg.axis()
		    .scale(rankLineScale)
		    .orient("bottom")
		    // .outerTickSize(0)
		    .ticks(10)
		    .tickFormat(function(d, i){
	     		return d;		    	
		    });

		var rankLineAxisLine = svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + (height - 0) + ")")
			.call(rankLineAxis);

		var rankLineAxisLineText = rankLineAxisLine.append("text")
										  // .attr("transform", "rotate(-90)")
										  .attr("y", 20)
										  .attr('x', 25)
										  .attr("dy", ".71em")
										  .style("text-anchor", "end")
										  .text("MPI Ranks");	

	    rankLineAxisLine.selectAll('path')
	                        .style("fill", "none")
	                        .style("stroke", "black")
	                        .style("stroke-width", "1px");
	    rankLineAxisLine.selectAll('line')
	                        .style("fill", "none")
	                        .style("stroke", "#000")
	                        .style("stroke-width", "1px")
	                        .style("opacity", 0.5);
	    rankLineAxisLine.selectAll("text")
	                       .style('font-size', '9px')
	                       .style('font-family', 'sans-serif')
	                       .style('font-weight', 'lighter');	

	}

	this.setContainerWidth = function(newWidth){
		containerWidth = newWidth;
		width = containerWidth - margin.left - margin.right;
	}

	this.setContainerHeight = function(newHeight){
		containerHeight = newHeight;
		height = containerHeight - margin.top - margin.bottom;
	}

	this.reDraw = function(){
		$(containerID).empty();
		histogramOffset = Math.floor( height / 3 );

		histogramHeight = height - histogramOffset;
		visualize();
	}

	visualize();

	//give an array of ids, group the ids into cosecutive group
	//return a string version and an array version
	//stolen from this: https://gist.github.com/XciA/10572206
	function groupProcess(processIDs){
    	var constData = processIDs.slice();
    	var a=0;
    	var groupArrayStr = "[ ";
    	var groupArray = [];
    	var first = true;
    	cons(constData[0], 1);
		function cons(s,t){
		  if(s+1==constData[t]){
			    s=constData[t];
			    t=t+1;
			    cons(s,t);
			}
			else{
		    	print(a,t-1);
			}
		}

		function print(k,t){
		    display(k,t);
		    t++;
		    a=t;
		    start=constData[t];
			if(t<constData.length){
				cons(start,t+1);
			}
		}
		function display(k,t){
			var string = "";
			var temp = [];
		    if(k!=t){
		    	// console.log(constData[k]+'-'+constData[t]);
		    	string = '[' + constData[k]+'-'+constData[t] +']'
		    	temp.push(constData[k]);
		    	temp.push(constData[t]);
		    }
			else{
		    	// console.log(constData[k]);
		    	string = '[' + constData[k] + ']'
		    	temp.push(constData[k]);
			}
			// groupArray.push(temp);
			// console.log(temp)
			if(!first){
				groupArrayStr += ', '
			}
			groupArrayStr += string;
			groupArray.push(temp);
			first = false;
		}
		groupArrayStr += ' ]';
		return {"string": groupArrayStr, "array" : groupArray};		
	}

}