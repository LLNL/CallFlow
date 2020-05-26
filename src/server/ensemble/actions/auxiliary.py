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
import json
import networkx as nx
from ast import literal_eval as make_tuple
import numpy as np
from .gradients import KDE_gradients
from .boxplot import BoxPlot
from utils.logger import log
from utils.timer import Timer
import time
import math
import os


class Auxiliary:
    def __init__(
        self,
        states,
        MPIBinCount="20",
        RunBinCount="20",
        datasets=[],
        config={},
        process=True,
        write=False,
    ):
        self.timer = Timer()
        self.df = self.select_rows(states["ensemble_entire"].df, datasets)
        self.MPIBinCount = MPIBinCount
        self.RunBinCount = RunBinCount
        self.config = config
        self.states = states
        self.process = process
        self.write = write
        self.datasets = datasets

        self.props = ["rank", "name", "dataset", "all_ranks"]
        self.filter = True

        # self.result = self.run()

        print(self.timer)

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
        print(count)
        return ret

    def group_frames(self):
        if self.filter:
            # self.df = self.df.loc[self.df['time'] > 0.01*self.config.filter_perc*self.df['time'].max() ]
            # self.df = self.df.loc[self.df['time (inc)'] > self.config.filter_perc]['name'].unique()
            xgroup_df = self.df.groupby(["name"]).mean()
            sort_xgroup_df = xgroup_df.sort_values(by=["time (inc)"], ascending=False)
            top100callsites = sort_xgroup_df.nlargest(50, "time (inc)")
            self.df = self.df[self.df["name"].isin(top100callsites.index.values)]

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

    def histogram(self, data, data_min=np.nan, data_max=np.nan):
        if np.isnan(data_min) or np.isnan(data_max):
            data_min = data.min()
            data_max = data.max()
        h, b = np.histogram(
            data, range=[data_min, data_max], bins=int(self.MPIBinCount)
        )
        return 0.5 * (b[1:] + b[:-1]), h

    def convert_pandas_array_to_list(self, series):
        return series.apply(lambda d: d.tolist())

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

    # Return the histogram in the required form.
    def histogram_format(self, histogram_grid):
        return {
            "x": histogram_grid[0].tolist(),
            "y": histogram_grid[1].tolist(),
            "x_min": histogram_grid[0][0],
            "x_max": histogram_grid[0][-1],
            "y_min": np.min(histogram_grid[1]).astype(np.float64),
            "y_max": np.max(histogram_grid[1]).astype(np.float64),
        }

    # Prop can be dataset, rank, name
    def histogram_by_property_ensemble(self, ensemble_df, prop):
        ret = {}

        if prop == "all_ranks":
            time_ensemble_inclusive_arr = np.array(ensemble_df["time (inc)"].tolist())
            time_ensemble_exclusive_arr = np.array(ensemble_df["time"].tolist())

        elif prop == "rank":
            ensemble_prop = ensemble_df.groupby(["dataset", prop])[
                ["time", "time (inc)"]
            ].mean()
            time_ensemble_inclusive_arr = np.array(ensemble_prop["time (inc)"])
            time_ensemble_exclusive_arr = np.array(ensemble_prop["time"])

        else:
            ensemble_prop = ensemble_df.groupby([prop])[["time", "time (inc)"]].mean()

            time_ensemble_inclusive_arr = np.array(ensemble_prop["time (inc)"])
            time_ensemble_exclusive_arr = np.array(ensemble_prop["time"])

        inclusive_max = time_ensemble_inclusive_arr.max()
        inclusive_min = time_ensemble_inclusive_arr.min()

        histogram_ensemble_inclusive_grid = self.histogram(
            time_ensemble_inclusive_arr, inclusive_min, inclusive_max
        )

        exclusive_max = time_ensemble_exclusive_arr.max()
        exclusive_min = time_ensemble_exclusive_arr.min()
        histogram_ensemble_exclusive_grid = self.histogram(
            time_ensemble_exclusive_arr, exclusive_min, exclusive_max
        )

        ret["Inclusive"] = {
            "ensemble": self.histogram_format(histogram_ensemble_inclusive_grid),
        }
        ret["Exclusive"] = {
            "ensemble": self.histogram_format(histogram_ensemble_exclusive_grid),
        }
        return ret

    # Prop can be dataset, rank, name
    def histogram_by_property(self, ensemble_df, target_df, prop):
        ret = {}

        if prop == "all_ranks":
            time_ensemble_inclusive_arr = np.array(ensemble_df["time (inc)"].tolist())
            time_ensemble_exclusive_arr = np.array(ensemble_df["time"].tolist())

            time_target_inclusive_arr = np.array(target_df["time (inc)"].tolist())
            time_target_exclusive_arr = np.array(target_df["time"].tolist())
        elif prop == "rank":
            ensemble_prop = ensemble_df.groupby(["dataset", prop])[
                ["time", "time (inc)"]
            ].mean()
            target_prop = target_df.groupby(["dataset", prop])[
                ["time", "time (inc)"]
            ].mean()

            time_ensemble_inclusive_arr = np.array(ensemble_prop["time (inc)"])
            time_ensemble_exclusive_arr = np.array(ensemble_prop["time"])

            time_target_inclusive_arr = np.array(target_prop["time (inc)"])
            time_target_exclusive_arr = np.array(target_prop["time"])
        else:
            ensemble_prop = ensemble_df.groupby([prop])[["time", "time (inc)"]].mean()
            target_prop = target_df.groupby([prop])[["time", "time (inc)"]].mean()

            time_ensemble_inclusive_arr = np.array(ensemble_prop["time (inc)"])
            time_ensemble_exclusive_arr = np.array(ensemble_prop["time"])

            time_target_inclusive_arr = np.array(target_prop["time (inc)"])
            time_target_exclusive_arr = np.array(target_prop["time"])

        inclusive_max = max(
            time_ensemble_inclusive_arr.max(), time_target_inclusive_arr.max()
        )
        inclusive_min = min(
            time_ensemble_inclusive_arr.min(), time_target_inclusive_arr.min()
        )
        histogram_ensemble_inclusive_grid = self.histogram(
            time_ensemble_inclusive_arr, inclusive_min, inclusive_max
        )
        histogram_target_inclusive_grid = self.histogram(
            time_target_inclusive_arr, inclusive_min, inclusive_max
        )

        exclusive_max = max(
            time_ensemble_exclusive_arr.max(), time_target_exclusive_arr.max()
        )
        exclusive_min = min(
            time_ensemble_exclusive_arr.min(), time_target_exclusive_arr.min()
        )
        histogram_ensemble_exclusive_grid = self.histogram(
            time_ensemble_exclusive_arr, exclusive_min, exclusive_max
        )
        histogram_target_exclusive_grid = self.histogram(
            time_target_exclusive_arr, exclusive_min, exclusive_max
        )

        ret["Inclusive"] = {
            "ensemble": self.histogram_format(histogram_ensemble_inclusive_grid),
            "target": self.histogram_format(histogram_target_inclusive_grid),
        }
        ret["Exclusive"] = {
            "ensemble": self.histogram_format(histogram_ensemble_exclusive_grid),
            "target": self.histogram_format(histogram_target_exclusive_grid),
        }
        return ret

    # Callsite grouped information
    def callsite_data(self):
        ret = {}

        # Create the data dict.
        ensemble = {}
        for callsite, callsite_df in self.name_group_df:
            callsite_ensemble_df = self.name_group_df.get_group(callsite)
            hists = {}
            hists["Inclusive"] = {}
            hists["Exclusive"] = {}
            for prop in self.props:
                prop_histograms = self.histogram_by_property_ensemble(
                    callsite_ensemble_df, prop
                )
                hists["Inclusive"][prop] = prop_histograms["Inclusive"]
                hists["Exclusive"][prop] = prop_histograms["Exclusive"]

            gradients = KDE_gradients(self.target_df, binCount=self.RunBinCount).run(
                columnName="name", callsiteOrModule=callsite
            )
            boxplot = BoxPlot(callsite_df)
            ensemble[callsite] = self.pack_json(
                callsite_df,
                callsite,
                gradients=gradients,
                q=boxplot.q,
                outliers=boxplot.outliers,
                prop_hists=hists,
            )

        ret["ensemble"] = ensemble

        ## Target data.
        # Loop through datasets and group the callsite by name.
        for dataset in self.datasets:
            name_grouped = self.target_name_group_df[dataset]
            target = {}
            for callsite, callsite_df in name_grouped:
                callsite_ensemble_df = self.name_group_df.get_group(callsite)
                callsite_target_df = callsite_df

                if not callsite_df.empty:
                    hists = {}
                    hists["Inclusive"] = {}
                    hists["Exclusive"] = {}
                    for prop in self.props:
                        prop_histograms = self.histogram_by_property(
                            callsite_ensemble_df, callsite_target_df, prop
                        )
                        hists["Inclusive"][prop] = prop_histograms["Inclusive"]
                        hists["Exclusive"][prop] = prop_histograms["Exclusive"]

                    boxplot = BoxPlot(callsite_df)
                    target[callsite] = self.pack_json(
                        df=callsite_target_df,
                        name=callsite,
                        prop_hists=hists,
                        q=boxplot.q,
                        outliers=boxplot.outliers,
                    )
            ret[dataset] = target

        return ret

    def module_data(self):
        ret = {}
        # Module grouped information
        modules = self.df["module"].unique()
        ensemble = {}
        for module, module_df in self.module_group_df:
            module_ensemble_df = self.module_group_df.get_group(module)
            hists = {"Inclusive": {}, "Exclusive": {}}
            for prop in self.props:
                prop_histograms = self.histogram_by_property_ensemble(
                    module_ensemble_df, prop
                )
                hists["Inclusive"][prop] = prop_histograms["Inclusive"]
                hists["Exclusive"][prop] = prop_histograms["Exclusive"]

            # Calculate gradients
            gradients = KDE_gradients(self.target_df, binCount=self.RunBinCount).run(
                columnName="module", callsiteOrModule=module
            )
            ensemble[module] = self.pack_json(
                df=module_df, name=module, gradients=gradients, prop_hists=hists
            )

        ret["ensemble"] = ensemble

        for dataset in self.datasets:
            target = {}
            module_group_df = self.target_module_group_df[dataset]
            for module, module_df in module_group_df:
                module_ensemble_df = self.module_group_df.get_group(module)
                module_target_df = module_df
                gradients = {"Inclusive": {}, "Exclusive": {}}
                hists = {"Inclusive": {}, "Exclusive": {}}
                if not module_target_df.empty:
                    for prop in self.props:
                        prop_histograms = self.histogram_by_property(
                            module_ensemble_df, module_target_df, prop
                        )
                        hists["Inclusive"][prop] = prop_histograms["Inclusive"]
                        hists["Exclusive"][prop] = prop_histograms["Exclusive"]
                    target[module] = self.pack_json(
                        df=module_target_df,
                        name=module,
                        gradients=gradients,
                        prop_hists=hists,
                    )

            ret[dataset] = target

        return ret

    def run(self):
        ret = {}
        path = (
            self.config.processed_path + f"/{self.config.runName}" + f"/all_data.json"
        )

        if self.process:
            print("Calculating Gradients, Mean runtime variations, and Distribution.")
            with self.timer.phase("Process data"):
                self.group_frames()
            with self.timer.phase("Collect Callsite data"):
                ret["callsite"] = self.callsite_data()
            with self.timer.phase("Collect Module data"):
                ret["module"] = self.module_data()
            with self.timer.phase("Module callsite map data"):
                ret["moduleCallsiteMap"] = self.get_module_callsite_map()
            # with self.timer.phase("Callsite module map data"):
            #     ret['callsiteModuleMap'] = self.get_callsite_module_map()
            if self.write:
                with self.timer.phase("Writing data"):
                    with open(path, "w") as f:
                        json.dump(ret, f)

            print(self.timer)

        return ret
