// Simple force-directed implementation.
export default function CCTComputation(graph, view){
    let CCT = d3.layout.force()
        .charge(-120)
        .linkDistance(30)
        .size([width, height]);

    force.nodes(json.nodes)
        .links(json.links)
        .on("tick", tick)
        .start();

    return CCT
}
