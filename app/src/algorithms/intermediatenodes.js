/** 
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

/**
 * 
 * Adds intermediate nodes to the Sankey diagram for resolving collisions.
 * For more details refer to the below paper. 
 * 
 * H. Alemasoom, F. Samavati, J. Brosz, and D. Layzell, “EnergyViz: 
 * An interactive system for visualization of energy systems,” Vis.
 * Comput., vol. 32, no. 3, pp. 403–413, 2016.
 * 
 * 
 * @param {*} nodes node
 * @param {*} edges 
 */
class IntermediateNodes {
    constructor(nodes, edges, debug = False) {
        this.nodes = nodes
        this.edges = edges
        this.debug = debug
        this.intermediateNodes = [];
        this.existingIntermediateNodes = {};
    }

    get_nodes_edges() {
        return {
            nodes: this.nodes,
            links: this.edges,
        };
    }

    debug_nodes_edges() {
        console.log("==============================");
        console.log("[Ensemble SuperGraph] Source Name", source);
        console.log("[Ensemble SuperGraph] Target Name", target);
        console.log("[Ensemble SuperGraph] This edge: ", temp_edges[i]);

        console.log(
            "[Ensemble SuperGraph] Source Node",
            source_node,
            target_node.level
        );
        console.log(
            "[Ensemble SuperGraph] Target Node",
            target_node,
            target_node.level
        );
    }

    add_intermediate_nodes(targetDataset) {
        for (let i = 0; i < this.edges.length; i++) {
            const source = this.edges[i].source;
            const target = this.edges[i].target;

            let source_node = this.edges[i].source_data;
            let target_node = this.edges[i].target_data;

            const temp_edges = this.edges.slice();

            let count = {};

            const source_level = source_node.level;
            const target_level = target_node.level;
            const shift_level = target_level - source_level;

            // Put in intermediate nodes.
            let firstNode = true;
            for (let j = shift_level; j > 1; j--) {
                const intermediate_idx = nodes.length;

                let tempNode = {};
                let actual_time = source_node["actual_time"];
                let max_flow = source_node["max_flow"];
                if (!this.existingIntermediateNodes[target_node.id]) {
                    // Add the intermediate node to the array
                    tempNode = {
                        id: "intermediate_" + target_node.id,
                        level: j - 1,
                        value: temp_edges[i].weight,
                        targetValue: temp_edges[i].targetWeight,
                        height: temp_edges[i].height,
                        targetHeight: temp_edges[i].targetHeight,
                        module: target_node.module,
                        type: "intermediate",
                        count: 1,
                    };
                    tempNode[targetDataset] = target_node[targetDataset];

                    if (firstNode) {
                        nodes.push(tempNode);
                        firstNode = false;
                    }

                    this.existingIntermediateNodes[target_node.id] = tempNode;
                } else {
                    if (count[temp_edges[i].source] == undefined) {
                        count[temp_edges[i].source] = 0;
                        console.log(
                            temp_edges[i].weight,
                            temp_edges[i].source,
                            temp_edges[i].target
                        );
                        this.existingIntermediateNodes[target_node.id].value +=
                            temp_edges[i].weight;
                    } else {
                        count[temp_edges[i].source] += 1;
                    }
                    tempNode = this.existingIntermediateNodes[target_node.id];
                }

                    // Add the source edge.
                    const sourceTempEdge = {
                        type: "source_intermediate",
                        source: source_node.id,
                        target: tempNode.id,
                        weight: temp_edges[i].weight,
                        targetWeight: temp_edges[i].targetWeight,
                        actual_time: actual_time,
                        max_flow: max_flow,
                    };
                    edges.push(sourceTempEdge);

                    if (debug) {
                        console.log(
                            "[Ensemble SuperGraph] Adding intermediate source edge: ",
                            sourceTempEdge
                        );
                    }

                    if (j == shift_level) {
                        edges[i].original_target = target;
                    }
                    edges[i].target_data = nodes[intermediate_idx];
                    if (debug) {
                        console.log("[Ensemble SuperGraph] Updating this edge:", edges[i]);
                    }

                    const targetTempEdge = {
                        type: "target_intermediate",
                        source: tempNode.id,
                        target: target_node.id,
                        actual_time: actual_time,
                        weight: temp_edges[i].weight,
                        targetWeight: temp_edges[i].targetWeight,
                        max_flow: max_flow,
                    };
                    edges.push(targetTempEdge);
                    if (debug) {
                        console.log(
                            "[Ensemble SuperGraph] Adding intermediate target edge: ",
                            targetTempEdge
                        );
                    }

                    if (j == shift_level) {
                        edges[i].original_target = target;
                    }
                    edges[i].target_data = nodes[intermediate_idx];
                    if (debug) {
                        console.log("[Ensemble SuperGraph] Updating this edge:", edges[i]);
                    }

                    this.removeActualEdges.push({
                        source,
                        target,
                    });
                }
            }
        }

            /**
             * Removes the edges that have been replaced by the intermediate edges.
             * @param {Map} edges Edges that must be replaced
             * @return {Array} 
             */
            _remove_updated_edges(edges) {
                for (let i = 0; i < edges.length; i += 1) {
                    let removeEdge = edges[i];
                    if (debug) {
                        console.log("[Ensemble SuperGraph] Removing edge: ", removeEdge);
                    }
                    for (let edge_idx = 0; edge_idx < edges.length; edge_idx += 1) {
                        let curr_edge = edges[edge_idx];
                        if (
                            removeEdge.source == curr_edge.source &&
                            removeEdge.target == curr_edge.target
                        ) {
                            edges.splice(edge_idx, 1);
                        }
                    }
                }

                return edges
            }
        }