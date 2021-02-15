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
import itertools
from callflow.utils.df import df_count

import callflow
from callflow.utils.utils import histogram
from callflow.datastructures.metrics import TIME_COLUMNS

LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
class Histogram:
    """
    Calculate Histogram (Per rank, All ranks, Per dataset)
    """

    HISTO_TYPES = ["rank", "name", "dataset"]

    def __init__(self, dataframes_as_dict, bins=20,
                 histo_types = [], proxy_columns={}):
        """

        :param dataframes_as_dict:
        :param histo_types:
        :param bins:
        :param proxy_columns:
        """
        assert isinstance(dataframes_as_dict, dict)
        assert isinstance(bins, int)
        assert isinstance(proxy_columns, dict)
        assert isinstance(histo_types, list)
        assert bins > 0
        for k, v in dataframes_as_dict.items():
            assert isinstance(k, str) and isinstance(v, pd.DataFrame)

        self.time_columns = [proxy_columns.get(_, _) for _ in TIME_COLUMNS]
        self.result = {_: {} for _ in TIME_COLUMNS}

        if len(histo_types) == 0:
            histo_types = Histogram.HISTO_TYPES

        # for each type of histogram and each time column
        for h,(tk,tv) in itertools.product(histo_types, zip(TIME_COLUMNS, self.time_columns)):
            self.result[tk][h] = {}

            data = {dn: self._get_data_by_histo_type(df, h)[tv]
                    for dn, df in dataframes_as_dict.items()}

            # in the first pass, compute the range
            drange = [100000, -100000]
            for dn, df in data.items():
                drange[0] = min(drange[0], df.min())
                drange[1] = max(drange[1], df.max())

            # in the next pass, compute the histograms
            for dn, df in data.items():
                hist = histogram(df, drange, bins=bins)
                self.result[tk][h][dn] = Histogram._format_data(hist)

    # --------------------------------------------------------------------------
    # Return the histogram in the required form.
    def _get_data_by_histo_type(self, df, histo_type):
        """

        :param data:
        :param prop:
        :return:
        """
        assert histo_type in df.columns

        if histo_type == "rank" and df_count(df, 'dataset') > 0:
            return df

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

# ------------------------------------------------------------------------------
