# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

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
        data1 = np.asarray(self.df1[self.col])
        data2 = np.asarray(self.df2[self.col])
        module2 = np.asarray(self.df2["module"])

        name = np.asarray(self.df2["name"])
        module = module2
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
        result = {
            "data": data_df.to_json(orient="columns"),
            "color": colordict,
            "md": md.tolist(),
            "sd": sd.tolist(),
        }
        return result
