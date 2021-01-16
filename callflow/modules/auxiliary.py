# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

import os
import sys
import json
import math
import numpy as np
from .gradients import Gradients
from .boxplot import BoxPlot
from .histogram import Histogram

import callflow
LOGGER = callflow.get_logger(__name__)

class Auxiliary:
    def __init__(self, supergraph, MPIBinCount: int = 20, RunBinCount: int = 20):
        self.MPIBinCount = MPIBinCount
        self.RunBinCount = RunBinCount
        self.hist_props = ["rank", "name", "dataset", "all_ranks"]

        self.runs = supergraph.config["parameter_props"]["runs"]
        if len(self.runs) > 1:
            self.e_df = Auxiliary.select_rows(supergraph.dataframe, self.runs)
        else:
            self.e_df = supergraph.dataframe
 
        self.e_name_group_df = self.e_df.groupby(["name"])
        self.e_module_group_df = self.e_df.groupby(["module"])
        self.e_module_name_group_df = self.e_df.groupby(["module", "name"])
        
        self.t_df = {}
        self.t_module_group_df = {}
        self.t_module_name_group_df = {}
        self.t_name_group_df = {}
        for dataset in self.runs:
            self.t_df[dataset] = self.e_df.loc[self.e_df["dataset"] == dataset]
            self.t_name_group_df[dataset] = self.t_df[dataset].groupby(["name"])
            self.t_module_group_df[dataset] = self.t_df[dataset].groupby(["module"])
            self.t_module_name_group_df[dataset] = self.t_df[dataset].groupby(["module", "name"])

        self.auxiliary_data = {
            "callsite": self.callsite_data(),
            "module": self.module_data(),
            "moduleCallsiteMap": self.get_callsite_module_map()
        }

    # Callsite grouped information
    # TODO: Need to clean up this further.
    def callsite_data(self):
        ret = {}
        # Create the data dict.
        ensemble = {}
        for callsite, callsite_df in self.e_name_group_df:
            callsite_ensemble_df = self.e_name_group_df.get_group(callsite)
            histograms = Histogram(ensemble_df=callsite_ensemble_df)
            gradients = Gradients(self.t_df, binCount=self.RunBinCount, callsiteOrModule=callsite)
            boxplot = BoxPlot(callsite_df)
            ensemble[callsite] = self.pack_json(
                callsite_df,
                callsite,
                gradients=gradients.result,
                q=boxplot.q,
                outliers=boxplot.outliers,
                prop_hists=histograms.result,
                isEnsemble=True,
                isCallsite=True,
            )
        ret["ensemble"] = ensemble

        ## Target data.
        # Loop through datasets and group the callsite by name.
        for dataset in self.runs:
            name_grouped = self.t_name_group_df[dataset]
            target = {}
            for callsite, callsite_df in name_grouped:
                callsite_ensemble_df = self.e_name_group_df.get_group(callsite)
                callsite_target_df = callsite_df
                if not callsite_df.empty:
                    histogram = Histogram(ensemble_df=callsite_ensemble_df, target_df=callsite_target_df)
                    boxplot = BoxPlot(callsite_df)
                    target[callsite] = self.pack_json(
                        df=callsite_target_df,
                        name=callsite,
                        prop_hists=histogram.result,
                        q=boxplot.q,
                        outliers=boxplot.outliers,
                        isEnsemble=False,
                        isCallsite=True,
                    )
            ret[dataset] = target
        return ret

    # Module grouped information.
    # TODO: Need to clean up this further.
    def module_data(self):
        ret = {}
        # Module grouped information
        ensemble = {}
        for module, module_df in self.e_module_group_df:
            module_ensemble_df = self.e_module_group_df.get_group(module)
            histogram = Histogram(ensemble_df=module_ensemble_df)
            gradients = Gradients(self.t_df, binCount=self.RunBinCount, callsiteOrModule=module)
            ensemble[module] = self.pack_json(
                df=module_df,
                name=module,
                gradients=gradients.result,
                prop_hists=histogram.result,
                isEnsemble=True,
            )
        ret["ensemble"] = ensemble
        
        for dataset in self.runs:
            target = {}
            module_group_df = self.t_module_group_df[dataset]
            for module, module_df in module_group_df:
                module_ensemble_df = self.e_module_group_df.get_group(module)
                module_target_df = module_df
                if not module_target_df.empty:
                    histogram = Histogram(ensemble_df=module_ensemble_df, target_df=module_target_df)
                    target[module] = self.pack_json(
                        df=module_target_df,
                        name=module,
                        gradients=gradients.result,
                        prop_hists=histogram.result,
                        isEnsemble=False,
                    )
            ret[dataset] = target
        return ret

    @staticmethod
    def select_rows(df, search_strings):
        unq, IDs = np.unique(df["dataset"], return_inverse=True)
        unqIDs = np.searchsorted(unq, search_strings)
        mask = np.isin(IDs, unqIDs)
        return df[mask]

    # TODO: Need to clean up this further.
    # TODO: Figure out where this should belong.
    def get_module_callsite_map(self):
        ret = {}
        _data = self.module_group_df["name"].unique()
        ret["ensemble"] = _data.apply(lambda d: d.tolist()).to_dict()
        
        for dataset in self.datasets:
            _t_data = self.target_module_group_df[dataset]["name"].unique()
            ret[dataset] = _t_data.apply(lambda d: d.tolist()).to_dict()
        
        return ret

    # TODO: Figure out where this should belong.
    def get_callsite_module_map(self):
        ret = {}
        callsites = self.e_df["name"].unique().tolist()
        for callsite in callsites:
            ret[callsite] = self.e_df.loc[self.e_df["name"] == callsite]["module"].unique().tolist()
        
        for dataset in self.runs:
            ret[dataset] = {}
            for callsite in callsites:
                ret[dataset][callsite] = self.t_df[dataset].loc[self.t_df[dataset]["name"] == callsite]["name"].unique().tolist()
        return ret

    # TODO: Need to clean up this further.
    @staticmethod
    def pack_json(
        df,
        name="",
        gradients={"Inclusive": {}, "Exclusive": {}},
        prop_hists={"Inclusive": {}, "Exclusive": {}},
        q={"Inclusive": {}, "Exclusive": {}},
        outliers={"Inclusive": {}, "Exclusive": {}},
        isEnsemble=False,
        isCallsite=False,
    ):
        inclusive_variance = df["time (inc)"].var()
        exclusive_variance = df["time"].var()
        inclusive_std_deviation = math.sqrt(df["time (inc)"].var())
        exclusive_std_deviation = math.sqrt(df["time"].var())
        if math.isnan(inclusive_variance):
            inclusive_variance = 0
            inclusive_std_deviation = 0
        if math.isnan(exclusive_variance):
            exclusive_variance = 0
            exclusive_std_deviation = 0
        if isCallsite:
            if isEnsemble:
                time_inc = []
                time = []
            else:
                time_inc = df["time (inc)"].tolist()
                time = df["time"].tolist()
        else:
            if isEnsemble:
                time_inc = []
                time = []
            else:
                module_df = df.groupby(["module", "rank"]).mean()
                x_df = module_df.xs(name, level="module")
                time_inc = x_df["time (inc)"].tolist()
                time = x_df["time"].tolist()
        result = {
            "name": name,
            "id": "node-" + str(df["nid"].tolist()[0]),
            "dataset": df["dataset"].unique().tolist(),
            "module": df["module"].tolist()[0],
            "component_path": df["component_path"].unique().tolist(),
            "component_level": df["component_level"].unique().tolist(),
            "Inclusive": {
                "data": time_inc,
                "mean_time": df["time (inc)"].mean(),
                "max_time": df["time (inc)"].max(),
                "min_time": df["time (inc)"].min(),
                "variance": inclusive_variance,
                "q": q["Inclusive"],
                "outliers": outliers["Inclusive"],
                "imbalance_perc": df['imbalance_perc_inclusive'].tolist()[0],
                "std_deviation": inclusive_std_deviation,
                "kurtosis": df['kurtosis_inclusive'].tolist()[0],
                "skewness": df['skewness_inclusive'].tolist()[0],
                "gradients": gradients["Inclusive"],
                "prop_histograms": prop_hists["Inclusive"],
            },
            "Exclusive": {
                "data": time,
                "mean_time": df["time"].mean(),
                "max_time": df["time"].max(),
                "min_time": df["time"].min(),
                "variance": exclusive_variance,
                "q": q["Exclusive"],
                "outliers": outliers["Exclusive"],
                "imbalance_perc": df['imbalance_perc_exclusive'].tolist()[0],
                "std_deviation": exclusive_std_deviation,
                "skewness": df['skewness_exclusive'].tolist()[0],
                "kurtosis": df['kurtosis_exclusive'].tolist()[0],
                "gradients": gradients["Exclusive"],
                "prop_histograms": prop_hists["Exclusive"],
            },
        }
        return result

    