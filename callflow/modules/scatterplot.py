# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

"""
CallFlow's operation to calculate runtime scatterplot (inclusive vs exclusive).
"""

import pandas as pd

import callflow
from callflow.datastructures.metrics import TIME_COLUMNS

LOGGER = callflow.get_logger()


class Scatterplot:
    """
    Scatterplot plotting Inclusive vs Exclusive runtime.
    """

    KEYS_TO_ADD = ["name", "rank", "time", "time (inc)"]

    def __init__(self, df, relative_to_df=None, node_type="", orientation=[],  proxy_columns={}):
        """
        Calculate Scatterplot for the callsite/module dataframe.

        :param df: (Pandas.DataFrame)
        :param relative_to_df: (Pandas.DataFrame)
        :param node_type: (str) Node's type (e.g., module or callsite)
        :param orientation: (list(str, str)) Orientation of data (e.g., time vs time (inc))


        """
        assert isinstance(df, pd.DataFrame)
        assert node_type in ["callsite", "module"]
        assert isinstance(proxy_columns, dict)
        assert isinstance(orientation, list)
        assert all([o in TIME_COLUMNS for o in orientation])

        self.time_columns = [proxy_columns.get(_, _) for _ in TIME_COLUMNS]
        self.result = {_: {} for _ in TIME_COLUMNS}
        self.orientation = [proxy_columns.get(_, _) for _ in orientation]

        # now, append the data
        for tk, tv in zip(TIME_COLUMNS, self.time_columns):

            if node_type == "callsite":
                _data = df[tv].to_numpy()
            elif node_type == "module":
                _data = df.groupby(["rank"])[tv].mean().to_numpy()

            _min, _mean, _max = _data.min(), _data.mean(), _data.max()

            self.result[tk] = {
                "d": _data,
                "min": _min,
                "max": _max,
                "mean": _mean
            }

    def unpack(self):
        """
        Unpack the data into JSON-supported format. 

        :return: (JSON) 
        """
        x = self.result[self.orientation[0]]
        y = self.result[self.orientation[1]]

        return {
            "x": x["d"].tolist(),
            "y": y["d"].tolist(),
            "xMin": x["min"],
            "xMax": x["max"],
            "yMin": y["min"],
            "yMax": y["max"]
        }