# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

"""
CallFlow's algorithm to compute the bland-altman plot.
"""
import numpy as np
import matplotlib.cm as cm


class BlandAltman_Plot:
    """
    Bland altman plot calculation.
    A Bland–Altman plot or mean-difference plot to compare two executions by their mean runtime.
    """

    def __init__(self):
        pass

    def compute(self, df_1, df_2, col, catcol):
        """
        Compute the bland altman plot results.
        :param df_1: Dataframe 1
        :param df_2: Dataframe 2
        :param col: column to calculate the mean differences
        :param catcol: column to aggregate (usually by name or module column).
        :return: JSON {
            "name": catcol, // callsite
            "mean": mean, // mean of the combined data
            "diff": diff, absolute difference
            "color": colordict, // A linear space color map
            "md": md, mean difference
            "sd": sd, std. deviation
        }
        """

        assert col in df_1 and catcol in df_1
        assert col in df_2 and catcol in df_2

        np_df_col_1 = np.asarray(df_1[col])
        np_df_col_2 = np.asarray(df_2[col])

        mean = np.mean([np_df_col_1, np_df_col_2], axis=0)
        diff = np_df_col_1 - np_df_col_2
        md = np.mean(diff)
        sd = np.std(diff, axis=0)

        categories = np.concatenate(np.unique(df_1[catcol]), np.unique(df_2[catcol]))
        colors = cm.rainbow(np.linspace(0, 1, len(categories)))
        colordict = list(dict(zip(categories, colors)))

        return {
            "axis": catcol,
            "mean": mean,
            "diff": diff,
            "color": colordict,
            "md": md,
            "sd": sd,
        }
