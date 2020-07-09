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


class RankHistogram:
    def __init__(self, state, name):
        self.graph = state.new_gf.graph
        self.df = state.new_gf.df
        self.entire_df = state.new_entire_gf.df
        self.name = name
        self.entry_funcs = {}
        self.result = self.run()

    def run(self):
        ret = []
        module = self.name.split("=")[0]
        func_in_module = self.df[self.df.module == module]["name"].unique().tolist()

        for idx, func in enumerate(func_in_module):
            ret.append(
                {
                    "name": func,
                    "time (inc)": self.df.loc[self.df["name"] == func][
                        "time (inc)"
                    ].tolist(),
                    "time": self.df.loc[self.df["name"] == func]["time"].tolist(),
                    "rank": self.df.loc[self.df["name"] == func]["rank"].tolist(),
                    "dataset": self.df.loc[self.df["name"] == func]["dataset"].tolist(),
                }
            )
        ret_df = pd.DataFrame(ret)
        return ret_df.to_json(orient="columns")
