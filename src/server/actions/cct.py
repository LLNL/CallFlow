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
import networkx as nx
from ast import literal_eval as make_tuple


class CCT:
    def __init__(self, state):
        self.entire_graph = state.entire_graph
        self.entire_df = state.entire_df
        self.run()

    def add_node_attributes(self):
        time_inc_mapping = self.generic_map(self.g.nodes(), 'time (inc)')
        nx.set_node_attributes(self.g, name='time (inc)', values=time_inc_mapping)

        time_mapping = self.generic_map(self.g.nodes(), 'time')
        nx.set_node_attributes(self.g, name='time', values=time_mapping)

        module_mapping = self.generic_map(self.g.nodes(), 'module')
        nx.set_node_attributes(self.g, name='module', values=module_mapping)

        imbalance_perc_mapping = self.generic_map(self.g.nodes(), 'imbalance_perc')
        nx.set_node_attributes(self.g, name='imbalance_perc', values=imbalance_perc_mapping)

    def generic_map(self, nodes, attr):
        ret = {}
        for node in nodes:          
            if attr == 'time' or attr == 'time (inc)' or attr == 'imbalance_perc':
                ret[node] = self.entire_df.loc[self.entire_df['name'] == node][attr].mean()
            else:
                ret[node] = list(set(self.entire_df[self.entire_df['name'] == node][attr].tolist()))[0]            
        return ret

    def add_paths(self, path_name):
        for idx, row in self.entire_df.iterrows():
            if row.show_node:
                path = row[path_name]
                # TODO: Sometimes the path becomes a string. Find why it happens. 
                # If it becomes a string 
                if isinstance(path, str):
                    path = make_tuple(row[path_name])
                self.g.add_path(path)  

    def run(self):    
        self.g = nx.DiGraph()
        self.add_paths('path')
        self.add_node_attributes() 
