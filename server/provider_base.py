# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import json
from callflow import SuperGraph, EnsembleGraph, get_logger

LOGGER = get_logger(__name__)

from callflow.operations import Filter, Group, Unify
#from .algorithms import DeltaConSimilarity, BlandAltman
#from .layout import NodeLinkLayout, SankeyLayout, HierarchyLayout
#from .modules import ParameterProjection, DiffView, MiniHistogram, FunctionList


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class BaseProvider:

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

        self.config["parameter_props"] = BaseProvider._parameter_props(self.config)
        self.supergraphs = {}

    # --------------------------------------------------------------------------
    # load functionality
    def load(self):
        """
        Load the processed datasets by the format.
        """
        # create supergraphs for all runs
        for dataset_name in self.config["parameter_props"]["runs"]:
            sg = SuperGraph(dataset_name, self.config)
            sg.load()
            self.supergraphs[dataset_name] = sg

        # ensemble case
        if self.ndatasets > 1:
            dataset_name = "ensemble"
            sg = EnsembleGraph(dataset_name, self.config)
            sg.load()
            self.supergraphs[dataset_name] = sg

        # Adds basic information to config.
        # Config is later return to client app on "init" request.
        self.config["runtime_props"] = BaseProvider._runtime_props(self.supergraphs)

    # --------------------------------------------------------------------------
    def process(self):
        """
        Process the datasets using a Pipeline of operations.
            1. Each dataset is processed individually into a SuperGraph. Each 
            SuperGraph is then processed according the provided config
            variables, e.g., filter_perc, filter_by.
            2. EnsembleGraph is then constructed from the processed SuperGraphs.
        """
        # Stage-1: Each dataset is processed individually into a SuperGraph.
        for dataset in self.config["runs"]:
            dataset_name = dataset["name"]
            sg = SuperGraph(dataset_name, self.config)
            sg.create()
            sg.process_sg()

            _f = Filter(sg, filter_by=self.config["filter_by"],
                        filter_perc=self.config["filter_perc"])
            _g = Group(sg, group_by=self.config["group_by"])

            sg.auxiliary_gf_sg()
            sg.write(write_aux=False)
            
            self.supergraphs[dataset_name] = sg

        # ----------------------------------------------------------------------
        # Stage-3: EnsembleGraph processing
        if len(self.supergraphs) > 1:

            sg = EnsembleGraph("ensemble", self.config)

            _u = Unify(sg, self.supergraphs)
            _f = Filter(sg, filter_by=self.config["filter_by"],
                        filter_perc=self.config["filter_perc"])
            _g = Group(sg, group_by=self.config["group_by"])

            sg.auxiliary_gf_sg()
            sg.write()

            # Attach to self
            self.supergraphs["ensemble"] = sg

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
            props["numOfRanks"][tag] = supergraphs[tag].df_count("rank")

            _mn, _mx = supergraphs[tag].df_minmax("time (inc)")
            props["minIncTime"][tag] = _mn
            props["maxIncTime"][tag] = _mx

            _mn, _mx = supergraphs[tag].df_minmax("time")
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

            ssg = SankeyLayout(supergraph=sg, path="group_path",
                               reveal_callsites=reveal_callsites,
                               split_entry_module=split_entry_module,
                               split_callee_module=split_callee_module)
            return ssg.nxg

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
