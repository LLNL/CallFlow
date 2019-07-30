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
    def __init__(self, state, module):
        self.graph = state.graph
        self.df = state.df
        self.entire_df = state.entire_df
        self.entry_funcs = state.entry_funcs[module]
        self.other_funcs = state.other_funcs[module]
        self.result = self.run()

    # Convert "['<unknown procedure>']" to Array([<unknown procedure>])
    def sanitize(self, string):
        print(string)
        # strip_1 = string.strip(['"'])
        strip_2 = string.strip(']')
        strip_3 = strip_2.strip('[')
        return strip_3.split(',')
        
    def run(self):    
        callers = []
        callees = []
        ret = []
        for idx, entry_func in enumerate(self.entry_funcs):
            print("Entry func: ", entry_func)
            callees_array = self.df[self.df.name == entry_func]['callees'].unique() 
            callers_array = self.df[self.df.name == entry_func]['callers'].unique()

            for idx, callee in enumerate(callees_array):
                callees.append(self.sanitize(callee))
            for idx, caller in enumerate(callers_array):
                callers.append(self.sanitize(caller))

            ret.append({
                "entry_function": entry_func,
                "other_funcs": self.other_funcs,
                "callees": callees,
                "callers": callers
            })
        ret_df = pd.DataFrame(ret)
        return ret_df.to_json(orient="columns")

