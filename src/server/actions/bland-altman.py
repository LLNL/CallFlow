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

class BlandAltman:
    def __init__(self, state1, state2, col, catcol):
        self.graph1 = state1.graph
        self.df1 = state1.df
        self.graph2 = state2.graph
        self.df2 = state2.df
        self.col = col
        self.catcol = catcol
        self.run(state)
        
    def run(self):    
        ret = []
        data1 = np.asarray(self.df1[self.col])
        data2 = np.asarray(self.df2[self.col])
        mean = np.mean([data1, data2], axis=0)
        diff = data1 - data2
        md = np.mean(diff)
        sd = np.std(diff, axis=0)
        categories = np.unique(self.df1[self.catcol].tolist())
        colors = cm.rainbow(np.linspace(0, 1, len(categories)))
        colordict = dict(zip(categories, colors))
        # df1["Color"] = df1[catcol].apply(lambda x: colordict[x])

        ret = {
            'color': colorDict,
            'md': md,
            'sd': sd,
            'mean': mean,
            'diff', diff,
        }
        
        ret_df = pd.DataFrame(ret)
        return ret_df.to_json(orient="columns")


