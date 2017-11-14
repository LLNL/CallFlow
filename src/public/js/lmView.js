/*******************************************************************************
 * Copyright (c) 2017, Lawrence Livermore National Security, LLC.
 * Produced at the Lawrence Livermore National Laboratory.
 *
 * Written by Huu Tan Nguyen <htpnguyen@ucdavis.edu>.
 *
 * LLNL-CODE-740862. All rights reserved.
 *
 * This file is part of CallFlow. For details, see:
 * https://github.com/LLNL/CallFlow
 * Please also read the LICENSE file for the MIT License notice.
 ******************************************************************************/

function LMView(args){
    var containerID = args.ID || "body",
	containerWidth = args.width || 900,
	containerHeight = args.height || 900,
	margin = args.margin || {top: 10, right: 30, bottom: 10, left: 10},
	numbOfClusters = args.numbOfClusters,
	callback = args.callback;

    var rectWidth = 20;
    var rectHeight = 20;

    var visData;
    var entryData;
    var exitData;

    var minVal;
    var maxVal;

    var clusterInfo = {};
    var totalProcesses;

    function calcStat(){
	var min = Number.MAX_SAFE_INTEGER;
	var max = 0;

	Object.keys(visData).forEach(function(rowid){
	    visData[rowid].forEach(function(dat){
		min = Math.min(min, dat.value);
		max = Math.max(max, dat.value);
	    })
	});

	minVal = min;
	maxVal = max;
    }

    function calcCusterSize(){
	var rowID = Object.keys(visData);
	var sum = 0;
	visData[ rowID[0] ].forEach(function(dat){
	    var temp = {
		"numberOfCluster" : dat.numberOfProcesses,
		"clusterID" : dat["clusterID"],
		"prevSum" : sum,
	    };

	    sum += dat.numberOfProcesses;
	    clusterInfo[ dat["clusterID"] ] = temp;
	});

	totalProcesses = sum;

    }

    function render(){

	var zoom = d3.behavior.zoom()
	    .scaleExtent([0.1,10])
	    .on('zoom', zoomed);
	

	function zoomed(){
	    svgBase.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	}		

	var colorScale = d3.scale.quantize().domain([minVal, maxVal]).range(['#f7fbff','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','#084594']);
	// var colorScale = d3.scale.log().domain([minVal + 0.000001, maxVal]).range(['#deebf7','#084594']);

	var svgO = d3.select(containerID).append('svg')
	    .attr('width', containerWidth )
	    .attr('height', containerHeight)
	    .append('g')
	    .call(zoom)

	//place an invisible rect over the svg to capture all mouse event
	var containerRect = svgO.append('rect')
	    .attr('width', containerWidth)
	    .attr('height', containerHeight)
	    .style('fill', "none")
	    .style("pointer-events", "all"); //this line is needed to capture the mouse events related to the entire svg						

	// console.log(Object.keys(visData).length);

	var svgBase = svgO.append('g');
	
	svg = svgBase.append('g')
	    .attr('transform', "translate(100, 100)").attr('opacity', 1);

	Object.keys(visData).forEach(function(rowid, idx){
	    svg.append('g').attr('class', 'row' + rowid)
		.attr("transform", "translate(0," + (rectHeight * idx) + ")")
	    // .on("mouseover", function(){
	    // 		// console.log(d3.select(this).attr('class'));
	    // 		// console.log(d3.mouse(this));
	    // 		var mouseX = d3.mouse(this)[0];
	    // 		if( mouseX <= rectWidth && mouseX >= 0){
	    // 			// console.log('this is the first rect');
	    // 			svg.selectAll('path').attr('opacity', 0);
	    // 			svg.selectAll('.paths_enter_row' + rowid).attr('opacity', 1);								
	    // 		}

	    // 		else if( mouseX <= rectWidth * numbOfClusters && mouseX >= rectWidth * (numbOfClusters - 1) ){
	    // 			// console.log('this is the last rect');
	    // 			svg.selectAll('path').attr('opacity', 0);
	    // 			svg.selectAll('.paths_exit_row' + rowid).attr('opacity', 1);								
	    // 		}
	    
	    // 	})
	    // .on("click", function(){
	    // 	var className = d3.select(this).attr('class');
	    // 	// console.log(className);
	    // 	var LMID = className.replace('row', '');
	    // 	// console.log(LMID);
	    // 	// callback(LMID);
	    // });
	    
	})

	var matrixWidth = numbOfClusters * rectHeight;
	var unitWidth = matrixWidth / totalProcesses;

	Object.keys(visData).forEach(function(rowid){
	    var temp = svg.select('.row'+rowid);//.append('g')

	    temp.selectAll('g').data( visData[rowid] ).enter().append('g').attr('class', function(d){return d.id})
		.attr("transform", function(d,i){
		    // return "translate(" +  (rectHeight * i) + ",0)";
		    return "translate(" +  (unitWidth * clusterInfo[ d["clusterID"] ]["prevSum"]) + ",0)";
		})
		.append('rect')
	    // .attr('width', rectWidth)
		.attr('width', function(d,i){
		    return unitWidth * clusterInfo[ d["clusterID"] ]["numberOfCluster"];
		})
		.attr('height', rectHeight)
		.style('stroke-width', '1px')
		.style('stroke', 'black')
		.style('fill', function(d){
		    return colorScale(d.value);
		})
		.on("mouseover", function(d,i){
		    // console.log(d3.select(this).attr('class'));
		    // console.log(d3.mouse(this));
		    if( i == 0 ){
			// console.log('this is the first rect');
			svg.selectAll('path').attr('opacity', 0);
			svg.selectAll('.paths_enter_row' + rowid).attr('opacity', 1);								
		    }

		    else if( i == (numbOfClusters - 1) ){
			// console.log('this is the last rect');
			svg.selectAll('path').attr('opacity', 0);
			svg.selectAll('.paths_exit_row' + rowid).attr('opacity', 1);								
		    }
		    
		})				
		.on("click", function(d){
		    console.log(d);
		});



	})

	//draw the arcs for each lm

	var rowidList = Object.keys(visData);
	// var rowidList = ["5579"]

	rowidList.forEach(function(rowid){

	    var arcsG = svg.append('g').attr('id', 'g_paths_row' + rowid);
	    var enterFromList = entryData[rowid];
	    enterFromList.forEach(function(enterFrom){
		if(parseInt(rowid, 10) != enterFrom){
		    arcsG.append('path')
			.attr('class', 'paths_enter_row' + rowid)
			.attr('d', drawArc( rowid,enterFrom.toString(), -1 ) )
			.attr('stroke', 'blue')
			.attr('stroke-width', 2)
			.attr('fill', "none")
			.attr('opacity', 0);
		}
	    })

	    var exitToList = exitData[rowid];
	    exitToList.forEach(function(exitTo){
		if(parseInt(rowid, 10) != exitTo){
		    arcsG.append('path')
			.attr('class', 'paths_exit_row' + rowid)
			.attr('d', drawArc( rowid,exitTo.toString(), 1 ) )
			.attr('stroke', 'blue')
			.attr('stroke-width', 2)
			.attr('fill', "none")
			.attr('opacity', 0);
		}				
	    })
	});

	//draw sample arc

	// var tempSvg = svg;
	// var arcsG = tempSvg.append('g').attr('id', 'g_paths_row0');
	// arcsG.append('path')
	// 	.attr('d', drawArc("0","5559"))
	// 	.attr('stroke', 'blue')
	// 	.attr('stroke-width', 2)
	// 	.attr('fill', "none");


	//legend
	var lCols = ['#f7fbff','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','#084594']
	var legendG = svgBase.append('g').attr('opacity', 1)
	    .attr('transform', 'translate( 100, ' + (rectHeight * Object.keys(visData).length + 0 + 100) + ' )');
	var legend = legendG.append("defs")
	    .append("svg:linearGradient").attr("id", "gradient")
	    .attr("x1", "0%").attr("y1", "100%")
	    .attr("x2", "100%").attr("y2", "100%")
	    .attr("spreadMethod", "pad");

	legend.append("stop").attr("offset", "0%").attr("stop-color", lCols[0]).attr("stop-opacity", 1);
	legend.append("stop").attr("offset", "12.5%").attr("stop-color", lCols[1]).attr("stop-opacity", 1);
	legend.append("stop").attr("offset", "25%").attr("stop-color", lCols[2]).attr("stop-opacity", 1);
	legend.append("stop").attr("offset", "37.5%").attr("stop-color", lCols[3]).attr("stop-opacity", 1);
	legend.append("stop").attr("offset", "50%").attr("stop-color", lCols[4]).attr("stop-opacity", 1);
	legend.append("stop").attr("offset", "62.5%").attr("stop-color", lCols[5]).attr("stop-opacity", 1);
	legend.append("stop").attr("offset", "75%").attr("stop-color", lCols[6]).attr("stop-opacity", 1);
	legend.append("stop").attr("offset", "87.5%").attr("stop-color", lCols[7]).attr("stop-opacity", 1);
	var lRect = legendG.append("rect").attr("height", 20).attr("width", rectWidth * numbOfClusters).style("fill", "url(#gradient)").attr("transform", "translate(0,10)");

	var lScale = d3.scale.quantize().domain([minVal, (maxVal + minVal) / 2 , maxVal])
	// .range([0, lCols.length * 20])
	    .range([0, rectHeight * numbOfClusters]);

	var yAxis = d3.svg.axis()
	    .scale(lScale)
	    .orient('bottom')
	    .ticks(5)
	    .tickFormat(d3.format(".1e"));	
	// legendG.append('text').attr("transform", "translate(22,10)").text(minVal);
	// legendG.append('text').attr("transform", "translate(22,160)").text(maxVal);

	var yAxisLine = legendG.append("g").attr("class", "y axis").attr("transform", "translate(0,40)").call(yAxis);
	yAxisLine.append("text").attr('x',(rectHeight * numbOfClusters)/2 + 20).attr("y", 10).attr("dy", ".71em").style("text-anchor", "end").text("Inclusive Time");	

        yAxisLine.selectAll('path')
	    .style("fill", "none")
	    .style("stroke", "black")
	    .style("stroke-width", "1px");
	yAxisLine.selectAll('line')
	    .style("fill", "none")
	    .style("stroke", "#000")
	    .style("stroke-width", "1px")
	    .style("opacity", 0.5);
        yAxisLine.selectAll("text")
	    .style('font-size', '10px')
	    .style('font-family', 'sans-serif')
	    .style('font-weight', 'lighter');	
    }

    function drawArc(startLM, endLM, direction){

	var xLocation;
	if(direction == -1){
	    xLocation = 0;
	}

	else{
	    xLocation = numbOfClusters * rectWidth;
	}

	var tLM = Object.keys(visData);
	// console.log(tLM);

	var startLMCoord = []; //(x,y) of start lm

	//get index of start lm
	var startLMIndex = tLM.indexOf(startLM);
	var startLMY = (rectHeight * startLMIndex) + (rectHeight / 2);
	
	startLMCoord.push(xLocation);
	startLMCoord.push(startLMY);


	var endLMCoord = [];
	var endtLMIndex = tLM.indexOf(endLM);
	var endLMY = (rectHeight * endtLMIndex) + (rectHeight / 2);
	// console.log(endtLMIndex, endLMY)
	
	endLMCoord.push(xLocation);
	endLMCoord.push(endLMY);

	return calcArchPath(startLMCoord, endLMCoord, direction);
    }

    //this function caculate the final arc path
    function calcArchPath(startPoint, endPoint, direction){

	var arcRadius = (Object.keys(visData).length * rectHeight) / 2 * direction;
	var x0 = startPoint[0],
	    y0 = startPoint[1],
	    x1 = endPoint[0],
	    y1 = endPoint[1],
	    x2 = startPoint[0] + arcRadius,
	    y2 = startPoint[1],
	    x3 = endPoint[0] + arcRadius,
	    y3 = endPoint[1];

	// console.log(
	// "m" + x0 + "," + y0
	// 		+ "c" + x2 + "," + y2
	// 		+ " " + x3 + "," + y3
	// 		+ " " + x1 + "," + y1
	// )	
	return "m" + x0 + "," + y0
	    + "C" + x2 + "," + y2
	    + " " + x3 + "," + y3
	    + " " + x1 + "," + y1;
    }

    this.getData = function(){
	$.ajax({
            type:'GET',
            contentType: 'application/json',
            dataType: 'json',
            url: '/data',
            success: function(newData){
                //somecoment
            	// console.log(newData);
            	console.log('done with getting data');
            	visData = newData["matrixData"];
            	entryData = newData["entryData"];
            	exitData = newData["exitData"];

            	calcStat();
            	calcCusterSize();
            	render();
		

            },
            error: function(){
            	console.log("There was problem with getting the data");
            }	
	});			
    }	

    this.getData();
}
