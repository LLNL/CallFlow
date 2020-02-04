##############################################################################
# Copyright (c) 2018-2019, Lawrence Livermore National Security, LLC.
# Produced at the Lawrence Livermore National Laboratory.
#
# This file is part of Callflow.
# Created by Suraj Kesavan <kesavan1@llnl.gov>.
# LLNL-CODE-741008. All rights reserved.
#
# For details, see: https://github.com/LLNL/Callflow
# Please also read the LICENSE file for the MIT License notice.
##############################################################################
import pandas as pd


class DiffScatterplot:
    def __init__(self, states, module):
        self.graph = state.graph
        self.df = state.df
        self.module = module
        self.entry_funcs = {}
        self.run(state)

    def run(self):
        ret = []
        entire_df = self.state.entire_df
        func_in_module = self.df[self.df.module == self.module]['name'].unique().tolist()

        for idx, func in enumerate(func_in_module):
            ret.append({
                "name": func,
                "time (inc)": entire_df.loc[entire_df['name'] == func]['time (inc)'].tolist(),
                "time": entire_df.loc[entire_df['name'] == func]['time'].tolist(),
                "rank": entire_df.loc[entire_df['name'] == func]['rank'].tolist(),
            })
        ret_df = pd.DataFrame(ret)
        return ret_df.to_json(orient="columns")


