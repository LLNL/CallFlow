# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

import pandas as pd
import numpy as np

HIST_PROPS = ["rank", "name", "dataset", "all_ranks"]

class Histogram:
    def __init__(self, ensemble_df, target_df=None, binCount=20):
        self.result = {
            "Inclusive": {},
            "Exclusive": {}
        }
        for prop in HIST_PROPS:
            if target_df is not None:
                prop_histograms = self.bin_by_property_single(ensemble_df, target_df, prop)
            else:
                prop_histograms = self.bin_by_property_ensemble(ensemble_df, prop)
            self.result["Inclusive"][prop] = prop_histograms["Inclusive"]
            self.result["Exclusive"][prop] = prop_histograms["Exclusive"]

    # Return the histogram in the required form.
    @staticmethod
    def _format_data(histogram_grid):
        return {
            "x": histogram_grid[0].tolist(),
            "y": histogram_grid[1].tolist(),
            "x_min": histogram_grid[0][0],
            "x_max": histogram_grid[0][-1],
            "y_min": np.min(histogram_grid[1]).astype(np.float64),
            "y_max": np.max(histogram_grid[1]).astype(np.float64),
        }

    @staticmethod
    def compute(data, data_min=np.nan, data_max=np.nan, binCount=20):
        if np.isnan(data_min) or np.isnan(data_max):
            data_min = data.min()
            data_max = data.max()
        h, b = np.histogram(data, range=[data_min, data_max], bins=binCount)
        return 0.5 * (b[1:] + b[:-1]), h

    def bin_by_property_ensemble(self, ensemble_df, prop):
        ret = {}
        if prop == "all_ranks":
            time_ensemble_inclusive_arr = np.array(ensemble_df["time (inc)"].tolist())
            time_ensemble_exclusive_arr = np.array(ensemble_df["time"].tolist())
        elif prop == "rank":
            ensemble_prop = ensemble_df.groupby(["dataset", "rank"])[
                ["time", "time (inc)"]
            ].mean()
            time_ensemble_inclusive_arr = np.array(ensemble_prop["time (inc)"])
            time_ensemble_exclusive_arr = np.array(ensemble_prop["time"])
        else:
            ensemble_prop = ensemble_df.groupby([prop])[["time", "time (inc)"]].mean()
            time_ensemble_inclusive_arr = np.array(ensemble_prop["time (inc)"])
            time_ensemble_exclusive_arr = np.array(ensemble_prop["time"])
        inclusive_max = time_ensemble_inclusive_arr.max()
        inclusive_min = time_ensemble_inclusive_arr.min()
        histogram_ensemble_inclusive_grid = Histogram.compute(time_ensemble_inclusive_arr, inclusive_min, inclusive_max)
        exclusive_max = time_ensemble_exclusive_arr.max()
        exclusive_min = time_ensemble_exclusive_arr.min()
        histogram_ensemble_exclusive_grid = Histogram.compute(
            time_ensemble_exclusive_arr, exclusive_min, exclusive_max
        )
        ret["Inclusive"] = {
            "ensemble": Histogram._format_data(histogram_ensemble_inclusive_grid),
        }
        ret["Exclusive"] = {
            "ensemble": Histogram._format_data(histogram_ensemble_exclusive_grid),
        }
        return ret

    def bin_by_property_single(self, ensemble_df, target_df, prop):
        ret = {}
        if prop == "all_ranks":
            time_ensemble_inclusive_arr = np.array(ensemble_df["time (inc)"].tolist())
            time_ensemble_exclusive_arr = np.array(ensemble_df["time"].tolist())
            time_target_inclusive_arr = np.array(target_df["time (inc)"].tolist())
            time_target_exclusive_arr = np.array(target_df["time"].tolist())
        elif prop == "rank":
            ensemble_prop = ensemble_df.groupby(["dataset", "rank"])[
                ["time", "time (inc)"]
            ].mean()
            target_prop = target_df.groupby(["dataset", "rank"])[
                ["time", "time (inc)"]
            ].mean()
            time_ensemble_inclusive_arr = np.array(ensemble_prop["time (inc)"])
            time_ensemble_exclusive_arr = np.array(ensemble_prop["time"])
            time_target_inclusive_arr = np.array(target_prop["time (inc)"])
            time_target_exclusive_arr = np.array(target_prop["time"])
        else:
            ensemble_prop = ensemble_df.groupby([prop])[["time", "time (inc)"]].mean()
            target_prop = target_df.groupby([prop])[["time", "time (inc)"]].mean()
            time_ensemble_inclusive_arr = np.array(ensemble_prop["time (inc)"])
            time_ensemble_exclusive_arr = np.array(ensemble_prop["time"])
            time_target_inclusive_arr = np.array(target_prop["time (inc)"])
            time_target_exclusive_arr = np.array(target_prop["time"])
        inclusive_max = max(
            time_ensemble_inclusive_arr.max(), time_target_inclusive_arr.max()
        )
        inclusive_min = min(
            time_ensemble_inclusive_arr.min(), time_target_inclusive_arr.min()
        )
        histogram_ensemble_inclusive_grid = Histogram.compute(
            time_ensemble_inclusive_arr, inclusive_min, inclusive_max
        )
        histogram_target_inclusive_grid = Histogram.compute(
            time_target_inclusive_arr, inclusive_min, inclusive_max
        )
        exclusive_max = max(
            time_ensemble_exclusive_arr.max(), time_target_exclusive_arr.max()
        )
        exclusive_min = min(
            time_ensemble_exclusive_arr.min(), time_target_exclusive_arr.min()
        )
        histogram_ensemble_exclusive_grid = Histogram.compute(
            time_ensemble_exclusive_arr, exclusive_min, exclusive_max
        )
        histogram_target_exclusive_grid = Histogram.compute(
            time_target_exclusive_arr, exclusive_min, exclusive_max
        )
        ret["Inclusive"] = {
            "ensemble": Histogram._format_data(histogram_ensemble_inclusive_grid),
            "target": Histogram._format_data(histogram_target_inclusive_grid),
        }
        ret["Exclusive"] = {
            "ensemble": Histogram._format_data(histogram_ensemble_exclusive_grid),
            "target": Histogram._format_data(histogram_target_exclusive_grid),
        }
        return ret
