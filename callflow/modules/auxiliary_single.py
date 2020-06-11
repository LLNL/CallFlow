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
import os
import json

import pandas as pd
import networkx as nx
import numpy as np
from ast import literal_eval as make_tuple

from callflow.timer import Timer


class SingleAuxiliary:
    def __init__(self, gf, dataset="", MPIBinCount=20, props={}, process=True):
        self.graph = gf.graph
        self.df = gf.df
        self.props = props
        self.process = process
        self.dataset = dataset
        self.binCount = MPIBinCount

        ret_df = pd.DataFrame([])
        self.timer = Timer()
        self.result = self.run()
        print(self.timer)

    def addID(self, name):
        name = "".join([i for i in name if not i.isdigit()])
        name = name.replace(":", "")
        if ":" in name and "[" not in name:
            # name = name.split(':')[len(name.split(':')) - 1]
            name = name
        elif "[" in name and ":" not in name:
            name = name.split("[")[0]
        elif "[" in name and ":" in name:
            name = name.split("[")[0]
            name = name.split(":")[len(name.split(":")) - 1]
        else:
            name = name

        name = name.replace(" ", "-")
        name = name.replace("<", "")
        name = name.replace(">", "")
        return name

    def histogram(self, data):
        h, b = np.histogram(data, range=[0, data.max()], bins=int(self.binCount))
        return 0.5 * (b[1:] + b[:-1]), h

    def get_module_callsite_map(self):
        ret = {}
        ret["ensemble"] = {}
        modules = self.df["module"].unique().tolist()
        for module in modules:
            callsites = (
                self.df.loc[self.df["module"] == module]["name"].unique().tolist()
            )
            ret["ensemble"][module] = callsites
        return ret

    def get_callsite_module_map(self):
        ret = {}
        callsites = self.df["name"].unique().tolist()
        for callsite in callsites:
            module = (
                self.df.loc[self.df["name"] == callsite]["module"].unique().tolist()
            )
            ret[callsite] = module

        return ret

    def pack_json(self, group_df, node_name, data_type):
        df = self.df.loc[self.df["name"] == node_name]
        with self.timer.phase("Calculate Histograms"):
            time_inc_ensemble_arr = np.array(df["time (inc)"].tolist())
            time_exc_ensemble_arr = np.array(df["time"].tolist())

            time_inc_target_arr = np.array(group_df["time (inc)"].tolist())
            time_exc_target_arr = np.array(group_df["time"].tolist())

            histogram_inc_array = np.concatenate(
                (time_inc_target_arr, time_inc_ensemble_arr), axis=0
            )
            histogram_exc_array = np.concatenate(
                (time_exc_target_arr, time_exc_ensemble_arr), axis=0
            )

            hist_inc_grid = self.histogram(time_inc_target_arr)
            hist_exc_grid = self.histogram(time_exc_target_arr)

        if "rank" not in group_df.keys():
            group_df = group_df.reset_index(drop=False)

        result = {
            "name": node_name,
            "time (inc)": group_df["time (inc)"].tolist(),
            "time": group_df["time"].tolist(),
            "sorted_time (inc)": group_df["time (inc)"].sort_values().tolist(),
            "sorted_time": group_df["time"].sort_values().tolist(),
            "rank": group_df["rank"].tolist(),
            "id": "node-" + str(group_df["nid"].tolist()[0]),
            "mean_time (inc)": group_df["time (inc)"].mean(),
            "mean_time": group_df["time"].mean(),
            "max_time (inc)": group_df["time (inc)"].max(),
            "max_time": group_df["time"].max(),
            "min_time (inc)": group_df["time (inc)"].min(),
            "min_time": group_df["time"].min(),
            "dataset": group_df["dataset"].tolist(),
            "module": group_df["module"].tolist()[0],
            "hist_time (inc)": {
                "x": hist_inc_grid[0].tolist(),
                "y": hist_inc_grid[1].tolist(),
                "x_min": hist_inc_grid[0][0],
                "x_max": hist_inc_grid[0][-1],
                "y_min": np.min(hist_inc_grid[1]).astype(np.float64),
                "y_max": np.max(hist_inc_grid[1]).astype(np.float64),
            },
            "hist_time": {
                "x": hist_exc_grid[0].tolist(),
                "y": hist_exc_grid[1].tolist(),
                "x_min": hist_exc_grid[0][0],
                "x_max": hist_exc_grid[0][-1],
                "y_min": np.min(hist_exc_grid[1]).astype(np.float64),
                "y_max": np.max(hist_exc_grid[1]).astype(np.float64),
            },
        }
        # print(result)
        return result

    # # Callsite grouped information
    def callsite_data(self):
        data_type = "callsite"
        ret = {}
        ## Ensemble data.
        # Group callsite by the name
        name_grouped = self.df.groupby(["name"])

        # Create the data dict.
        ensemble = {}
        for name, group_df in name_grouped:
            name_df = self.df.loc[self.df["name"] == name]
            ensemble[name] = self.pack_json(name_df, name, data_type)

        ret[self.dataset] = ensemble

        return ret

    def module_data(self):
        data_type = "module"
        ret = {}
        # Module grouped information
        modules = self.df["module"].unique()
        ensemble = {}
        for module in modules:
            module_df = self.df[self.df["module"] == module]
            ensemble[module] = self.pack_json(module_df, module, data_type)

        ret[self.dataset] = ensemble

        return ret

    def run(self):
        ret = {}
        path = self.props["save_path"] + f"/{self.dataset}/auxiliary_data.json"

        # self.process = True
        if os.path.exists(path) and not self.process:
            print(f"[Callsite info] Reading the data from file {path}")
            with open(path, "r") as f:
                ret = json.load(f)
        else:
            print("Processing the data again.")
            # with self.timer.phase("Pack Callsite data"):
            ret["callsite"] = self.callsite_data()
            # with self.timer.phase("Pack Module data"):
            ret["module"] = self.module_data()
            with self.timer.phase("Module callsite map data"):
                ret["moduleCallsiteMap"] = self.get_module_callsite_map()
            # with self.timer.phase("Callsite module map data"):
            #     ret['callsiteModuleMap'] = self.get_callsite_module_map()
            with self.timer.phase("Writing data"):
                with open(path, "w") as f:
                    json.dump(ret, f)
        return ret
