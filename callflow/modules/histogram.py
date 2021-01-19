# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import numpy as np

import callflow
from callflow.utils.utils import histogram

LOGGER = callflow.get_logger()


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class Histogram:

    HISTO_TYPES = ["rank", "name", "dataset", "all_ranks"]
    KEYS_AND_ATTRS = {'Inclusive': 'time (inc)',
                      'Exclusive': 'time'}

    def __init__(self, ensemble_df, target_df=None, bins=20):

        self.result = {"Inclusive": {}, "Exclusive": {}}

        # for each property
        for prop in Histogram.HISTO_TYPES:

            if target_df is None:
                _dfe = Histogram._get_data_by_property(ensemble_df, prop)
                for k, a in Histogram.KEYS_AND_ATTRS.items():
                    _hist = histogram(_dfe[a], bins=bins)
                    self.result[k][prop] = {
                        "ensemble": Histogram._format_data(_hist)
                    }

            else:
                _dfe = Histogram._get_data_by_property(ensemble_df, prop)
                _dft = Histogram._get_data_by_property(target_df, prop)

                for k, a in Histogram.KEYS_AND_ATTRS.items():
                    _e = _dfe[a]
                    _t = _dft[a]

                    _min = min(_e.min(), _t.min())
                    _max = max(_e.max(), _t.max())

                    _histe = histogram(_e, [_min, _max], bins=bins)
                    _histt = histogram(_t, [_min, _max], bins=bins)

                    self.result[k][prop] = {
                        "ensemble": Histogram._format_data(_histe),
                        "target": Histogram._format_data(_histt)
                    }

    # --------------------------------------------------------------------------
    # Return the histogram in the required form.
    @staticmethod
    def _get_data_by_property(data, prop):
        if prop == "all_ranks":
            return data
        elif prop == "rank":
            assert prop in data.columns
            return data.groupby(["dataset", "rank"])[["time", "time (inc)"]].mean()
        else:
            assert prop in data.columns
            return data.groupby([prop])[["time", "time (inc)"]].mean()

    @staticmethod
    def _format_data(histo):
        if len(histo[0]) == 0 or len(histo[1]) == 0:
            return {"x": [],
                    "y": [],
                    "x_min": 0,
                    "x_max": 0,
                    "y_min": 0.,
                    "y_max": 0.}

        else:
            return {"x": histo[0].tolist(),
                    "y": histo[1].tolist(),
                    "x_min": histo[0][0],
                    "x_max": histo[0][-1],
                    "y_min": np.min(histo[1]).astype(np.float64),
                    "y_max": np.max(histo[1]).astype(np.float64)}

    # --------------------------------------------------------------------------
    '''
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
    '''
# ------------------------------------------------------------------------------
