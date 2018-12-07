function drawNodes_force(graph, view){

}

function clearNodes_force(graph, view){
    var node = svg.selectAll("circle")
        .data(json.nodes)
        .enter().append("circle")
        .attr("r", radius - .75)
        .style("fill", function(d) { return fill(d.group); })
        .style("stroke", function(d) { return d3.rgb(fill(d.group)).darker(); })
        .call(force.drag);
}

function drawEdges_force(graph, view){
    link.each(function(d) { d.source.y -= k, d.target.y += k; })
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
}

export {
    drawNodes_force,
    clearNodes_force,
    drawEdges_force
}
