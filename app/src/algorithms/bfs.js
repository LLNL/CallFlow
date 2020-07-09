/*******************************************************************************
 * Copyright (c) 2020, Lawrence Livermore National Security, LLC.
 * Produced at the Lawrence Livermore National Laboratory.
 *
 * Written by Suraj Kesavan <spkesavan@ucdavis.edu>.
 *
 * LLNL-CODE-740862. All rights reserved.
 *
 * This file is part of CallFlow. For details, see:
 * https://github.com/LLNL/CallFlow
 * Please also read the LICENSE file for the MIT License notice.
 ******************************************************************************/
import Queue from "../../../data-structures/queue/Queue";
/**
 * @typedef {Object} Callbacks
 *
 * @property {function(vertices: Object): boolean} [allowTraversal] -
 *   Determines whether DFS should traverse from the vertex to its neighbor
 *   (along the edge). By default prohibits visiting the same vertex again.
 *
 * @property {function(vertices: Object)} [enterVertex] - Called when BFS enters the vertex.
 *
 * @property {function(vertices: Object)} [leaveVertex] - Called when BFS leaves the vertex.
 */

 /**
 * @param {Callbacks} [callbacks]
 * @returns {Callbacks}
 */
function initCallbacks(callbacks = {}) {
	const initiatedCallback = callbacks;

	const stubCallback = () => { };

	const allowTraversalCallback = (
		() => {
			const seen = {};
			return ({ nextVertex }) => {
				if (!seen[nextVertex.getKey()]) {
					seen[nextVertex.getKey()] = true;
					return true;
				}
				return false;
			};
		}
	)();

	initiatedCallback.allowTraversal = callbacks.allowTraversal || allowTraversalCallback;
	initiatedCallback.enterVertex = callbacks.enterVertex || stubCallback;
	initiatedCallback.leaveVertex = callbacks.leaveVertex || stubCallback;

	return initiatedCallback;
}

/**
 * @param {Graph} graph
 * @param {GraphVertex} startVertex
 * @param {Callbacks} [originalCallbacks]
 */
export default function bfs (graph, startVertex, originalCallbacks) {
	const callbacks = initCallbacks(originalCallbacks);
	const vertexQueue = new Queue();

	// Do initial queue setup.
	vertexQueue.enqueue(startVertex);

	let previousVertex = null;

	// Traverse all vertices from the queue.
	while (!vertexQueue.isEmpty()) {
		const currentVertex = vertexQueue.dequeue();
		callbacks.enterVertex({ currentVertex, previousVertex });

		// Add all neighbors to the queue for future traversals.
		graph.getNeighbors(currentVertex).forEach((nextVertex) => {
			if (callbacks.allowTraversal({ previousVertex, currentVertex, nextVertex })) {
				vertexQueue.enqueue(nextVertex);
			}
		});

		callbacks.leaveVertex({ currentVertex, previousVertex });

		// Memorize current vertex before next loop.
		previousVertex = currentVertex;
	}
}