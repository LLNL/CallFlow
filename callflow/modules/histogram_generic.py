# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------
# Library imports
import numpy as np

# ------------------------------------------------------------------------------
class GenericHistogram:
    def __init__(self):
        pass

    # Return the histogram in the required form.
    def histogram_format(self, histogram_grid):
        return {
            "x": histogram_grid[0].tolist(),
            "y": histogram_grid[1].tolist(),
            "x_min": histogram_grid[0][0],
            "x_max": histogram_grid[0][-1],
            "y_min": np.min(histogram_grid[1]).astype(np.float64),
            "y_max": np.max(histogram_grid[1]).astype(np.float64),
        }

    # Prop can be dataset, rank, name
    def ensemble(self, ensemble_df, prop):
        ret = {}

        if prop == "all_ranks":
            time_ensemble_inclusive_arr = np.array(ensemble_df["time (inc)"].tolist())
            time_ensemble_exclusive_arr = np.array(ensemble_df["time"].tolist())

        elif prop == "rank":
            ensemble_prop = ensemble_df.groupby(["dataset", prop])[
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

        histogram_ensemble_inclusive_grid = self.histogram(
            time_ensemble_inclusive_arr, inclusive_min, inclusive_max
        )

        exclusive_max = time_ensemble_exclusive_arr.max()
        exclusive_min = time_ensemble_exclusive_arr.min()
        histogram_ensemble_exclusive_grid = self.histogram(
            time_ensemble_exclusive_arr, exclusive_min, exclusive_max
        )

        ret["Inclusive"] = {
            "ensemble": self.histogram_format(histogram_ensemble_inclusive_grid),
        }
        ret["Exclusive"] = {
            "ensemble": self.histogram_format(histogram_ensemble_exclusive_grid),
        }
        return ret

    # Prop can be dataset, rank, name
    def target(self, ensemble_df, target_df, prop):
        ret = {}

        if prop == "all_ranks":
            time_ensemble_inclusive_arr = np.array(ensemble_df["time (inc)"].tolist())
            time_ensemble_exclusive_arr = np.array(ensemble_df["time"].tolist())

            time_target_inclusive_arr = np.array(target_df["time (inc)"].tolist())
            time_target_exclusive_arr = np.array(target_df["time"].tolist())
        elif prop == "rank":
            ensemble_prop = ensemble_df.groupby(["dataset", prop])[
                ["time", "time (inc)"]
            ].mean()
            target_prop = target_df.groupby(["dataset", prop])[
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
        histogram_ensemble_inclusive_grid = self.histogram(
            time_ensemble_inclusive_arr, inclusive_min, inclusive_max
        )
        histogram_target_inclusive_grid = self.histogram(
            time_target_inclusive_arr, inclusive_min, inclusive_max
        )

        exclusive_max = max(
            time_ensemble_exclusive_arr.max(), time_target_exclusive_arr.max()
        )
        exclusive_min = min(
            time_ensemble_exclusive_arr.min(), time_target_exclusive_arr.min()
        )
        histogram_ensemble_exclusive_grid = self.histogram(
            time_ensemble_exclusive_arr, exclusive_min, exclusive_max
        )
        histogram_target_exclusive_grid = self.histogram(
            time_target_exclusive_arr, exclusive_min, exclusive_max
        )

        ret["Inclusive"] = {
            "ensemble": self.histogram_format(histogram_ensemble_inclusive_grid),
            "target": self.histogram_format(histogram_target_inclusive_grid),
        }
        ret["Exclusive"] = {
            "ensemble": self.histogram_format(histogram_ensemble_exclusive_grid),
            "target": self.histogram_format(histogram_target_exclusive_grid),
        }
        return ret
