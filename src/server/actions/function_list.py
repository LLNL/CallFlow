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
        
        for idx, entry_func in enumerate(entry_funcs):
            print("Entry func: ", entry_func)
            callees.append(df[df.name == entry_func]['callees'].unique().tolist())
            callers.append(df[df.name == entry_func]['callers'].unique().tolist())

        return {
            "entry_function": entry_funcs,
            "other_funcs": other_funcs,
            "callees": callees,
            "callers": callers
        }
        ret = []
        func_in_module = self.df[df.mod_index == mod_index]['name'].unique().tolist()
        
        for idx, func in enumerate(func_in_module):
            name_entire_df = self.entire_df.loc[self.entire_df['name'] == func]
            name_df = self.df.loc[self.df['name'] == func]
            ret.append({
                "name": func,
                "time (inc)": name_entire_df['time (inc)'].tolist(),
                "time": name_entire_df['time'].tolist(),
                "rank": name_entire_df['rank'].tolist(),
                "callers": name_df['callers'].tolist(),
                "callees": name_df['callees'].tolist()
            })
        ret_df = pd.DataFrame(ret)
        return ret_df.to_json(orient="columns")

