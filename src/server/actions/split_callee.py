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

class splitCallee:
    def __init__(self, state, df_index):
        self.graph = state.graph
        self.df = state.df
        self.df_index = df_index
        self.entry_funcs = {}
        self.run(state)
        
    def run(self, state):    
        print(state.lookup_with_df_index(self.df_index))
        ret = {}
        return ret

