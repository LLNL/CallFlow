# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import os
import datetime
import multiprocessing
from functools import partial

from callflow import SuperGraph, EnsembleGraph
from callflow import get_logger
from callflow.operations import Filter, Group, Unify
from callflow.modules import Auxiliary
from pyinstrument import Profiler

from callflow.layout import NodeLinkLayout, SankeyLayout, HierarchyLayout
from callflow.modules import ParameterProjection, DiffView
from callflow.utils.utils import get_memory_usage
from callflow.utils.sanitizer import Sanitizer

LOGGER = get_logger(__name__)

# TODO: this flag should come from commandline
indivdual_aux_for_ensemble = False


# ------------------------------------------------------------------------------
# BaseProvider Class
# ------------------------------------------------------------------------------
class BaseProvider:

    # TODO: CAL-38: add additional module map argument
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
    def _mp_saved_data(self, run_prop, save_path):
        """
        Outputs the directories that have the processed result. Others will be omitted during the loading. 
        """
        _FILENAMES = {
            "df": "df.pkl",
            "nxg": "nxg.json",
            "aux": "aux-{}.npz",
        }
        _name = run_prop["name"]
        _path = os.path.join(save_path, _name)
        process = False
        for f_type, f_run in _FILENAMES.items():
            if f_type == "aux":
                f_run = f_run.format(_name)

            f_path = os.path.join(_path, f_run)
            if not os.path.isfile(f_path):
                process = True

        if not process:
            return run_prop

    def load(self):
        """Load the processed datasets by the format."""
        load_path = self.config.get("save_path", "")
        read_param = self.config.get("read_parameter", "")
        save_path = self.config.get("save_path", "")
        chunk_idx = int(self.config.get("chunk_idx", 0))
        chunk_size = int(self.config.get("chunk_size", -1))

        is_not_ensemble = self.ndatasets == 1

        LOGGER.warning(f'-------------------- TOTAL {len(self.config["runs"])} SUPERGRAPHS in the directory/config --------------------')

        with multiprocessing.Pool(processes=multiprocessing.cpu_count()) as pool:
            processed_folders = pool.map(partial(self._mp_saved_data, save_path=save_path), self.config["runs"])
        self.config["runs"] = [d for d in processed_folders if d is not None] # Filter the none's 

        LOGGER.warning(f'-------------------- CHUNKING {len(self.config["runs"])} SUPERGRAPHS from start_date to end_date --------------------')

        if chunk_size != 0:
            self.config["runs"] = self.config["runs"][chunk_idx * chunk_size : (chunk_idx + 1) * chunk_size]

        with multiprocessing.Pool(processes=multiprocessing.cpu_count()) as pool:
            supergraphs = pool.map(partial(self.mp_dataset_load, save_path=load_path), self.config["runs"])
        self.supergraphs = { sg.name: sg for sg in supergraphs }

        # ensemble case
        if not is_not_ensemble:
            name = "ensemble"
            sg = EnsembleGraph(name)
            sg.load(os.path.join(load_path, name),
                    read_parameter=read_param,
                    read_aux=True)
            self.supergraphs[name] = sg

            # TODO: This is repopulation of data. Avoid!
            for run in self.config["runs"]:
                name = run["name"]
                LOGGER.warning(f"Duplicating aux data for run {name}!")
                self.supergraphs[name].modules = self.supergraphs["ensemble"].modules
                self.supergraphs[name].aux_data = self.supergraphs["ensemble"].aux_data[name]
                   
    def mp_dataset_load(self, dataset, save_path):
        """
        Parallel function to load single supergraph loading.
        """
        name = dataset["name"]
        read_param = self.config["read_parameter"]
        read_aux = True

        sg = SuperGraph(name)
        sg.load(os.path.join(save_path, name),
            read_parameter=read_param,
            read_aux=read_aux) 
        return sg

    def split_process_load_datasets(self):
        # TODO: This is a copy of _FILENAMES and also exists in supergraph.py. 
        # Not quite sure where this should reside to avoid duplication.
        _FILENAMES = {
            "df": "df.pkl",
            "nxg": "nxg.json",
            "aux": "aux-{}.npz",
        }

        save_path = self.config["save_path"]

        ret = []
        unret = []

        # Parallelize this. 
        for dataset in self.config["runs"]:
            process = False
            _name = dataset["name"]
            _path = os.path.join(save_path, _name)
            for f_type, f_run in _FILENAMES.items():
                if f_type == "aux":
                    f_run = f_run.format(dataset["name"])

                f_path = os.path.join(_path, f_run)
                if not os.path.isfile(f_path):
                    process = True

            if (process):
                ret.append(dataset)
            else:
                unret.append(dataset)

        # if len(ret) == 0:
        #     raise Warning("All datasets have been processed already. To re-process, use --reset.")
        return ret, unret

    @staticmethod
    def _filter_datasets_by_date_range(config, start_date, end_date):
        _start = Sanitizer.fmt_timestr_to_datetime(Sanitizer.fmt_time(start_date))
        _end = Sanitizer.fmt_timestr_to_datetime(Sanitizer.fmt_time(end_date))

        LOGGER.info(f"Filtering datasets by start_date [{_start}] and end_date [{_end}]")

        ret = []
        # Parallelize this.
        for dataset in config["runs"]:
            is_in_range = _start <= Sanitizer.fmt_timestr_to_datetime(Sanitizer.fmt_time(dataset["name"])) <= _end
            if is_in_range:
                ret.append(dataset) 
                
        return ret

    def process_single(self, process_datasets):
        # TODO: Need to avoid auxiliary processing for single datasets.
        indivdual_aux_for_ensemble = True

        is_not_ensemble = len(self.config["runs"]) == 1
        no_aux_process = self.config.get("no_aux_process", False)
        append_path = self.config.get("append_path", "")
        load_path = self.config["data_path"]
        module_callsite_map = self.config.get("module_callsite_map", {})
        group_by = self.config["group_by"]
        filter_by = self.config.get("filter_by","")
        filter_perc = self.config.get("filter_perc", 0)
        save_path = self.config.get("save_path", "")
        no_aux_process = self.config.get("no_aux_process", False)
        
        run_props = {
            _["name"]: (os.path.join(_["path"], append_path) if len(append_path) > 0 else _["path"], _["profile_format"]) for _ in self.config["runs"]
        }

        LOGGER.warning(f'-------------------- {len(process_datasets)} DATASETS NEED TO BE PROCESSED--------------------')

        for dataset in process_datasets:
            name = dataset["name"]
            _prop = run_props[name]
            LOGGER.profile(f'Starting supergraph ({name})')

            data_path = os.path.join(load_path, _prop[0])
            if _prop[1] == "hpctoolkit" and not os.path.isfile(os.path.join(data_path, "experiment.xml")):
                LOGGER.debug(f"Skipping {data_path} as it is missing the experiment.xml file")
                continue

            sg = SuperGraph(name)
            sg.create(
                    path=data_path,
                    profile_format=_prop[1],
                    module_callsite_map=module_callsite_map,
                    filter_by=filter_by,
                    filter_perc=filter_perc
                )

            LOGGER.profile(f'Created supergraph {name}')
            Group(sg, group_by=group_by)
            LOGGER.profile(f'Grouped supergraph {name}')

            Filter(sg, filter_by=filter_by, filter_perc=filter_perc)
            LOGGER.profile(f'Filtered supergraph {name}')

            if (is_not_ensemble or indivdual_aux_for_ensemble) and no_aux_process:
                Auxiliary(sg)

            LOGGER.profile(f'Created Aux for {name}')
            sg.write(os.path.join(save_path, name), write_aux=(is_not_ensemble or indivdual_aux_for_ensemble))

            self.supergraphs[name] = sg
            LOGGER.profile(f'Stored in dictionary {name}')

    def load_single(self, load_datasets):
        append_path = self.config.get("append_path", "")
        save_path = self.config.get("save_path", "")

        if len(load_datasets) > 0:            
            with multiprocessing.Pool(processes=multiprocessing.cpu_count()) as pool:
                processed_folders = pool.map(partial(self._mp_saved_data, save_path=save_path), self.config["runs"])
            self.config["runs"] = [d for d in processed_folders if d is not None] # Filter the none's 
        
            with multiprocessing.Pool(processes=multiprocessing.cpu_count()) as pool:
                load_supergraphs = pool.map(partial(self.mp_dataset_load, save_path=save_path), load_datasets)
            
            for sg in load_supergraphs:
                self.supergraphs[sg.name] = sg

    def process_ensemble(self, save_path):
        # ----------------------------------------------------------------------
        # Stage-2: EnsembleGraph processing
        no_aux_process = self.config.get("no_aux_process", False)

        if len(self.supergraphs) > 1:
            name = "ensemble"
            LOGGER.profile(f'Starting supergraph {name}')
            sg = EnsembleGraph(name)

            Unify(sg, self.supergraphs)
            LOGGER.profile(f'Created supergraph {name}')

            # Group(sg, group_by=group_by)
            # LOGGER.profile(f'Grouped supergraph {name}')

            # Filter(sg, filter_by=filter_by, filter_perc=filter_perc)
            # LOGGER.profile(f'Filtered supergraph {name}')

            if not no_aux_process:
                Auxiliary(sg)
                LOGGER.profile(f'Created Aux for {name}')

            sg.write(os.path.join(save_path, name))
            self.supergraphs[name] = sg
            LOGGER.profile(f'Stored in dictionary {name}')

    # --------------------------------------------------------------------------
    def process(self, reset=False):
        """Process the datasets using a Pipeline of operations.
        1. Each dataset is processed individually into a SuperGraph. Each
        SuperGraph is then processed according the provided config
        variables, e.g., filter_perc, filter_by.
        2. EnsembleGraph is then constructed from the processed SuperGraphs.
        """
        profile = Profiler()
        start_date = self.config.get("start_date", "")
        end_date = self.config.get("end_date", "")
        save_path = self.config.get("save_path", "")
        chunk_idx = int(self.config.get("chunk_idx", 0))
        chunk_size = int(self.config.get("chunk_size", -1))
        ensemble_process = self.config.get("ensemble_process", False);

        # ----------------------------------------------------------------------
        # Stage-1: Each dataset is processed individually into a SuperGraph.
        LOGGER.warning(f'-------------------- TOTAL {len(self.config["runs"])} SUPERGRAPHS in the directory/config --------------------')
        
        LOGGER.warning(f'-------------------- FILTERING {len(self.config["runs"])} SUPERGRAPHS from start_date to end_date --------------------')
        if start_date and end_date:
            self.config["runs"] = BaseProvider._filter_datasets_by_date_range(self.config, start_date, end_date)
                    
        LOGGER.warning(f'-------------------- CHUNKING {chunk_size} SUPERGRAPHS from {chunk_idx} --------------------')
        if chunk_size != 0:
            self.config["runs"] = self.config["runs"][chunk_idx * chunk_size : (chunk_idx + 1) * chunk_size]
        
        # Do not process, if already processed. 
        if(reset):
            process_datasets, load_datasets = self.config["runs"], []
        else:
            process_datasets, load_datasets = self.split_process_load_datasets()

        if ensemble_process:
            process_datasets, load_datasets = [], self.config["runs"]

        LOGGER.warning(f'-------------------- PROCESSING {len(process_datasets)} SUPERGRAPHS --------------------\n\n')
        self.process_single(process_datasets)

        LOGGER.warning(f'-------------------- LOADING {len(load_datasets)} SUPERGRAPHS --------------------\n\n')
        self.load_single(load_datasets)

        LOGGER.warning('-------------------- PROCESSING ENSEMBLE SUPERGRAPH --------------------\n\n')
        self.process_ensemble(save_path)
        
    def request_general(self, operation):
        """
        Handles general requests
        """
        _OPERATIONS = ["init", "aux_data"]

        assert "name" in operation
        assert operation["name"] in _OPERATIONS

        operation_name = operation["name"]

        if operation_name == "init":
            return self.config

        elif operation_name == "aux_data":
            if operation["reProcess"]:
                Auxiliary(self.supergraphs["ensemble"], selected_runs=operation["datasets"], rankBinCount=int(operation["rankBinCount"]), runBinCount=int(operation["runBinCount"]))

            if len(operation["datasets"]) > 1:
                operation["datasets"].append("ensemble")
                ret = {dataset: self.supergraphs["ensemble"].aux_data[dataset] for dataset in operation["datasets"]}
            else:
                dataset = operation["datasets"][0]
                ret = {dataset: self.supergraphs[dataset].aux_data}

            return ret

    def request_single(self, operation):
        """
        Handles requests connected to Single CallFlow.
        """
        assert isinstance(operation, dict)
        _OPERATIONS = ["cct", "supergraph", "split_mpi_distribution"]
        assert "name" in operation
        assert operation["name"] in _OPERATIONS

        LOGGER.info(f"[Single Mode] {operation}")

        operation_name = operation["name"]
        sg = self.supergraphs[operation["dataset"]]

        if operation_name == "cct":
            nll = NodeLinkLayout(sg=sg, selected_runs=operation["dataset"])
            return nll.nxg

        elif operation_name == "supergraph":
            reveal_callsites = operation.get("reveal_callsites", [])
            split_entry_module = operation.get("split_entry_module", [])
            split_callee_module = operation.get("split_callee_module", [])
            selected_runs = operation.get("selected_runs", None)

            ssg = SankeyLayout(
                sg=sg,
                path="group_path",
                selected_runs=selected_runs,
                reveal_callsites=reveal_callsites,
                split_entry_module=split_entry_module,
                split_callee_module=split_callee_module,
            )
            return ssg.nxg

        elif operation_name == "split_mpi_distribution":
            assert False
            pass

    def request_ensemble(self, operation):
        """
        Handles all the socket requests connected to Single CallFlow.
        """
        _OPERATIONS = ["cct", "supergraph", "module_hierarchy", "projection", "compare"]

        assert "name" in operation
        assert operation["name"] in _OPERATIONS

        LOGGER.info(f"[Ensemble Mode] {operation}")

        operation_name = operation["name"]
        sg = self.supergraphs["ensemble"]

        if operation_name == "init":
            return self.config

        elif operation_name == "cct":
            nll = NodeLinkLayout(
                supergraph=sg, callsite_count=operation["functionsInCCT"]
            )
            return nll.nxg

        elif operation_name == "supergraph":
            reveal_callsites = operation.get("reveal_callsites", [])
            split_entry_module = operation.get("split_entry_module", [])
            split_callee_module = operation.get("split_callee_module", [])
            selected_runs = operation.get("selected_runs", None)

            ssg = SankeyLayout(
                sg=sg,
                path="group_path",
                selected_runs=selected_runs,
                reveal_callsites=reveal_callsites,
                split_entry_module=split_entry_module,
                split_callee_module=split_callee_module,
            )
            return ssg.nxg

        elif operation_name == "module_hierarchy":
            hl = HierarchyLayout(sg, operation["module"])
            return hl.nxg

        elif operation_name == "projection":
            selected_runs = operation.get("selected_runs", [])
            n_cluster = operation.get("n_cluster", 3)

            pp = ParameterProjection(
                sg=sg,
                selected_runs=selected_runs,
                n_cluster=n_cluster,
            )
            return pp.result.to_json(orient="columns")

        elif operation_name == "compare":
            compare_dataset = operation["compareDataset"]
            target_dataset = operation["targetDataset"]

            assert operation["selectedMetric"] in ["Inclusive", "Exclusive"]
            # TODO: CAL-37: Use proxies.
            if operation["selectedMetric"] == "Inclusive":
                selected_metric = "time (inc)"
            elif operation["selectedMetric"] == "Exclusive":
                selected_metric = "time"

            dv = DiffView(sg, compare_dataset, target_dataset, selected_metric)
            return dv.result
