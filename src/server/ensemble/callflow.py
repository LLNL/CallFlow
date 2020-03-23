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

from pipeline.state import State
from pipeline.index import Pipeline

from utils.logger import log
from utils.timer import Timer
from utils.df import getMaxExcTime, getMinExcTime, getMaxIncTime, getMinIncTime

from ensemble.cct import CCT
from ensemble.supergraph import SuperGraph
from ensemble.actions.module_hierarchy import ModuleHierarchy
from ensemble.actions.union_graph import UnionGraph
from ensemble.actions.gradients import KDE_gradients
from ensemble.actions.similarity import Similarity
from ensemble.actions.parameter_projection import ParameterProjection
from ensemble.actions.histogram import Histogram
from ensemble.actions.auxiliary import Auxiliary
from ensemble.actions.compare import Compare
from ensemble.actions.split_callee import SplitCallee
from ensemble.actions.split_caller import SplitCaller
# from ensemble.actions.split_rank import SplitRank
# from ensemble.actions.split_level import SplitLevel


# Create states for each dataset.
# Note: gf would never change from create_gf.
# # Note: fgf would be changed when filter props are changed by client.
# Note: df is always updated.
# Note: graph is always updated.
class EnsembleCallFlow:
    def __init__(self, config):
        # Config contains properties set by the input config file.
        self.config = config
        self.timer = Timer()

        self.pipeline = Pipeline(self.config)
        if config.process:
            log.info("[Ensemble] Process Mode.")
            self.states = self.processState(self.config.dataset_names)
        else:
            log.info("[Ensemble] Read Mode.")
            self.states = self.readState(self.config.dataset_names)

        self.target_df = {}
        for dataset in self.config.dataset_names:
            self.target_df[dataset] = self.states['ensemble_entire'].df.loc[self.states['ensemble_entire'].df['dataset'] == dataset]

        self.currentBinCount = 0

    def processState(self, datasets, filterBy="Inclusive", filterPerc="10"):
        states = {}
        col_names = ['stage', 'time']
        time_perf_df = pd.DataFrame(columns = col_names)
        # for idx, dataset_name in enumerate(datasets):
        #     states[dataset_name] = State(dataset_name)
        #     stage1 = time.perf_counter()
        #     states[dataset_name] = self.pipeline.create_gf(dataset_name)
        #     stage2 = time.perf_counter()
        #     print(f"Create GraphFrame: {stage2 - stage1}")
        #     # self.pipeline.write_gf(states[dataset_name], dataset_name, "entire_unprocessed", write_graph=False)

        #     states[dataset_name] = self.pipeline.process_gf(states[dataset_name], "entire")
        #     stage3 = time.perf_counter()
        #     print(f"Preprocess GraphFrame: {stage3 - stage2}")

        #     states[dataset_name] = self.pipeline.convertToNetworkX(states[dataset_name], "path")
        #     stage4 = time.perf_counter()
        #     print(f"Convert to NetworkX graph: {stage4 - stage3}")

        #     states[dataset_name] = self.pipeline.group(states[dataset_name], "module")
        #     stage5 = time.perf_counter()
        #     print(f"Group GraphFrame: {stage5 - stage4}")

        #     self.pipeline.write_dataset_gf(states[dataset_name], dataset_name, "entire", write_graph=False)
        #     stage6 = time.perf_counter()
        #     print(f"Write GraphFrame: {stage6 - stage5}")

        #     # states[dataset_name] = self.pipeline.filterNetworkX(states, dataset_name, self.config.filter_perc)
        #     self.pipeline.write_hatchet_graph(states, dataset_name)

        
        for idx, dataset_name in enumerate(datasets):
            states[dataset_name] = self.pipeline.read_dataset_gf(dataset_name)

        stage7 = time.perf_counter()
        states["ensemble_entire"] = self.pipeline.union(states)
        stage8 = time.perf_counter()
        print(f"Union GraphFrame: {stage8 - stage7}")

        self.pipeline.write_ensemble_gf(states, "ensemble_entire")
        stage9 = time.perf_counter()
        print(f"Writing ensemble graph: {stage9 - stage8}")

        stage10 = time.perf_counter()
        states["ensemble_filter"] = self.pipeline.filterNetworkX(states['ensemble_entire'], self.config.filter_perc)
        stage11 = time.perf_counter()
        print(f"Filter ensemble graph: {stage11 - stage10}")

        stage12 = time.perf_counter()
        self.pipeline.write_ensemble_gf(states, "ensemble_filter")
        stage13 = time.perf_counter()
        print(f"Writing ensemble graph: {stage13 - stage12}")

        stage14 = time.perf_counter()
        states["ensemble_group"] = self.pipeline.ensemble_group(states, "module")
        stage15 = time.perf_counter()
        print(f"Group ensemble graph: {stage15 - stage14}")

        stage16 = time.perf_counter()
        self.pipeline.write_ensemble_gf(states, "ensemble_group")
        stage17 = time.perf_counter()
        print(f"Write group ensemble graph: {stage17 - stage16}")

        # self.pipeline.write_callsite_information(states)

        # similarities = self.pipeline.deltaconSimilarity(datasets, states, "ensemble")

        return states

    def readState(self, datasets):
        states = {}
        states["ensemble_entire"] = self.pipeline.read_ensemble_gf('ensemble_entire')
        states["ensemble_filter"] = self.pipeline.read_ensemble_gf('ensemble_filter')
        states["ensemble_group"] = self.pipeline.read_ensemble_gf('ensemble_group')
        # for idx, dataset in enumerate(datasets):
        #     states[dataset] = self.pipeline.read_dataset_gf(dataset)
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
            self.config.max_incTime[dataset] = self.target_df[dataset]['time (inc)'].max()
            self.config.max_excTime[dataset] = self.target_df[dataset]['time'].max()
            self.config.min_incTime[dataset] = self.target_df[dataset]['time (inc)'].min()
            self.config.min_excTime[dataset] = self.target_df[dataset]['time'].min()
            self.config.numOfRanks[dataset] = len(self.target_df[dataset]['rank'].unique())
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
        self.config.numOfRanks['ensemble'] = max_numOfRanks


    def request(self, action):
        action_name = action["name"]
        log.info(f"Action: {action_name}")
        datasets = self.config.dataset_names

        if action_name == "init":
            self.addIncExcTime()
            return self.config

        elif action_name == "ensemble_cct":
            self.request({
                "name": "supergraph",
                "groupBy": "name",
                "datasets": action["datasets"]
            })
            nx = CCT(self.states["ensemble_entire"], action["functionsInCCT"])
            return nx.g

        elif action_name == "supergraph":
            if('reveal_callsites' in action):
                reveal_callsites = action['reveal_callsites']
            else:
                reveal_callsites = []
            self.states['ensemble_group'].g = SuperGraph(
                self.states, "group_path", construct_graph=True, add_data=True, reveal_callsites=reveal_callsites
            ).g
            return self.states['ensemble_group'].g

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
            mH = ModuleHierarchy(self.states["ensemble_entire"], action["module"])
            return mH.result

        elif action_name == "projection":
            self.similarities = {}
            # dirname = self.config.callflow_dir
            # name = self.config.runName
            # similarity_filepath = dirname  + '/' + 'similarity.json'
            # with open(similarity_filepath, 'r') as similarity_file:
            #     self.similarities = json.load(similarity_file)
            result = ParameterProjection(self.states['ensemble_entire'], self.similarities, action['targetDataset']).result
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
            histogram = Histogram(self.states['ensemble'], action["module"])
            return histogram.result

        elif action_name == "auxiliary":
            if(self.currentBinCount != action['binCount']):
                auxiliary = Auxiliary(self.states, binCount=action["binCount"], datasets=action['datasets'], config=self.config, process=False)
            else:
                auxiliary = Auxiliary(self.states, binCount=action["binCount"], datasets=action['datasets'], config=self.config, process=False)
            self.currentBinCount = action['binCount']

            return auxiliary.result

        elif action_name == 'compare':
            compareDataset = action['compareDataset']
            targetDataset = action['targetDataset']
            if(action['selectedMetric'] == 'Inclusive'):
                selectedMetric = 'time (inc)'
            elif(action['selectedMetric'] == 'Exclusive'):
                selectedMetric = 'time'

            compare = Compare(self.states['ensemble_entire'], compareDataset, targetDataset, selectedMetric)
            return compare.result

        elif action_name == 'mpi_range_data':
            self.states['ensemble_entire']



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

