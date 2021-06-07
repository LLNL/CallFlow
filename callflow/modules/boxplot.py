# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

"""
CallFlow's module to get the dataframe's boxplot (for inclusive and exclusive runtime).
"""
import numpy as np
import pandas as pd
from scipy.stats import kurtosis, skew

import callflow
from callflow.utils.df import df_count, df_unique
from callflow.utils.utils import outliers
from callflow.datastructures.metrics import TIME_COLUMNS

LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
# TODO: Boxplots also need to be computed "relative" to the ensemble
# just like the histograms
class BoxPlot:
    """
    Boxplot computation for a dataframe segment
    """

    def __init__(self, sg, name="", ntype="", proxy_columns={}):
        """
        Boxplot for 
        
        :param sg: (callflow.SuperGraph) 
        :param name: (str) Node name
        :param ntype: (str) Node type (e.g., "callsite" or "module")
        :param proxy_columns: (dict) Proxy for names.
        """
        assert isinstance(sg, callflow.SuperGraph)
        assert isinstance(name, str)
        # assert ntype in ["callsite", "module"]
        assert isinstance(proxy_columns, dict)

        if ntype == "callsite":
            df = sg.callsite_aux_dict[name]
        elif ntype == "module":
            df = sg.module_aux_dict
        
        self.ndatasets = df_count(df, 'dataset')
        self.time_columns = [proxy_columns.get(_, _) for _ in TIME_COLUMNS]
        self.result = {_: {} for _ in TIME_COLUMNS}

        for tk, tv in zip(TIME_COLUMNS, self.time_columns):

            q = np.percentile(df[tv], [0.0, 25.0, 50.0, 75.0, 100.0])
            mask = outliers(df[tv])
            mask = np.where(mask)[0]

            if 'rank' in df.columns:
                rank = df['rank'].to_numpy()[mask]
            else:
                rank = np.zeros(mask.shape[0], dtype=int)

            _data = df[tv].to_numpy()
            _min, _mean, _max = _data.min(), _data.mean(), _data.max()
            _var = _data.var() if _data.shape[0] > 0 else 0.0
            _imb = (_max - _mean) / _mean if not np.isclose(_mean, 0.0) else _max
            _skew = skew(_data)
            _kurt = kurtosis(_data)

            self.result[tk] = {"q": q,
                               "oval": df[tv].to_numpy()[mask],
                               "orank": rank,
                               "d": _data,
                                "rng": (_min, _max),
                                "uv": (_mean, _var),
                                "imb": _imb,
                                "ks": (_kurt, _skew),
                                "nid": df["nid"].unique(),
                            }
            if self.ndatasets > 1:
                self.result[tk]['odset'] = df['dataset'].to_numpy()[mask]

            self.result["name"] = name

            if ntype == "callsite":
                self.result["module"] = sg.get_module(sg.get_idx(name, ntype))

    def unpack(self):
        result = {}
        for metric in self.time_columns:
            box = self.result[metric]
            result[metric] = {
                "q": box["q"].tolist(),
                "outliers": {
                    "values": box["oval"].tolist(),
                    "ranks": box["orank"].tolist()
                },
                "min": box["rng"][0],
                "max": box["rng"][1],
                "mean": box["uv"][0],
                "var": box["uv"][1],
                "imb": box["imb"],
                "kurt": box["ks"][0],
                "skew": box["ks"][1],
                "nid": box["nid"][0],
            }
            result["name"] = self.result["name"]
            
            if self.ndatasets > 1:
                result[metric]['odset'] = box['odset'].tolist()
        
        return result

# ------------------------------------------------------------------------------
