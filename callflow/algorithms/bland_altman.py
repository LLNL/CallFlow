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
import numpy as np
import matplotlib.cm as cm


class BlandAltman:
    def __init__(self, state1, state2, col, catcol, dataset1, dataset2):
        self.graph1 = state1.graph
        self.df1 = state1.df
        self.graph2 = state2.graph
        self.df2 = state2.df
        self.col = col
        self.catcol = catcol
        self.dataset1 = dataset1
        self.dataset2 = dataset2
        self.results = self.run()

    def run(self):
        ret = []

        data1 = np.asarray(self.df1[self.col])
        name1 = np.asarray(self.df1["name"])
        dataset1 = np.array([self.dataset1 for _ in range(data1.shape[0])])
        module1 = np.asarray(self.df1["module"])

        data2 = np.asarray(self.df2[self.col])
        name2 = np.asarray(self.df2["name"])
        dataset2 = np.array([self.dataset2 for _ in range(data2.shape[0])])
        module2 = np.asarray(self.df2["module"])

        name = name2
        module = module2
        dataset = np.concatenate([dataset1, dataset2], axis=0)
        mean = np.mean([data1, data2], axis=0)
        diff = data1 - data2
        md = np.mean(diff)
        sd = np.std(diff, axis=0)
        categories = np.unique(self.df1[self.catcol].tolist())
        colors = cm.rainbow(np.linspace(0, 1, len(categories)))
        colordict = list(dict(zip(categories, colors)))
        # df1["Color"] = df1[catcol].apply(lambda x: colordict[x])

        data = {
            # 'dataset': dataset.tolist(),
            "name": name.tolist(),
            "module": module.tolist(),
            "mean": mean.tolist(),
            "diff": diff.tolist(),
        }

        data_df = pd.DataFrame(data)
        group_df = data_df.groupby(["name"]).mean()
        result = {
            "data": data_df.to_json(orient="columns"),
            "color": colordict,
            "md": md.tolist(),
            "sd": sd.tolist(),
        }
        return result
