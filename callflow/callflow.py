# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

import os
import json

# ------------------------------------------------------------------------------
# CallFlow imports
import callflow
from callflow import SuperGraph, EnsembleGraph
from callflow.algorithms import DeltaConSimilarity, BlandAltman
from callflow.layout import NodeLinkLayout, SankeyLayout, HierarchyLayout
from callflow.modules import ParameterProjection, DiffView, MiniHistogram, FunctionList

LOGGER = callflow.get_logger(__name__)


class CallFlow:
    def __init__(self, config: dict, ensemble=False):
        """
        Entry interface to access CallFlow's functionalities. "
        """

        # Assert if config is provided.
        assert isinstance(config, dict)

        self.config = config
        self.ensemble = ensemble

    # --------------------------------------------------------------------------
    # Processing methods.
    def _create_dot_callflow_folder(self):
        """
        Create a .callflow directory and empty files.
        """
        LOGGER.debug(f"Saved .callflow directory is: {self.config['save_path']}")

        if not os.path.exists(self.config["save_path"]):
            os.makedirs(self.config["save_path"])
            os.makedirs(os.path.join(self.config["save_path"], "ensemble"))

        dataset_folders = [k for k in self.config["properties"]["paths"].keys()]
        # for dataset in self.config["properties"][""]:
        #     dataset_folders.append(self.config["properties"]["name"])
        dataset_folders.append("ensemble")

        for dataset in dataset_folders:
            dataset_dir = os.path.join(self.config["save_path"], dataset)
            LOGGER.debug(dataset_dir)
            if not os.path.exists(dataset_dir):
                # if self.debug:
                LOGGER.debug(f"Creating .callflow directory for dataset : {dataset}")
                os.makedirs(dataset_dir)

            files = ["df.csv", "nxg.json", "hatchet_tree.txt", "auxiliary_data.json"]
            for f in files:
                fname = os.path.join(dataset_dir, f)
                if not os.path.exists(fname):
                    open(fname, "w").close()

    def _remove_dot_callflow_folder(self):
        """
        TODO: We might want to delete the .callflow folder when we re-process/re-write.
        """
        pass

    def process(self):
        """
        Process the datasets based on the format (i.e., either single or ensemble)
        """
        ndatasets = len(self.config["properties"]["runs"])
        assert self.ensemble == (ndatasets > 1)

        self._create_dot_callflow_folder()
        if self.ensemble:
            self._process_ensemble(self.config["properties"]["runs"])
        else:
            self._process_single(self.config["properties"]["runs"][0])

    def load(self):
        """
        Load the processed datasets by the format.
        """
        ndatasets = len(self.config["properties"]["runs"])
        if self.ensemble:
            self.supergraphs = self._read_ensemble()
            # assertion here is 1 less than self.supergraph.keys, becasuse
            # self.supergraphs contains the ensemble supergraph as well.
            assert len(self.supergraphs.keys()) == 1 + ndatasets
        else:
            self.supergraphs = self._read_single()
            assert len(self.supergraphs.keys()) == 1

        # Adds basic information to config.
        # Config is later return to client app on "init" request.
        self.add_basic_info_to_config()

    def _process_single(self, dataset):
        """
        Single dataset processing.
        """
        LOGGER.debug("#########################################")
        LOGGER.debug(f"Single Mode: {dataset}")
        LOGGER.debug("#########################################")
        supergraph = SuperGraph(config=self.config, tag=dataset, mode="process")

        # Process each graphframe.
        supergraph.process_gf()

        # Filter by inclusive or exclusive time.
        supergraph.filter_gf(mode="single")

        # Group by module.
        supergraph.group_gf(group_by=self.config["group_by"])

        # Store the graphframe.
        supergraph.write_gf("entire")

        supergraph.single_auxiliary(dataset=dataset, binCount=20, process=True)

    def _process_ensemble(self, datasets):
        """
        Ensemble processing of datasets.
        """
        # Before we process the ensemble, we perform single processing on all datasets.
        single_supergraphs = {}
        for idx, dataset_name in enumerate(datasets):
            # Create an instance of dataset.
            LOGGER.debug("#########################################")
            LOGGER.debug(f"Ensemble Mode: {dataset_name}")
            LOGGER.debug("#########################################")
            single_supergraphs[dataset_name] = SuperGraph(
                config=self.config, tag=dataset_name, mode="process"
            )

            # Process each graphframe.
            single_supergraphs[dataset_name].process_gf()

            single_supergraphs[dataset_name].group_gf(group_by="module")

            # Write the entire graphframe into .callflow.
            single_supergraphs[dataset_name].write_gf("entire")

            # Single auxiliary processing.
            single_supergraphs[dataset_name].single_auxiliary(
                dataset=dataset_name,
                binCount=20,
                process=True,
            )

        # Create a supergraph class for ensemble case.
        ensemble_supergraph = EnsembleGraph(
            self.config, "ensemble", mode="process", supergraphs=single_supergraphs
        )

        # Filter the ensemble graphframe.
        ensemble_supergraph.filter_gf(mode="ensemble")

        # Group by module.
        ensemble_supergraph.group_gf(group_by=self.config["group_by"])

        # Write the grouped graphframe.
        ensemble_supergraph.write_gf("group")

        # Ensemble auxiliary processing.
        ensemble_supergraph.ensemble_auxiliary(
            # MPIBinCount=self.currentMPIBinCount,
            # RunBinCount=self.currentRunBinCount,
            datasets=self.config["properties"]["runs"],
            MPIBinCount=20,
            RunBinCount=20,
            process=True,
            write=True,
        )

    def _read_single(self):
        """
        Read the single .callflow files required for client.
        """
        supergraphs = {}
        # Only consider the first dataset from the listing.
        dataset_name = self.config["properties"]["runs"][0]
        supergraphs[dataset_name] = SuperGraph(
            config=self.config, tag=dataset_name, mode="render"
        )

        return supergraphs

    def _read_ensemble(self):
        """
        Read the ensemble .callflow files required for client.
        """
        supergraphs = {}

        for idx, dataset_name in enumerate(self.config["properties"]["runs"]):
            supergraphs[dataset_name] = SuperGraph(
                config=self.config, tag=dataset_name, mode="render"
            )
            # supergraphs[dataset_name].read_gf(read_parameter=self.config["read_parameter"])

        supergraphs["ensemble"] = EnsembleGraph(
            config=self.config, tag="ensemble", mode="render"
        )
        # supergraphs["ensemble"].read_gf(read_parameter=self.config["read_parameter"])
        # supergraphs["ensemble"].read_auxiliary_data()
        return supergraphs

    # --------------------------------------------------------------------------
    # Reading and rendering methods.
    # All the functions below are Public methods that are accessed by the server.

    def add_basic_info_to_config(self):
        """
        Adds basic information (like max, min inclusive and exclusive runtime) to self.config.
        """
        self.config["maxIncTime"] = {}
        self.config["maxExcTime"] = {}
        self.config["minIncTime"] = {}
        self.config["minExcTime"] = {}
        self.config["numOfRanks"] = {}
        maxIncTime = 0
        maxExcTime = 0
        minIncTime = 0
        minExcTime = 0
        maxNumOfRanks = 0
        for idx, tag in enumerate(self.supergraphs):
            self.config["maxIncTime"][tag] = (
                self.supergraphs[tag].gf.df["time (inc)"].max()
            )
            self.config["maxExcTime"][tag] = self.supergraphs[tag].gf.df["time"].max()
            self.config["minIncTime"][tag] = (
                self.supergraphs[tag].gf.df["time (inc)"].min()
            )
            self.config["minExcTime"][tag] = self.supergraphs[tag].gf.df["time"].min()
            self.config["numOfRanks"][tag] = len(
                self.supergraphs[tag].gf.df["rank"].unique()
            )
            maxExcTime = max(self.config["maxExcTime"][tag], maxExcTime)
            maxIncTime = max(self.config["maxIncTime"][tag], maxIncTime)
            minExcTime = min(self.config["minExcTime"][tag], minExcTime)
            minIncTime = min(self.config["minIncTime"][tag], minIncTime)
            maxNumOfRanks = max(self.config["numOfRanks"][tag], maxNumOfRanks)

        self.config["maxIncTime"]["ensemble"] = maxIncTime
        self.config["maxExcTime"]["ensemble"] = maxExcTime
        self.config["minIncTime"]["ensemble"] = minIncTime
        self.config["minExcTime"]["ensemble"] = minExcTime
        self.config["numOfRanks"]["ensemble"] = maxNumOfRanks

    def request_single(self, operation):
        """
        Handles all the socket requests connected to Single CallFlow.
        """
        _OPERATIONS = [
            "init",
            "reset",
            "auxiliary",
            "cct",
            "supergraph",
            "miniHistogram",
            "function",
            "split_mpi_distribution",
        ]
        assert "name" in operation
        assert operation["name"] in _OPERATIONS

        LOGGER.info(f"[Single Mode] {operation}")
        operation_name = operation["name"]

        if operation_name == "init":
            return self.config

        elif operation_name == "auxiliary":
            return self.supergraphs[operation["dataset"]].auxiliary_data

        elif operation_name == "supergraph":
            if "reveal_callsites" in operation:
                reveal_callsites = operation["reveal_callsites"]
            else:
                reveal_callsites = []

            if "split_entry_module" in operation:
                split_entry_module = operation["split_entry_module"]
            else:
                split_entry_module = ""

            if "split_callee_module" in operation:
                split_callee_module = operation["split_callee_module"]
            else:
                split_callee_module = ""

            single_supergraph = SankeyLayout(
                supergraph=self.supergraphs[operation["dataset"]],
                path="group_path",
                reveal_callsites=reveal_callsites,
                split_entry_module=split_entry_module,
                split_callee_module=split_callee_module,
            )
            return single_supergraph.nxg

        elif operation_name == "mini-histogram":
            minihistogram = MiniHistogram(self.supergraphs[operation["dataset"]])
            return minihistogram.result

        elif operation_name == "cct":
            result = NodeLinkLayout(
                supergraph=self.supergraphs[operation["dataset"]],
                callsite_count=operation["functionsInCCT"],
            )
            return result.nxg

        elif operation_name == "function":
            functionlist = FunctionList(
                self.supergraphs[operation["dataset"]], operation["module"]
            )
            return functionlist.result

        elif operation_name == "split_mpi_distribution":
            pass

    # flake8: noqa: C901
    def request_ensemble(self, operation):
        """
        Handles all the socket requests connected to Single CallFlow.
        """
        operation_name = operation["name"]
        datasets = self.config["properties"]["runs"]

        if operation_name == "init":
            return self.config

        elif operation_name == "ensemble_cct":
            result = NodeLinkLayout(
                supergraph=self.supergraphs["ensemble"],
                callsite_count=operation["functionsInCCT"],
            )
            return result.nxg

        elif operation_name == "supergraph":
            if "reveal_callsites" in operation:
                reveal_callsites = operation["reveal_callsites"]
            else:
                reveal_callsites = []

            if "split_entry_module" in operation:
                split_entry_module = operation["split_entry_module"]
            else:
                split_entry_module = ""

            if "split_callee_module" in operation:
                split_callee_module = operation["split_callee_module"]
            else:
                split_callee_module = ""

            ensemble_super_graph = SankeyLayout(
                supergraph=self.supergraphs["ensemble"],
                path="group_path",
                reveal_callsites=reveal_callsites,
                split_entry_module=split_entry_module,
                split_callee_module=split_callee_module,
            )
            return ensemble_super_graph.nxg

        elif operation_name == "hierarchy":
            modulehierarchy = HierarchyLayout(
                self.supergraphs["ensemble"], operation["module"]
            )
            return modulehierarchy.nxg

        elif operation_name == "projection":
            projection = ParameterProjection(
                supergraph=self.supergraphs["ensemble"],
                targetDataset=operation["targetDataset"],
                n_cluster=operation["numOfClusters"],
            )
            return projection.result.to_json(orient="columns")

        # Not used.
        elif operation_name == "scatterplot":
            assert False
            if operation["plot"] == "bland-altman":
                state1 = self.states[operation["dataset"]]
                state2 = self.states[operation["dataset2"]]
                col = operation["col"]
                catcol = operation["catcol"]
                dataset1 = operation["dataset"]
                dataset2 = operation["dataset2"]
                ret = BlandAltman(
                    state1, state2, col, catcol, dataset1, dataset2
                ).results
            return ret

        # Not used.
        elif operation_name == "similarity":
            assert False
            if operation["module"] == "all":
                dirname = self.config.callflow_dir
                similarity_filepath = dirname + "/" + "similarity.json"
                with open(similarity_filepath, "r") as similarity_file:
                    self.similarities = json.load(similarity_file)
            else:
                self.similarities = {}
                for idx, dataset in enumerate(datasets):
                    self.similarities[dataset] = []
                    for idx_2, dataset2 in enumerate(datasets):
                        union_similarity = DeltaConSimilarity(
                            self.states[dataset2].g, self.states[dataset].g
                        )
                    self.similarities[dataset].append(union_similarity.result)
            return self.similarities

        # Not used.
        elif operation_name == "run-information":
            assert False
            ret = []
            for idx, state in enumerate(self.states):
                self.states[state].projection_data["dataset"] = state
                ret.append(self.states[state].projection_data)
            return ret

        elif operation_name == "auxiliary":
            if len(operation["datasets"]) > 1:
                return self.supergraphs["ensemble"].auxiliary_data
            return self.supergraphs[operation["datasets"][0]].auxiliary_data

        elif operation_name == "compare":
            compareDataset = operation["compareDataset"]
            targetDataset = operation["targetDataset"]
            if operation["selectedMetric"] == "Inclusive":
                selectedMetric = "time (inc)"
            elif operation["selectedMetric"] == "Exclusive":
                selectedMetric = "time"

            compare = DiffView(
                self.supergraphs["ensemble"],
                compareDataset,
                targetDataset,
                selectedMetric,
            )
            return compare.result
