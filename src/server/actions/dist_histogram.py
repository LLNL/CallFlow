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

class DistHistogram:
    def __init__(self, state, name):
        self.graph = state.g
        self.df = state.df
        self.entire_df = state.entire_df
        self.name = name
        self.entry_funcs = {}
        self.result = self.run()

    def run(self):
        ret = []
        func_in_module = self.df[self.df.vis_name == self.name]['name'].unique().tolist()

        for idx, func in enumerate(func_in_module):
            ret.append({
                "name": func,
                "time (inc)": self.df.loc[self.df['name'] == func]['time (inc)'].tolist(),
                "time": self.df.loc[self.df['name'] == func]['time'].tolist(),
                "rank": self.df.loc[self.df['name'] == func]['rank'].tolist(),
            })
        ret_df = pd.DataFrame(ret)
        return ret_df.to_json(orient="columns")


