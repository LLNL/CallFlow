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
import networkx as nx
from ast import literal_eval as make_tuple

class FunctionList:
    def __init__(self, state, module):
        self.graph = state.graph
        self.df = state.df
        self.entire_df = state.entire_df
        self.module_df = self.df.loc[self.df['module'] == module]
        # self.entry_funcs = state.entry_funcs[module]
        # self.other_funcs = state.other_funcs[module]
        self.result = self.run()

    # Convert "['<unknown procedure>']" to Array([<unknown procedure>])
    def sanitize(self, string):
        # strip_1 = string.strip(['"'])
        strip_2 = string.strip(']')
        strip_3 = strip_2.strip('[')
        return strip_3.split(',')

    def add_paths(self, path_name):
        for idx, row in self.entire_df.iterrows():
            if row.show_node:
                path = row[path_name]
                # TODO: Sometimes the path becomes a string. Find why it happens. 
                # If path becomes a string.
                if isinstance(path, str):
                    path = make_tuple(row[path_name])
                self.entire_g.add_path(path)
        
    def run(self):    
        callers = {}
        callees = []
        entry_func = []
        ret = []

        # Create a networkX graph.
        self.entire_g = nx.DiGraph()
        self.add_paths('path')

        entry_func_df = self.module_df.loc[self.module_df['component_level'] == 2] 
        entry_funcs = entry_func_df['name'].unique()
        other_func_df = self.module_df.loc[self.module_df['component_level'] > 2]
        other_funcs = other_func_df['name'].unique()
        for idx, entry_func in enumerate(entry_funcs):
            print("Entry func: ", entry_func)

            callers[entry_func] = list(self.entire_g.predecessors(entry_func))
        ret.append({
            "entry_functions": entry_funcs,
            "other_functions": other_funcs,
            "callers": callers
        })
        ret_df = pd.DataFrame(ret)
        return ret_df.to_json(orient="columns")

