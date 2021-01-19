# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import numpy as np
import pandas as pd

import callflow
from callflow.utils.utils import histogram

LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class Histogram:

    HISTO_TYPES = ["rank", "name", "dataset", "all_ranks"]
    KEYS_AND_ATTRS = {'Inclusive': 'time (inc)',
                      'Exclusive': 'time'}

    def __init__(self, df_ensemble, df_target=None, bins=20):

        assert isinstance(df_ensemble, pd.DataFrame)
        assert isinstance(df_target, pd.DataFrame) or df_target is None
        assert isinstance(bins, int)
        assert bins > 0

        self.result = {"Inclusive": {}, "Exclusive": {}}

        # for each property
        for prop in Histogram.HISTO_TYPES:

            if df_target is None:
                _dfe = Histogram._get_data_by_property(df_ensemble, prop)
                for k, a in Histogram.KEYS_AND_ATTRS.items():
                    _hist = histogram(_dfe[a], bins=bins)
                    self.result[k][prop] = {
                        "ensemble": Histogram._format_data(_hist)
                    }

            else:
                _dfe = Histogram._get_data_by_property(df_ensemble, prop)
                _dft = Histogram._get_data_by_property(df_target, prop)

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

# ------------------------------------------------------------------------------
