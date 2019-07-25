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
import json


class FunctionList:
    def __init__(self, state):
        self.graph = state.graph
        self.df = state.df
        self.entire_df = state.entire_df
        self.entry_funcs = state.entry_funcs[module]
        self.other_funcs = state.other_funcs[module]
        self.result = self.run()
        
    def run(self):    
        callers = []
        callees = []
        ret = []
        for idx, entry_func in enumerate(entry_funcs):
            print("Entry func: ", entry_func)
            callees.append(df[df.name == entry_func]['callees'].unique().tolist())
            callers.append(df[df.name == entry_func]['callers'].unique().tolist())

            ret.append({
                "entry_function": entry_func,
                "other_funcs": other_funcs,
                "callees": callees,
                "callers": callers
            })
        ret_df = pd.DataFrame(ret)
        return ret_df.to_json(orient="columns")

