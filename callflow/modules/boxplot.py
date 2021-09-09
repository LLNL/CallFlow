# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

"""
CallFlow's module to get the dataframe's boxplot (for inclusive and exclusive runtime).
"""
import numpy as np
from scipy.stats import kurtosis, skew

import callflow
from callflow.utils.df import df_count
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

    def __init__(
        self, sg, rel_sg=None, name="", ntype="", iqr_scale=1.5
    ):
        """
        Boxplot for callsite or module

        :param sg: (callflow.SuperGraph)
        :param rel_sg: (callflow.SuperGraph) Relative supergraph
        :param name: (str) Node name
        :param ntype: (str) Node type (e.g., "callsite" or "module")
        :param proxy_columns: (dict) Proxy for names.
        """
        assert isinstance(sg, callflow.SuperGraph)
        assert isinstance(name, str)
        assert ntype in ["callsite", "module"]
        assert isinstance(iqr_scale, float)

        self.time_columns = [sg.proxy_columns.get(_, _) for _ in TIME_COLUMNS]
        self.idx = sg.get_idx(name, ntype)

        self.result = {
            "name": name,
            "type": ntype,
            "idx": self.idx,
            "module": "",
            "tgt": {},
            "bkg": {}
        }
        self.ntype = ntype
        self.iqr_scale = iqr_scale

        if ntype == "callsite":
            self.result["module"] = sg.get_module(sg.get_idx(name, ntype))
        
        self.node = {"id": self.idx, "type": ntype, "name": name}

        self.box_types = ["tgt"]
        df = BoxPlot.get_aux_dict(sg, ntype, self.idx)        
        self.result["tgt"] = self.compute(sg, df)

        self.rel_c_path = None
        if rel_sg is not None:
            self.rel_idx = rel_sg.get_idx(name, ntype)
            rel_df = BoxPlot.get_aux_dict(rel_sg, ntype, self.rel_idx)
            self.result["bkg"] = self.compute(rel_sg, rel_df)
            self.box_types = ["tgt", "bkg"]

    @staticmethod
    def get_aux_dict(sg, ntype, idx):
        if ntype == "callsite":
            aux_dict = sg.callsite_aux_dict
        elif ntype == "module":
            aux_dict = sg.module_aux_dict

        if idx not in aux_dict:
            return None
        
        return aux_dict[idx]

    def compute(self, sg, df):
        """
        Compute boxplot related information.

        :param df: Dataframe to calculate the boxplot information.
        :return:
        """

        if df is None:
            return
        
        if "dataset" in df.columns:
            self.ndataset = df_count(df, "dataset")

        ret = {_: {} for _ in TIME_COLUMNS}
        for tk, tv in zip(TIME_COLUMNS, self.time_columns):
            q = np.percentile(df[tv], [0.0, 25.0, 50.0, 75.0, 100.0])
            mask = outliers(df[tv], scale=self.iqr_scale)
            mask = np.where(mask)[0]

            if "rank" in df.columns:
                rank = df["rank"].to_numpy()[mask]
            else:
                rank = np.zeros(mask.shape[0], dtype=int)

            _data = df[tv].to_numpy()
            _min, _mean, _max = _data.min(), _data.mean(), _data.max()
            _var = _data.var() if _data.shape[0] > 0 else 0.0
            _imb = (_max - _mean) / _mean if not np.isclose(_mean, 0.0) else _max
            _skew = skew(_data)
            _kurt = kurtosis(_data)

            ret[tk] = {
                "q": q,
                "oval": df[tv].to_numpy()[mask],
                "orank": rank,
                "d": _data,
                "rng": (_min, _max),
                "uv": (_mean, _var),
                "imb": _imb,
                "ks": (_kurt, _skew),
                "idx": self.idx,
            }
            if "dataset" in df.columns:
                ret[tk]["odset"] = df["dataset"].to_numpy()[mask]

            ret[tk]["cpath"] = sg.get_component_path(self.node)


        return ret

    def unpack(self):
        """
        Unpack the boxplot data into JSON format.
        """
        result = {}
        for box_type in self.box_types:
            result[box_type] = {}

            if not self.result[box_type]:
                continue

            for metric in self.time_columns:
                box = self.result[box_type][metric]
                result[box_type][metric] = {
                    "q": box["q"].tolist(),
                    "outliers": {
                        "values": box["oval"].tolist(),
                        "ranks": box["orank"].tolist(),
                    },
                    "min": box["rng"][0],
                    "max": box["rng"][1],
                    "mean": box["uv"][0],
                    "var": box["uv"][1],
                    "imb": box["imb"],
                    "kurt": box["ks"][0],
                    "skew": box["ks"][1],
                    "nid": self.result["idx"],
                    "name": self.result["name"]
                }
                result["name"] = self.result["name"]

                if "odset" in box:
                    result[box_type][metric]["odset"] = box["odset"].tolist()

                if "cpath" in box:
                    result[box_type][metric]["cpath"] = box["cpath"]

        return result


# ------------------------------------------------------------------------------
