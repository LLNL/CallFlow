/** 
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * 
 * SPDX-License-Identifier: MIT
 */

export default class GraphEdge {
	/**
     * @param {GraphVertex} startVertex
     * @param {GraphVertex} endVertex
     * @param {number} [weight=1]
     */
	constructor(startVertex, endVertex, weight = 0) {
		this.startVertex = startVertex;
		this.endVertex = endVertex;
		this.weight = weight;
	}

	/**
     * @return {string}
     */
	getKey() {
		const startVertexKey = this.startVertex.getKey();
		const endVertexKey = this.endVertex.getKey();

		return `${startVertexKey}_${endVertexKey}`;
	}

	/**
     * @return {GraphEdge}
     */
	reverse() {
		const tmp = this.startVertex;
		this.startVertex = this.endVertex;
		this.endVertex = tmp;

		return this;
	}

	/**
     * @return {string}
     */
	toString() {
		return this.getKey();
	}
}