function Scatter(args){
	var containerID = args.ID || "body",
		containerWidth = args.width || 900,
		containerHeight = args.height || 900,
		margin = args.margin || {top: 10, right: 30, bottom: 10, left: 10},
		data1 = args.data1,
		data2 = args.data2,
		label = args.label,
		sort =  args.sort,
		clickCallBack = args.clickCallBack;	

	// console.log("in scatter", label, sort);

	var width = containerWidth - margin.left - margin.right;
	var height = containerHeight - margin.top - margin.bottom;

	//find min and max
	var minVal = Number.MAX_SAFE_INTEGER;
	var maxVal = 0;

	var minVal2 = Number.MAX_SAFE_INTEGER;
	var maxVal2 = 0;
	// if(sort == true){
	// 	data.sort(function(a,b){
	// 		return a - b;
	// 	});
	// }

	data1.forEach(function(d){
		minVal = Math.min(minVal, d);
		maxVal = Math.max(maxVal, d);
	});

	data2.forEach(function(d){
		minVal2 = Math.min(minVal2, d);
		maxVal2 = Math.max(maxVal2, d);
	});

	//set scale
	var xScale;
	var yScale;
	// var yScale = d3.scale.log().domain([minVal + 0.000001, maxVal + 0.000001]).range([height, 0]);:q

	var svg;

	function visualize(){

		xScale = d3.scale.linear().domain([minVal2, maxVal2]).range([0, width]);
		yScale = d3.scale.linear().domain([minVal, maxVal]).range([height, 0]);
		
		svg = d3.select(containerID).append('svg')
				.attr('width', width + margin.left + margin.right)
				.attr('height', height + margin.top + margin.bottom)
				.append('g')
					.attr('transform', "translate(" + margin.left + "," + margin.top + ")");

		var xAxis = d3.svg.axis()
					.scale(xScale)
					.orient('bottom')
					.ticks(5)
					// .tickFormat(d3.formatPrefix(".1", 1e6));
					.tickFormat(d3.format(".1e"));	
		var yAxis = d3.svg.axis()
					.scale(yScale)
					.orient('left')
					.ticks(5)
					.tickFormat(d3.format(".1e"));		

		var xAxisLine = svg.append('g')
						.attr('class', 'xAxis')
						.attr("transform", "translate(0," + height + ")")
						.call(xAxis)
		xAxisLine.append('text')
				.attr('x', width)
				.attr('y', -6)
				.style('text-anchor', 'end')
				.text("Exclusive Runtime")

		var yAxisLine = svg.append('g')
							.attr('class', 'yAxis')
							.call(yAxis)
		yAxisLine.append("text")
				.attr('transform', 'rotate(-90)')
				.attr('y', 6)
				.attr('dy', ".71em")
				.style("text-anchor", "end")
				.text("Inclusive Runtime");

		svg.append('g').selectAll('.dot')
			.data(data1)
			.enter().append('circle')
			.attr('class', 'dot')
			.attr('r', 3)
			.attr('cx', function(d, i){
				return xScale(data2[i]);
			})
			.attr('cy', function(d, i){
				return yScale(d);
			})
			.style('fill', "#4682b4")

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
				.style('font-size', '10px')
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
				.style("opacity", 0.5);
        yAxisLine.selectAll("text")
				.style('font-size', '10px')
				.style('font-family', 'sans-serif')
				.style('font-weight', 'lighter');						
	}

	visualize();

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
}