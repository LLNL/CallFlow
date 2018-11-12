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

class splitCaller:
    def __init__(self, state, df_index):
        show_node_map = {}
        children_of_node = df[df['node'] == node].children
        for nod in children_of_node:
            show_node_map[node] = True

        utils.update_df(df, 'show_node', show_node_map)
