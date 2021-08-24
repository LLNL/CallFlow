# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

"""
CallFlow's operation to calculate runtime scatterplot (inclusive vs exclusive).
"""

import pandas as pd
import numpy as np

import callflow
from callflow.datastructures.metrics import TIME_COLUMNS

LOGGER = callflow.get_logger()


class Scatterplot:
    """
    Scatterplot plotting Inclusive vs Exclusive runtime.
    """

    def __init__(
        self, sg, rel_sg=None, name="", ntype="", orientation=[]
    ):
        """
        Calculate Scatterplot for the callsite/module dataframe.

        :param sg: (CallFlow.SuperGraph)
        :param rel_sg: (CallFlow.SuperGraph)
        :param name: (str) Node's name
        :param ntype: (str) Node's type (e.g., module or callsite)
        :param orientation: (list(str, str)) Orientation of data (e.g., time vs time (inc))
        """
        assert isinstance(sg, callflow.SuperGraph)
        assert ntype in ["callsite", "module"]
        if rel_sg is not None:
            assert isinstance(rel_sg, callflow.SuperGraph)
        assert isinstance(orientation, list)
        assert all([o in TIME_COLUMNS for o in orientation])

        self.time_columns = [sg.proxy_columns.get(_, _) for _ in TIME_COLUMNS]
        SCAT_TYPES = ["tgt"]
        if rel_sg is not None:
            SCAT_TYPES = ["tgt", "bkg"]
        self.result = {_: {} for _ in SCAT_TYPES}
        self.orientation = [sg.proxy_columns.get(_, _) for _ in orientation]
        self.node_type = ntype

        df = sg.get_aux_df(name, ntype)
        self.result["tgt"] = self.compute(df)

        if rel_sg is not None:
            rel_df = rel_sg.get_aux_df(name, ntype)
            self.result["bkg"] = self.compute(rel_df)

    def compute(self, df):
        assert isinstance(df, pd.DataFrame)

        ret = {_: {} for _ in TIME_COLUMNS}
        for tk, tv in zip(TIME_COLUMNS, self.time_columns):

            if self.node_type == "callsite":
                _data = df[tv].to_numpy()
            elif self.node_type == "module":
                _data = df.groupby(["rank"])[tv].mean().to_numpy()

            _min, _mean, _max = _data.min(), _data.mean(), _data.max()

            if "rank" in df.columns:
                _ranks = df["rank"].to_numpy()
            else:
                _ranks = np.array([])

            ret[tv] = {
                "d": _data,
                "ranks": _ranks,
                "min": _min,
                "max": _max,
                "mean": _mean,
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
                "ranks": x["ranks"].tolist(),
                "xMin": x["min"],
                "xMax": x["max"],
                "yMin": y["min"],
                "yMax": y["max"],
                "orientation": self.orientation,
            }
        return ret
