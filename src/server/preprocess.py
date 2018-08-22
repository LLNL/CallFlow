##############################################################################
# Copyright (c) 2018-2019, Lawrence Livermore National Security, LLC.
# Produced at the Lawrence Livermore National Laboratory.
#
# This file is part of Callflowt.
# Created by Suraj Kesavan <kesavan1@llnl.gov>.
# LLNL-CODE-741008. All rights reserved.
#
# For details, see: https://github.com/LLNL/Callflow
# Please also read the LICENSE file for the MIT License notice.
##############################################################################

#!/usr/bin/env python3

import utils

class PreProcess():
    def __init__(self, df):
        self.df = df
        # Bring out the path information from the node object
        self.df['path'] = self.df['node'].apply(lambda node: node.callpath)

        # Max of the inclusive Runtimes among all processes
        # node -> max([ inclusive times of process])
        self.max_incTime_map = self.create_max_incTime_map()
        self.df['max_incTime'] = self.df['node'].apply(lambda node: self.max_incTime_map[node])

        # Avg of inclusive Runtimes among all processes
        # node -> avg([ inclusive times of process])
        self.avg_incTime_map = self.create_avg_incTime_map()
        self.df['avg_incTime'] = self.df['node'].apply(lambda node: self.avg_incTime_map[node])
                
        # Imbalance percentage Series in the dataframe
        self.imbalance_perc_map = self.create_imbalance_perc_map()
        self.df['imbalance_perc'] = self.df['node'].apply(lambda node: self.imbalance_perc_map[node])
        
        # Create a pandas series for showNode and set it to True
        self.df['show_node'] = self.df['node'].apply(lambda node: True)
        
        # node_name is different from name in dataframe. So creating a copy of it.
        self.df['node_name'] = self.df['name'].apply(lambda name: name)

        

    def create_max_incTime_map(self):
        ret = {}
        for idx, row in self.df.iterrows():
            ret[row.node] = max(utils.lookup(self.df, row.node)['CPUTIME (usec) (I)'])

        return ret

    def create_avg_incTime_map(self):
        ret = {}
        for idx, row in self.df.iterrows():
            ret[row.node] = utils.avg(utils.lookup(self.df, row.node)['CPUTIME (usec) (I)'])

        return ret
        
    def create_imbalance_perc_map(self):
        ret = {}
        for idx, row in self.df.iterrows():
            ret[row.node] = (self.max_incTime_map[row.node] - self.avg_incTime_map[row.node])/ self.max_incTime_map[row.node]
            
        return ret
    
