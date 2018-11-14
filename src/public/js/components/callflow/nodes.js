import { getHistogramData, getFunctionLists } from '../../routes'
import Color from './color.js'

function calcTextSize(text) {
    if (!d3) return;
    var container = d3.select('body').append('svg');
    container.append('text').attr({ x: -99999, y: -99999 }).text(text);
    var size = container.node().getBBox();
    container.remove();
    return { width: size.width, height: size.height };
}

function drawNodes(graph, view){
    let node = view.nodes.selectAll(".node")
	.data(graph.nodes)
	.enter().append("g")
	.attr("class", function(d){
	    if(d.name == "intermediate" || d.name[0][d.name[0].length - 1] == '_'){
		return "node intermediate";
	    }
	    else{
		return "node";
	    }		    	
	})
	.attr('opacity' , 0)
	.attr("transform", function (d) {
	    if(d.name != "intermediate"){
		return "translate(" + d.x + "," + d.y + ")";
	    }
	    else{
		return "translate(0,0)";
	    }
	})

    view.nodes.selectAll('.node')
	.data(graph.nodes)
	.transition()
	.duration(view.transitionDuration)
	.attr('opacity' , 1)
	.attr('transform', function(d){
	    return "translate(" + d.x + "," + d.y + ")";
	})

    drawRectangle(node, graph, view)
    drawPath(node, graph, view)
    drawText(node, graph, view)
}


function clearNodes(view){
    view.nodes.selectAll(".node").remove()
}

// add the rectangles for the nodes
function drawRectangle(node, graph, view){
    let rect = node.append("rect")
	.attr("height", function (d) {
	    return d.height;
	})
	.attr("width", view.nodeWidth)
        .attr("opacity", 0)
	.style("fill", function (d) {
            return view.color.getColor(d);
	})
	.style("fill-opacity", function(d){
	    if(d.name == "intermediate" || d.name[d.name.length - 1] == '_'){
                if(d.name[0] == "intermediate"){
		    return 0;
	        }
	        else{
		    return 1;
	        }
	    }
	})
	.style("shape-rendering", "crispEdges")
	.style("stroke", function (d) {
            if(d.name != "intermediate"){
		return d3.rgb(view.color.getColor(d)).darker(2);
	    }
	    else{
		return '#e1e1e1';
	    }
	})
	.style("stroke-width", function(d){
	    if(d.name[0] == "intermediate" || d.name[0][d.name[0].length - 1] == '_'){
                if(d.name[0] == "intermediate"){
		    return 0;
	        }
	        else{
		    return 1;
	        }
	    }
	})
	.on("mouseover", function(d) { 
	    if(d.name != "intermediate"){
		view.toolTipList.attr('width', "400px")
		    .attr('height', "150px")	    	
//                var res = getFunctionListOfNode(graph, d);
                //		toolTipTexts(d,res, rootRunTime1)
		d3.select(this).style("stroke-width", "2");
		// fadeUnConnected(d);
		// svg.selectAll(".link").style('fill-opacity', 0.0)
		// svg.selectAll('.node').style('opacity', '0.0')
	    }
	})
	.on("mouseout", function(d) { 
	    view.toolTipList.attr('width', '0px')
		.attr('height', '0px')
	    if(d.name[0] == "intermediate" || d.name[0][d.name[0].length - 1] == '_'){
		d3.select(this).style("stroke-width", "1");
		//                unFade();
	    }
	    view.toolTip.style('opacity', 0)
		.style('left', function(){
		    return 0;
		})
		.style('top', function(){
		    return 0;
		})
	    view.toolTipText.html("");
	    view.toolTipG.selectAll('*').remove();		    	
	})		    
	.on('click', function(d){
	    getHistogramData(d)
	    getFunctionLists(d)
	    // if(d.name != "intermediate"){
	    // 	var ret = getFunctionListOfNode(d);
	    // 	var fromProcToProc = ret["fromProcToProc"];
	    // 	var nameToIDMap = ret["nameToIDMap"];
	    // 	var res = {"node" : d, "fromProcToProc" : fromProcToProc, "nameToIDMap" : nameToIDMap, "rootRunTime" : rootRunTime};
	    // 	clickCallBack(res);
	    // }
	})
        .on('contextmenu', function(d){
            return view.svgBase.contextMenu(d);            
        })

    // Transition
    view.nodes.selectAll("rect")
	.data(graph.nodes)
	.transition()
	.duration(view.transitionDuration)
        .attr("opacity", 1)
	.attr('height',function(d){
	    return d.height;
	})
	.style("fill", function (d) {
	    if(d.name == "intermediate"){
		return '#e1e1e1'
	    }
	    else{
		return d.color = view.color.getColor(d);
	    }
	})
        .style("stroke", function(d){
            if(d.name == "intermediate"){
                return 0
            }
            else
                return 1
        })

}

function drawPath(node, graph, view){
    node.append("path")
	.attr('d', function(d){
	    if(d.name == "intermediate"){
		return "m" + 0 + " " + 0
		    + "h " + view.sankey.nodeWidth()
		    + "v " + (1)*0
		    + "h " + (-1)*view.sankey.nodeWidth();
	    }
	})
	.style("fill", function(d){
	    if(d.name == "intermediate"){
		return 'grey'
	    }
	    else{
		return view.color.getColor(d)
	    }
	})
	.style('fill-opacity', function(d){
	    if(d.name == "intermediate"){
		return 0.0;
	    }
	    else{
		return 0;
	    }
	})
	.style("stroke", function(d){
	    if(d.name == "intermediate"){
		return 'grey'
	    }
	})
	.style("stroke-opacity", "0.0") 

    view.nodes.selectAll('path')
	.data(graph.nodes)
	.transition()
	.duration(view.transitionDuration)
	.delay(view.transitionDuration/3)
	.style('fill-opacity' , function(d){
	    if(d.name[0] == "intermediate"){
	    	return 0;
	    }
	})
}


function drawText(node, graph, view){
    let textTruncForNode = 4;
    node.append("text")
	.attr('dy', '0.35em')
	.attr("transform", "rotate(90)")
	.attr('x', function(d){
	    // return sankey.nodeWidth() + 5;
	    return 5;
	})
	.attr('y', "-10")
	.style('opacity', 1)
	.text(function (d) {
	    if(d.name != "intermediate" && d.name[0][d.name[0].length - 1] != '_'){
	    	if(d.height < view.minHeightForText ) {
	    	    return "";
	    	}
	    	else {
	    	    var textSize = calcTextSize(d.name)["width"];
	    	    if(textSize < d.height){
	    		return d.name[0];
	    	    }
	    	    else{
	    		return d.name[0].trunc(textTruncForNode);
	    	    }
	    	}
	    }
	    else{
	    	return "";
	    }
	})
	.on("mouseover", function(d){
	    if(d.name[0] != "intermediate"){
	    	view.toolTipList.attr('width', "400px")
		    .attr('height', "150px")	    	
                //		var res = getFunctionListOfNode(d);
                //		toolTipTexts(d,res, rootRunTime1);
		d3.select(this.parentNode).select('rect').style("stroke-width", "2");
	    }
	})
	.on("mouseout", function(d){
	    view.toolTipList.attr('width', '0px')
		.attr('height', '0px')
	    if(d.name[0] != "intermediate"){
		d3.select(this.parentNode).select('rect').style("stroke-width", "1");
		//                unFade();
	    }
	    view.toolTip.style('opacity', 1)
		.style('left', function(){
		    return 0;
		})
		.style('top', function(){
		    return 0;
		})
	    view.toolTipText.html("");		    
	    view.toolTipG.selectAll('*').remove();		    		
	});

    // Transition
    view.nodes.selectAll("text")
	.data(graph.nodes)
	.transition()
	.duration(view.transitionDuration)
        .style('opacity', 1)
    	.style("fill", function(d){
	    return view.color.setContrast(view.color.getColor(d))
	})
	.text(function (d) {
            let name_splits = d.name[0].split('/').reverse()
            if(name_splits.length == 1){
                d.name = d.name[0]
            }
            else{
                d.name = name_splits[0]
            }

            if(d.name != "i" &&  d.name[d.name.length - 1] != '_'){
	    	if(d.height < view.minHeightForText ){
	    	    return "";
	    	}
	    	else{
	    	    var textSize = calcTextSize(d.name)["width"];	    	        
	    	    if(textSize < d.height){
	    		return d.name;
	    	    }
	    	    else{
	    		return d.name.trunc(textTruncForNode);
	    	    }
	    	}
	    }
	    else{
	    	return "";
	    }
	});   
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

function getFunctionListOfNode(graph, d){
    var sankeyNodeList = d["sankeyNodeList"];
    var uniqueNodeIDList = d["uniqueNodeID"];


    //get the final nodes that we are connected to
    var sourceLabel = [];
    var sourceID = [];
    graph.edges.forEach(function(edge){
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
    graph.nodes.forEach(function(node){
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
        console.log(connectionInfo, toolTipData["edgeList"], sankID);
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
                // connectivity[parentProcName]["procedureNameList"].push(procedureName);
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
    // fromProcToProc.forEach(function(ft){
    // // console.log(ft["value"] / 36644360084 * 100);
    // temp += ft["value"];// / rootRunTime * 100
    // })
    // console.log(temp);

    var res = {"fromProcToProc" : fromProcToProc, "nameToIDMap" : nameToIDMap , "rootRunTime" : rootRunTime}
    // console.log(fromProcToProc)
    return res;
}


export {
    drawNodes,
    clearNodes
}
