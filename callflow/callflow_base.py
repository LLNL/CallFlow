import os

import callflow
LOGGER = callflow.get_logger(__name__)
from callflow.pipeline import Pipeline

class AppState:
    def __init__(self, config):
        self.config = config
        
        self.maxIncTime = {}
        self.maxExcTime = {}
        self.minIncTime = {}
        self.minExcTime = {}
        self.numOfRanks = {}


    def add_target_df(self):    
        self.target_df = {}
        for dataset in self.config.dataset_names:
            self.target_df[dataset] = self.states["ensemble_entire"].new_gf.df.loc[
                self.states["ensemble_entire"].new_gf.df["dataset"] == dataset
            ]

    def add_basic_info(self):
        maxIncTime = 0
        maxExcTime = 0
        minIncTime = 0
        minExcTime = 0
        maxNumOfRanks = 0
        for idx, dataset in enumerate(self.config.dataset_names):
            self.maxIncTime[dataset] = self.target_df[dataset][
                "time (inc)"
            ].max()
            self.maxExcTime[dataset] = self.target_df[dataset]["time"].max()
            self.minIncTime[dataset] = self.target_df[dataset][
                "time (inc)"
            ].min()
            self.minExcTime[dataset] = self.target_df[dataset]["time"].min()
            self.numOfRanks[dataset] = len(
                self.target_df[dataset]["rank"].unique()
            )
            max_exclusive_time = max(
                self.maxExcTime[dataset], maxExcTime
            )
            max_inclusive_time = max(
                self.maxIncTime[dataset], maxIncTime
            )
            min_exclusive_time = min(
                self.minExcTime[dataset], minExcTime
            )
            min_inclusive_time = min(
                self.minIncTime[dataset], minIncTime
            )
            max_numOfRanks = max(self.numOfRanks[dataset], max_numOfRanks)
        self.maxIncTime["ensemble"] = maxIncTime
        self.maxExcTime["ensemble"] = maxExcTime
        self.minIncTime["ensemble"] = minIncTime
        self.minExcTime["ensemble"] = minExcTime
        self.numOfRanks["ensemble"] = maxNumOfRanks


class Config:
    def __init__(self):
        pass


class BaseCallFlow: 
    def __init__(self, config={}, process=False):

        # Assert if config is provided.
        assert config != None
        self.config = config

        if process:
            self.pipeline = Pipeline(self.config)    
            self._create_dot_callflow_folder()

        self.appState = AppState(self.config)

        
    def process_states(self):
        pass

    def read_states(self):
        pass
    
    def _create_dot_callflow_folder(self):
        """
        Create a .callflow directory and empty files.
        """
        LOGGER.info(f"Saved .callflow directory is: {self.config.save_path}")

        if not os.path.exists(self.config.save_path):
            os.makedirs(self.config.save_path)

        for dataset in self.config.datasets:
            dataset_dir = os.path.join(self.config.save_path, dataset["name"])
            LOGGER.info(dataset_dir)
            if not os.path.exists(dataset_dir):
                if self.debug:
                    LOGGER.info(
                        f"Creating .callflow directory for dataset : {dataset['name']}"
                    )
                os.makedirs(dataset_dir)

            files = [
                "entire_df.csv",
                "filter_df.csv",
                "entire_graph.json",
                "filter_graph.json",
            ]
            for f in files:
                if not os.path.exists(dataset_dir + "/" + f):
                    open(os.path.join(dataset_dir, f), "w").close()
    
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


    def request(self, operation):
        pass

        