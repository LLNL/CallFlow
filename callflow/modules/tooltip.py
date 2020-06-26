# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
#------------------------------------------------------------------------------
# Library imports
import pandas as pd
import json

#------------------------------------------------------------------------------
class ToolTip:
    def __init__(self, state, module):
        self.state = state
        self.graph = state.new_gf.graph
        self.df = state.new_gf.df
        self.entire_df = state.new_entire_gf.df
        self.module = module
        self.result = self.run()

    def run(self):
        ret = []
        func_in_module = self.df[df.module == module]["name"].unique().tolist()

        for idx, func in enumerate(func_in_module):
            name_entire_df = self.entire_df.loc[self.entire_df["name"] == func]
            name_df = self.df.loc[self.df["name"] == func]
            ret.append(
                {
                    "name": func,
                    "time (inc)": name_entire_df["time (inc)"].tolist(),
                    "time": name_entire_df["time"].tolist(),
                    "rank": name_entire_df["rank"].tolist(),
                    "callers": name_df["callers"].tolist(),
                    "callees": name_df["callees"].tolist(),
                }
            )
        ret_df = pd.DataFrame(ret)
        return ret_df.to_json(orient="columns")
