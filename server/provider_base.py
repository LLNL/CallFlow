# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import os
import json

from callflow import SuperGraph, EnsembleGraph
from callflow import get_logger
from callflow.operations import Filter, Group, Unify
from callflow.modules import Auxiliary

from callflow.layout import NodeLinkLayout, SankeyLayout, HierarchyLayout
from callflow.modules import ParameterProjection, DiffView


LOGGER = get_logger(__name__)


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class BaseProvider:

    # TODO: add additional module map argument
    def __init__(self, config: dict = None):
        """
        Entry interface to access CallFlow's functionalities.
        """
        assert config is not None 
        assert isinstance(config, dict)
        self.config = config
        self.ndatasets = len(self.config["runs"])
        assert self.ndatasets > 0
        self.supergraphs = {}

    # --------------------------------------------------------------------------
    # load functionality
    def load(self):
        """
        Load the processed datasets by the format.
        """
        load_path = self.config["save_path"]
        read_param = self.config["read_parameter"]

        # create supergraphs for all runs
        for run in self.config["runs"]:

            name = run['name']
            sg = SuperGraph(name)
            sg.load(os.path.join(load_path, name), read_parameter=read_param, read_aux=True)
            self.supergraphs[name] = sg

        # ensemble case
        if self.ndatasets >= 1:
            name = "ensemble"
            sg = EnsembleGraph(name)
            sg.load(os.path.join(load_path, name), read_parameter=read_param, read_aux=True)
            self.supergraphs[name] = sg

    # --------------------------------------------------------------------------
    def process(self):
        """
        Process the datasets using a Pipeline of operations.
            1. Each dataset is processed individually into a SuperGraph. Each 
            SuperGraph is then processed according the provided config
            variables, e.g., filter_perc, filter_by.
            2. EnsembleGraph is then constructed from the processed SuperGraphs.
        """

        save_path = self.config["save_path"]
        load_path = self.config["data_path"]
        group_by = self.config["group_by"]
        filter_by = self.config["filter_by"]
        filter_perc = self.config["filter_perc"]
        module_map = self.config.get("module_map", {})

        run_props = {_['name']: (_['path'], _['profile_format'])
                     for _ in self.config['runs']}

        # ----------------------------------------------------------------------
        # Stage-1: Each dataset is processed individually into a SuperGraph.
        print(f'\n\n-------------------- PROCESSING {len(self.config["runs"])} SUPERGRAPHS --------------------\n\n')

        for dataset in self.config["runs"]:

            name = dataset["name"]
            _prop = run_props[name]

            sg = SuperGraph(name)
            sg.create(path=os.path.join(load_path, _prop[0]), profile_format=_prop[1], module_callsite_map=module_map)
            sg.process()

            _f = Filter(sg, filter_by=filter_by, filter_perc=filter_perc)
            _g = Group(sg, group_by=group_by)

            # TODO: Avoid computing auxiliary in future for single datasets here.
            # if len(self.supergraphs) == 1:
            _a = Auxiliary(sg)

            self.supergraphs[name] = sg
            sg.write(os.path.join(save_path, name))

        # ----------------------------------------------------------------------
        # Stage-2: EnsembleGraph processing
        if len(self.supergraphs) >= 1:

            print(f'\n\n-------------------- PROCESSING ENSEMBLE SUPERGRAPH --------------------\n\n')
            name = "ensemble"
            sg = EnsembleGraph(name)

            _u = Unify(sg, self.supergraphs)
            _f = Filter(sg, filter_by=filter_by, filter_perc=filter_perc)
            _g = Group(sg, group_by=group_by)
            _a = Auxiliary(sg)

            sg.write(os.path.join(save_path, name))
            self.supergraphs[name] = sg

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
            return self.supergraphs["ensemble"].auxiliary_data

    def request_single(self, operation):
        """
        Handles requests connected to Single CallFlow.
        """
        assert isinstance(operation, dict)
        _OPERATIONS = ["cct", "supergraph", "split_mpi_distribution"]
        assert "name" in operation
        assert operation["name"] in _OPERATIONS

        LOGGER.info(f"[Single Mode] {operation}")

        # ----------------------------------------------------------------------
        operation_name = operation["name"]
        print(operation)
        sg = self.supergraphs[operation["datasets"]]

        # ----------------------------------------------------------------------
        if operation_name == "cct":
            nll = NodeLinkLayout(sg=sg, selected_runs=operation["datasets"])
            return nll.nxg

        # ----------------------------------------------------------------------
        elif operation_name == "supergraph":
            reveal_callsites = operation.get("reveal_callsites", [])
            split_entry_module = operation.get("split_entry_module", [])
            split_callee_module = operation.get("split_callee_module", [])
            selected_runs = operation.get("selected_runs", None)

            ssg = SankeyLayout(sg=sg, path="group_path",
                               selected_runs=selected_runs,
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
            selected_runs = operation.get("datasets", None)
            
            ssg = SankeyLayout(sg=sg, path="group_path",
                               selected_runs=selected_runs,
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
            pp = ParameterProjection(sg=sg,
                                     selected_runs=operation["selectedRuns"],
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
