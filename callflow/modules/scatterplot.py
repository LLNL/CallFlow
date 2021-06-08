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
        if relative_to_df is not None:
            assert isinstance(relative_to_df, pd.DataFrame)
        assert isinstance(proxy_columns, dict)
        assert isinstance(orientation, list)
        assert all([o in TIME_COLUMNS for o in orientation])

        self.time_columns = [proxy_columns.get(_, _) for _ in TIME_COLUMNS]
        SCAT_TYPES = ["abs"]
        if relative_to_df is not None:
            SCAT_TYPES = ["abs", "rel"]
        self.result = {_: {} for _ in SCAT_TYPES}
        self.orientation = [proxy_columns.get(_, _) for _ in orientation]
        self.node_type = node_type

        # now, append the data
        self.result["abs"] = self.compute(df)

        if relative_to_df is not None:
            self.result["rel"] = self.compute(relative_to_df)

    def compute(self, df):
        assert isinstance(df, pd.DataFrame)

        ret = { _: {} for _ in TIME_COLUMNS }
        for tk, tv in zip(TIME_COLUMNS, self.time_columns):

            if self.node_type == "callsite":
                _data = df[tv].to_numpy()
            elif self.node_type == "module":
                _data = df.groupby(["rank"])[tv].mean().to_numpy()

            _min, _mean, _max = _data.min(), _data.mean(), _data.max()

            ret[tv] = {
                "d": _data,
                "min": _min,
                "max": _max,
                "mean": _mean
            }
        
        return ret

    def unpack(self):
        """
        Unpack the data into JSON-supported format. 

        :return: (JSON) 
        """
        ret = {}
        for scat_type in self.result.keys():
            x = self.result[scat_type][self.orientation[0]]
            y = self.result[scat_type][self.orientation[1]]

            ret[scat_type] = {
                "x": x["d"].tolist(),
                "y": y["d"].tolist(),
                "xMin": x["min"],
                "xMax": x["max"],
                "yMin": y["min"],
                "yMax": y["max"]
            }
        return ret