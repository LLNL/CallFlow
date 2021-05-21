# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

"""
CallFlow's module to consolidate the auxiliary information
(i.e., histograms, gradients, and boxplots)
for each call site or module based on the type of data requested.
"""
import numpy as np
import pandas as pd
from scipy.stats import kurtosis, skew
import multiprocessing
from functools import partial

import callflow
from callflow.utils.df import df_unique, df_bi_level_group

from .gradients import Gradients
from .boxplot import BoxPlot
from .histogram import Histogram
from .unpack_auxiliary import UnpackAuxiliary
from callflow.datastructures.metrics import TIME_COLUMNS

LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
class Auxiliary:
    """
    Auxiliary: consolidates per-callsite and per-module information.
    """
    def __init__(self, sg, nbins_rank: int = 20, nbins_run: int = 20):
        """
        Constructor
        :param sg: SuperGraph
        :param selected_runs: Array of selected runs
        :param nbins_rank: Bin count for MPI-level histogram
        :param nbins_run: Bin count for run-level histogram
        """
        LOGGER.info(f"Computing auxiliary data for {sg}")
        assert isinstance(sg, (callflow.SuperGraph, callflow.EnsembleGraph))

        self.nbins_rank = nbins_rank
        self.nbins_run = nbins_run
        self.sg = sg

        self.proxy_columns = sg.proxy_columns
        self.time_columns = [self.proxy_columns.get(_, _) for _ in TIME_COLUMNS]

        self.name = sg.name
    
    def unpack(self, unpack: bool=False):
        if unpack:
            if isinstance(sg, callflow.SuperGraph) and not isinstance(sg, callflow.EnsembleGraph):
                self.aux = UnpackAuxiliary(data=self.single_auxiliary(sg), name=sg.name).data
            elif isinstance(sg, callflow.EnsembleGraph):
                self.aux = UnpackAuxiliary(data=self.ensemble_auxiliary(sg), name=sg.name).data

        else:
            # TODO: This will be deprecated.
            self.runs = sg.filter_by_datasets(selected_runs)

            if not isinstance(sg, callflow.EnsembleGraph):
                self.result =  self.single_auxiliary(sg)
            else:
                self.result = self.ensemble_auxiliary(sg)
        
    @property
    def get_aux(self):
        return self.aux

    # --------------------------------------------------------------------------

    def single_auxiliary(self, sg):
        assert isinstance(sg, callflow.SuperGraph)
        df_module = df_bi_level_group(sg.dataframe, "module", "name", cols=self.time_columns, group_by=["rank"], apply_func=lambda _: _.mean())
        df_name = df_bi_level_group(sg.dataframe, "name", None, cols=self.time_columns, group_by=["rank"], apply_func=lambda _: _.mean())

        return {
            "data_mod": self.new_collect_data(sg.name, "module", df_module),
            "data_cs": self.new_collect_data(sg.name, "name", df_name),
        }

    def ensemble_auxiliary(self, sg):
        assert isinstance(sg, callflow.EnsembleGraph)
        edf_module = df_bi_level_group(sg.dataframe, "module", "name", cols=self.time_columns, group_by=["dataset", "rank"], apply_func=lambda _: _.mean())        
        edf_name = df_bi_level_group(sg.dataframe, "name", None, cols=self.time_columns, group_by=["dataset", "rank"], apply_func=lambda _: _.mean())

        runs = list(sg.supergraphs.keys())
        runs.remove("ensemble") # TODO: avoid removing "ensemble" here. 

        with multiprocessing.Pool(processes=multiprocessing.cpu_count()) as pool:
            result = pool.map(partial(self._relative_computation, sg=sg, edf_module=edf_module, edf_name=edf_name), runs)

        result = {res["tag"]: res for res in result}

        result["ensemble"] = {
            "data_mod": self.new_collect_data(sg.name, "module", edf_module),
            "data_cs": self.new_collect_data(sg.name, "name", edf_name),
        }

        return result

    def _relative_computation(self, dataset, sg, edf_module, edf_name):
        assert isinstance(sg, callflow.EnsembleGraph)

        if len(sg.supergraphs[dataset].dataframe['rank'].unique().tolist()) == 1:
            group_by = []
        else:
            group_by = ["rank"]

        df_module = df_bi_level_group(sg.supergraphs[dataset].dataframe, "module", "name", cols=self.time_columns, group_by=group_by, apply_func=lambda _: _.mean())        
        df_name = df_bi_level_group(sg.supergraphs[dataset].dataframe, "name", None, cols=self.time_columns, group_by=group_by, apply_func=lambda _: _.mean())

        return {
            "data_mod": self.new_collect_data(dataset, "module", df_module, edf_module),
            "data_cs": self.new_collect_data(dataset, "name", df_name, edf_name),
        }

    def new_collect_data(self, name, grp_column, grp_df, grp_edf=None):

        assert grp_column in ['module', 'name']

        is_callsite = grp_column == "name"
        is_ensemble = name == "ensemble"
        is_relative = grp_edf is not None

        assert not is_ensemble or not is_relative

        histogram, boxplot, gradients = None, None, None
        ensemble_df = None

        histo_types = []
        if not is_relative and not is_ensemble:
            histo_types = ['rank']

        result = {}
        for grp_name in grp_df:

            df = grp_df[grp_name]

            if is_relative:
                ensemble_df = grp_edf[grp_name]
            histogram = Histogram(df, relative_to_df=ensemble_df,
                                  histo_types=histo_types,
                                  proxy_columns=self.proxy_columns).result

            # todo: boxplot should also be for target wrt ensemble
            boxplot = BoxPlot(df, proxy_columns=self.proxy_columns).result

            if is_ensemble:
                gradients = Gradients(df, bins=self.nbins_run,
                                      callsiteOrModule=grp_name,
                                      grp_type=grp_column,
                                      proxy_columns=self.proxy_columns).result

            # ------------------------------------------------------------------
            result[grp_name] = self.pack_json(df=df,
                                              name=grp_name,
                                              grp_type=grp_column,
                                              is_ensemble=is_ensemble,
                                              is_callsite=is_callsite,
                                              gradients=gradients,
                                              histograms=histogram,
                                              boxplots=boxplot)

        return result

    # --------------------------------------------------------------------------
    def pack_json(self, name, df, is_ensemble, is_callsite,
                  gradients=None, histograms=None, boxplots=None,
                  grp_type="name"):
        """

        :param name:
        :param df:
        :param is_ensemble:
        :param is_callsite:
        :param gradients:
        :param histograms:
        :param boxplots:
        :param grp_type:
        :return:
        """
        assert grp_type in ['name', 'module']

        _id_col = 'nid' if grp_type == "name" else 'module'
        result = {"name":               name,
                  "id":                 f"{grp_type}-{name}",
                  "dataset":            df_unique(df, "dataset"),
                  "component_path":     df_unique(df, "component_path"),
                #   "component_level":    df_unique(df, "component_level")
                  }

        #if grp_type == "module":
        #    result["module"] = df_unique(df, "module")

        # now, append the data
        for tk, tv in zip(TIME_COLUMNS, self.time_columns):

            if grp_type == "name":
                _data = df[tv].to_numpy()
            elif grp_type == "module":
                _data = df.groupby(["rank"])[tv].mean().to_numpy()
            else:
                assert False

            # compute the statistics
            _min, _mean, _max = _data.min(), _data.mean(), _data.max()
            _var = _data.var() if _data.shape[0] > 0 else 0.0
            #_std = np.sqrt(_var)
            _imb = (_max - _mean) / _mean if not np.isclose(_mean, 0.0) else _max
            _skew = skew(_data)
            _kurt = kurtosis(_data)

            result[tk] = {"d": _data,
                          "rng": (_min, _max),
                          "uv": (_mean, _var),
                          #"std": _std,
                          "imb": _imb,
                          "ks": (_kurt, _skew)
                          }

            if gradients is not None:
                result[tk]["grd"] = gradients[tk]

            if boxplots is not None:
                result[tk]["box"] = boxplots[tk]

            if histograms is not None:
                result[tk]["hst"] = histograms[tk]

        return result

    # --------------------------------------------------------------------------
