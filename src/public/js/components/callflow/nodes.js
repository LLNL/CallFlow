import Color from './color.js'

function calcTextSize(text) {
	if (!d3) return;
	var container = d3.select('body').append('svg');
	container.append('text').attr({ x: -99999, y: -99999 }).text(text);
	var size = container.node().getBBox();
	container.remove();
	return { width: size.width, height: size.height };
}

export default function drawNodes(graph, view){
    let node = view.nodes.selectAll(".node")
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

// add the rectangles for the nodes
function drawRectangle(node, graph, view){
	let rect = node.append("rect")
	    .attr("height", function (d) {
		    return d.dy;
	    })
	    .attr("width", view.nodeWidth)
        .attr("opacity", 0)
	    .style("fill", function (d) {
            //		    var temp = {"name" : d.name.replace(/ .*/, ""),
            //			            "color" : view.color(d.name.replace(/ .*/, ""))}
            //		    nodeList.push(temp);
		    if(d.name == "intermediate"){
		        return 'grey'
		    }
		    else{
                return view.color.getColor(d);
		    }

	    })
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
		        return d3.rgb(view.color.getColor(d)).darker(2);
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
		        toolTipTexts(d,res, rootRunTime1)
		        d3.select(this).style("stroke-width", "2");
		        // fadeUnConnected(d);
		        // svg.selectAll(".link").style('fill-opacity', 0.0)
		        // svg.selectAll('.node').style('opacity', '0.0')
		    }
	    })
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
	    })		    
	    .on('click', function(d){
		    if(d.name != "intermediate"){
		        var ret = getFunctionListOfNode(d);
		        var fromProcToProc = ret["fromProcToProc"];
		        var nameToIDMap = ret["nameToIDMap"];
		        var res = {"node" : d, "fromProcToProc" : fromProcToProc, "nameToIDMap" : nameToIDMap, "rootRunTime" : rootRunTime};
		        clickCallBack(res);
		    }
	    })

    // Transition
    view.nodes.selectAll("rect")
	    .data(graph.nodes)
	    .transition()
	    .duration(view.transitionDuration)
        .attr("opacity", 1)
	    .attr('height',function(d){
	    	return d.dy;
	    })
	    .style("fill", function (d) {
//		    var temp = {"name" : d.name.replace(/ .*/, ""),
//			            "color" : color(d.name.replace(/ .*/, ""))}
//		    nodeList.push(temp);
		    if(d.name == "intermediate"){
		        return 'grey'
		    }
		    else{
		        return d.color = view.color.getColor(d);
		    }
	    })	    	

}

function drawPath(node, graph, view){
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
	    	if(d.name == "intermediate"){
	    	    return 0.4;
	    	}
	    })

    
}


function drawText(node, graph, view){
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
	    	if(d.name != "intermediate"){
	    	    if(d.dy < view.minHeightForText ) {
	    		    return "";
	    	    }
	    	    else {
	    		    var textSize = calcTextSize(d.name)["width"];
	    		    if(textSize < d.dy){
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
	    })
	    .on("mouseover", function(d){
	    	if(d.name != "intermediate"){
	    	    toolTipList.attr('width', "400px")
			        .attr('height', "150px")	    	
		        var res = getFunctionListOfNode(d);
		        toolTipTexts(d,res, rootRunTime1);
		        d3.select(this.parentNode).select('rect').style("stroke-width", "2");
	    	}
	    })
	    .on("mouseout", function(d){
		    view.toolTipList.attr('width', '0px')
		        .attr('height', '0px')
		    if(d.name != "intermediate"){
		        d3.select(this.parentNode).select('rect').style("stroke-width", "1");
		        unFade();
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
	    .text(function (d) {
	    	if(d.name != "intermediate"){
	    	    if(d.dy < view.minHeightForText ){
	    		    return "";
	    	    }
	    	    else{
	    		    var textSize = calcTextSize(d.name)["width"];
	    		    
	    		    if(textSize < d.dy){
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
