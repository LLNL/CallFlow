# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

#------------------------------------------------------------------------------
# Library imports
import pandas as pd
import json

#------------------------------------------------------------------------------
class MiniHistogram:
    def __init__(self, state, target_datasets):
        self.state = state
        self.graph = state.new_gf.nxg
        self.target_datasets = target_datasets
        self.all_datasets = self.state.df["dataset"].unique().tolist()
        self.other_datasets = [
            item for item in self.all_datasets if item not in self.target_datasets
        ]
        self.df = self.state.new_gf.df.fillna(0.0)
        self.result = self.run()

    def run(self):
        ret = {}
        ret_df = {}
        entire_df = self.state.df
        modules_in_df = self.df["vis_name"].unique()

        for module in modules_in_df:
            func_in_module = (
                self.df[self.df.vis_name == module]["name"].unique().tolist()
            )
            targets = {}
            ensemble = []

            for idx, func in enumerate(func_in_module):
                for dataset_idx, dataset in enumerate(self.all_datasets):
                    func_df = entire_df.loc[
                        (entire_df["name"] == func) & (entire_df["dataset"] == dataset)
                    ]
                    targets[dataset] = {
                        "name": func,
                        "time (inc)": func_df["time (inc)"].tolist(),
                        "mean_time (inc)": func_df["time (inc)"].mean(),
                        "time": func_df["time"].tolist(),
                        "mean_time": func_df["time"].mean(),
                        "rank": func_df["rank"].tolist(),
                    }

                func_df = entire_df.loc[(entire_df["name"] == func)]
                ensemble.append(
                    {
                        "name": func,
                        "time (inc)": func_df["time (inc)"].tolist(),
                        "mean_time (inc)": func_df["time (inc)"].mean(),
                        "time": func_df["time"].tolist(),
                        "mean_time": func_df["time"].mean(),
                        "rank": func_df["rank"].tolist(),
                    }
                )

                if module not in ret:
                    ret[module] = []
                ret[module].append({"target": targets, "ensemble": ensemble})

            ret_df[module] = pd.DataFrame(ret[module])
            ret[module] = ret_df[module].to_json(orient="columns")
        return json.dumps(ret)
