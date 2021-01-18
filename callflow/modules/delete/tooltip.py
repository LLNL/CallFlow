# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import pandas as pd

import callflow
from callflow.utils.utils import df_lookup_by_column, df_names_in_module

LOGGER = callflow.get_logger()


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class ToolTip:

    KEYS_TO_ADD = ['name', 'rank', 'time', 'time (inc)', 'callers', 'callees']

    def __init__(self, state, module):

        self.state = state
        self.graph = state.new_gf.graph
        self.df = state.new_gf.df
        self.entire_df = state.new_entire_gf.df

        self.module = module
        self.result = self.run()

    def run(self):

        ret = []

        callsites = df_names_in_module(self.df, self.module)
        for func in callsites:

            _ret = {}

            name_entire_df = df_lookup_by_column(self.entire_df, "name", func)
            name_df = df_lookup_by_column(self.df, "name", func)

            for _ in ToolTip.KEYS_TO_ADD:
                if _ == 'name':
                    _ret[_] = func
                elif _ in ['callers', 'callees']:
                    _ret[_] = name_df[_].tolist()
                else:
                    _ret[_] = name_entire_df[_].tolist()

        return pd.DataFrame(ret).to_json(orient="columns")

# ------------------------------------------------------------------------------
