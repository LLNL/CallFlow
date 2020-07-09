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