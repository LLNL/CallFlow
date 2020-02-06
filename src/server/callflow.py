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
from logger import log
from timer import Timer

from networkx.readwrite import json_graph

from callgraph import CallGraph

from actions.mini_histogram import MiniHistogram
from actions.histogram import Histogram
from actions.scatterplot import Scatterplot
from actions.split_callee import splitCallee
from actions.split_caller import splitCaller
from actions.split_rank import splitRank
from actions.split_level import splitLevel
from actions.cct import CCT
from actions.module_hierarchy import moduleHierarchy
from actions.function_list import FunctionList

from state import State
from logger import log
from pipeline import Pipeline

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
	        utils.debug("Processing with filter.")
	    else:
	        utils.debug("Reading from the processed files.")

	    self.pipeline = Pipeline(self.config)

	    states = {}
	    for idx, dataset_name in enumerate(datasets):
	        states[dataset_name] = State(dataset_name)

	        if self.processEntire:
	            states[dataset_name] = self.pipeline.create(dataset_name)
	            states[dataset_name] = self.pipeline.convertdfToNetworkX(
	                states[dataset_name], graph_type='entire')
	            # self.pipeline.write_gf(states[dataset_name], dataset_name, "entire", write_graph=False)
	            states[dataset_name] = self.pipeline.filterNetworkX(
	                states, dataset_name, self.config.filter_perc
	            )
	            states[dataset_name] = self.pipeline.process(
	                states[dataset_name], "filter"
	            )

	            self.pipeline.write_dataset_gf(
	                states[dataset_name], dataset_name, "filter"
	            )
	            self.pipeline.write_hatchet_graph(states, dataset_name)

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
	            self.config.max_incTime[state] = utils.getMaxIncTime(self.states[state])
	            self.config.max_excTime[state] = utils.getMaxExcTime(self.states[state])
	            self.config.min_incTime[state] = utils.getMinIncTime(self.states[state])
	            self.config.min_excTime[state] = utils.getMinExcTime(self.states[state])
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

	def update(self, action):
	    utils.debug("Update", action)
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
	    if action_name == "default":
	        groupBy(state, action["groupBy"])
	        nx = CallGraph(state, "group_path", True, action["groupBy"])

	    elif action_name == "reset":
	        datasets = [dataset]
	        self.reProcess = True
	        self.states = self.pipeline(
	            datasets, action["filterBy"], action["filterPerc"]
	        )
	        self.reProcess = False
	        self.states = self.pipeline(datasets)
	        return {}

	    elif action_name == "group":
	        log.debug("Grouping the Graphframe by: {0}".format(action["groupBy"]))
	        group = groupBy(state, action["groupBy"])
	        self.states[dataset].gdf = group.df
	        self.states[dataset].graph = group.graph
	        write_graph = False
	        self.write_gf(state, dataset, "group", write_graph)
	        if action["groupBy"] == "module":
	            path_type = "group_path"
	        elif action["groupBy"] == "name":
	            path_type = "path"
	        nx = CallGraph(state, path_type, True, action["groupBy"])
	        state.g = nx.g
	        return nx.g

	    elif action_name == "split-level":
	        splitLevel(state, action["groupBy"])
	        nx = CallGraph(state, "group_path", True)
	        return nx.g

	    elif action_name == "split-callee":
	        splitCallee(state, action["groupBy"])
	        nx = CallGraph(state, "path", True)
	        return nx.g

	    elif action_name == "split-caller":
	        splitCaller(state, action["groupBy"])
	        nx = CallGraph(state, "path", True)
	        return nx.g

	    elif action_name == "hierarchy":
	        mH = moduleHierarchy(self.states[dataset], action["module"])
	        return mH.result

	    elif action_name == "histogram":
	        histogram = Histogram(state, action["nid"])
	        return histogram.result

	    elif action_name == "mini-histogram":
	        minihistogram = MiniHistogram(state)
	        return minihistogram.result

	    elif action_name == "cct":
	        self.update_dist({
	            "name": "group",
	            "groupBy": "name",
	            "datasets": action["dataset"]
	        })
	        nx = CCT(self.states[action["dataset"]], action["functionsInCCT"])
	        return nx.g

	    elif action_name == "split-rank":
	        ret = splitRank(state, action["ids"])
	        return ret

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

