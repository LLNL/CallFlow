# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

import os
import json
import math
import pandas as pd
import numpy as np

# CallFlow imports
from .gradients import Gradients
from .boxplot import BoxPlot


class FastEnsembleAuxiliary:
    def __init__(
        self,
        states,
        MPIBinCount="20",
        RunBinCount="20",
        datasets=[],
        config={},
        process=True,
        write=False,
        topCallsite=10,
    ):
        self.timer = Timer()
        self.df = self.select_rows(states["ensemble_entire"].new_gf.df, datasets)
        self.MPIBinCount = MPIBinCount
        self.RunBinCount = RunBinCount
        self.config = config
        self.props = ["rank", "name", "dataset", "all_ranks"]
        self.h5IndexFilename = os.path.join(self.config.save_path, "h5_index.json")
        self.moduleh5File = os.path.join(self.config.save_path, "module_data.h5")
        self.callsiteh5File = os.path.join(self.config.save_path, "callsite_data.h5")
        self.topCallsite = topCallsite
        with self.timer.phase("Group data with indexes"):
            self.group_frames()
        self.callsiteMap = {}
        self.moduleMap = {}

    def filter_dict(self, result):
        ret = {}
        # Modules will be the same as original.
        ret["module"] = result["module"]
        ret["moduleCallsiteMap"] = result["moduleCallsiteMap"]
        ret["callsite"] = {}
        group_df = self.df.groupby(["name"]).mean()
        if self.config.filter_by == "time":
            f_group_df = group_df.loc[
                group_df[self.config.filter_by] > self.config.filter_below
            ]
        elif self.config.filter_by == "time (inc)":
            f_group_df = group_df.loc[
                group_df[self.config.filter_by]
                > 0.01 * self.config.filter_perc * group_df["time (inc)"].max()
            ]
        callsites = f_group_df.index.values.tolist()
        count = 0
        for dataset in result["callsite"]:
            ret["callsite"][dataset] = {}
            for callsite in callsites:
                if callsite in result["callsite"][dataset]:
                    ret["callsite"][dataset][callsite] = result["callsite"][dataset][
                        callsite
                    ]
                    count += 1
        return ret

    def filter_frames(self, nCallsites, attr):
        xgroup_df = self.df.groupby(["name"]).mean()
        sort_xgroup_df = xgroup_df.sort_values(by=[attr], ascending=False)
        nCallsites_df = sort_xgroup_df.nlargest(nCallsites, attr)
        return nCallsites_df

    def group_frames(self):
        self.module_name_group_df = self.df.groupby(["module", "name"])
        self.module_group_df = self.df.groupby(["module"])
        self.name_group_df = self.df.groupby(["name"])
        self.target_df = {}
        self.target_module_group_df = {}
        self.target_module_name_group_df = {}
        self.target_name_group_df = {}
        for dataset in self.datasets:
            self.target_df[dataset] = self.df.loc[self.df["dataset"] == dataset]
            self.target_module_group_df[dataset] = self.target_df[dataset].groupby(
                ["module"]
            )
            self.target_module_name_group_df[dataset] = self.target_df[dataset].groupby(
                ["module", "name"]
            )
            self.target_name_group_df[dataset] = self.target_df[dataset].groupby(
                ["name"]
            )

    def select_rows(self, df, search_strings):
        unq, IDs = np.unique(df["dataset"], return_inverse=True)
        unqIDs = np.searchsorted(unq, search_strings)
        mask = np.isin(IDs, unqIDs)
        return df[mask]

    def get_module_callsite_map(self):
        ret = {}
        np_data = self.module_group_df["name"].unique()
        ret["ensemble"] = self.convert_pandas_array_to_list(np_data).to_dict()
        for dataset in self.datasets:
            np_data = self.target_module_group_df[dataset]["name"].unique()
            ret[dataset] = self.convert_pandas_array_to_list(np_data).to_dict()
        return ret

    def get_callsite_module_map(self):
        ret = {}
        callsites = self.df["name"].unique().tolist()
        for callsite in callsites:
            module = (
                self.df.loc[self.df["name"] == callsite]["module"].unique().tolist()
            )
            ret[callsite] = module
        for dataset in self.datasets:
            ret[dataset] = {}
            for callsite in callsites:
                module = (
                    self.target_df[dataset]
                    .loc[self.target_df[dataset]["name"] == callsite]["name"]
                    .unique()
                    .tolist()
                )
                ret[dataset][callsite] = module
        return ret

    def pack_json(
        self,
        df=pd.DataFrame(),
        name="",
        gradients={"Inclusive": {}, "Exclusive": {}},
        prop_hists={"Inclusive": {}, "Exclusive": {}},
        q={"Inclusive": {}, "Exclusive": {}},
        outliers={"Inclusive": {}, "Exclusive": {}},
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
        result = {
            "name": name,
            "id": "node-" + str(df["nid"].tolist()[0]),
            "dataset": df["dataset"].unique().tolist(),
            "module": df["module"].tolist()[0],
            "callers": df["callers"].unique().tolist(),
            "callees": df["callees"].unique().tolist(),
            "component_path": df["component_path"].unique().tolist(),
            "component_level": df["component_level"].unique().tolist(),
            "Inclusive": {
                "mean_time": df["time (inc)"].mean(),
                "max_time": df["time (inc)"].max(),
                "min_time": df["time (inc)"].min(),
                "variance": inclusive_variance,
                "q": q["Inclusive"],
                "outliers": outliers["Inclusive"],
                # "imbalance_perc": df['imbalance_perc_inclusive'].tolist()[0],
                "std_deviation": inclusive_std_deviation,
                # "kurtosis": df['kurtosis_inclusive'].tolist()[0],
                # "skewness": df['skewness_inclusive'].tolist()[0],
                "gradients": gradients["Inclusive"],
                "prop_histograms": prop_hists["Inclusive"],
            },
            "Exclusive": {
                "mean_time": df["time"].mean(),
                "max_time": df["time"].max(),
                "min_time": df["time"].min(),
                "variance": exclusive_variance,
                "q": q["Exclusive"],
                "outliers": outliers["Exclusive"],
                # "imbalance_perc": df['imbalance_perc_exclusive'].tolist()[0],
                "std_deviation": exclusive_std_deviation,
                # "skewness": df['skewness_exclusive'].tolist()[0],
                # "kurtosis": df['kurtosis_exclusive'].tolist()[0],
                "gradients": gradients["Exclusive"],
                "prop_histograms": prop_hists["Exclusive"],
            },
        }
        return result

    def get_data_from_hd5(self, nodes, col):
        ret = {}
        if col == "module":
            filename = self.moduleh5File
            mapping = self.moduleMap
        elif col == "name":
            filename = self.callsiteh5File
            mapping = self.callsiteMap
        ensemble = {}
        for node in nodes:
            module_ensemble_df = pd.read_hdf(filename, key=mapping[node])
            hists = {"Inclusive": {}, "Exclusive": {}}
            for prop in self.props:
                prop_histograms = self.histogram_by_property_ensemble(
                    module_ensemble_df, prop
                )
                hists["Inclusive"][prop] = prop_histograms["Inclusive"]
                hists["Exclusive"][prop] = prop_histograms["Exclusive"]
            # Calculate gradients
            gradients = {"Inclusive": {}, "Exclusive": {}}
            gradients = Gradients(self.target_df, binCount=self.RunBinCount).run(
                columnName=col, callsiteOrModule=node
            )
            quartiles = {"Inclusive": {}, "Exclusive": {}}
            outliers = {"Inclusive": {}, "Exclusive": {}}
            if col == "name":
                boxplot = BoxPlot(module_ensemble_df)
                quartiles = boxplot.q
                outliers = boxplot.outliers
            ensemble[node] = self.pack_json(
                df=module_ensemble_df,
                name=node,
                gradients=gradients,
                prop_hists=hists,
                q=quartiles,
                outliers=outliers,
            )
        ret["ensemble"] = ensemble
        for dataset in self.datasets:
            target = {}
            module_target_df = module_ensemble_df.loc[
                module_ensemble_df["dataset"] == dataset
            ]
            for node in nodes:
                gradients = {"Inclusive": {}, "Exclusive": {}}
                hists = {"Inclusive": {}, "Exclusive": {}}
                quartiles = {"Inclusive": {}, "Exclusive": {}}
                outliers = {"Inclusive": {}, "Exclusive": {}}
                if module_target_df.shape[0] != 0:
                    for prop in self.props:
                        prop_histograms = self.histogram_by_property(
                            module_ensemble_df, module_target_df, prop
                        )
                        hists["Inclusive"][prop] = prop_histograms["Inclusive"]
                        hists["Exclusive"][prop] = prop_histograms["Exclusive"]
                    if col == "name":
                        boxplot = BoxPlot(module_target_df)
                        quartiles = boxplot.q
                        outliers = boxplot.outliers
                    target[node] = self.pack_json(
                        df=module_target_df,
                        name=node,
                        gradients=gradients,
                        prop_hists=hists,
                        q=quartiles,
                        outliers=outliers,
                    )
            ret[dataset] = target
        return ret

    def module_data(self):
        module_group_df = self.df.groupby(["module"])
        self.moduleMap = {}
        count = 0
        for module, module_df in module_group_df:
            module_ensemble_df = module_group_df.get_group(module)
            key = "module_" + str(count)
            self.moduleMap[module] = key
            module_ensemble_df.to_hdf(self.moduleh5File, key=key)
            count += 1

    def callsite_data(self):
        name_group_df = self.df.groupby(["name"])
        count = 0
        for name, name_df in name_group_df:
            callsite_ensemble_df = name_group_df.get_group(name)
            key = "callsite_" + str(callsite_ensemble_df["nid"].unique()[0])
            self.callsiteMap[name] = key
            callsite_ensemble_df.to_hdf(self.callsiteh5File, key=key)
            count += 1

    def write_h5(self):
        exDict = {"moduleMap": self.moduleMap, "callsiteMap": self.callsiteMap}
        with open(self.h5IndexFilename, "w") as file:
            file.write(json.dumps(exDict))
            LOGGER.debug(f"writen to file : {self.h5IndexFilename}")

    def read_h5(self):
        f = open(self.h5IndexFilename, "r")
        data = json.load(f)
        return data
        LOGGER.debug("Read the h5 index map.")

    def process(self):
        LOGGER.info("Calculating Gradients, Mean runtime variations, and Distribution.")
        with self.timer.phase("Collect Callsite data"):
            self.callsite_data()
        with self.timer.phase("Collect Module data"):
            self.module_data()
        with self.timer.phase("Write module's and callsite's hdf indexes"):
            self.write_h5()
        LOGGER.info(self.timer)

    def fetch(self):
        ret = {}
        with self.timer.phase("Read module's and callsite's hdf indexes"):
            data = self.read_maps()
            self.moduleMap = data["moduleMap"]
            self.callsiteMap = data["callsiteMap"]
        with self.timer.phase("Collect Callsite data"):
            modules = self.df["module"].unique().tolist()
        with self.timer.phase("Filter"):
            if self.filter:
                # topCallsites_df = self.filter_frames(self.topCallsite, "time (inc)")
                topCallsites_df = self.filter_frames(self.topCallsite, "time")
                callsites = topCallsites_df.index.values
                self.df = self.df[self.df["name"].isin(topCallsites_df.index.values)]
            else:
                callsites = self.df["name"].unique().tolist()
        with self.timer.phase("Fetch module"):
            ret["module"] = self.get_data_from_hd5(modules, "module")
        with self.timer.phase("Fetch callsite"):
            ret["callsite"] = self.get_data_from_hd5(callsites, "name")
        with self.timer.phase("Module callsite map data"):
            ret["moduleCallsiteMap"] = self.get_module_callsite_map()
        return ret
