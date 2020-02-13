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

import hatchet as ht
import time
import utils
from utils.logger import log
from utils.timer import Timer
from utils.df import getMaxExcTime, getMinExcTime, getMaxIncTime, getMinIncTime

from networkx.readwrite import json_graph

from single.supergraph import SuperGraph
from ensemble.supergraph import SuperGraph

from actions.mini_histogram import MiniHistogram
from actions.histogram import Histogram
from actions.scatterplot import Scatterplot
from actions.split_callee import splitCallee
from actions.split_caller import splitCaller
from actions.split_rank import splitRank
from actions.split_level import splitLevel
from actions.cct import CCT
from actions.module_hierarchy import moduleHierarchy
from actions.module_hierarchy_dist import moduleHierarchyDist
from actions.function_list import FunctionList
from actions.union_graph import UnionGraph
from actions.kde_gradients import KDE_gradients
from actions.similarity import Similarity
from actions.run_projection import RunProjection
from actions.dist_histogram import DistHistogram
from actions.dist_auxiliary import Auxiliary
from actions.compare import Compare

from pipeline.state import State
from utils.logger import log
from pipeline.index import Pipeline

import time
import networkx as nx
import pandas as pd
import json
import os


class CallFlow:
    def __init__(self, config):
        # Config contains properties set by the input config file.
        self.config = config
        self.reUpdate = False
        self.reProcess = config.preprocess
        self.processEntire = config.entire
        self.processFilter = config.filter
        self.processEnsemble = config.ensemble

        # Create states for each dataset.
        # Note: gf would never change from create_gf.
        # Note: fgf would be changed when filter props are changed by client.
        # Note: df is always updated.
        # Note: graph is always updated.
        # Note: map -> not sure if it can be used.
        self.timer = Timer()
        self.dataset_names = self.config.dataset_names
        self.states = self.pipeline(self.dataset_names)

    def pipeline(self, datasets, filterBy="Inclusive", filterPerc="10"):
        if self.reProcess:
            log.info("Processing with filter.")
        else:
            log.info("Reading from the processed files.")

        self.pipeline = Pipeline(self.config)

        states = {}
        for idx, dataset_name in enumerate(datasets):
            states[dataset_name] = State(dataset_name)
            if self.reUpdate:
                states[dataset_name] = self.pipeline.create(dataset_name)
                states[dataset_name] = self.pipeline.process(
                    states[dataset_name], "filter"
                )
                states[dataset_name] = self.pipeline.filter(
                    states[dataset_name], filterBy, filterPerc
                )
            elif self.reProcess and self.processEnsemble:
                states[dataset_name] = self.pipeline.create(dataset_name)
                # self.pipeline.write_gf(states[dataset_name], dataset_name, "entire_unprocessed", write_graph=False)

                states[dataset_name] = self.pipeline.process(
                    states[dataset_name], "entire"
                )
                states[dataset_name] = self.pipeline.convertToNetworkX(
                    states[dataset_name], "path"
                )
                # self.pipeline.write_gf(states[dataset_name], dataset_name, "entire", write_graph=False)
                states[dataset_name] = self.pipeline.filterNetworkX(
                    states, dataset_name, self.config.filter_perc
                )
                self.pipeline.write_dataset_gf(
                    states[dataset_name], dataset_name, "filter"
                )
                # self.pipeline.write_hatchet_graph(states, dataset_name)

        if self.reProcess and self.processEnsemble:
            states["ensemble"] = self.pipeline.union(states)
            states["ensemble"] = self.pipeline.filterNetworkX(
                states, "ensemble", self.config.filter_perc
            )
            states["ensemble"] = self.pipeline.group(states, "ensemble", "module")
            self.pipeline.write_ensemble_gf(states, "ensemble")

            similarities = self.pipeline.deltaconSimilarity(datasets, states, "ensemble")

        return states

    def setConfig(self):
        self.config.max_incTime = {}
        self.config.max_excTime = {}
        self.config.min_incTime = {}
        self.config.min_excTime = {}
        self.config.numbOfRanks = {}
        max_inclusvie_time = 0
        max_exclusive_time = 0
        min_inclusive_time = 0
        min_exclusive_time = 0
        for idx, state in enumerate(self.states):
            if state != "ensemble":
                self.config.max_incTime[state] = getMaxIncTime(self.states[state])
                self.config.max_excTime[state] = getMaxExcTime(self.states[state])
                self.config.min_incTime[state] = getMinIncTime(self.states[state])
                self.config.min_excTime[state] = getMinExcTime(self.states[state])
                # self.config.numbOfRanks[state] = self.config.nop
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
        self.config.max_incTime["ensemble"] = max_inclusvie_time
        self.config.max_excTime["ensemble"] = max_exclusive_time
        self.config.min_incTime["ensemble"] = min_inclusive_time
        self.config.min_excTime["ensemble"] = min_exclusive_time

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