# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import json

#TODO: should be
#from .datastructures import SuperGraph, EnsembleGraph
from . import SuperGraph, EnsembleGraph
from .algorithms import DeltaConSimilarity, BlandAltman
from .layout import NodeLinkLayout, SankeyLayout, HierarchyLayout
from .modules import ParameterProjection, DiffView, MiniHistogram, FunctionList
from .logger import get_logger
LOGGER = get_logger(__name__)


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class CallFlow:

    def __init__(self, config: dict = None, data_dir: str = None):
        """
        Entry interface to access CallFlow's functionalities.
        """
        assert config is not None or data_dir is not None

        if config:
            assert isinstance(config, dict)
            self.config = config

        elif data_dir:
            assert isinstance(config, str)
            assert False
            # TODO: this function does not exist!
            self.config = self.read_config()

        self.ndatasets = len(self.config["runs"])
        assert self.ndatasets > 0

        self.config["parameter_props"] = CallFlow._parameter_props(self.config)
        self.supergraphs = {}

    # --------------------------------------------------------------------------
    # load functionality
    def load(self):
        """
        Load the processed datasets by the format.
        """
        # create supergraphs for all runs
        for dataset_name in self.config["parameter_props"]["runs"]:
            self.supergraphs[dataset_name] = SuperGraph(config=self.config,
                                                        tag=dataset_name,
                                                        mode="render")

        # ensemble case
        if self.ndatasets > 1:
            self.supergraphs["ensemble"] = EnsembleGraph(config=self.config,
                                                         tag="ensemble",
                                                         mode="render")

        # Adds basic information to config.
        # Config is later return to client app on "init" request.
        self.config["runtime_props"] = CallFlow._runtime_props(self.supergraphs)

    # --------------------------------------------------------------------------
    def process(self):
        """
        Process the datasets based on the format (i.e., either single or ensemble)
        """
        # process all datasets
        for dataset in self.config["runs"]:

            dataset_name = dataset["name"]
            LOGGER.info("#########################################")
            LOGGER.info(f"Dataset name: {dataset_name}")
            LOGGER.info("#########################################")

            sg = SuperGraph(config=self.config, tag=dataset_name, mode="process")

            sg.process_gf()
            if self.ndatasets == 1:
                sg.filter_gf(mode="single")
                sg.group_gf(group_by = "module") # TODO: ask why is this here?
            else:
                sg.group_gf(group_by=self.config["group_by"])

            sg.write_gf("entire")
            sg.single_auxiliary(dataset=dataset_name, binCount=20, process=True)

            self.supergraphs[dataset_name] = sg

        # now, process ensemble
        sg = EnsembleGraph(self.config, "ensemble", mode="process",
                           supergraphs=self.supergraphs)

        sg.gf.df_add_time_proxies()
        sg.filter_gf(mode="ensemble")
        sg.group_gf(group_by=self.config["group_by"])

        sg.write_gf("group")
        sg.ensemble_auxiliary(
                # MPIBinCount=self.currentMPIBinCount,
                # RunBinCount=self.currentRunBinCount,
                datasets=self.config["parameter_props"]["runs"],
                MPIBinCount=20, RunBinCount=20,
                process=True, write=True)
        self.supergraphs["ensemble"] = sg

    # --------------------------------------------------------------------------
    # Processing methods.
    '''
    def _create_dot_callflow_folder(self):
        """
        Create a .callflow directory and empty files.
        """
        LOGGER.info(f".callflow directory is: {self.config['save_path']}")

        if not os.path.exists(self.config["save_path"]):
            os.makedirs(self.config["save_path"])
            os.makedirs(os.path.join(self.config["save_path"], "ensemble"))

        dataset_folders = [
            os.path.join(self.config["save_path"], k["name"])
            for k in self.config["runs"]
        ]

        dataset_folders.append("ensemble")

        for dataset in dataset_folders:
            dataset_dir = os.path.join(self.config["save_path"], dataset)
            if not os.path.exists(dataset_dir):
                # if self.debug:
                LOGGER.info(f"Creating .callflow directory for dataset : {dataset}")
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
        self.config["parameter_props"] = self._parameter_props(self.config)

        if self.ensemble:
            self._process_ensemble(self.config["runs"])
        else:
            self._process_single(self.config["runs"][0])

    def load(self):
        """
        Load the processed datasets by the format.
        """
        ndatasets = len(self.config["runs"])
        self.config["parameter_props"] = self._parameter_props(self.config)

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
        self.config["runtime_props"] = self._runtime_props(self.supergraphs)
    
    def _process_single(self, dataset):
        """
        Single dataset processing.
        """
        dataset_tag = dataset["name"]

        LOGGER.info("#########################################")
        LOGGER.info(f"Single Mode: {dataset_tag}")
        LOGGER.info("#########################################")
        supergraph = SuperGraph(config=self.config, tag=dataset_tag, mode="process")

        # Process each graphframe.
        supergraph.process_gf()

        # Filter by inclusive or exclusive time.
        supergraph.filter_gf(mode="single")

        # Group by module.
        supergraph.group_gf(group_by=self.config["group_by"])

        # Store the graphframe.
        supergraph.write_gf("entire")

        supergraph.ensemble_auxiliary(
            datasets=[dataset_tag],
            MPIBinCount=20,
            RunBinCount=20,
            process=True,
            write=True,
        )

    def _process_ensemble(self, datasets):
        """
        Ensemble processing of datasets.
        """
        # Before we process the ensemble, we perform single processing on all datasets.
        single_supergraphs = {}
        for dataset in datasets:
            dataset_tag = dataset["name"]
            # Create an instance of dataset.
            LOGGER.info("#########################################")
            LOGGER.info(f"Dataset name: {dataset_tag}")
            LOGGER.info("#########################################")
            single_supergraphs[dataset_tag] = SuperGraph(
                config=self.config, tag=dataset_tag, mode="process"
            )

            # Process each graphframe.
            single_supergraphs[dataset_tag].process_gf()

            single_supergraphs[dataset_tag].group_gf(group_by="module")

            # Write the entire graphframe into .callflow.
            single_supergraphs[dataset_tag].write_gf("entire")

            # Single auxiliary processing.
            single_supergraphs[dataset_tag].ensemble_auxiliary(
                datasets=[dataset_tag],
                MPIBinCount=20,
                RunBinCount=20,
                process=True,
                write=True,
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
            datasets=self.config["parameter_props"]["runs"],
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
        dataset_name = self.config["parameter_props"]["runs"][0]
        supergraphs[dataset_name] = SuperGraph(
            config=self.config, tag=dataset_name, mode="render"
        )

        return supergraphs

    def _read_ensemble(self):
        """
        Read the ensemble .callflow files required for client.
        """
        supergraphs = {}

        for dataset_name in self.config["parameter_props"]["runs"]:
            supergraphs[dataset_name] = SuperGraph(
                config=self.config, tag=dataset_name, mode="render"
            )

        supergraphs["ensemble"] = EnsembleGraph(
            config=self.config, tag="ensemble", mode="render"
        )
        return supergraphs
    '''

    # --------------------------------------------------------------------------
    # Reading and rendering methods.
    @staticmethod
    def _parameter_props(config):
        """
        Adds parameter information (like path, tag name, and other information fetched).
        """
        props = {"runs": [], "data_path": {}, "profile_format": {}}
        for run in config["runs"]:
            tag = run["name"]
            props["runs"].append(tag)
            if run["profile_format"] == "hpctoolkit":
                props["data_path"][tag] = os.path.join(run["path"], tag)
            else:
                props["data_path"][tag] = run["path"]
            props["profile_format"][tag] = run["profile_format"]
        return props

    @staticmethod
    def _runtime_props(supergraphs):
        """
        Adds runtime information (like max, min inclusive and exclusive runtime).
        """
        props = {"maxIncTime": {}, "maxExcTime": {},
                 "minIncTime": {}, "minExcTime": {}, "numOfRanks": {}}

        maxIncTime = 0.
        maxExcTime = 0.
        minIncTime = 1e6
        minExcTime = 1e6
        maxNumOfRanks = 0.

        for idx, tag in enumerate(supergraphs):
            props["numOfRanks"][tag] = supergraphs[tag].gf.df_count("rank")

            _mn, _mx = supergraphs[tag].gf.df_minmax("time (inc)")
            props["minIncTime"][tag] = _mn
            props["maxIncTime"][tag] = _mx

            _mn, _mx = supergraphs[tag].gf.df_minmax("time")
            props["minExcTime"][tag] = _mn
            props["maxExcTime"][tag] = _mx

            maxExcTime = max(props["maxExcTime"][tag], maxExcTime)
            maxIncTime = max(props["maxIncTime"][tag], maxIncTime)
            minExcTime = min(props["minExcTime"][tag], minExcTime)
            minIncTime = min(props["minIncTime"][tag], minIncTime)
            maxNumOfRanks = max(props["numOfRanks"][tag], maxNumOfRanks)

        props["maxIncTime"]["ensemble"] = maxIncTime
        props["maxExcTime"]["ensemble"] = maxExcTime
        props["minIncTime"]["ensemble"] = minIncTime
        props["minExcTime"]["ensemble"] = minExcTime
        props["numOfRanks"]["ensemble"] = maxNumOfRanks

        return props

    # --------------------------------------------------------------------------
    def request_general(self, operation):
        """
        Handles general requests
        """
        _OPERATIONS = ["init", "supergraph_data"]

        assert "name" in operation
        assert operation["name"] in _OPERATIONS

        operation_name = operation["name"]

        if operation_name == "init":
            return self.config

        elif operation_name == "supergraph_data":
            if len(operation["datasets"]) > 1:
                sgname = "ensemble"
            else:
                sgname = operation["datasets"][0]
            return self.supergraphs[sgname].auxiliary_data

    def request_single(self, operation):
        """
        Handles requests connected to Single CallFlow.
        """
        assert isinstance(operation, dict)
        _OPERATIONS = ["cct", "supergraph", "function", "split_mpi_distribution"]
        assert "name" in operation
        assert operation["name"] in _OPERATIONS

        LOGGER.info(f"[Single Mode] {operation}")

        # ----------------------------------------------------------------------
        operation_name = operation["name"]
        sg = self.supergraphs[operation["dataset"]]

        # ----------------------------------------------------------------------
        if operation_name == "cct":
            nll = NodeLinkLayout(supergraph=sg,
                                 callsite_count=operation["functionsInCCT"])
            return nll.nxg

        # ----------------------------------------------------------------------
        elif operation_name == "supergraph":
            reveal_callsites = operation.get("reveal_callsites", [])
            split_entry_module = operation.get("split_entry_module", [])
            split_callee_module = operation.get("split_callee_module", [])

            '''
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
            '''
            ssg = SankeyLayout(supergraph=sg, path="group_path",
                               reveal_callsites=reveal_callsites,
                               split_entry_module=split_entry_module,
                               split_callee_module=split_callee_module)
            return ssg.nxg

        # ----------------------------------------------------------------------
        elif operation_name == "function":
            fll = FunctionList(sg, operation["module"])
            return fll.result

        # ----------------------------------------------------------------------
        elif operation_name == "split_mpi_distribution":
            assert False
            pass
        # ----------------------------------------------------------------------

    def request_ensemble(self, operation):
        """
        Handles all the socket requests connected to Single CallFlow.
        """
        _OPERATIONS = ["cct", "supergraph", "module_hierarchy", "projection", "compare"]

        assert "name" in operation
        assert operation["name"] in _OPERATIONS

        LOGGER.info(f"[Ensemble Mode] {operation}")

        # ----------------------------------------------------------------------
        datasets = self.config["parameter_props"]["runs"]
        operation_name = operation["name"]
        sg = self.supergraphs["ensemble"]

        # ----------------------------------------------------------------------
        if operation_name == "init":
            return self.config

        # ----------------------------------------------------------------------
        elif operation_name == "cct":
            nll = NodeLinkLayout(supergraph=sg,
                                 callsite_count=operation["functionsInCCT"])
            return nll.nxg

        # ----------------------------------------------------------------------
        elif operation_name == "supergraph":
            reveal_callsites = operation.get("reveal_callsites", [])
            split_entry_module = operation.get("split_entry_module", [])
            split_callee_module = operation.get("split_callee_module", [])

            '''
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
            '''
            ssg = SankeyLayout(supergraph=sg, path="group_path",
                               reveal_callsites=reveal_callsites,
                               split_entry_module=split_entry_module,
                               split_callee_module=split_callee_module)
            return ssg.nxg

        # ----------------------------------------------------------------------
        elif operation_name == "module_hierarchy":
            hl = HierarchyLayout(sg, operation["module"])
            return hl.nxg

        # ----------------------------------------------------------------------
        elif operation_name == "projection":
            pp = ParameterProjection(supergraph=sg,
                                     targetDataset=operation["targetDataset"],
                                     n_cluster=operation["numOfClusters"])
            return pp.result.to_json(orient="columns")

        # ----------------------------------------------------------------------
        elif operation_name == "compare":
            compareDataset = operation["compareDataset"]
            targetDataset = operation["targetDataset"]

            assert operation["selectedMetric"] in ["Inclusive", "Exclusive"]
            if operation["selectedMetric"] == "Inclusive":
                selectedMetric = "time (inc)"
            elif operation["selectedMetric"] == "Exclusive":
                selectedMetric = "time"

            dv = DiffView(sg, compareDataset, targetDataset, selectedMetric)
            return dv.result

        # ----------------------------------------------------------------------
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

        # ----------------------------------------------------------------------
