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
# ------------------------------------------------------------------------------
class BoxPlot:
    """
    Boxplot computation
    """
    KEYS_AND_ATTRS = {'Inclusive': 'time (inc)',
                      'Exclusive': 'time'}

    def __init__(self, df):

        assert isinstance(df, pd.DataFrame)

        self.result = {"q": {}, "outliers": {}}

        for k,a in BoxPlot.KEYS_AND_ATTRS.items():

            q = np.percentile(df[a], [0., 25., 50., 75., 100.])
            mask = outliers(df[a])

            self.result["q"][k] = q
            self.result["outliers"][k] = {
                "values": (mask * df[a]),
                "datasets": (mask * df['dataset']),
                "ranks": (mask * df['rank'])}

# ------------------------------------------------------------------------------
