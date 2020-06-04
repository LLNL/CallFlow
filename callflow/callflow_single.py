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

import callflow

LOGGER = callflow.get_logger(__name__)

from callflow.timer import Timer
from callflow.pipeline import State, Pipeline
from callflow.utils import (
    getMaxExcTime,
    getMinExcTime,
    getMaxIncTime,
    getMinIncTime,
)

from callflow import SingleCCT, SingleSuperGraph, BaseCallFlow

from callflow.modules import (
    SingleAuxiliary,
    RankHistogram,
    MiniHistogram,
    RuntimeScatterplot,
    FunctionList,
)


class SingleCallFlow(BaseCallFlow):

    def __init__(self, config=None, process=False):
        super(SingleCallFlow, self).__init__(config, process)

    # --------------------------------------------------------------------------
    def _process_states(self):
        for dataset_name in self.config.dataset_names:
            state = State(dataset_name)
            LOGGER.info("#########################################")
            LOGGER.info(f"Run: {dataset_name}")
            LOGGER.info("#########################################")

            stage1 = time.perf_counter()
            state = self.pipeline.create_gf(dataset_name)
            stage2 = time.perf_counter()
            LOGGER.info(f"Create GraphFrame: {stage2 - stage1}")
            LOGGER.info("-----------------------------------------")

            states = self.pipeline.process_gf(state, "entire")
            stage3 = time.perf_counter()
            LOGGER.info(f"Preprocess GraphFrame: {stage3 - stage2}")
            LOGGER.info("-----------------------------------------")

            state = self.pipeline.hatchetToNetworkX(state, "path")
            stage4 = time.perf_counter()
            LOGGER.info(f"Convert to NetworkX graph: {stage4 - stage3}")
            LOGGER.info("-----------------------------------------")

            state = self.pipeline.group(state, "module")
            stage5 = time.perf_counter()
            LOGGER.info(f"Group GraphFrame: {stage5 - stage4}")
            LOGGER.info("-----------------------------------------")

            self.pipeline.write_dataset_gf(
                state, dataset_name, "entire", write_graph=False
            )
            stage6 = time.perf_counter()
            LOGGER.info(f"Write GraphFrame: {stage6 - stage5}")
            LOGGER.info("-----------------------------------------")
            LOGGER.info(f'Module: {state.new_gf.df["module"].unique()}')

        return state

    def _read_states(self, datasets):
        states = {}
        for idx, dataset in enumerate(datasets):
            states[dataset] = self.pipeline.read_dataset_gf(dataset)
        return states

    def _request(self, action):
        LOGGER.info("[Single Mode]", action)
        action_name = action["name"]

        if action_name == "init":
            self.setConfig()
            return self.config

        if "groupBy" in action:
            LOGGER.info("Grouping by: {0}".format(action["groupBy"]))
        else:
            action["groupBy"] = "name"

        dataset = action["dataset"]
        state = self.states[dataset]

        LOGGER.info("The selected Dataset is {0}".format(dataset))

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

    # --------------------------------------------------------------------------
