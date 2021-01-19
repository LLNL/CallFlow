# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import pandas as pd

import callflow
from callflow.utils.utils import df_lookup_by_column

LOGGER = callflow.get_logger()


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class RuntimeScatterplot:

    KEYS_TO_ADD = ['name', 'rank', 'time', 'time (inc)']

    def __init__(self, state, module):

        self.entire_df = state.entire_df
        self.graph = state.new_gf.graph
        self.df = state.new_gf.df

        assert 0
        self.module = module
        self.entry_funcs = {}
        self.result = self.run()

    def run(self):

        ret = []

        callsites = df_lookup_and_list(self.df, "module", self.module, "name")
        for func in callsites:

            _ret = {}
            _df = df_lookup_by_column(self.entire_df, "name", func)
            for _ in RuntimeScatterplot.KEYS_TO_ADD:
                if _ == 'name':
                    _ret[_] = func
                else:
                    _ret[_] = _df[_].tolist()
            ret.append(_ret)

        return pd.DataFrame(ret).to_json(orient="columns")

# ------------------------------------------------------------------------------
