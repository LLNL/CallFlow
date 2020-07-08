/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
const screens = {
	"xs-max": 543,
	"sm-min": 544,
	"sm-max": 767,
	"md-min": 768,
	"md-max": 991,
	"lg-min": 992,
	"lg-max": 1199,
	"xl-min": 1200,
};

export default function isScreen(size) {
	const screenPx = window.innerWidth;
	return (screenPx >= screens[`${size}-min`] || size === "xs")
		&& (screenPx <= screens[`${size}-max`] || size === "xl");
}