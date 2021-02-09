# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import numpy as np
import pandas as pd

import callflow
from callflow.utils.utils import outliers

LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
# Compute Boxplots for a dataframe segment
# ------------------------------------------------------------------------------
class BoxPlot:
    """
    Boxplot computation
    """

    KEYS_AND_ATTRS = {"Inclusive": "time (inc)", "Exclusive": "time"}

    def __init__(self, df):
        """

        :param df:
        """
        assert isinstance(df, pd.DataFrame)
        self.result = {}

        for k, a in BoxPlot.KEYS_AND_ATTRS.items():

            q = np.percentile(df[a], [0.0, 25.0, 50.0, 75.0, 100.0])
            mask = outliers(df[a])

            self.result[k] = {
                "q": q,
                "outliers": {
                    "values": (mask * df[a]).to_numpy(),
                    "datasets": (mask * df["dataset"]).to_numpy(),
                    "ranks": (mask * df["rank"]).to_numpy(),
                },
            }


# ------------------------------------------------------------------------------
