function drawNodes_force(graph, view){
    let force = d3.layout.force()
        .nodes(graph.nodes)
        .links(graph.links)
        .size([view.width, view.height])
        .linkStrength(0.1)
        .friction(0.9)
        .linkDistance(20)
        .charge(-40)
        .gravity(0.1)
        .theta(0.5)
        .alpha(0.1)
        .on("tick", tick)
        .start()
    
    let node = view.nodes.selectAll("circle")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("r", 5)
        .style("fill", function(d) { return view.color.getColor(d); })
        .style("stroke", function(d) { return "#000"; })
        .style("stroke-width", function(d){
            if(d.show_node){
                return 1;
            }
            return 0;
        })

    let k = 0.0
    function tick(e){
        let k = 6.0*e.alpha
        node.attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; })

        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

    }

    let link = view.edges.selectAll('line')
        .data(graph.links)
        .enter().append('line')
        .attr('stroke-width', function(d) {
            return d.height/2;
        })
        .style("stroke", "#000")
}

function update(){
    var nodes = flatten(root)
}


function clearNodes_force(graph, view){

}

function drawEdges_force(graph, view){
}

export {
    drawNodes_force,
    clearNodes_force,
    drawEdges_force
}
