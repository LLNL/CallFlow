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
    def __init__(self, state, modFunc, nid):
        self.graph = state.new_gf.graph
        self.df = state.new_gf.df
        self.entire_df = state.new_entire_gf.df

        # Processing for the modFunc format to get the module name
        if "=" in modFunc:
            self.function = modFunc.split("=")[1]
            self.module = modFunc.split("=")[0]
        elif "/" in modFunc:
            self.function = modFunc.split("/")[1]
            self.module = modFunc.split("/")[0]

        self.module_df = self.df.loc[self.df["module"] == self.module]

        self.result = self.run()

    def add_paths(self, path_name):
        for idx, row in self.df.iterrows():
            # if row.show_node:
            path = row[path_name]
            print(path)
            # TODO: Sometimes the path becomes a string. Find why it happens.
            # If it becomes a string
            if isinstance(path, str):
                path = make_tuple(path)

            corrected_path = path[0]
            if len(corrected_path) >= 2:
                source = corrected_path[-2]
                target = corrected_path[-1]

                if not self.entire_g.has_edge(source, target):
                    self.entire_g.add_edge(source, target)

    def run(self):
        callers = {}
        callees = {}
        entry_func = []
        ret = []

        # Create a networkX graph.
        self.entire_g = nx.DiGraph()
        self.add_paths("path")
        print(self.entire_g.nodes())

        entry_func_df = self.module_df.loc[self.module_df["component_level"] == 2]
        entry_funcs = entry_func_df["name"].unique()
        other_func_df = self.module_df.loc[self.module_df["component_level"] > 2]
        other_funcs = other_func_df["name"].unique()
        for idx, entry_func in enumerate(entry_funcs):
            print("Entry func: ", entry_func)

            print("predecessors", self.entire_g.predecessors(entry_func))
            callers[entry_func] = list(self.entire_g.predecessors(entry_func))

            for idx, caller in enumerate(callers[entry_func]):
                callees[caller] = list(self.entire_g.predecessors(caller))

        ret.append(
            {
                "entry_functions": entry_funcs,
                "other_functions": other_funcs,
                "callers": callers,
                "callees": callees,
            }
        )
        ret_df = pd.DataFrame(ret)
        return ret_df.to_json(orient="columns")
