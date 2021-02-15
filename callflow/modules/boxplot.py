# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

"""
CallFlow's module to get the dataframe's boxplot (for inclusive and exclusive runtime).
"""
import numpy as np
import pandas as pd

import callflow
from callflow.utils.df import df_count
from callflow.utils.utils import outliers
from callflow.datastructures.metrics import TIME_COLUMNS

LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
class BoxPlot:
    """
    Boxplot computation for a dataframe segment
    """

    def __init__(self, df, proxy_columns={}):
        """

        :param df:
        """
        assert isinstance(df, pd.DataFrame)
        assert isinstance(proxy_columns, dict)

        ndatasets = df_count(df, 'dataset')
        self.time_columns = [proxy_columns.get(_, _) for _ in TIME_COLUMNS]
        self.result = {_: {} for _ in TIME_COLUMNS}

        for tk, tv in zip(TIME_COLUMNS, self.time_columns):

            q = np.percentile(df[tv], [0.0, 25.0, 50.0, 75.0, 100.0])
            mask = outliers(df[tv])
            mask = np.where(mask)[0]

            self.result[tk] = {"q": q,
                               "oval": df[tv].to_numpy()[mask],
                               "orank": df['rank'].to_numpy()[mask]
                               }
            if ndatasets > 1:
                self.result[tk]['odset'] = df['dataset'].to_numpy()[mask]

            '''
            self.result[tk] = {
                "q": q,
                "outliers": {
                    "values": (mask * df[tv]).to_numpy(),
                    "datasets": (mask * df["dataset"]).to_numpy(),
                    "ranks": (mask * df["rank"]).to_numpy(),
                },
            }
            '''

# ------------------------------------------------------------------------------
