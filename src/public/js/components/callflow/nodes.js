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
            console.log(d.x, d.y, d.name)
		    return "translate(" + d.x + "," + d.y + ")";
	    })


	// add the rectangles for the nodes
	let rect = node.append("rect")
	    .attr("height", function (d) {
  		    console.log(d.dy, d.name, d.dx);
		    return d.dy;
	    })
	    .attr("width", view.nodeWidth)
	    .style("fill", function (d) {
		    var temp = {"name" : d.name.replace(/ .*/, ""),
			            "color" : color(d.name.replace(/ .*/, ""))}
		    nodeList.push(temp);
		    if(d.name == "intermediate"){
		        return 'grey'
		    }
		    else{
//                console.log(setNodeColor(d))
                return d.color = setNodeColor(d);
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
		        return d.color
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

	node.append("text")
	    .attr('dy', '0.35em')
	    .attr("transform", "rotate(90)")
	    .attr('x', function(d){
		    // return sankey.nodeWidth() + 5;
		    return 5;
	    })
	    .attr('y', "-10")
	    .style('opacity', 0)
	    .text(function (d) {
	    	if(d.name != "intermediate"){
	    	    if(d.dy < minHeightForText ) {
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

		        // var parentDOM = d3.select(this).node().parentNode;
		        // console.log(parentDOM)
		        // console.log(d3.select(this.parentNode).select('rect'))
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
		    view.toolTip.style('opacity', 0)
		        .style('left', function(){
			        return 0;
		        })
		        .style('top', function(){
			        return 0;
		        })
		    view.toolTipText.html("");		    
		    view.toolTipG.selectAll('*').remove();		    		
	    });
}
