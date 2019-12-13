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
from distgraph import DistGraph


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
        self.processUnion = config.union

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
            # TODO: Remove this.
            if self.reProcess and self.processEntire:
                states[dataset_name] = self.pipeline.create(dataset_name)
                states[dataset_name] = self.pipeline.process(
                    states[dataset_name], "entire"
                )
                self.pipeline.write_gf(states[dataset_name], dataset_name, "entire")
                states[dataset_name] = self.pipeline.filter(
                    states[dataset_name], filterBy, filterPerc
                )
                self.pipeline.write_gf(states[dataset_name], dataset_name, "filter")
                states[dataset_name] = self.pipeline.group(
                    states[dataset_name], "module"
                )

                write_graph = False
                self.write_gf(states[dataset_name], dataset_name, "group")
            elif self.reUpdate:
                states[dataset_name] = self.pipeline.create(dataset_name)
                states[dataset_name] = self.pipeline.process(
                    states[dataset_name], "filter"
                )
                states[dataset_name] = self.pipeline.filter(
                    states[dataset_name], filterBy, filterPerc
                )
            elif self.reProcess and self.processUnion:
                states[dataset_name] = self.pipeline.create(dataset_name)
                states[dataset_name] = self.pipeline.process(
                    states[dataset_name], "entire"
                )
                states[dataset_name] = self.pipeline.convertToNetworkX(
                    states[dataset_name], "path"
                )
                self.pipeline.write_gf(states[dataset_name], dataset_name, "entire", write_graph=False)
                states[dataset_name] = self.pipeline.filterNetworkX(
                    states, dataset_name, self.config.filter_perc
                )
                self.pipeline.write_dataset_gf(
                    states[dataset_name], dataset_name, "filter"
                )
                self.pipeline.write_hatchet_graph(states, dataset_name)
            # else:
            # states[dataset_name] = self.read_gf(dataset_name, '')

        if self.reProcess and self.processUnion:
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
                self.config.max_incTime[state] = utils.getMaxIncTime(self.states[state])
                self.config.max_excTime[state] = utils.getMaxExcTime(self.states[state])
                self.config.min_incTime[state] = utils.getMinIncTime(self.states[state])
                self.config.min_excTime[state] = utils.getMinExcTime(self.states[state])
                self.config.numbOfRanks[state] = self.config.nop
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

        dataset1 = action["dataset1"]
        state1 = self.states[dataset1]

        log.info("The selected Dataset is {0}".format(dataset1))

        # Compare against the different operations
        if action_name == "default":
            groupBy(state1, action["groupBy"])
            nx = CallGraph(state1, "group_path", True, action["groupBy"])

        elif action_name == "reset":
            datasets = [dataset1]
            self.reProcess = True
            self.states = self.pipeline(
                datasets, action["filterBy"], action["filterPerc"]
            )
            self.reProcess = False
            self.states = self.pipeline(datasets)
            return {}

        elif action_name == "group":
            log.debug("Grouping the Graphframe by: {0}".format(action["groupBy"]))
            group = groupBy(state1, action["groupBy"])
            self.states[dataset1].gdf = group.df
            self.states[dataset1].graph = group.graph
            write_graph = False
            self.write_gf(state1, dataset1, "group", write_graph)
            if action["groupBy"] == "module":
                path_type = "group_path"
            elif action["groupBy"] == "name":
                path_type = "path"
            nx = CallGraph(state1, path_type, True, action["groupBy"])
            state1.g = nx.g
            return nx.g

        elif action_name == "split-level":
            splitLevel(state1, action["groupBy"])
            nx = CallGraph(state1, "group_path", True)
            return nx.g

        elif action_name == "split-callee":
            splitCallee(state1, action["groupBy"])
            nx = CallGraph(state1, "path", True)
            return nx.g

        elif action_name == "split-caller":
            splitCaller(state1, action["groupBy"])
            nx = CallGraph(state1, "path", True)
            return nx.g

        elif action_name == "hierarchy":
            mH = moduleHierarchy(self.states[dataset1], action["module"])
            return mH.result

        elif action_name == "histogram":
            histogram = Histogram(state1, action["nid"])
            return histogram.result

        elif action_name == "mini-histogram":
            minihistogram = MiniHistogram(state1)
            return minihistogram.result

        elif action_name == "cct":
            nx = CCT(state1, action["functionInCCT"])
            return nx.g

        elif action_name == "split-rank":
            ret = splitRank(state1, action["ids"])
            return ret

        elif action_name == "function":
            functionlist = FunctionList(state1, action["module"], action["nid"])
            return functionlist.result

    def update_dist(self, action):
        action_name = action["name"]
        print("Action: ", action_name)
        datasets = self.config.dataset_names

        if action_name == "init":
            self.states["ensemble"] = self.pipeline.read_ensemble_gf()
            print(self.states['ensemble'].g.nodes())
            for idx, dataset in enumerate(datasets):
                self.states[dataset] = self.pipeline.read_dataset_gf(dataset)

            # Read all datasets but the filtered versions.
            self.setConfig()
            return self.config

        elif action_name == "group":
            self.states['ensemble'].g = DistGraph(
                self.states, "group_path", construct_graph=True, add_data=True
            ).g
            return self.states['ensemble'].g

        elif action_name == "scatterplot":
            if action["plot"] == "bland-altman":
                state1 = self.states[action["dataset1"]]
                state2 = self.states[action["dataset2"]]
                col = action["col"]
                catcol = action["catcol"]
                dataset1 = action["dataset1"]
                dataset2 = action["dataset2"]
                ret = BlandAltman(
                    state1, state2, col, catcol, dataset1, dataset2
                ).results
            return ret

        elif action_name == "gradients":
            if action["plot"] == "kde":
                ret = KDE_gradients(self.states).results
            return ret

        elif action_name == "Gromov-wasserstein":
            ret = {}
            return ret

        elif action_name == "similarity":
            if (action['module'] == 'all'):
                dirname = self.config.callflow_dir
                name = self.config.runName
                similarity_filepath = dirname  + '/' + 'similarity.json'
                with open(similarity_filepath, 'r') as similarity_file:
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
            mH = moduleHierarchyDist(self.states["ensemble"], action["module"])
            return mH.result

        elif action_name == "cct":
            self.update_dist(
                {"name": "group", "groupBy": "name", "datasets": action["datasets"]}
            )
            nx = CCT(self.states["ensemble"], action["functionsInCCT"])
            return nx.g

        elif action_name == "projection":
            result = RunProjection(self.states, self.similarities).result
            return result.to_json(orient="columns")

        elif action_name == "run-information":
            ret = []
            for idx, state in enumerate(self.states):
                self.states[state].projection_data["dataset"] = state
                ret.append(self.states[state].projection_data)
            return ret

        elif action_name == "mini-histogram":
            minihistogram = MiniHistogram(self.states['ensemble'], target_datasets=action['target-datasets'])
            return minihistogram.result

        elif action_name == "histogram":
            histogram = DistHistogram(self.states['ensemble'], action["module"])
            return histogram.result

        elif action_name == "auxiliary":
            auxiliary = Auxiliary(self.states['ensemble'], module=action['module'], sortBy=action['sortBy'], datasets=action['datasets'])
            return auxiliary.result

        elif action_name == 'compare':
            compareDataset = action['compareDataset']
            targetDataset = action['targetDataset']
            compare = Compare(self.states, compareDataset, targetDataset, 'time (inc)')
            return compare.result

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

