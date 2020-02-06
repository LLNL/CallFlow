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

class Histogram:
	def __init__(self, state, nid):
	    self.graph = state.graph
	    self.df = state.df
	    self.entire_df = state.entire_df
	    self.nid = nid
	    self.entry_funcs = {}
	    self.result = self.run()
	    
	def run(self):    
	    ret = []
	    func_in_module = self.df[self.df.nid == self.nid]['name'].unique().tolist()
	    print(func_in_module)
	    
	    for idx, func in enumerate(func_in_module):
	        ret.append({
	            "name": func,
	            "time (inc)": self.entire_df.loc[self.entire_df['name'] == func]['time (inc)'].tolist(),
	            "time": self.entire_df.loc[self.entire_df['name'] == func]['time'].tolist(),
	            "rank": self.entire_df.loc[self.entire_df['name'] == func]['rank'].tolist(),
	        })
	    ret_df = pd.DataFrame(ret)
	    print(ret_df)
	    return ret_df.to_json(orient="columns")


