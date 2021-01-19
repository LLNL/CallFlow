# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

import pandas as pd
import numpy as np
import matplotlib.cm as cm


class BlandAltman_Plot:
    def __init__(self):
        pass

    def compute(self, supergraph_1, supergraph_2, col, catcol, dataset1, dataset2):
        assert col in supergraph_1.df
        assert col in supergraph_2.df
        assert catcol in supergraph_1.df
        assert catcol in supergraph_2.df
        
        np_df_col_1 = np.asarray(supergraph_1.df[col])
        np_df_col_2 = np.asarray(supergraph_2.df[col])

        mean = np.mean([np_df_col_1, np_df_col_2], axis=0)
        diff = np_df_col_1 - np_df_col_2
        md = np.mean(diff)
        sd = np.std(diff, axis=0)

        categories = np.concatenate(np.unique(supergraph_1.df[catcol].tolist()), np.unique(supergraph_2.df[catcol].tolist()))
        colors = cm.rainbow(np.linspace(0, 1, len(categories)))
        colordict = list(dict(zip(categories, colors)))

        result = {
            "data": {
                "name": name.tolist(),
                "module": module.tolist(),
                "mean": mean.tolist(),
                "diff": diff.tolist(),
            },
            "color": colordict,
            "md": md.tolist(),
            "sd": sd.tolist(),
        }
        return result
