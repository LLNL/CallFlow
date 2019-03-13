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

class componentGraph:
    def __init__(self, state, module):
        self.graph = state.graph
        self.df = state.df
        self.module = module
        self.run()

    def run(self):
        """
        Return the component graph for a module.
        """
        paths = []
        func_in_module = state.df.loc[state.df['module'] == module]['name'].unique().tolist()
        print("Number of functions inside the {0} module: {1}".format(module, len(func_in_module)))
        for idx, func in enumerate(func_in_module):
            paths.append({
                "module": module,
                "path": [state.df.loc[state.df['name'] == func]['component_path'].unique().tolist()[0]],
                "inc_time" : state.df.loc[state.df['name'] == func]['CPUTIME (usec) (I)'].mean()
            })
        return pd.DataFrame(paths)
