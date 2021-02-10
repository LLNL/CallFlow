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
from callflow.utils.df import df_lookup_by_column, df_lookup_and_list

LOGGER = callflow.get_logger()


class RuntimeScatterplot:
    """
    Scatterplot plotting Inclusive vs Exclusive runtime.
    """
    KEYS_TO_ADD = ["name", "rank", "time", "time (inc)"]

    def __init__(self, state, module):
        """
        Constructor.
        :param state:
        :param module:
        """
        self.entire_df = state.entire_df
        self.graph = state.new_gf.graph
        self.df = state.new_gf.df

        assert 0
        self.module = module
        self.entry_funcs = {}
        self.result = self.compute()

    def compute(self):
        """
        Compute method.
        :return:
        """
        ret = []

        callsites = df_lookup_and_list(self.df, "module", self.module, "name")
        for func in callsites:

            _ret = {}
            _df = df_lookup_by_column(self.entire_df, "name", func)
            for _ in RuntimeScatterplot.KEYS_TO_ADD:
                if _ == "name":
                    _ret[_] = func
                else:
                    _ret[_] = _df[_].to_numpy()
            ret.append(_ret)

        return pd.DataFrame(ret).to_json(orient="columns")


# ------------------------------------------------------------------------------
