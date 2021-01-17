# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import numpy as np
from scipy import stats

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
                    _hist = Histogram.compute(_dfe[a], bins=bins)
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
                    _max = min(_e.max(), _t.max())

                    _histe = Histogram.compute(_e, [_min, _max], bins=bins)
                    _histt = Histogram.compute(_t, [_min, _max], bins=bins)

                    self.result[k][prop] = {
                        "ensemble": Histogram._format_data(_histe),
                        "target": Histogram._format_data(_histt)
                    }

    # --------------------------------------------------------------------------
    # Return the histogram in the required form.
    @staticmethod
    def compute(data, data_range=None, bins=20):
        if len(data) == 0:
            return np.array([]), np.array([])

        if data_range is None:
            data_range = [data.min(), data.max()]
        else:
            assert isinstance(data_range, (list, np.ndarray))
            assert len(data_range) == 2
        h, b = np.histogram(data, range=data_range, bins=bins)
        return 0.5 * (b[1:] + b[:-1]), h

    @staticmethod
    def freedman_diaconis_bins(arr):
        """Calculate number of hist bins using Freedman-Diaconis rule."""
        # From https://stats.stackexchange.com/questions/798/

        n = len(arr)
        if n < 2:
            return 1

        # Calculate the iqr ranges.
        iqr = [stats.scoreatpercentile(arr, _) for _ in [25, 50, 75]]

        # Calculate the h
        h = 2 * (iqr[2] - iqr[0]) / (n ** (1 / 3))

        # fall back to sqrt(a) bins if iqr is 0
        if h == 0:
            return int(np.sqrt(arr.size))

        else:
            return int(np.ceil((arr.max() - arr.min()) / h))

    @staticmethod
    def _get_data_by_property(data, prop):
        if prop == "all_ranks":
            return data
        elif prop == "rank":
            return data.groupby(["dataset", "rank"])[["time", "time (inc)"]].mean()
        else:
            return data.groupby([prop])[["time", "time (inc)"]].mean()

    @staticmethod
    def _format_data(histo):
        if len(histo[0]) == 0 or len(histo[1]) == 0:
            return {"x": [],
                    "y": [],
                    "x_min": 0,
                    "x_max": 0,
                    "y_min": 0.,
                    "y_max": 0.
                    }

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