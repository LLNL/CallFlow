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

import {
	pointVsCode,
	pointFsCode,
	lineVsCode,
	lineFsCode,
	lassoVsCode,
	lassoFsCode,
	focusVsCode,
	focusFsCode
} from "./shader.js";

import {
	pallette
} from "./colors.js";

//
// Info from datasets
//
export const data = {
	instances: {},
	variables: {},
	time_points: {},
	first_dr_info: {}
};

//
// Global State
//
export const state = {
	nGroups: 0,
	group_indices: [],
	emb_type: undefined
};

//
// WebSocket server
//
export const wsInfo = {
	ws: undefined,
	dataKey: undefined,
	messageActions: {
		addNewFcs: 0,
		getHistInfo: 1
	}
};

//
// Related to WebGL rendering
//
export const renderingDataTemplate = () => {
	return {
		// defaults
		default_size: 1.5,
		default_opacity: 0.9,
		default_outer_ring_opacity: 0.9,
		default_shape: 0.0,
		default_color: pallette.gray,
		default_outer_ring_color: [0.5, 0.5, 0.5],
		default_width: 0.0,
		default_line_opacity: 0.5,
		default_line_color: pallette.gray,
		default_translate: {
			x: 0.0,
			y: 0.0
		},
		default_rotate: 0.0,
		default_scale: {
			x: 0.9,
			y: 0.9
		},

		// data
		vertices: [0.0, 0.0],
		sizes: [0.0],
		colors: [0.0, 0.0, 0.0],
		opacities: [0.0],
		outer_ring_colors: [0.0, 0.0, 0.0],
		outer_ring_opacities: [0.0],
		shapes: [0.0],
		line_vertices: [],
		line_colors: [],
		line_opacities: [],
		lasso_vertices: [],
		focus_vertices: [],
		translate: {
			x: 0.0,
			y: 0.0
		},
		rotate: 0.0,
		scale: {
			x: 0.0,
			y: 0.0
		},
		transform: new Float32Array([
			1, 0, 0, 0, //
			0, 1, 0, 0, //
			0, 0, 1, 0, //
			0, 0, 0, 1 //
		]),
		// renderer info
		canvas: undefined,
		gl: undefined,
		shaders: {
			focus: {
				v: focusVsCode,
				f: focusFsCode
			},
			lasso: {
				v: lassoVsCode,
				f: lassoFsCode
			},
			line: {
				v: lineVsCode,
				f: lineFsCode
			},
			point: {
				v: pointVsCode,
				f: pointFsCode
			},
		},
		renderers: {
			focus: () => { },
			lasso: () => { },
			line: () => { },
			point: () => { }
		},
		event_handlers: {
			wheel_sensitiveness: 0.05,
			wheel: () => { },
			left_down: () => { },
			left_move: () => { },
			left_up: () => { },
			right_move_sensitiveness: 0.002,
			right_move: () => { },
			enter: () => { },
			out: () => { },
			click: () => { },
			shift_left_up: () => { }
		}
	};
};

export const renderingData = {
	drs: {},
	par_coords: {}
};

export const svgDataTemplate = () => {
	return {
		dom_id: undefined,
		svg: undefined,
		svg_area: undefined,
		data: [],
		selected_x: undefined,
		selected_y: undefined
	};
};

export const svgData = {
	info: svgDataTemplate(),
	fc: svgDataTemplate(),
	hist: svgDataTemplate(),
	pc: svgDataTemplate()
};