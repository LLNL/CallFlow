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

function singleSankey(args){
    var containerID = args.ID || "body",
	    containerWidth = args.width || 900,
	    containerHeight = args.height || 900,
	    margin = args.margin || {top: 10, right: 30, bottom: 10, left: 10},
	    data = args.data,
	    toolTipData = args.toolTipData,
        //	histogramData = args.histogramData,
	    // spinner = args.spinner,
	    clickCallBack = args.clickCallBack,
	    maxNodeSize = args.maxNodeSize;    
    
    this.colorScale = args.colorScale || d3.scale.category20();
    var width = containerWidth - margin.left - margin.right;
    var height = containerHeight - 2*margin.top - 2*margin.bottom;
    var units = "Widgets";
    var maxInc = 0;
    var minInc = Number.MAX_SAFE_INTEGER;
    var maxExc = 0;
    var minExc = Number.MAX_SAFE_INTEGER;
    var incColorScale;
    var excColorScale;
    var nRangeColorScale;
    var diffColorScale;
    var nodeColorOption = 1;
    var colorArray = ["red", "green", "yellow", "blue", "black", "white"];
    var nodeList = [];
    var transitionDuration = 2000;
    var rootRunTime = [];
    var rootRunTime1 = 0;
    var rootRunTime2 = 0;
    var gMinInc;
    var gMaxInc;
    var gMinExc;
    var gMaxExc;
    var minHeightForText = 50;
    var textTruncForNode = 8;
    let graphID = data['graphID'];

    var referenceValue = rootRunTime;

    var formatNumber = d3.format(",.0f"), // zero decimal places
	    format = function (d) {
	        return formatNumber(d) + " " + units;
	    },
	    color = this.colorScale;


o    var stat = {
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
    var exTimeColorScale = d3.scale.quantize().range(colorbrewer.Reds[8]).domain([stat["exTimeMin"], stat["exTimeMax"]]);
    var imPercColorScale = d3.scale.quantize().range(colorbrewer.Reds[8]).domain([stat["imPercMin"], stat["imPercMax"]]);
    

 

    function visualize(removeIntermediate){
	    //remove all histograms
	    histograms.selectAll("*").remove();
	    if(removeIntermediate){
	        svg.selectAll(".intermediate").remove();
	    }

	    // add in the links
	    
	    // add in the nodes

	    // the function for moving the nodes
	    function dragmove(d) {
	        d3.select(this).attr("transform",
			                     "translate(" + (
				                     d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))) + "," + (
					                     d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
	        sankey.relayout();
	        link.attr("d", path);
	        // positionGrads();
	    };

	    function hightLightConnected(g){
	        link.filter(function(d){return d.source === g;})
	        //.style()
	    }

	    //hide all links not connected to selected node
	    function fadeUnConnected(g){
	        var thisLink = links.selectAll(".link");
	        thisLink.filter(function(d){ return d.source !==g && d.target !== g; })
		        .transition()
		        .duration(500)
		        .style("opacity", 0.05);
	    }

	    //show all links
	    function unFade(){
	        var thisLink = links.selectAll(".link");
	        thisLink.transition()
		        .duration(500)
		        .style("opacity", 1)
	    }

	    var drawHist = false;
	    if(drawHist){
	        graph.nodes.forEach(function(node){
		        if(node.name != "intermediate"){

		            var histoData = histogramData["histogramData"][node.specialID];

		            var myXvals = histoData["xVals"];
		            var myFreq = histoData["freq"];

		            var myHist = histograms.append('g')
			            .attr('transform', function(){
			                return "translate(" + node.x + "," + (node.y - ySpacing) + ")";
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
			                // height - y(d);
			                return minimapYScale(d);
			            })
			            .attr('width', function(d){
			                // return width/hData.length - 1.0;
			                return minimapXScale.rangeBand();
			            })
			            .attr('height', function(d){
			                return (ySpacing - 5) - minimapYScale(d);
			            })
			            .attr('fill', 'steelblue')
			            .attr('opacity', 1)
			            .attr('stroke-width', function(d,i){
			                
			                return "0.2px";
			                
			            })
			            .attr('stroke', function(d,i){
			                return "black"		             	
			            });
		        }
	        })
	    }


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
    
    this.changeNodeColor = function(option){

	    if(option != nodeColorOption){

	        nodeColorOption = option;

	        d3.selectAll('.node rect')
		        .style('fill', function(d){
		            return d.color = setNodeColor(d);
		        })
	    }

	    if(nodeColorOption == 1){
	        return [minInc, maxInc];
	    }
	    else if(nodeColorOption == 2){
	        return [minExc, maxExc];
	    }

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
	    graph2 = null;
	    resetStat();
	    data["nodes"] = newData["nodes"];
	    data["links"] = newData["links"];
	    toolTipData = newData["toolTipData"];
	    histogramData = newData["histogramData"];

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
	        node["inclusive"] = Math.max(inComing, outGoing);
	        node["exclusive"] = Math.max(inComing, outGoing) - outGoing;
	        calcStat(node["inclusive"], node["exclusive"]);
	    });
	    
	    treeHeight = height;
	    d3.select(containerID).select('svg.sank1').attr("height", treeHeight + margin.top + margin.bottom);
	    containerRect.attr('height', treeHeight);
	    d3.select(containerID).select('svg.sank2').attr("height", 0);
	    containerRect2.attr('height', 0);
	    
	    referenceValue = rootRunTime;
	    computeColorScale();
	    visualize(true);
    }	

    this.changeProcessSelect = function(newEdgeData){
	    resetStat();

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

	        node["inclusive"] = Math.max(inComing, outGoing);
	        node["exclusive"] = Math.max(inComing, outGoing) - outGoing;

	        calcStat(node["inclusive"], node["exclusive"]);
	        // console.log(node["inclusive"]);

	        if(node['specialID'] == 'LM0' || node['specialID'] == "0"){
		        rootRunTime1 = node["inclusive"];
	        }
	    });	

	    strip_intermediate(data["nodes"], data["links"])
	    // console.log(data["links"]);
	    
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

	        node["inclusive"] = Math.max(inComing, outGoing);
	        node["exclusive"] = Math.max(inComing, outGoing) - outGoing;
	        calcStat(node["inclusive"], node["exclusive"]);
            
	        if(node['specialID'] == 'LM0' || node['specialID'] == "0"){
		        rootRunTime2 = node["inclusive"];
	        }

	    });	

	    data["nodes"].forEach(function(node){
	        node.diff = 0;
	        secondGraphNodes.some(function(sNode){
		        if(sNode["specialID"] == node["specialID"]){
		            var diff = (node["inclusive"] - sNode["inclusive"]) / node["inclusive"];
		            sNode.diff = diff;
		            node.diff = (sNode["inclusive"] - node["inclusive"]) / sNode["inclusive"]
		            return true;
		        }
	        })
	    })

	    referenceValue = Math.max(maxEdge1, maxEdge2);

	    graph2 = {"nodes" : secondGraphNodes, "links" : newEdges};

	    strip_intermediate(graph2["nodes"], graph2["links"])

	    d3.select(containerID).select('svg.sank2').attr("height", treeHeight + margin.top + margin.bottom);
	    containerRect2.attr('height', treeHeight);

	    computeColorScale();

	    visualize(true);
	    visualize2(true);	
    }

    this.updateSize = function(size){
	    if(containerWidth != size["width"] || containerHeight != size["height"]){
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
	        visualize();

	        if(graph2){
		        d3.select(containerID).select('svg.sank2')
		            .attr("height", treeHeight + margin.top + margin.bottom)
		            .attr("width", width + margin.left + margin.right);
		        containerRect2.attr('height', treeHeight)
		            .attr('width', width);
		        visualize2();				
	        }
	    }
    }

    this.setGlobalRange = function(option, minVal, maxVal){
	    if(option == 1){

	        if(minVal){
		        gMinInc = minVal * 1000000;
	        }
	        if(maxVal){
		        gMaxInc = maxVal * 1000000;
	        }

	    }

	    else if(option == 2){
	        if(minVal){
		        gMinExc = minVal * 1000000;
	        }
	        if(maxVal){
		        gMaxExc = maxVal * 1000000;
	        }			
	    }

	    computeColorScale();
	    d3.selectAll('.node rect')
	        .style('fill', function(d){
		        return d.color = setNodeColor(d);
	        })		

    }

    function getFunctionListOfNode(d){
	    var sankeyNodeList = d["sankeyNodeList"];
	    var uniqueNodeIDList = d["uniqueNodeID"];


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
            //	    console.log(connectionInfo, toolTipData["edgeList"], sankID);
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
	    	        nameToIDMap[procedureName] = connInfo["procID"] || connInfo["procedureID"];
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
		        fromProcToProc.push(temp);
	        })
	    })

	    fromProcToProc.sort(function(a,b){
	        return b["value"] - a["value"];
	    });
	    var temp = 0;
	    
	    var res = {"fromProcToProc" : fromProcToProc, "nameToIDMap" : nameToIDMap , "rootRunTime" : rootRunTime}
	    return res;
    }

    function getFunctionListOfNode2(d){
	    var sankeyNodeList = d["sankeyNodeList"];
	    var uniqueNodeIDList = d["uniqueNodeID"];


	    //get the final nodes that we are connected to
	    var sourceLabel = [];
	    var sourceID = [];
	    
	    edges.forEach(function(edge){
	        
	        if(edge["targetID"] == d["sankeyID"]){
		        if(sourceLabel.indexOf(edge["sourceLabel"]) ==-1) {
		            sourceLabel.push( edge["sourceLabel"] );
		        }
	    	    if(sourceID.indexOf(edge["sourceID"]) == -1){
		            sourceID.push(edge["sourceID"]);
		        }
	        }
	    });

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
	    // sankeyNodeList.forEach(function(sankID){
	    //	console.log(toolTipData);
	    var connectionInfo = toolTipData["connInfo"][ d["specialID"] ];
        //	console.log(connectionInfo, toolTipData);
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
	    	    nameToIDMap[procedureName] = connInfo["procID"] || connInfo["procedureID"];
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
	    // });

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

	    var res = {"fromProcToProc" : fromProcToProc, "nameToIDMap" : nameToIDMap , "rootRunTime" : rootRunTime}
	    // console.log(fromProcToProc)
	    return res;
    }



    function toolTipTexts(node, data, runTimeR){
    	var fromProcToProc = data["fromProcToProc"];
    	var numberOfConn = Math.min(fromProcToProc.length, 10);
    	var svgScale = d3.scale.linear().domain([2,11]).range([50, 150]);
    	toolTipList.attr('height', svgScale(numberOfConn) + "px");
    	var mousePos = d3.mouse(d3.select(containerID).node()); 
    	toolTip.style('opacity', 1)
	        .style('left', function(){
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
    	toolTipText.html("Name: " + node.name +		
    			         "<br> Inclusive Time: " + (node['inclusive'] * 0.000001 ).toFixed(3) + "s - " +  (node['inclusive']/ runTimeR * 100 ).toFixed(3) + "%" + 
			             "<br> Exclusive Time: " + (node['exclusive'] * 0.000001 ).toFixed(3)  + "s - " + (node["exclusive"] / runTimeR * 100).toFixed(3) + "%" );


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

    // Add nodes and links as needed
    function rebuild(nodes, links) {
        var temp_nodes = nodes.slice()
        var temp_links = links.slice()
        computeNodeLinks(temp_nodes, temp_links)
        computeNodeBreadths(temp_nodes, temp_links)
        for (var i = 0; i < temp_links.length; i++) {
            var source = temp_links[i].sourceID;
            var target = temp_links[i].targetID;
            var source_x = nodes[source].x
            var target_x = nodes[target].x
            var dx = target_x - source_x
            // Put in intermediate steps
            for (var j = dx; 1 < j; j--) {
                var intermediate = nodes.length
                var tempNode = {
                    sankeyID: intermediate,
                    name: "intermediate",
                    // runTime: nodes[i].runTime
                }
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
}

function nodeClickCallBack(res){
    $("#info_view").empty();

    var node = res["node"];
    var fromProcToProc = res["fromProcToProc"];
    var nodeInfo = d3.select("#info_view")
	    .append('p');

    nodeInfo.html(
	    "Name : " + node.name +
	        "<br> Incoming: " + node['in'] + 
	        "<br> Outgoing: " + node["out"] + 
	        // "<br> Imbalance Percent: " + (node["imPerc"] * 100).toFixed(2) + "%"
	        ""
    );

    var uniqueNodeIDList = node["uniqueNodeID"];
    getHistogramScatterData(node);

    var tempList = {};
    var nameToIDMap = res["nameToIDMap"];
    fromProcToProc.forEach(function(fromTo){
	    var funcName = fromTo["toProc"];
	    if(tempList[funcName] == null){
	        tempList[funcName] = {"name" : funcName, "value" : 0, "procID" : nameToIDMap[funcName]};
	    }
	    tempList[funcName]["value"] += fromTo["value"];
    });

    getList(node);

    var parentProcList = {};
    
    fromProcToProc.forEach(function(fromTo){
	    var parentLabel = fromTo["fromLM"];

	    if(parentProcList[parentLabel] == null){
	        parentProcList[parentLabel] = [];
	    }
	    var funcName = fromTo["toProc"];
	    // console.log(funcName);
	    var procID = nameToIDMap[funcName];
	    if(parentProcList[parentLabel].indexOf(procID) == -1){
	        parentProcList[parentLabel].push(procID);
	    }
    });
    // console.log("proc ids by parent are,", parentProcList, node.name);
    // console.log(node.specialID);
    currentClickNode = {"nodeLabel" : node.name, "nodeSpecialID" : node.specialID};
    document.getElementById("splitNodeByParentBtr").disabled = false;
    // splitNodeByParents(parentProcList, node.name);
}
