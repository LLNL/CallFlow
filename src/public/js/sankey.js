function Sankey(args){

	String.prototype.trunc = String.prototype.trunc ||
      function(n){
          return (this.length > n) ? this.substr(0, n-1) + '...' : this;
      };

	var containerID = args.ID || "body",
		containerWidth = args.width || 900,
		containerHeight = args.height || 900,
		margin = args.margin || {top: 10, right: 30, bottom: 10, left: 10},
		data = args.data,
		toolTipData = args.toolTipData,
		// spinner = args.spinner,
		clickCallBack = args.clickCallBack;


	this.colorScale = args.colorScale || d3.scale.category20();
	var width = containerWidth - margin.left - margin.right;
	var height = containerHeight - 2*margin.top - 2*margin.bottom;
	var units = "Widgets";


	var nodeColorOption = 0;

	var colorArray = ["red", "green", "yellow", "blue", "black", "white"];

	var nodeList = [];

	var transitionDuration = 2000;

	var rootRunTime = 0;
	data["links"].forEach(function(link){
		if(link["sourceLabel"] == 'LM0'){
			rootRunTime += link["value"];
		}
	})

	var referenceValue = rootRunTime;

	var secondGraphNodes = [];// = data["nodes"].slice();

	data["nodes"].forEach(function(node){
		var outGoing = 0;
		var inComing = 0;
		var nodeLabel = node["specialID"];

		var tempOBJ = JSON.parse( JSON.stringify(node) );
		secondGraphNodes.push(tempOBJ);

		data["links"].forEach(function(edge){
			if(edge["sourceLabel"] == nodeLabel){
				outGoing += edge["value"];
			}
			else if(edge["targetLabel"] == nodeLabel){
				inComing += edge["value"];
			}
		})

		node["out"] = outGoing;
		node["in"] = inComing;
	});

	// console.log(containerID);
	// console.log(width)

	var formatNumber = d3.format(",.0f"), // zero decimal places
	format = function (d) {
			return formatNumber(d) + " " + units;
		},
	// color = d3.scale.category20();
	// color = d3.scale.category10();
	color = this.colorScale;

	console.log(color)

	var stat = {
		"inTimeMin" : Number.MAX_SAFE_INTEGER,
		"inTimeMax" : 0,
		"exTimeMin" : Number.MAX_SAFE_INTEGER,
		"exTimeMax" : 0,
		"imPercMin" : Number.MAX_SAFE_INTEGER,
		"imPercMax" : 0
	};

	data.nodes.forEach(function(datNode){
		stat["inTimeMin"] = Math.min(stat["inTimeMin"], datNode["inTime"]);
		stat["inTimeMax"] = Math.max(stat["inTimeMax"], datNode["inTime"]);
		stat["exTimeMin"] = Math.min(stat["exTimeMin"], datNode["exTime"]);
		stat["exTimeMax"] = Math.max(stat["exTimeMax"], datNode["exTime"]);
		stat["imPercMin"] = Math.min(stat["imPercMin"], datNode["imPerc"]);
		stat["imPercMax"] = Math.max(stat["imPercMax"], datNode["imPerc"]);
	});

	var inTimeColorScale = d3.scale.quantize().range(colorbrewer.Reds[8]).domain([stat["inTimeMin"], stat["inTimeMax"]]);
	// var inTimeColorScale = d3.scale.linear().domain([ 0,1 ]).range([1, 10]);
	var exTimeColorScale = d3.scale.quantize().range(colorbrewer.Reds[8]).domain([stat["exTimeMin"], stat["exTimeMax"]]);
	var imPercColorScale = d3.scale.quantize().range(colorbrewer.Reds[8]).domain([stat["imPercMin"], stat["imPercMax"]]);
	// console.log(inTimeColorScale(0));
	var svg;
	var sankey;
	var xSpacing = 1;
	var ySpacing = 24;
	var nodeWidth = 17;
	var graph;
	var graph2;

	var treeHeight = height;

	var zoom = d3.behavior.zoom()
				.scaleExtent([0.1,10])
				.on('zoom', zoomed);
	

	function zoomed(){
		svgBase.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");

		// var textScaleValue = 1 + (1/d3.event.scale );

		// var nodeText = node.selectAll('text').attr("transform","scale(" + textScaleValue + ")");
		// console.log(nodeText);
		// console.log(d3.event.scale)
		svgBase2.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");		

	}

	//////////////////////////////Top tree//////////////////////////////////////
	var svgO = d3.select(containerID).append("svg")
		.attr('class', 'sank1')
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", treeHeight + margin.top + margin.bottom)
	    .append("g")
	    .attr("transform",
	            // "translate(" + margin.left + "," + margin.top + ") rotate(90)")
				"translate(" + margin.left + "," + margin.top + ")")

	    .call(zoom);

	//place an invisible rect over the svg to capture all mouse event
	var containerRect = svgO.append('rect')
							.attr('width', width)
							.attr('height', treeHeight)
							.style('fill', "none")
							.style("pointer-events", "all"); //this line is needed to capture the mouse events related to the entire svg		

	var svgBase = svgO.append('g');
	
	svg = svgBase.append('g')
					.attr('transform', "translate(" + 0 + "," + (0) +  ")")

	var defs = svg.append("defs");
	var links = svg.append("g");
	var nodes = svg.append("g");
	/////////////////////////////////////////////////////////////////////////////////////

	//////////////////////////////Bottom Tree////////////////////////////////////////////
	var svgO2 = d3.select(containerID).append("svg")
		.attr('class', 'sank2')
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", 0)
	    .append("g")
	    .attr("transform",
	            // "translate(" + margin.left + "," + margin.top + ") rotate(90)")
				"translate(" + margin.left + "," + margin.top + ")")

	    .call(zoom);
	var containerRect2 = svgO2.append('rect')
							.attr('width', width)
							.attr('height', 0)
							.style('fill', "none")
							.style("pointer-events", "all"); //this line is needed to capture the mouse events related to the entire svg	

	var svgBase2 = svgO2.append('g');
	var svg2 = svgBase2.append('g')

	var defs2 = svg2.append("defs");
	var links2 = svg2.append("g");
	var nodes2 = svg2.append("g");	

	var sankey2;
	/////////////////////////////////////////////////////////////////////////////////////


	////////////////////////////Tool Tip/////////////////////////////////////////////////
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
	var toolTipList = toolTip.append('svg');
	toolTipList.attr('width', "400px")
				.attr('height', "150px")
	var toolTipG = toolTipList.append('g')
					.attr("transform", "translate(" + 5 + "," + 5 + ")");
	/////////////////////////////////////////////////////////////////////////////////////

	function visualize(removeIntermediate){


		// Set the sankey diagram properties
		sankey = d3sankey()
			.nodeWidth(nodeWidth)
		    // .nodeWidth(200)
		    // .nodePaddint(200)
		    .nodePadding(ySpacing)
		    // .size([width, height / 4]);
		    // .size([2200 + 1000, 1500 / 4]);
		    // .size([2200 + 1000, height])
		    .size([width * 0.9, treeHeight])
		    .xSpacing(xSpacing)
		    .setReferenceValue(referenceValue);

		var path = sankey.link();
		// console.log('path', path);
		// load the data
		// graph = {"nodes" : data["nodes"], "links" : data["links"]};

		var graph_zero = {"nodes" : data["nodes"], "links" : data["links"]};
		var graph; // = graph_zero;
		if(removeIntermediate){
			graph = rebuild(graph_zero.nodes, graph_zero.links);
		}
		else{
			graph = graph_zero;
		}
		

		sankey.nodes(graph.nodes)
		    .links(graph.links)
		    .layout(32);

		// console.log(graph.nodes);
		// define utility functions
		function getGradID(d){
		    // return "linkGrad-" + d.source.name + "-" + d.target.name;
		    // console.log(d.source);
		    // return "linkGrad-" + d.source.myID + "-" + d.target.myID;
		    return "linkGrad-" + d.source.sankeyID + "-" + d.target.sankeyID;
		}
		function nodeColor(d) { 
		    return d.color = color(d.name.replace(/ .*/, ""));
		    // return d.color = color(d["lmID"]);
		}
		function positionGrads() {
				    grads.attr("x1", function(d){return d.source.x;})
				        .attr("y1", function(d){return d.source.y;})
				        .attr("x2", function(d){return d.target.x;})
				        .attr("y2", function(d){return d.target.y;});
		}		

		// var grads = defs.selectAll("linearGradient")
		//         .data(graph.links, getGradID);

		// grads.enter().append("linearGradient")
		//         .attr("id", getGradID)
		//         .attr("gradientUnits", "userSpaceOnUse");

		// positionGrads();

		// grads.html("") //erase any existing <stop> elements on update
		//     .append("stop")
		//     .attr("offset", "0%")
		//     .attr("stop-color", function(d){
		//         return nodeColor( (+d.source.x <= +d.target.x)? 
		//                          d.source: d.target) ;

		//     	// return "red";
		//     });

		// grads.append("stop")
		//     .attr("offset", "100%")
		//     .attr("stop-color", function(d){
		//         return nodeColor( (+d.source.x > +d.target.x)? 
		//                          d.source: d.target) 

		//     	// return "blue";
		//     });

		if(removeIntermediate){
			svg.selectAll(".intermediate").remove();
		}

		// add in the links
		var link = links.selectAll(".link")
		    .data(graph.links)

		    link.enter().append("path")
		    .attr("class", function(d){

		    	if(d.source.name == "intermediate" || d.target.name == "intermediate"){
		    		return "link intermediate";
		    	}
		    	else{
		    		return "link";
		    	}
		    	
		    })
		    // .attr("d", path)
		    .attr("d", function(d){
		      	var Tx0 = d.source.x + d.source.dx,
		          	Tx1 = d.target.x,
		          	Txi = d3.interpolateNumber(Tx0, Tx1),
		          	Tx2 = Txi(0.4),
		          	Tx3 = Txi(1 - 0.4),
		          	Ty0 = d.source.y + d.sy,
		          	Ty1 = d.target.y + d.ty;

		          	//note .ty is the y point that the edge meet the target(for top)
		          	//		.sy is the y point of the source  (for top)
		          	//		.dy is width of the edge

		      	var Bx0 = d.source.x + d.source.dx,
		          	Bx1 = d.target.x,
		          	Bxi = d3.interpolateNumber(Bx0, Bx1),
		          	Bx2 = Bxi(0.4),
		          	Bx3 = Bxi(1 - 0.4),
		          	By0 = d.source.y + d.dy + d.sy,
		          	By1 = d.target.y + d.ty + d.dy;

	          	var rightMoveDown = By1 - Ty1;

				return "M" + Tx0 + "," + Ty0
					+ "C" + Tx2 + "," + Ty0
					+ " " + Tx3 + "," + Ty1
					+ " " + Tx1 + "," + Ty1
					+ " " + " v " + rightMoveDown
					+ "C" + Bx3 + "," + By1
					+ " " + Bx2 + "," + By0
					+ " " + Bx0 + "," + By0
		    })
		    // .style("fill", "none")
		    .style("fill", function(d){
		    	// return "url(#" + getGradID(d) + ")";
		    	return "grey";
		    })
		    .style('fill-opacity', 0)
		    .style("stroke", function(d){
		        return "url(#" + getGradID(d) + ")";
		    })
		    // .style("stroke-opacity", "0.4")
		    .style("stroke-opacity", "0.0")
		    .on("mouseover", function() { 
		    	// d3.select(this).style("stroke-opacity", "0.7") 
		    	d3.select(this).style("fill-opacity", "0.7") 

		    } )
		    .on("mouseout", function() { 
		    	// d3.select(this).style("stroke-opacity", "0.4") 
		    	d3.select(this).style("fill-opacity", "0.4") 
		    } )
		    .on('click', function(d){
		    	console.log(d);
		    })
		    // .style("stroke-width", function (d) {
		    //     return Math.max(1, d.dy);
		    // })
		    // .sort(function (a, b) {
		    //     return b.dy - a.dy;
		    // });

		    link.exit().remove();
		//transition for links
		// links.selectAll(".link")
		// 	.data(graph.links)
		// 	.transition()
		// 	.duration(transitionDuration)
		// 	.style('fill-opacity', 0.4);
	    links.selectAll(".link")
	    	.data(graph.links)
	    	.transition()
	    	.duration(transitionDuration)
	    	.style('fill-opacity', 0.4)
	    	.attr('d', function(d){
		      	var Tx0 = d.source.x + d.source.dx,
		          	Tx1 = d.target.x,
		          	Txi = d3.interpolateNumber(Tx0, Tx1),
		          	Tx2 = Txi(0.4),
		          	Tx3 = Txi(1 - 0.4),
		          	Ty0 = d.source.y + d.sy,
		          	Ty1 = d.target.y + d.ty;

		          	//note .ty is the y point that the edge meet the target(for top)
		          	//		.sy is the y point of the source  (for top)
		          	//		.dy is width of the edge

		        // var rightMoveDown = d.target.y + d.dy / 2;

		      	var Bx0 = d.source.x + d.source.dx,
		          	Bx1 = d.target.x,
		          	Bxi = d3.interpolateNumber(Bx0, Bx1),
		          	Bx2 = Bxi(0.4),
		          	Bx3 = Bxi(1 - 0.4),
		          	By0 = d.source.y + d.dy + d.sy,
		          	By1 = d.target.y + d.ty + d.dy;

	          	var rightMoveDown = By1 - Ty1;

				return "M" + Tx0 + "," + Ty0
					+ "C" + Tx2 + "," + Ty0
					+ " " + Tx3 + "," + Ty1
					+ " " + Tx1 + "," + Ty1
					+ " " + " v " + rightMoveDown
					+ "C" + Bx3 + "," + By1
					+ " " + Bx2 + "," + By0
					+ " " + Bx0 + "," + By0		    		
	    	})		

		// add in the nodes
		var node = nodes.selectAll(".node")
		    .data(graph.nodes)
			.enter().append("g")
		    .attr("class", function(d){
		    	if(d.name == "intermediate"){
		    		return "node intermediate";
		    	}
		    	else{
		    		return "node";
		    	}
		    	
		    })
		    .attr('opacity' , 0)
		    .attr("transform", function (d) {
		        return "translate(" + d.x + "," + d.y + ")";
		    });

		// add the rectangles for the nodes
		node.append("rect")
		    .attr("height", function (d) {
		        return d.dy;
		        // return d["inTime"];
		    })
		    .attr("width", sankey.nodeWidth())
		    .style("fill", function (d) {

		    	if(d.name == "intermediate"){
		    		return 'grey'
		    	}
		    	else{
			    	var temp = {"name" : d.name.replace(/ .*/, ""),
							"color" : color(d.name.replace(/ .*/, ""))}
		    		nodeList.push(temp);

		        	return d.color = color(d.name.replace(/ .*/, ""));
		    	}
		        // return d.color = color(d["lmID"]);
		    })
		    // .style("fill-opacity", ".9")
		    .style("fill-opacity", function(d){
		    	if(d.name == "intermediate"){
		    		return '0'
		    	}
		    	else{
		    		return '1';
		    	}		    	
		    })
		    .style("shape-rendering", "crispEdges")
		    .style("stroke", function (d) {
		    	if(d.name != "intermediate"){
		    		return d3.rgb(d.color).darker(2);
		    	}
		    	else{
		    		return 'grey';
		    	}
		        
		    })
		    .style("stroke-width", function(d){
		        if(d.name == "intermediate"){
		        	return 0;
		        }
		        else{
		        	return 1;
		        }		    	
		    })
		    .on("mouseover", function(d) { 
		    	if(d.name != "intermediate"){
			    	toolTipList.attr('width', "400px")
								.attr('height', "150px")	    	
			    	var res = getFunctionListOfNode(d);
			    	toolTipTexts(d,res)
			    	d3.select(this).style("stroke-width", "2");
			    	fadeUnConnected(d);
		    	}
		    } )
		    .on("mouseout", function(d) { 

		    	toolTipList.attr('width', '0px')
		    				.attr('height', '0px')

		    	if(d.name != "intermediate"){
			    	d3.select(this).style("stroke-width", "1");
			    	unFade();
		    	}

				toolTip.style('opacity', 0)
						.style('left', function(){
							return 0;
						})
						.style('top', function(){
							return 0;
						})
		    	toolTipText.html("");

		    	
		    	toolTipG.selectAll('*').remove();		    	
		    } )		    
		    .on('click', function(d){

		    	// splitNode(d);
		    	if(d.name != "intermediate"){
			    	var ret = getFunctionListOfNode(d);
			    	var fromProcToProc = ret["fromProcToProc"];
			    	var nameToIDMap = ret["nameToIDMap"];
			    	var res = {"node" : d, "fromProcToProc" : fromProcToProc, "nameToIDMap" : nameToIDMap};
			    	// clickCallBack(d);
			    	clickCallBack(res);
		    	}
		    })

		node.append("path")
		    .attr('d', function(d){
		    	if(d.name == "intermediate"){
		    		return "m" + 0 + " " + 0
		    				+ "h " + sankey.nodeWidth()
		    				+ "v " + (1)*d.dy
		    				+ "h " + (-1)*sankey.nodeWidth();
		    	}
		    })
			.style("fill", function(d){
		    	// return "url(#" + getGradID(d) + ")";
		    	if(d.name == "intermediate"){
		    		return 'grey'
		    	}
		    })
		    .style('fill-opacity', function(d){
		    	if(d.name == "intermediate"){
		    		return 0.4
		    	}
		    	else{
		    		return 0;
		    	}
		    })
		    .style("stroke", function(d){
		        // return "url(#" + getGradID(d) + ")";
		    	if(d.name == "intermediate"){
		    		return 'grey'
		    	}
		    })
		    .style("stroke-opacity", "0.0") 

		 // node.append("title")
		 //    .text(function (d) {
		 //        return d.name + "\n" + format(d.value);
		 //    });
		node.append("text")
			.attr('dy', '0.35em')
			.attr('x', function(d){
				return sankey.nodeWidth() + 5;
			})
			.attr('y', '10px')
			.style('opacity', 0)
	    	.text(function (d) {
	    		if(d.name != "intermediate"){
	    			return d.name//; + "\n" + format(d.value);
	    		}
	    		else{
	    			return "";
	    		}
	    	});

	    // node.exit().remove();

			// the function for moving the nodes
			function dragmove(d) {
			    d3.select(this).attr("transform",
			        "translate(" + (
			    d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))) + "," + (
			    d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
			    sankey.relayout();
			    link.attr("d", path);
			    positionGrads();
			};

			function hightLightConnected(g){
				link.filter(function(d){return d.source === g;})
					//.style()
			}

			//hide all links not connected to selected node
			function fadeUnConnected(g){
				// link.filter(function(d){ return d.source !==g && d.target !== g; })
				// 	.transition()
				// 		.duration(500)
				// 		.style("opacity", 0.05);

				var thisLink = links.selectAll(".link");
				thisLink.filter(function(d){ return d.source !==g && d.target !== g; })
					.transition()
						.duration(500)
						.style("opacity", 0.05);
			}

			//show all links
			function unFade(){
				// link.transition()
				// 		.duration(500)
				// 		.style("opacity", 1)

				var thisLink = links.selectAll(".link");
				thisLink.transition()
						.duration(500)
						.style("opacity", 1)
			}

		////////////////////////transition for nodes/////////////////////////
	    nodes.selectAll('.node')
	    	.data(graph.nodes)
	    	.transition()
	    	.duration(transitionDuration)
	    	.attr('opacity' , 1)
	    	.attr('transform', function(d){
	    		return "translate(" + d.x + "," + d.y + ")";
	    	})


	    nodes.selectAll("text")
	    	.data(graph.nodes)
	    	.transition()
	    	.duration(transitionDuration)
	  //   	.attr('x', function(d){
			// 	return sankey.nodeWidth() + 5;
			// })
			.text(function (d) {
	    		if(d.name != "intermediate"){
	    			return d.name//; + "\n" + format(d.value);
	    		}
	    		else{
	    			return "";
	    		}
	    	});

	    nodes.selectAll("rect")
	    	.data(graph.nodes)
	    	.transition()
	    	.duration(transitionDuration)
	    	.attr('height',function(d){
	    		return d.dy;
	    	})
		    .style("fill", function (d) {

		    	var temp = {"name" : d.name.replace(/ .*/, ""),
							"color" : color(d.name.replace(/ .*/, ""))}
		    	nodeList.push(temp);

		        return d.color = color(d.name.replace(/ .*/, ""));
		        // return d.color = color(d["lmID"]);
		    })	    	
	    ////////////////////////////////////

		function showLegend(){
			var colLegend = svgO.append('g');
			// console.log(nodeList);
			nodeList.forEach(function(nodeL, idx){
				colLegend.append('rect')
							.attr('height', '20')
							.attr('width', '20')
							.attr('y', idx*20)
							.style('fill', nodeL["color"])
				colLegend.append('text')
							.attr('dy', '0.35em')
							.attr('x', 25)
							.attr('y', idx*20 + 10)
							.text(nodeL["name"]);
			})
		}
		// showLegend(); 
	}

	visualize(true);

	function visualize2(){
		// Set the sankey diagram properties
		sankey2 = d3sankey()
			.nodeWidth(nodeWidth)
		    // .nodeWidth(200)
		    // .nodePaddint(200)
		    .nodePadding(ySpacing)
		    // .size([width, height / 4]);
		    // .size([2200 + 1000, 1500 / 4]);
		    // .size([2200 + 1000, height])
		    .size([width * 0.9, treeHeight])
		    .xSpacing(xSpacing)
		    .setReferenceValue(referenceValue);

		var path = sankey2.link();
		// console.log('path', path);
		// load the data
		// graph2 = {"nodes" : data["nodes"], "links" : data["links"]};

		// console.log(graph.nodes);

		sankey2.nodes(graph2.nodes)
		    .links(graph2.links)
		    .layout(32);

		// console.log(graph.nodes);
		// define utility functions
		function getGradID(d){
		    // return "linkGrad-" + d.source.name + "-" + d.target.name;
		    // console.log(d.source);
		    // return "linkGrad-" + d.source.myID + "-" + d.target.myID;
		    return "linkGrad-" + d.source.sankeyID + "-" + d.target.sankeyID;
		}
		function nodeColor(d) { 
		    return d.color = color(d.name.replace(/ .*/, ""));
		    // return d.color = color(d["lmID"]);
		}
		function positionGrads() {
				    grads.attr("x1", function(d){return d.source.x;})
				        .attr("y1", function(d){return d.source.y;})
				        .attr("x2", function(d){return d.target.x;})
				        .attr("y2", function(d){return d.target.y;});
		}		

		// add in the links
		var link2 = links2.selectAll(".link")
		    .data(graph2.links)
		    .enter().append("path")
		    .attr("class", "link")
		    // .attr("d", path)
		    .attr("d", function(d){
		      	var Tx0 = d.source.x + d.source.dx,
		          	Tx1 = d.target.x,
		          	Txi = d3.interpolateNumber(Tx0, Tx1),
		          	Tx2 = Txi(0.4),
		          	Tx3 = Txi(1 - 0.4),
		          	Ty0 = d.source.y + d.sy,
		          	Ty1 = d.target.y + d.ty;

		          	//note .ty is the y point that the edge meet the target(for top)
		          	//		.sy is the y point of the source  (for top)
		          	//		.dy is width of the edge

		      	var Bx0 = d.source.x + d.source.dx,
		          	Bx1 = d.target.x,
		          	Bxi = d3.interpolateNumber(Bx0, Bx1),
		          	Bx2 = Bxi(0.4),
		          	Bx3 = Bxi(1 - 0.4),
		          	By0 = d.source.y + d.dy + d.sy,
		          	By1 = d.target.y + d.ty + d.dy;

	          	var rightMoveDown = By1 - Ty1;

				return "M" + Tx0 + "," + Ty0
					+ "C" + Tx2 + "," + Ty0
					+ " " + Tx3 + "," + Ty1
					+ " " + Tx1 + "," + Ty1
					+ " " + " v " + rightMoveDown
					+ "C" + Bx3 + "," + By1
					+ " " + Bx2 + "," + By0
					+ " " + Bx0 + "," + By0
		    })
		    // .style("fill", "none")
		    .style("fill", function(d){
		    	// return "url(#" + getGradID(d) + ")";
		    	return "grey";
		    })
		    .style('fill-opacity', 0)
		    .style("stroke", function(d){
		        return "url(#" + getGradID(d) + ")";
		    })
		    .style("stroke-opacity", "0.4")
		    .on("mouseover", function() { 
		    	// d3.select(this).style("stroke-opacity", "0.7") 
		    	d3.select(this).style("fill-opacity", "0.7") 

		    } )
		    .on("mouseout", function() { 
		    	// d3.select(this).style("stroke-opacity", "0.4") 
		    	d3.select(this).style("fill-opacity", "0.4") 
		    } )
		    .on('click', function(d){
		    	console.log(d);
		    })
		    // .style("stroke-width", function (d) {
		    //     return Math.max(1, d.dy);
		    // })
		    .sort(function (a, b) {
		        return b.dy - a.dy;
		    });

		//transition for links
		// links.selectAll(".link")
		// 	.data(graph.links)
		// 	.transition()
		// 	.duration(transitionDuration)
		// 	.style('fill-opacity', 0.4);
	    links2.selectAll(".link")
	    	.data(graph2.links)
	    	.transition()
	    	.duration(transitionDuration)
	    	.style('fill-opacity', 0.4)
	    	.attr('d', function(d){
		      	var Tx0 = d.source.x + d.source.dx,
		          	Tx1 = d.target.x,
		          	Txi = d3.interpolateNumber(Tx0, Tx1),
		          	Tx2 = Txi(0.4),
		          	Tx3 = Txi(1 - 0.4),
		          	Ty0 = d.source.y + d.sy,
		          	Ty1 = d.target.y + d.ty;

		          	//note .ty is the y point that the edge meet the target(for top)
		          	//		.sy is the y point of the source  (for top)
		          	//		.dy is width of the edge

		        // var rightMoveDown = d.target.y + d.dy / 2;

		      	var Bx0 = d.source.x + d.source.dx,
		          	Bx1 = d.target.x,
		          	Bxi = d3.interpolateNumber(Bx0, Bx1),
		          	Bx2 = Bxi(0.4),
		          	Bx3 = Bxi(1 - 0.4),
		          	By0 = d.source.y + d.dy + d.sy,
		          	By1 = d.target.y + d.ty + d.dy;

	          	var rightMoveDown = By1 - Ty1;

				return "M" + Tx0 + "," + Ty0
					+ "C" + Tx2 + "," + Ty0
					+ " " + Tx3 + "," + Ty1
					+ " " + Tx1 + "," + Ty1
					+ " " + " v " + rightMoveDown
					+ "C" + Bx3 + "," + By1
					+ " " + Bx2 + "," + By0
					+ " " + Bx0 + "," + By0		    		
	    	})		

		// add in the nodes
		var node2 = nodes2.selectAll(".node")
		    .data(graph2.nodes)
		    .enter().append("g")
		    .attr("class", "node")
		    .attr('opacity' , 0)
		    .attr("transform", function (d) {
		        return "translate(" + d.x + "," + d.y + ")";
		    });

		// add the rectangles for the nodes
		node2.append("rect")
		    .attr("height", function (d) {
		        return d.dy;
		        // return d["inTime"];
		    })
		    .attr("width", sankey.nodeWidth())
		    .style("fill", function (d) {
		        return d.color = color(d.name.replace(/ .*/, ""));
		        // return d.color = color(d["lmID"]);
		    })
		    // .style("fill-opacity", ".9")
		    .style("fill-opacity", "1")
		    .style("shape-rendering", "crispEdges")
		    .style("stroke", function (d) {
		        return d3.rgb(d.color).darker(2);
		    })
		    .style("stroke-width", '1')
		    .on("mouseover", function(d) { 
		    	var res = getFunctionListOfNode(d);

		    	toolTipTexts(d, res);

		    	d3.select(this).style("stroke-width", "2");
		    	fadeUnConnected(d);
		    } )
		    .on("mouseout", function(d) { 
		    	d3.select(this).style("stroke-width", "1");
		    	unFade();
				toolTip.style('opacity', 0)
						.style('left', function(){
							return 0;
						})
						.style('top', function(){
							return 0;
						})
		    	toolTipText.html("");

		    	
		    	toolTipG.selectAll('*').remove();		    	
		    } )		    
		    .on('click', function(d){

		    	// splitNode(d);
		    	var ret = getFunctionListOfNode(d);
		    	var fromProcToProc = ret["fromProcToProc"];
		    	var nameToIDMap = ret["nameToIDMap"];
		    	var res = {"node" : d, "fromProcToProc" : fromProcToProc, "nameToIDMap" : nameToIDMap};
		    	// clickCallBack(d);
		    	clickCallBack(res);
		    })
		 // node.append("title")
		 //    .text(function (d) {
		 //        return d.name + "\n" + format(d.value);
		 //    });
		node2.append("text")
			.attr('dy', '0.35em')
			.attr('x', function(d){
				return sankey2.nodeWidth() + 5;
			})
			.attr('y', '10px')
			.style('opacity', 0)
	    	.text(function (d) {
	        	return d.name//; + "\n" + format(d.value);
	    	});

			// the function for moving the nodes
			function dragmove(d) {
			    d3.select(this).attr("transform",
			        "translate(" + (
			    d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))) + "," + (
			    d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
			    sankey2.relayout();
			    link2.attr("d", path);
			    positionGrads();
			};

			function hightLightConnected(g){
				link.filter(function(d){return d.source === g;})
					//.style()
			}

			//hide all links not connected to selected node
			function fadeUnConnected(g){
				// link.filter(function(d){ return d.source !==g && d.target !== g; })
				// 	.transition()
				// 		.duration(500)
				// 		.style("opacity", 0.05);

				var thisLink = links2.selectAll(".link");
				thisLink.filter(function(d){ return d.source !==g && d.target !== g; })
					.transition()
						.duration(500)
						.style("opacity", 0.05);
			}

			//show all links
			function unFade(){
				// link.transition()
				// 		.duration(500)
				// 		.style("opacity", 1)

				var thisLink = links2.selectAll(".link");
				thisLink.transition()
						.duration(500)
						.style("opacity", 1)
			}

		////////////////////////transition for nodes/////////////////////////
	    nodes2.selectAll('.node')
	    	.data(graph2.nodes)
	    	.transition()
	    	.duration(transitionDuration)
	    	.attr('opacity' , 1)
	    	.attr('transform', function(d){
	    		return "translate(" + d.x + "," + d.y + ")";
	    	})


	    nodes2.selectAll("text")
	    	.data(graph2.nodes)
	    	.transition()
	    	.duration(transitionDuration)
	  //   	.attr('x', function(d){
			// 	return sankey.nodeWidth() + 5;
			// })
			.text(function (d) {
				console.log(d.name, d.specialID, d)
	        	return d.name//; + "\n" + format(d.value);
	    	});

	    nodes2.selectAll("rect")
	    	.data(graph2.nodes)
	    	.transition()
	    	.duration(transitionDuration)
	    	.attr('height',function(d){
	    		return d.dy;
	    	})
		    .style("fill", function (d) {
		        return d.color = color(d.name.replace(/ .*/, ""));
		        // return d.color = color(d["lmID"]);
		    })	    	
	    ////////////////////////////////////

		function showLegend(){
			var colLegend = svgO.append('g');
			// console.log(nodeList);
			nodeList.forEach(function(nodeL, idx){
				colLegend.append('rect')
							.attr('height', '20')
							.attr('width', '20')
							.attr('y', idx*20)
							.style('fill', nodeL["color"])
				colLegend.append('text')
							.attr('dy', '0.35em')
							.attr('x', 25)
							.attr('y', idx*20 + 10)
							.text(nodeL["name"]);
			})
		}
	}

	// this.updateData = function(newData){
	// 	data = newData;

	// 	// console.log(data["nodes"]);
	// 	// console.log(data["edges"]);

	// 	$(containerID).empty();

	// 	visualize();		
	// }

	this.changeNodeColor = function(option){

		if(option != nodeColorOption){

			if(option == 0){
				d3.selectAll('.node rect')
					.style("fill", function (d) {
				        return d.color = color(d.name.replace(/ .*/, ""));
				        // return d.color = color(d["lmID"]);
				    })
			}
			else if(option == 1){
				d3.selectAll('.node rect')
					.style("fill", function (d) {
				        return d.color = inTimeColorScale(d.inTime);
				    })
			}
			else if(option == 2){
				d3.selectAll('.node rect')
					.style("fill", function (d) {
				        return d.color = exTimeColorScale(d.exTime);
				    })
			}
			else if(option == 3){
				d3.selectAll('.node rect')
					.style("fill", function (d) {
				        return d.color = imPercColorScale(d["imPerc"]);
				    })				
								
			}

		}

		nodeColorOption = option;
	}

	this.changeXSpacing = function(value){
		xSpacing = value;
		// console.log(graph.nodes);
		sankey.setXSpacing(xSpacing);
		sankey.nodes(graph.nodes)
		    .links(graph.links)
		    .layout(32)

		sankey.relayout();

		// console.log(d3.selectAll('.node'));
		// // d3.selectAll('.node').data(graph.nodes).enter();
		// console.log(d3.selectAll('.node'));

		//there is no need to update the data since the data is pass by ref
		d3.selectAll('.node')
			.transition().duration(750)
			.attr("transform", function (d) {
		        return "translate(" + d.x + "," + d.y + ")";
		    });

		path = sankey.link();    

		d3.selectAll('linearGradient')
			.attr("x1", function(d){return d.source.x;})
	        .attr("y1", function(d){return d.source.y;})
	        .attr("x2", function(d){return d.target.x;})
	        .attr("y2", function(d){return d.target.y;});		
		d3.selectAll('.link')
			.transition().duration(750)
			.attr('d', path);

	}

	this.changeYSpacing = function(value){
		ySpacing = value;
		// console.log(ySpacing);
		sankey.nodePadding(ySpacing);
		// sankey.setXSpacing(xSpacing);


		// sankey.nodes(graph.nodes)
		//     .links(graph.links)
		//     .layout(100);
		sankey.layout(100);
		sankey.relayout();

		d3.selectAll('.node')
			.transition().duration(750)
			.attr("transform", function (d) {
		        return "translate(" + d.x + "," + d.y + ")";
		    });

		de.selectAll('.node rect')   
			.attr("height", function (d) {
		        return d.dy;
		        // return d["inTime"];
		    })
		    .attr("width", sankey.nodeWidth())

		path = sankey.link();    

		d3.selectAll('linearGradient')
			.attr("x1", function(d){return d.source.x;})
	        .attr("y1", function(d){return d.source.y;})
	        .attr("x2", function(d){return d.target.x;})
	        .attr("y2", function(d){return d.target.y;});		
		d3.selectAll('.link')
			.transition().duration(750)
			.attr('d', path);		
	}

	this.updateData = function(newData){
		data["nodes"] = newData["nodes"];
		data["links"] = newData["links"];
		toolTipData = newData["toolTipData"];

		secondGraphNodes = [];

		data["nodes"].forEach(function(node){
			var outGoing = 0;
			var inComing = 0;

			var tempOBJ = JSON.parse( JSON.stringify(node) );
			secondGraphNodes.push(tempOBJ);

			var nodeLabel = node["specialID"];
			data["links"].forEach(function(edge){
				if(edge["sourceLabel"] == nodeLabel){
					outGoing += edge["value"];
				}
				else if(edge["targetLabel"] == nodeLabel){
					inComing += edge["value"];
				}
			})

			node["out"] = outGoing;
			node["in"] = inComing;
		});		

		treeHeight = height;

		d3.select(containerID).select('svg.sank1').attr("height", treeHeight + margin.top + margin.bottom);
		containerRect.attr('height', treeHeight);
		d3.select(containerID).select('svg.sank2').attr("height", 0);
		containerRect2.attr('height', 0);

		referenceValue = rootRunTime;

		visualize(true);

		console.log(data["nodes"]);
	}	

	this.changeProcessSelect = function(newEdgeData){
		treeHeight = height / 2;
		d3.select(containerID).select('svg.sank1').attr("height", treeHeight + margin.top + margin.bottom);
		containerRect.attr('height', treeHeight);
		data["links"] = newEdgeData["brush"];

		var maxEdge1 = 0;
		data["nodes"].forEach(function(node){
			var outGoing = 0;
			var inComing = 0;
			var nodeLabel = node["specialID"];
			data["links"].forEach(function(edge){
				if(edge["sourceLabel"] == nodeLabel){
					outGoing += edge["value"];
				}
				else if(edge["targetLabel"] == nodeLabel){
					inComing += edge["value"];
				}
				maxEdge1 = Math.max(maxEdge1, edge['value']);
			})

			node["out"] = outGoing;
			node["in"] = inComing;
		});	

		// console.log(data["nodes"]);
		strip_intermediate(data["nodes"], data["links"])

		
		var newEdges = newEdgeData["nonBrush"];
		var maxEdge2 = 0;
		secondGraphNodes.forEach(function(node){
			var outGoing = 0;
			var inComing = 0;
			var nodeLabel = node["specialID"];
			newEdges.forEach(function(edge){
				if(edge["sourceLabel"] == nodeLabel){
					outGoing += edge["value"];
				}
				else if(edge["targetLabel"] == nodeLabel){
					inComing += edge["value"];
				}
				maxEdge2 = Math.max(maxEdge2, edge["value"]);
			})

			node["out"] = outGoing;
			node["in"] = inComing;
			node["second"] = "sup"

		});	

		//strip_intermediate(secondGraphNodes, newEdges)

		referenceValue = Math.max(maxEdge1, maxEdge2);

		graph2 = {"nodes" : secondGraphNodes, "links" : newEdges};
		d3.select(containerID).select('svg.sank2').attr("height", treeHeight + margin.top + margin.bottom);
		containerRect2.attr('height', treeHeight);

		visualize(true);
		visualize2(true);		
	}

	this.updateSize = function(size){
		containerWidth = size["width"];
		containerHeight = size["height"];
		width = containerWidth - margin.left - margin.right;
		height = containerHeight - 2*margin.top - 2*margin.bottom;	

		if(graph2){
			treeHeight = height / 2;
		}
		else{
			treeHeight = height;
		}
		d3.select(containerID).select('svg.sank1')
			.attr("height", treeHeight + margin.top + margin.bottom)
			.attr("width", width + margin.left + margin.right)
		containerRect.attr('height', treeHeight)
					.attr('width', width);
		visualize(false);

		if(graph2){
			d3.select(containerID).select('svg.sank2')
				.attr("height", treeHeight + margin.top + margin.bottom)
				.attr("width", width + margin.left + margin.right);
			containerRect2.attr('height', treeHeight)
							.attr('width', width);
			visualize2(false);				
		}

	}

	function splitNode(node){

		$.ajax({
            type:'GET',
            contentType: 'application/json',
            dataType: 'json',
            url: '/splitNodeMultiLevel',
            data: {"nodeID" : node.myID, "lmID" : node.lmID , "nodeLevel" : node.oldLevel, "offset": (node.oldLevel - node.level)},
            success: function(newData){
                //somecoment
            	var offSet = 0;
            	var nodes = newData["nodes"];
            	var edges = newData["edges"];
            	var myNodes = [];

            	var levelOffSet = 0;

            	// console.log(nodes[])

				var treeLevel = Object.keys(nodes);
				treeLevel.forEach(function(myLevel){
					var myLM = Object.keys(nodes[myLevel]);

					if(myLM.length == 0){
						levelOffSet += 1;
					}

					myLM.forEach(function(loadMod){

						var tempObj = nodes[myLevel][loadMod];
						tempObj.level = tempObj.level - levelOffSet;

						myNodes.push(tempObj);
					})
				});

				// console.log(data["nodes"]);


				data = {"nodes": myNodes, "links": edges};

				// console.log(data["nodes"]);
				// console.log(data["edges"]);

				$(containerID).empty();

				visualize();

				// var sankeyVis = new Sankey({
				// 	ID: "#tree",
				// 	width: 2200,
				// 	height: 1500,
				// 	margin: {top: 10, right: 10, bottom: 10, left: 10},
				// 	data: {"nodes": myNodes, "links": edges}
				// })

            },
            error: function(){
            	console.log("There was problem with getting the data");
            }	
		})			
	}

	function getFunctionListOfNode(d){
		var sankeyNodeList = d["sankeyNodeList"];
		var uniqueNodeIDList = d["uniqueNodeID"];

		// console.log(d);

		//get the final nodes that we are connected to
		var sourceLabel = [];
		var sourceID = [];
		// console.log(edges);
		edges.forEach(function(edge){
			
			if(edge["targetID"] == d["sankeyID"]){
				// console.log(edge);
				// console.log(edge);
				if(sourceLabel.indexOf(edge["sourceLabel"]) ==-1) {
					sourceLabel.push( edge["sourceLabel"] );
				}
	    		if(sourceID.indexOf(edge["sourceID"]) == -1){
					sourceID.push(edge["sourceID"]);
				}
			}
		});
		// console.log(sourceLabel, sourceID);

		var myParent = [];
		//get uniqueNodeID of parent
		var parUniqueNodeID = [];
		data.nodes.forEach(function(node){
			if(sourceID.indexOf(node["sankeyID"]) >-1 ){
				myParent.push(node);
				// console.log(node);
				node["uniqueNodeID"].forEach(function(nodeID){
					parUniqueNodeID.push(nodeID)
				})
			}
		})
		
		// console.log(sankeyNodeList, uniqueNodeIDList, parUniqueNodeID);
		var connectivity = {};
		var temp = 0;
		var nameToIDMap = {};
		sankeyNodeList.forEach(function(sankID){
			// console.log(toolTipData["nodeList"][sankID]);
			var connectionInfo = toolTipData["edgeList"][sankID];
			connectionInfo.forEach(function(connInfo){
				if(uniqueNodeIDList.indexOf(connInfo["nodeID"]) > -1 
					&& parUniqueNodeID.indexOf(connInfo["parentNodeID"]) > -1
					&& (connInfo["type"] == "PR" || connInfo["type"] == "PF")
					){
					// console.log(connInfo);
	    			var parentProcName = connInfo["parentProcedureName"];
	    			if(connectivity[parentProcName] == null){
	    				connectivity[parentProcName] = {
	    					"name" : parentProcName,
	    					"loadModule" : connInfo["parentLoadModuleName"],
	    					"procedureNameList" : {}
	    				}
	    			}
	    			var procedureName = connInfo["procedureName"];
	    			nameToIDMap[procedureName] = connInfo["procID"];
	    			// if(connectivity[parentProcName]["procedureNameList"].indexOf(procedureName) == -1){
	    			// 	connectivity[parentProcName]["procedureNameList"].push(procedureName);
	    			// }
	    			if(connectivity[parentProcName]["procedureNameList"][procedureName] == null){
	    				connectivity[parentProcName]["procedureNameList"][procedureName] = 0;
	    			}
	    			connectivity[parentProcName]["procedureNameList"][procedureName] += connInfo["value"];
	    			temp += connInfo["value"]
				}
			});
		});

		// console.log(connectivity);
		// console.log(temp, d["runTime"]);

		var fromProcToProc = [];
		Object.keys(connectivity).forEach(function(fromProc){
			Object.keys(connectivity[fromProc]["procedureNameList"]).forEach(function(toProc){
				var temp = {
					"fromProc" : fromProc,
					"fromLM" : connectivity[fromProc]["loadModule"],
					"toProc" : toProc,
					"toLM" : d["name"],
					"value" : connectivity[fromProc]["procedureNameList"][toProc]
				}
				// console.log(temp);
				fromProcToProc.push(temp);
			})
		})

		fromProcToProc.sort(function(a,b){
			return b["value"] - a["value"];
		});
		var temp = 0;
		fromProcToProc.forEach(function(ft){
			// console.log(ft["value"] / 36644360084 * 100);
			temp += ft["value"] / rootRunTime * 100
		})
		// console.log(temp);

		var res = {"fromProcToProc" : fromProcToProc, "nameToIDMap" : nameToIDMap }
		// console.log(fromProcToProc)
		return res;
	}

	function toolTipTexts(node, data){
    	var fromProcToProc = data["fromProcToProc"];
    	var numberOfConn = Math.min(fromProcToProc.length, 10);
    	var svgScale = d3.scale.linear().domain([2,11]).range([50, 150]);
    	toolTipList.attr('height', svgScale(numberOfConn) + "px");
    	var mousePos = d3.mouse(d3.select(containerID).node()); 
    	toolTip.style('opacity', 1)
				.style('left', function(){
					// console.log(mousePos[0]);
					if(mousePos[0]  + 10 + 500 > width){
						return (mousePos[0] - 500) + 'px';
					}
					else if( mousePos[0] < 100 ){
						return (mousePos[0] ) + 'px'
					}
					else{
						return (mousePos[0]  - 200) + 'px';
					}
				})
				.style('top', function(){
					return (mousePos[1] + 50) + "px";
				})
    	toolTipText.html("Name: " + node.name);

    	var textLength = 100;
    	var rectWidth = "5px";

    	toolTipG.selectAll('*').remove();
    	for(var tIndex = 0; tIndex < numberOfConn; tIndex++){
    		var yOffset = tIndex * 10;
	    	toolTipG.append('rect')
	    			.attr('width' , rectWidth)
	    			.attr('height', '5px')
	    			.attr('y', yOffset + 'px' )
	    			.style('fill', color(fromProcToProc[tIndex]["fromLM"]))
	    	var fpName = fromProcToProc[tIndex]["fromProc"];
	    	toolTipG.append('text')
	    			.attr('x', "10")
	    			.attr( 'y', (yOffset + 5) + "px" )
	    			.text(fpName.trunc(20))
	    	toolTipG.append('text')
	    			.attr('x', "150")
	    			.attr( 'y',(yOffset + 5) + "px")
	    			.text("->")
	    	toolTipG.append('rect')
	    			.attr('width' , rectWidth)
	    			.attr('height', '5px')
	    			.attr('x', '170px')
	    			.attr('y', yOffset + 'px' )
	    			.style('fill', color(fromProcToProc[tIndex]["toLM"]))
	    	toolTipG.append('text')
	    			.attr('x', "180px")
	    			.attr( 'y',(yOffset + 5) + "px")
	    			.text(fromProcToProc[tIndex]["toProc"].trunc(20))
	    	// var timeInfo = fromProcToProc[0]["value"] + " (" + (fromProcToProc[0]["value"] / 36644360084 * 100 ) + "%)"
	    	var timeInfo = (fromProcToProc[tIndex]["value"] / rootRunTime * 100).toFixed(3) + '%'
	    	toolTipG.append('text')
	    			.attr('x', "320")
	    			.attr( 'y',(yOffset + 5) + "px")
	    			.text(timeInfo)
    	}

	}

	//////////////////Added in for edge crossing//////////////////////////////

    // From sankey, but keep indices as indices
    // Populate the sourceLinks and targetLinks for each node.
    // Also, if the source and target are not objects, assume they are indices.
    function computeNodeLinks(nodes, links) {
        nodes.forEach(function(node) {
        node.sourceLinks = [];
        node.targetLinks = [];
        });
        links.forEach(function(link) {
        var source = link.source,
          target = link.target;
        nodes[source].sourceLinks.push(link);
        nodes[target].targetLinks.push(link);
        });
    }

    // computeNodeBreadths from sankey re-written to use indexes
    // Iteratively assign the breadth (x-position) for each node.
    // Nodes are assigned the maximum breadth of incoming neighbors plus one;
    // nodes with no incoming links are assigned breadth zero, while
    // nodes with no outgoing links are assigned the maximum breadth.
    function computeNodeBreadths(nodes,links) {
        var remainingNodes = nodes.map(function(d) { return d.sankeyID })
        var nextNodes
        var x = 0

        // console.log(nodes);

        while (remainingNodes.length) {
            nextNodes = [];
            remainingNodes.forEach(function(node) {
                nodes[node].x = x;
                nodes[node].sourceLinks.forEach(function(link) {
                    if (nextNodes.indexOf(link.target) < 0) {
                        nextNodes.push(link.target);
                    }
                });
            });
            remainingNodes = nextNodes;
            ++x;
        }
    }

    // Add nodes and links as needed
    function rebuild(nodes, links) {
        var temp_nodes = nodes.slice()
        var temp_links = links.slice()
        computeNodeLinks(temp_nodes, temp_links)
        computeNodeBreadths(temp_nodes, temp_links)
        for (var i = 0; i < temp_links.length; i++) {
        	// console.log(temp_links[i]);
            var source = temp_links[i].source
            var target = temp_links[i].target
            var source_x = nodes[source].x
            var target_x = nodes[target].x
            var dx = target_x - source_x
            // Put in intermediate steps
            for (var j = dx; 1 < j; j--) {
                var intermediate = nodes.length
                // console.log(intermediate, temp_links.length, dx, target_x, source_x, nodes[i], source, target);
                console.log(nodes[i], i, nodes.length, temp_links.length);
                var tempNode = {
                    sankeyID: intermediate,
                    name: "intermediate",
                    // runTime: nodes[i].runTime
                }
                // console.log(tempNode)
                nodes.push(tempNode)
                links.push({
                    source: intermediate,
                    target: (j == dx ? target : intermediate-1),
                    value: links[i].value
                })
                if (j == dx) {
                    links[i].original_target = target
                    links[i].last_leg_source = intermediate
                }
                links[i].target = intermediate
            }
        }

        // console.log({
        //     nodes: nodes.slice(),
        //     links: links.slice()
        // })

        return {
            nodes: nodes,
            links: links
        }
    }
 
    function strip_intermediate(nodes, links) {
        for (var i = links.length-1; i >= 0; i--) {
            var link = links[i]
            if (link.original_target) {
                var intermediate = nodes[link.last_leg_source];

                if(link["intermediateTargets"] == null){
                	link["intermediateTargets"] = [];
                }
                var temp = {
                	"x" : nodes[link.last_leg_source].x,
                	"y" : nodes[link.last_leg_source].y,
                	"nodeHeight" : nodes[link.last_leg_source].dy

               	}
               	link["intermediateTargets"].push(temp);
            }
        }

        for (var i = links.length-1; i >= 0; i--) {
            var link = links[i]
            if (link.original_target) {
                var intermediate = nodes[link.last_leg_source];
                link.target = nodes[link.original_target]
                link.ty = intermediate.sourceLinks[0].ty
            }
        }

        // console.log(links);

        for (var i = links.length-1; i >= 0; i--) {
            var link = links[i]
            if (link.source.name == "intermediate") {
                links.splice(i, 1)
            }
        }
        for (var i = nodes.length-1; i >= 0; i--) {
            if (nodes[i].name == "intermediate") {
                nodes.splice(i, 1)
            }
        }
    }    



	//////////////////////////////////////////////////////////////////////////	

}
