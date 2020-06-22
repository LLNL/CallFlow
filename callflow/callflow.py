# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------
# Library imports
import os
import json

# ------------------------------------------------------------------------------
# CallFlow imports
import callflow
from callflow import SuperGraph, EnsembleGraph
from callflow.layout import NodeLinkLayout, SankeyLayout
from callflow.modules import (
    EnsembleAuxiliary,
    ModuleHierarchy,
    ParameterProjection,
    FunctionList,
)

LOGGER = callflow.get_logger(__name__)

# ------------------------------------------------------------------------------
# CallFlow class
class CallFlow:
    def __init__(self, config, process=False, ensemble=False):
        """
        Entry interface to access CallFlow's functionalities. "
        """

        # Assert if config is provided.
        assert isinstance(config, callflow.operations.ConfigFileReader)

        # Convert config json to props. Never touch self.config ever.
        self.props = json.loads(json.dumps(config, default=lambda o: o.__dict__))
        #LOGGER.debug('Callflow.init() -- {}'.format(self.props.keys()))

        ndatasets = len(self.props["dataset_names"])
        assert ensemble == (ndatasets > 1)

        # Based on option, either process into .callflow or read from .callflow.
        if process:
            self._create_dot_callflow_folder()
            if ensemble:    self._process_ensemble(self.props["dataset_names"])
            else:           self._process_single(self.props["dataset_names"][0])

         # Rendering of call graphs.
        else:
            if ensemble:
                self.supergraphs = self._read_ensemble()
                # assertion here is 1 less than self.supergraph.keys, becasuse
                # self.supergraphs contains the ensemble supergraph as well.
                assert len(self.supergraphs.keys()) == 1 + ndatasets
            else:
                self.supergraphs = self._read_single()
                assert len(self.supergraphs.keys()) == 1

            # Adds basic information to props.
            # Props is later return to client app on "init" request.
            self.add_basic_info_to_props()

    # --------------------------------------------------------------------------
    # Processing methods.
    def _create_dot_callflow_folder(self):
        """
        Create a .callflow directory and empty files.
        """
        LOGGER.debug(f"Saved .callflow directory is: {self.props['save_path']}")

        if not os.path.exists(self.props["save_path"]):
            os.makedirs(self.props["save_path"])
            os.makedirs(os.path.join(self.props["save_path"], "ensemble"))

        dataset_folders = []
        for dataset in self.props["datasets"]:
            dataset_folders.append(dataset["name"])
        dataset_folders.append("ensemble")

        for dataset in dataset_folders:
            dataset_dir = os.path.join(self.props["save_path"], dataset)
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

    def _process_single(self, dataset):
        """
        Single dataset processing.
        """
        supergraph = SuperGraph(props=self.props, tag=dataset, mode="process")
        LOGGER.info("#########################################")
        LOGGER.info(f"Run: {dataset}")
        LOGGER.info("#########################################")

        # Process each graphframe.
        supergraph.process_gf()

        # Filter by inclusive or exclusive time.
        supergraph.filter_gf(mode="single")

        # Group by module.
        supergraph.group_gf(group_by="module")

        # Store the graphframe.
        supergraph.write_gf("entire")

        supergraph.single_auxiliary(dataset=dataset, #_name,
                                        binCount=20, process=True)

    def _process_ensemble(self, datasets):
        """
        Ensemble processing of datasets.
        """
        # Before we process the ensemble, we perform single processing on all datasets.
        single_supergraphs = {}
        for idx, dataset_name in enumerate(datasets):
            # Create an instance of dataset.
            single_supergraphs[dataset_name] = SuperGraph(
                props=self.props, tag=dataset_name, mode="process"
            )
            LOGGER.info("#########################################")
            LOGGER.info(f"Run: {dataset_name}")
            LOGGER.info("#########################################")

            # Process each graphframe.
            single_supergraphs[dataset_name].process_gf()

            single_supergraphs[dataset_name].group_gf(group_by="module")

            # Write the entire graphframe into .callflow.
            single_supergraphs[dataset_name].write_gf("entire")

            # Single auxiliary processing.
            single_supergraphs[dataset_name].single_auxiliary(
                dataset=dataset_name, binCount=20, process=True,
            )

        # Create a supergraph class for ensemble case.
        ensemble_supergraph = EnsembleGraph(
            self.props, "ensemble", mode="process", supergraphs=single_supergraphs
        )

        # Write the graphframe to file.
        # ensemble_supergraph.write_gf("entire")

        # Filter the ensemble graphframe.
        ensemble_supergraph.filter_gf(mode="ensemble")

        # Write the filtered graphframe.
        # ensemble_supergraph.write_gf("filter")

        # Group by module.
        ensemble_supergraph.group_gf(group_by="module")

        # Write the grouped graphframe.
        ensemble_supergraph.write_gf("group")

        # Ensemble auxiliary processing.
        ensemble_supergraph.ensemble_auxiliary(
            # MPIBinCount=self.currentMPIBinCount,
            # RunBinCount=self.currentRunBinCount,
            datasets=self.props["dataset_names"],
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
        dataset_name = self.props["dataset_names"][0]
        supergraphs[dataset_name] = SuperGraph(
            props=self.props, tag=dataset_name, mode="render"
        )

        return supergraphs

    def _read_ensemble(self):
        """
        Read the ensemble .callflow files required for client.
        """
        supergraphs = {}

        for idx, dataset_name in enumerate(self.props["dataset_names"]):
            supergraphs[dataset_name] = SuperGraph(
                self.props, dataset_name, mode="render"
            )
            #supergraphs[dataset_name].read_gf(read_parameter=self.props["read_parameter"])

        supergraphs["ensemble"] = EnsembleGraph(
            props=self.props, tag="ensemble", mode="render"
        )
        #supergraphs["ensemble"].read_gf(read_parameter=self.props["read_parameter"])
        #supergraphs["ensemble"].read_auxiliary_data()
        return supergraphs

    # --------------------------------------------------------------------------
    # Reading and rendering methods.
    # All the functions below are Public methods that are accessed by the server.

    def add_basic_info_to_props(self):
        """
        Adds basic information (like max, min inclusive and exclusive runtime) to self.props.
        """
        self.props["maxIncTime"] = {}
        self.props["maxExcTime"] = {}
        self.props["minIncTime"] = {}
        self.props["minExcTime"] = {}
        self.props["numOfRanks"] = {}
        maxIncTime = 0
        maxExcTime = 0
        minIncTime = 0
        minExcTime = 0
        maxNumOfRanks = 0
        for idx, tag in enumerate(self.supergraphs):
            self.props["maxIncTime"][tag] = (
                self.supergraphs[tag].gf.df["time (inc)"].max()
            )
            self.props["maxExcTime"][tag] = self.supergraphs[tag].gf.df["time"].max()
            self.props["minIncTime"][tag] = (
                self.supergraphs[tag].gf.df["time (inc)"].min()
            )
            self.props["minExcTime"][tag] = self.supergraphs[tag].gf.df["time"].min()
            # self.props["numOfRanks"][dataset] = len(
            #     self.datasets[dataset].gf.df["rank"].unique()
            # )
            maxExcTime = max(self.props["maxExcTime"][tag], maxExcTime)
            maxIncTime = max(self.props["maxIncTime"][tag], maxIncTime)
            minExcTime = min(self.props["minExcTime"][tag], minExcTime)
            minIncTime = min(self.props["minIncTime"][tag], minIncTime)
            # maxNumOfRanks = max(self.props["numOfRanks"][dataset], maxNumOfRanks)

        self.props["maxIncTime"]["ensemble"] = maxIncTime
        self.props["maxExcTime"]["ensemble"] = maxExcTime
        self.props["minIncTime"]["ensemble"] = minIncTime
        self.props["minExcTime"]["ensemble"] = minExcTime
        # self.props["numOfRanks"]["ensemble"] = maxNumOfRanks

    def request_single(self, operation):
        """
        Handles all the socket requests connected to Single CallFlow.
        """
        _OPERATIONS = ["init", "reset", "auxiliary", "cct", "supergraph", "miniHistogram", "function"]
        assert "name" in operation
        assert operation["name"] in _OPERATIONS

        LOGGER.info(f"[Single Mode] {operation}")
        operation_name = operation["name"]

        if operation_name == "init":
            return self.props

        elif operation_name == "auxiliary":
            return self.supergraphs[operation["dataset"]].auxiliary_data

        elif operation_name == "supergraph":
            single_supergraph = SankeyLayout(supergraph=self.supergraphs[operation['dataset']], path="group_path")
            return single_supergraph.nxg

        elif operation_name == "mini-histogram":
            minihistogram = MiniHistogram(state)
            return minihistogram.result

        elif operation_name == "cct":
            result = NodeLinkLayout(
                supergraph=self.supergraphs[operation['dataset']],
                callsite_count=operation["functionsInCCT"],
            )
            return result.nxg

        elif operation_name == "function":
            functionlist = FunctionList(state, operation["module"], operation["nid"])
            return functionlist.result

    def request_ensemble(self, operation):
        """
        TODO: Write individual functiosn to do this.
        Handles all the socket requests connected to Single CallFlow.
        """
        operation_name = operation["name"]
        datasets = self.props["dataset_names"]

        if operation_name == "init":
            return self.props

        elif operation_name == "ensemble_cct":
            result = NodeLinkLayout(
                supergraph=self.supergraphs['ensemble'],
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

            if len(operation["datasets"]) != len(self.props["dataset_names"]):
                ensemble_supergraph.ensemble_auxiliary(
                    # MPIBinCount=self.currentMPIBinCount,
                    # RunBinCount=self.currentRunBinCount,
                    datasets=operation["datasets"],
                    MPIBinCount=20,
                    RunBinCount=20,
                    process=True,
                    write=True,
                )

            ensemble_super_graph = SankeyLayout(supergraph=self.supergraphs["ensemble"], path="group_path")

            return ensemble_super_graph.nxg

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

        elif operation_name == "hierarchy":
            modulehierarchy = ModuleHierarchy(self.supergraphs["ensemble"], operation["module"])
            return modulehierarchy.nxg

        elif operation_name == "projection":
            self.similarities = {}
            # dirname = self.config.callflow_dir
            # name = self.config.runName
            # similarity_filepath = dirname  + '/' + 'similarity.json'
            # with open(similarity_filepath, 'r') as similarity_file:
            #     self.similarities = json.load(similarity_file)
            result = ParameterProjection(
                self.supergraphs["ensemble"],
                self.similarities,
                operation["targetDataset"],
                n_cluster=operation["numOfClusters"],
            ).result
            return result.to_json(orient="columns")

        # Not used.
        elif operation_name == "run-information":
            assert False
            ret = []
            for idx, state in enumerate(self.states):
                self.states[state].projection_data["dataset"] = state
                ret.append(self.states[state].projection_data)
            return ret

        # TODO: need to handle re-processing case.
        # The commented code below was used to enable re-processing.
        elif operation_name == "auxiliary":
            # print(f"Reprocessing: {operation['re-process']}")
            # aux = EnsembleAuxiliary(
            #     self.states,
            #     MPIBinCount=operation["MPIBinCount"],
            #     RunBinCount=operation["RunBinCount"],
            #     datasets=operation["datasets"],
            #     config=self.config,
            #     process=True,
            #     write=False,
            # )
            # if operation["re-process"] == 1:
            #     result = aux.run()
            # else:

            # Need these two variables to belong to some class. Not sure where.
            # Will take care when pre-processing is done.
            # self.currentMPIBinCount = operation["MPIBinCount"]
            # self.currentRunBinCount = operation["RunBinCount"]

            return self.supergraphs["ensemble"].auxiliary_data

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
