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

import time
import json
import pandas as pd

import callflow
LOGGER = callflow.get_logger(__name__)
from callflow.pipeline import State, Pipeline
from callflow.utils import (
    getMaxExcTime,
    getMinExcTime,
    getMaxIncTime,
    getMinIncTime
)
from callflow.timer import Timer
from callflow.ensemble import (
    EnsembleCCT,
    EnsembleSuperGraph,
)
from callflow.modules import (
    RankHistogram,
    EnsembleAuxiliary,
    Gradients,
    ModuleHierarchy,
    ParameterProjection,
    DiffView,
)
from callflow.algorithms import (
    DeltaConSimilarity
)


# Create states for each dataset.
# Note: gf would never change from create_gf.
# # Note: fgf would be changed when filter props are changed by client.
# Note: df is always updated.
# Note: graph is always updated.
class EnsembleCallFlow:
    def __init__(self, config=None, process=None):
        # Config contains properties set by the input config file.
        self.config = config
        self.timer = Timer()
        self.currentMPIBinCount = 20
        self.currentRunBinCount = 20

        self.pipeline = Pipeline(self.config)
        if process:
            LOGGER.info("[Ensemble] Process Mode.")
            self.states = self.processState()
        else:
            LOGGER.info("[Ensemble] Read Mode.")
            self.states = self.readState()

        self.target_df = {}
        for dataset in self.config.dataset_names:
            self.target_df[dataset] = self.states["ensemble_entire"].new_gf.df.loc[
                self.states["ensemble_entire"].new_gf.df["dataset"] == dataset
            ]

    def processState(self, filterBy="Inclusive", filterPerc="10"):
        states = {}
        col_names = ["stage", "time"]
        time_perf_df = pd.DataFrame(columns=col_names)
        for idx, dataset_name in enumerate(self.config.dataset_names):
            states[dataset_name] = State(dataset_name)
            LOGGER.warn("#########################################")
            LOGGER.warn(f"Run: {dataset_name}")
            LOGGER.warn("#########################################")

            stage1 = time.perf_counter()
            states[dataset_name] = self.pipeline.create_gf(dataset_name)
            stage2 = time.perf_counter()
            LOGGER.warn(f"Create GraphFrame: {stage2 - stage1}")
            LOGGER.warn("-----------------------------------------")

            states[dataset_name] = self.pipeline.process_gf(
                states[dataset_name], "entire"
            )
            stage3 = time.perf_counter()

            LOGGER.warn(f"Preprocess GraphFrame: {stage3 - stage2}")
            LOGGER.warn("-----------------------------------------")

            states[dataset_name] = self.pipeline.hatchetToNetworkX(
                states[dataset_name], "path"
            )
            stage4 = time.perf_counter()
            LOGGER.warn(f"Convert to NetworkX graph: {stage4 - stage3}")
            LOGGER.warn("-----------------------------------------")

            states[dataset_name] = self.pipeline.group(states[dataset_name], "module")
            stage5 = time.perf_counter()
            LOGGER.warn(f"Convert to NetworkX graph: {stage4 - stage3}")
            LOGGER.warn("-----------------------------------------")

            self.pipeline.write_dataset_gf(
                states[dataset_name], dataset_name, "entire", write_graph=False
            )
            stage6 = time.perf_counter()
            LOGGER.warn(f"Write GraphFrame: {stage6 - stage5}")
            LOGGER.warn("-----------------------------------------")
            self.pipeline.write_hatchet_graph(states, dataset_name)

        for idx, dataset_name in enumerate(self.config.dataset_names):
            states[dataset_name] = self.pipeline.read_dataset_gf(dataset_name)

        stage7 = time.perf_counter()
        states["ensemble_entire"] = self.pipeline.union(states)
        stage8 = time.perf_counter()

        LOGGER.warn(f"Union GraphFrame: {stage8 - stage7}")
        LOGGER.warn("-----------------------------------------")

        self.pipeline.write_ensemble_gf(states, "ensemble_entire")
        stage9 = time.perf_counter()
        LOGGER.warn(f"Writing ensemble graph: {stage9 - stage8}")
        LOGGER.warn("-----------------------------------------")

        stage10 = time.perf_counter()
        states["ensemble_filter"] = self.pipeline.filterNetworkX(
            states["ensemble_entire"], self.config.filter_perc
        )
        stage11 = time.perf_counter()

        LOGGER.warn(f"Filter ensemble graph: {stage11 - stage10}")
        LOGGER.warn("-----------------------------------------")

        stage12 = time.perf_counter()
        self.pipeline.write_ensemble_gf(states, "ensemble_filter")
        stage13 = time.perf_counter()
        LOGGER.warn(f"Writing ensemble graph: {stage13 - stage12}")
        LOGGER.warn("-----------------------------------------")

        stage14 = time.perf_counter()
        states["ensemble_group"] = self.pipeline.ensemble_group(states, "module")
        stage15 = time.perf_counter()

        LOGGER.debug(f"Group ensemble graph: {stage15 - stage14}")
        LOGGER.info("-----------------------------------------")
        stage16 = time.perf_counter()
        self.pipeline.write_ensemble_gf(states, "ensemble_group")
        stage17 = time.perf_counter()

        LOGGER.debug(f"Write group ensemble graph: {stage17 - stage16}")
        LOGGER.info("-----------------------------------------")

        # Need to remove the dependence on reading the dataframe again.
        states = {}
        states["ensemble_entire"] = self.pipeline.read_ensemble_gf("ensemble_entire")

        stage18 = time.perf_counter()
        aux = EnsembleAuxiliary(
            states,
            MPIBinCount=self.currentMPIBinCount,
            RunBinCount=self.currentRunBinCount,
            datasets=self.config.dataset_names,
            config=self.config,
            process=True,
            write=True,
        )
        aux.run()
        stage19 = time.perf_counter()
        LOGGER.debug(
            f"Dump Gradient, distribution and variations: {stage19 - stage18}"
        )
        LOGGER.info("-----------------------------------------")

        return states

    def readState(self):
        states = {}
        states["ensemble_entire"] = self.pipeline.read_ensemble_gf("ensemble_entire")
        states["ensemble_filter"] = self.pipeline.read_ensemble_gf("ensemble_filter")
        states["ensemble_group"] = self.pipeline.read_ensemble_gf("ensemble_group")
        states["all_data"] = self.pipeline.read_all_data()

        return states

    def addIncExcTime(self):
        self.config.max_incTime = {}
        self.config.max_excTime = {}
        self.config.min_incTime = {}
        self.config.min_excTime = {}
        self.config.numOfRanks = {}

        max_inclusvie_time = 0
        max_exclusive_time = 0
        min_inclusive_time = 0
        min_exclusive_time = 0
        max_numOfRanks = 0
        for idx, dataset in enumerate(self.config.dataset_names):
            self.config.max_incTime[dataset] = self.target_df[dataset][
                "time (inc)"
            ].max()
            self.config.max_excTime[dataset] = self.target_df[dataset]["time"].max()
            self.config.min_incTime[dataset] = self.target_df[dataset][
                "time (inc)"
            ].min()
            self.config.min_excTime[dataset] = self.target_df[dataset]["time"].min()
            self.config.numOfRanks[dataset] = len(
                self.target_df[dataset]["rank"].unique()
            )
            max_exclusive_time = max(
                self.config.max_excTime[dataset], max_exclusive_time
            )
            max_inclusvie_time = max(
                self.config.max_incTime[dataset], max_exclusive_time
            )
            min_exclusive_time = min(
                self.config.min_excTime[dataset], min_exclusive_time
            )
            min_inclusive_time = min(
                self.config.min_incTime[dataset], min_inclusive_time
            )
            max_numOfRanks = max(self.config.numOfRanks[dataset], max_numOfRanks)
        self.config.max_incTime["ensemble"] = max_inclusvie_time
        self.config.max_excTime["ensemble"] = max_exclusive_time
        self.config.min_incTime["ensemble"] = min_inclusive_time
        self.config.min_excTime["ensemble"] = min_exclusive_time
        self.config.numOfRanks["ensemble"] = max_numOfRanks

    def request(self, action):
        action_name = action["name"]
        LOGGER.info(f"Action: {action_name}")
        datasets = self.config.dataset_names

        if action_name == "init":
            self.addIncExcTime()
            return self.config

        elif action_name == "ensemble_cct":
            nx = EnsembleCCT(
                self.states["ensemble_entire"], action["functionsInCCT"], self.config
            )
            return nx.g

        elif action_name == "supergraph":
            if "reveal_callsites" in action:
                reveal_callsites = action["reveal_callsites"]
            else:
                reveal_callsites = []

            if "split_entry_module" in action:
                split_entry_module = action["split_entry_module"]
            else:
                split_entry_module = ""

            if "split_callee_module" in action:
                split_callee_module = action["split_callee_module"]
            else:
                split_callee_module = ""

            self.states["ensemble_group"].g = EnsembleSuperGraph(
                self.states,
                "group_path",
                construct_graph=True,
                add_data=True,
                reveal_callsites=reveal_callsites,
                split_entry_module=split_entry_module,
                split_callee_module=split_callee_module,
            ).agg_g
            return self.states["ensemble_group"].g

        elif action_name == "scatterplot":
            if action["plot"] == "bland-altman":
                state1 = self.states[action["dataset"]]
                state2 = self.states[action["dataset2"]]
                col = action["col"]
                catcol = action["catcol"]
                dataset1 = action["dataset"]
                dataset2 = action["dataset2"]
                ret = BlandAltman(
                    state1, state2, col, catcol, dataset1, dataset2
                ).results
            return ret

        elif action_name == "Gromov-wasserstein":
            ret = {}
            return ret

        elif action_name == "similarity":
            if action["module"] == "all":
                dirname = self.config.callflow_dir
                name = self.config.runName
                similarity_filepath = dirname + "/" + "similarity.json"
                with open(similarity_filepath, "r") as similarity_file:
                    self.similarities = json.load(similarity_file)
            else:
                self.similarities = {}
                for idx, dataset in enumerate(datasets):
                    self.similarities[dataset] = []
                    for idx_2, dataset2 in enumerate(datasets):
                        union_similarity = Similarity(
                            self.states[dataset2].g, self.states[dataset].g
                        )
                    self.similarities[dataset].append(union_similarity.result)
            return self.similarities

        elif action_name == "hierarchy":
            mH = ModuleHierarchy(
                self.states["ensemble_entire"], action["module"], config=self.config
            )
            return mH.result

        elif action_name == "projection":
            self.similarities = {}
            # dirname = self.config.callflow_dir
            # name = self.config.runName
            # similarity_filepath = dirname  + '/' + 'similarity.json'
            # with open(similarity_filepath, 'r') as similarity_file:
            #     self.similarities = json.load(similarity_file)
            result = ParameterProjection(
                self.states["ensemble_entire"],
                self.similarities,
                action["targetDataset"],
                n_cluster=action["numOfClusters"],
            ).result
            return result.to_json(orient="columns")

        elif action_name == "run-information":
            ret = []
            for idx, state in enumerate(self.states):
                self.states[state].projection_data["dataset"] = state
                ret.append(self.states[state].projection_data)
            return ret

        elif action_name == "mini-histogram":
            minihistogram = MiniHistogram(
                self.states["ensemble"], target_datasets=action["target-datasets"]
            )
            return minihistogram.result

        elif action_name == "histogram":
            histogram = RankHistogram(self.states["ensemble"], action["module"])
            return histogram.result

        elif action_name == "auxiliary":
            print(f"Reprocessing: {action['re-process']}")
            aux = EnsembleAuxiliary(
                self.states,
                MPIBinCount=action["MPIBinCount"],
                RunBinCount=action["RunBinCount"],
                datasets=action["datasets"],
                config=self.config,
                process=True,
                write=False,
            )
            if action["re-process"] == 1:
                result = aux.run()
            else:
                result = self.states["all_data"]
                # result = aux.filter_dict(result)
            self.currentMPIBinCount = action["MPIBinCount"]
            self.currentRunBinCount = action["RunBinCount"]

            return result

        elif action_name == "compare":
            compareDataset = action["compareDataset"]
            targetDataset = action["targetDataset"]
            if action["selectedMetric"] == "Inclusive":
                selectedMetric = "time (inc)"
            elif action["selectedMetric"] == "Exclusive":
                selectedMetric = "time"

            compare = DiffView(
                self.states["ensemble_entire"],
                compareDataset,
                targetDataset,
                selectedMetric,
            )
            return compare.result

        elif action_name == "mpi_range_data":
            self.states["ensemble_entire"]
