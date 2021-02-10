# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

"""
CallFlow's operation to calculate the rank and dataset histograms.
"""
import numpy as np
import pandas as pd

import callflow
from callflow.utils.utils import histogram
from callflow.datastructures.metrics import TIME_COLUMNS

LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
class Histogram:
    """
    Calculate Histogram (Per rank, All ranks, Per dataset)
    """

    HISTO_TYPES = ["rank", "name", "dataset", "all_ranks"]

    def __init__(self, df_ensemble, df_target=None, bins=20, proxy_columns={}):
        """

        :param df_ensemble:
        :param df_target:
        :param bins:
        """
        assert isinstance(df_ensemble, pd.DataFrame)
        assert isinstance(df_target, pd.DataFrame) or df_target is None
        assert isinstance(bins, int)
        assert isinstance(proxy_columns, dict)
        assert bins > 0

        self.time_columns = [proxy_columns.get(_, _) for _ in TIME_COLUMNS]
        self.result = {_: {} for _ in TIME_COLUMNS}

        # for each type of histogram
        for histo_type in Histogram.HISTO_TYPES:

            if df_target is None:
                _dfe = self._get_data_by_histo_type(df_ensemble, histo_type)

                # for each time column
                for tk, tv in zip(TIME_COLUMNS, self.time_columns):
                    _hist = histogram(_dfe[tv], bins=bins)
                    self.result[tk][histo_type] = {
                        "ensemble": Histogram._format_data(_hist)
                    }

            else:
                _dfe = self._get_data_by_histo_type(df_ensemble, histo_type)
                _dft = self._get_data_by_histo_type(df_target, histo_type)

                # for each time column
                for tk, tv in zip(TIME_COLUMNS, self.time_columns):
                    _e = _dfe[tv]
                    _t = _dft[tv]

                    _min = min(_e.min(), _t.min())
                    _max = max(_e.max(), _t.max())
                    _histe = histogram(_e, [_min, _max], bins=bins)
                    _histt = histogram(_t, [_min, _max], bins=bins)

                    self.result[tk][histo_type] = {
                        "ensemble": Histogram._format_data(_histe),
                        "target": Histogram._format_data(_histt)
                    }

    # --------------------------------------------------------------------------
    # Return the histogram in the required form.
    def _get_data_by_histo_type(self, df, histo_type):
        """

        :param data:
        :param prop:
        :return:
        """
        if histo_type == "all_ranks":
            return df

        assert histo_type in df.columns
        if histo_type == "rank":
            _df = df.groupby(["dataset", "rank"])
        else:
            _df = df.groupby([histo_type])

        return _df[self.time_columns].mean()

    @staticmethod
    def _format_data(histo):
        """

        :param histo:
        :return:
        """
        return {"x": histo[0], "y": histo[1]}

        if len(histo[0]) == 0 or len(histo[1]) == 0:
            return {
                "x": [],
                "y": [],
                "x_min": 0,
                "x_max": 0,
                "y_min": 0.0,
                "y_max": 0.0,
            }

        else:
            return {
                "x": histo[0],
                "y": histo[1],
                "x_min": histo[0][0],
                "x_max": histo[0][-1],
                "y_min": np.min(histo[1]).astype(np.float64),
                "y_max": np.max(histo[1]).astype(np.float64),
            }

# ------------------------------------------------------------------------------
