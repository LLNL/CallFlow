# *******************************************************************************
# * Copyright (c) 2020, Lawrence Livermore National Security, LLC.
# * Produced at the Lawrence Livermore National Laboratory.
# *
# * Written by Suraj Kesavan <htpnguyen@ucdavis.edu>.
# *
# * LLNL-CODE-740862. All rights reserved.
# *
# * This file is part of CallFlow. For details, see:
# * https://github.com/LLNL/CallFlow
# * Please also read the LICENSE file for the MIT License notice.
# ******************************************************************************
# Library imports
import pandas as pd

class RuntimeScatterplot:
    def __init__(self, states, module):
        self.graph = state.new_gf.graph
        self.df = state.new_gf.df
        self.module = module
        self.entry_funcs = {}
        self.run(state)

    def run(self):
        ret = []

        # this should not work because there is no self.state
        entire_df = self.state.entire_df
        func_in_module = (
            self.df[self.df.module == self.module]["name"].unique().tolist()
        )

        for idx, func in enumerate(func_in_module):
            ret.append(
                {
                    "name": func,
                    "time (inc)": entire_df.loc[entire_df["name"] == func][
                        "time (inc)"
                    ].tolist(),
                    "time": entire_df.loc[entire_df["name"] == func]["time"].tolist(),
                    "rank": entire_df.loc[entire_df["name"] == func]["rank"].tolist(),
                }
            )
        ret_df = pd.DataFrame(ret)
        return ret_df.to_json(orient="columns")
