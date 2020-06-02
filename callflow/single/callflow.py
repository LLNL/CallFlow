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

from callflow.pipeline import State, Pipeline

from callflow.utils import (
    getMaxExcTime,
    getMinExcTime,
    getMaxIncTime,
    getMinIncTime,
    Log,
    Timer,
)

from callflow.single import (
    SingleCCT,
    SingleSuperGraph,
    Auxiliary,
    MiniHistogram,
    Scatterplot,
    FunctionList,
)

from callflow.modules import RankHistogram


class SingleCallFlow:
    def __init__(self, config=None, process=False):
        # Config contains properties set by the input config file.
        self.log = Log("single_callflow")
        self.config = config
        self.timer = Timer()

        self.pipeline = Pipeline(self.config)
        if process:
            self.process()
        else:
            self.log.info("[Single] Read Mode.")
            self.states = self.readState(self.config.dataset_names)

    def readState(self, datasets):
        states = {}
        for idx, dataset in enumerate(datasets):
            states[dataset] = self.pipeline.read_dataset_gf(dataset)
        return states

    def process(self):
        for dataset_name in self.config.dataset_names:
            state = State(dataset_name)
            self.log.info("#########################################")
            self.log.debug(f"Run: {dataset_name}")
            self.log.info("#########################################")

            stage1 = time.perf_counter()
            state = self.pipeline.create_gf(dataset_name)
            stage2 = time.perf_counter()
            self.log.debug(f"Create GraphFrame: {stage2 - stage1}")
            self.log.info("-----------------------------------------")

            states = self.pipeline.process_gf(state, "entire")
            stage3 = time.perf_counter()
            self.log.debug(f"Preprocess GraphFrame: {stage3 - stage2}")
            self.log.info("-----------------------------------------")

            state = self.pipeline.hatchetToNetworkX(state, "path")
            stage4 = time.perf_counter()
            self.log.debug(f"Convert to NetworkX graph: {stage4 - stage3}")
            self.log.info("-----------------------------------------")

            state = self.pipeline.group(state, "module")
            stage5 = time.perf_counter()
            self.log.debug(f"Group GraphFrame: {stage5 - stage4}")
            self.log.info("-----------------------------------------")

            self.pipeline.write_dataset_gf(
                state, dataset_name, "entire", write_graph=False
            )
            stage6 = time.perf_counter()
            self.log.debug(f"Write GraphFrame: {stage6 - stage5}")
            self.log.info("-----------------------------------------")
            self.log.info(f'Module: {state.df["module"].unique()}')

        return state

    def setConfig(self):
        self.config.max_incTime = {}
        self.config.max_excTime = {}
        self.config.min_incTime = {}
        self.config.min_excTime = {}
        self.config.numOfRanks = {}
        max_inclusive_time = 0
        max_exclusive_time = 0
        min_inclusive_time = 0
        min_exclusive_time = 0
        for idx, state in enumerate(self.states):
            if state != "ensemble":
                self.config.max_incTime[state] = getMaxIncTime(self.states[state])
                self.config.max_excTime[state] = getMaxExcTime(self.states[state])
                self.config.min_incTime[state] = getMinIncTime(self.states[state])
                self.config.min_excTime[state] = getMinExcTime(self.states[state])
                self.config.numOfRanks[state] = len(
                    self.states[state].df["rank"].unique()
                )
                print(self.config.numOfRanks)
                max_exclusive_time = max(
                    self.config.max_excTime[state], max_exclusive_time
                )
                max_inclusvie_time = max(
                    self.config.max_incTime[state], max_exclusive_time
                )
                min_exclusive_time = min(
                    self.config.min_excTime[state], min_exclusive_time
                )
                min_inclusive_time = min(
                    self.config.min_incTime[state], min_inclusive_time
                )
        self.config.max_incTime["ensemble"] = max_inclusive_time
        self.config.max_excTime["ensemble"] = max_exclusive_time
        self.config.min_incTime["ensemble"] = min_inclusive_time
        self.config.min_excTime["ensemble"] = min_exclusive_time

    def request(self, action):
        log.info("[Single Mode]", action)
        action_name = action["name"]

        if action_name == "init":
            self.setConfig()
            return self.config

        if "groupBy" in action:
            log.debug("Grouping by: {0}".format(action["groupBy"]))
        else:
            action["groupBy"] = "name"

        dataset = action["dataset"]
        state = self.states[dataset]

        log.info("The selected Dataset is {0}".format(dataset))

        # Compare against the different operations
        if action_name == "reset":
            datasets = [dataset]
            self.reProcess = True
            self.states = self.pipeline(
                datasets, action["filterBy"], action["filterPerc"]
            )
            self.reProcess = False
            self.states = self.pipeline(datasets)
            return {}

        elif action_name == "auxiliary":
            auxiliary = Auxiliary(
                self.states[action["dataset"]],
                binCount=action["binCount"],
                dataset=action["dataset"],
                config=self.config,
            )
            return auxiliary.result

        elif action_name == "supergraph":
            self.states[dataset].g = SuperGraph(
                self.states, dataset, "group_path", construct_graph=True, add_data=True
            ).g
            return self.states[dataset].g

        elif action_name == "split-callee":
            splitCallee(state, action["groupBy"])
            nx = CallGraph(state, "path", True)
            return nx.g

        elif action_name == "split-caller":
            splitCaller(state, action["groupBy"])
            nx = CallGraph(state, "path", True)
            return nx.g

        elif action_name == "mini-histogram":
            minihistogram = MiniHistogram(state)
            return minihistogram.result

        elif action_name == "cct":
            graph = singleCCT(
                self.states[action["dataset"]], action["functionsInCCT"], self.config
            )
            return graph.g

        elif action_name == "function":
            functionlist = FunctionList(state, action["module"], action["nid"])
            return functionlist.result

    def displayStats(self, name):
        log.warn("==========================")
        log.info("Number of datasets : {0}".format(len(self.config[name].paths.keys())))
        log.info("Stats: Dataset ({0}) ".format(name))
        log.warn("==========================")
        max_inclusive_time = utils.getMaxIncTime(gf)
        max_exclusive_time = utils.getMaxExcTime(gf)
        avg_inclusive_time = utils.getAvgIncTime(gf)
        avg_exclusive_time = utils.getAvgExcTime(gf)
        num_of_nodes = utils.getNumOfNodes(gf)
        log.info("[] Rows in dataframe: {0}".format(self.states[name].df.shape[0]))
        log.info("Max Inclusive time = {0} ".format(max_inclusive_time))
        log.info("Max Exclusive time = {0} ".format(max_exclusive_time))
        log.info("Avg Inclusive time = {0} ".format(avg_inclusive_time))
        log.info("Avg Exclusive time = {0} ".format(avg_exclusive_time))
        log.info("Number of nodes in CCT = {0}".format(num_of_nodes))
