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
export default class Comparator {
	/**
	 * @param {function(a: *, b: *)} [compareFunction] - It may be custom compare function that, let's
	 * say may compare custom objects together.
	 */
	constructor(compareFunction) {
		this.compare = compareFunction || Comparator.defaultCompareFunction;
	}

	/**
	 * Default comparison function. It just assumes that "a" and "b" are strings or numbers.
	 * @param {(string|number)} a
	 * @param {(string|number)} b
	 * @returns {number}
	 */
	static defaultCompareFunction(a, b) {
		if (a === b) {
			return 0;
		}

		return a < b ? -1 : 1;
	}

	/**
	 * Checks if two variables are equal.
	 * @param {*} a
	 * @param {*} b
	 * @return {boolean}
	 */
	equal(a, b) {
		return this.compare(a, b) === 0;
	}

	/**
	 * Checks if variable "a" is less than "b".
	 * @param {*} a
	 * @param {*} b
	 * @return {boolean}
	 */
	lessThan(a, b) {
		return this.compare(a, b) < 0;
	}

	/**
	 * Checks if variable "a" is greater than "b".
	 * @param {*} a
	 * @param {*} b
	 * @return {boolean}
	 */
	greaterThan(a, b) {
		return this.compare(a, b) > 0;
	}

	/**
	 * Checks if variable "a" is less than or equal to "b".
	 * @param {*} a
	 * @param {*} b
	 * @return {boolean}
	 */
	lessThanOrEqual(a, b) {
		return this.lessThan(a, b) || this.equal(a, b);
	}

	/**
	 * Checks if variable "a" is greater than or equal to "b".
	 * @param {*} a
	 * @param {*} b
	 * @return {boolean}
	 */
	greaterThanOrEqual(a, b) {
		return this.greaterThan(a, b) || this.equal(a, b);
	}

	/**
	 * Reverses the comparison order.
	 */
	reverse() {
		const compareOriginal = this.compare;
		this.compare = (a, b) => compareOriginal(b, a);
	}
}