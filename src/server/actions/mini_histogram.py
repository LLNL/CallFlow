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

#!/usr/bin/env python3

import pandas as pd


class MiniHistogram:
    def __init__(self, state):
        self.state = state
        self.graph = state.graph
        self.df = state.df
        self.results = self.run()
        
    def run(self):    
        ret = {}
        ret_df = {}
        entire_df = self.state.entire_df
        modules_in_df = self.df['_module'].unique()

        for module in modules_in_df:
            func_in_module = self.df[self.df._module == module]['name'].unique().tolist()
            for idx, func in enumerate(func_in_module):
                func_df = entire_df.loc[entire_df['name'] == func]
                if module not in ret:
                    ret[module] = []
                ret[module].append({
                    "name": func,
                    "time (inc)": func_df['time (inc)'].tolist(),
                    "mean_time (inc)": func_df['time (inc)'].mean(),
                    "time": func_df['time'].tolist(),
                    "mean_time": func_df['time'].mean(),
                    "rank": func_df['rank'].tolist(),
                })
            ret_df[module] = pd.DataFrame(ret[module])
            ret[module] = ret_df[module].to_json(orient="columns")
        return json.dumps(ret)
        return ret

