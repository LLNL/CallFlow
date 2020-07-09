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
