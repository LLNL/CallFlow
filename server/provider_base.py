# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import os
import multiprocessing
from functools import partial

from callflow import SuperGraph, EnsembleGraph
from callflow import get_logger
from callflow.operations import Filter, Group, Unify

from callflow.layout import NodeLinkLayout, SankeyLayout, HierarchyLayout

from callflow.utils.sanitizer import Sanitizer
from callflow.modules import (
    Histogram,
    Scatterplot,
    BoxPlot,
    ParameterProjection,
    DiffView,
)

LOGGER = get_logger(__name__)


# ------------------------------------------------------------------------------
# BaseProvider Class
# ------------------------------------------------------------------------------
class BaseProvider:
    def __init__(self, config: dict = None):
        """
        Entry interface to access CallFlow's functionalities.
        """
        assert config is not None
        assert isinstance(config, dict)
        self.config = config
        start_date = self.config.get("start_date", "")
        end_date = self.config.get("end_date", "")
        chunk_idx = int(self.config.get("chunk_idx", 0))
        chunk_size = int(self.config.get("chunk_size", -1))

        # ----------------------------------------------------------------------
        # Stage-1: Each dataset is processed individually into a SuperGraph.
        LOGGER.warning(
            f'-------------------- TOTAL {len(self.config["runs"])} datasets detected from  in the CallFlow.config --------------------'
        )
        self.datasets = self.config["runs"]

        if start_date and end_date:
            LOGGER.warning(
                f'-------------------- FILTERING {len(self.config["runs"])} SUPERGRAPHS from start_date={start_date} to end_date={end_date} --------------------'
            )
            self.datasets = BaseProvider._filter_datasets_by_date_range(
                self.config, start_date, end_date
            )

        if chunk_size != 0:
            LOGGER.warning(
                f"-------------------- CHUNKING size={chunk_size} SUPERGRAPHS from index={chunk_idx} --------------------"
            )
            self.datasets = self.config["runs"][
                chunk_idx * chunk_size : (chunk_idx + 1) * chunk_size
            ]

        self.ndatasets = len(self.datasets)
        assert self.ndatasets > 0
        self.supergraphs = {}

    # --------------------------------------------------------------------------
    def _mp_saved_data(self, run_prop, save_path):
        """
        Outputs the directories that have the processed result. Others will be omitted during the loading.
        """
        _FILENAMES = {
            "df": "cf-df.pkl",
            "nxg": "cf-nxg.json",
        }
        _name = run_prop["name"]
        _path = os.path.join(save_path, _name)
        process = False
        for f_type, f_run in _FILENAMES.items():
            f_path = os.path.join(_path, f_run)
            if not os.path.isfile(f_path):
                process = True

        if not process:
            return run_prop

    def load(self):
        """Load the processed datasets by the format."""
        load_path = self.config.get("save_path", "")
        read_param = self.config.get("read_parameter", "")

        is_not_ensemble = self.ndatasets == 1

        with multiprocessing.Pool(processes=multiprocessing.cpu_count()) as pool:
            supergraphs = pool.map(
                partial(self.mp_dataset_load, save_path=load_path), self.datasets
            )
        self.supergraphs = {sg.name: sg for sg in supergraphs}

        # ensemble case
        if not is_not_ensemble:
            name = "ensemble"
            eg = EnsembleGraph(name)
            eg.load(
                os.path.join(load_path, name),
                module_callsite_map=self.config.get("module_callsite_map", {}),
                read_parameter=read_param,
            )
            eg.supergraphs = self.supergraphs

            self.supergraphs[name] = eg

        # self.aux = { dataset: Auxiliary(self.supergraphs[dataset]) for dataset in all_runs }

    def mp_dataset_load(self, dataset, save_path):
        """
        Parallel function to load single supergraph loading.
        """
        name = dataset["name"]
        read_param = self.config["read_parameter"]

        sg = SuperGraph(name)
        sg.load(
            os.path.join(save_path, name),
            module_callsite_map=self.config.get("module_callsite_map", {}),
            read_parameter=read_param,
        )
        if 'module' in sg.dataframe:
            print ('after load:', sg.dataframe['module'])
        return sg

    def split_process_load_datasets(self):
        # TODO: This is a copy of _FILENAMES and also exists in supergraph.py.
        # Not quite sure where this should reside to avoid duplication.
        _FILENAMES = {
            "df": "df.pkl",
            "nxg": "nxg.json",
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
                f_path = os.path.join(_path, f_run)
                if not os.path.isfile(f_path):
                    process = True

            if process:
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

        LOGGER.info(
            f"Filtering datasets by start_date [{_start}] and end_date [{_end}]"
        )

        ret = []
        # Parallelize this.
        for dataset in config["runs"]:
            is_in_range = (
                _start
                <= Sanitizer.fmt_timestr_to_datetime(
                    Sanitizer.fmt_time(dataset["name"])
                )
                <= _end
            )
            if is_in_range:
                ret.append(dataset)

        return ret

    def process_single(self, process_datasets, save_supergraphs):
        append_path = self.config.get("append_path", "")
        load_path = self.config["data_path"]
        module_callsite_map = self.config.get("module_callsite_map", {})
        group_by = self.config["group_by"]
        filter_by = self.config.get("filter_by", "")
        filter_perc = self.config.get("filter_perc", 0)
        save_path = self.config.get("save_path", "")

        run_props = {
            _["name"]: (
                os.path.join(_["path"], append_path)
                if len(append_path) > 0
                else _["path"],
                _["profile_format"],
            )
            for _ in self.config["runs"]
        }

        if save_supergraphs:
            self.supergraphs = {}

        for idx, dataset in enumerate(process_datasets):
            name = dataset["name"]
            _prop = run_props[name]
            LOGGER.warning(
                f"-------------------- Dataset ({idx}/{len(process_datasets)}) = {name} --------------------"
            )
            LOGGER.profile(f"Starting supergraph ({name})")

            data_path = os.path.join(load_path, _prop[0])
            if _prop[1] == "hpctoolkit" and not os.path.isfile(
                os.path.join(data_path, "experiment.xml")
            ):
                LOGGER.debug(
                    f"Skipping {data_path} as it is missing the experiment.xml file"
                )
                continue

            sg = SuperGraph(name)
            sg.create(
                path=data_path,
                profile_format=_prop[1],
                module_callsite_map=module_callsite_map,
                filter_by=filter_by,
                filter_perc=filter_perc,
            )
            #print('outside create:', sg.dataframe['module'])

            LOGGER.profile(f"Created supergraph {name}")
            Group(sg, group_by=group_by)
            LOGGER.profile(f"Grouped supergraph {name}")
            #print('after group:', sg.dataframe['module'])

            Filter(sg, filter_by=filter_by, filter_perc=filter_perc)
            LOGGER.profile(f"Filtered supergraph {name}")
            #print('after filter:', sg.dataframe['module'])

            sg.write(os.path.join(save_path, name))
            #print('after write:', sg.dataframe['module'])
            #exit()

            LOGGER.profile(f"Stored in dictionary {name}")
            if save_supergraphs:
                self.supergraphs[sg.name] = sg

    def load_single(self, load_datasets):
        save_path = self.config.get("save_path", "")

        if len(load_datasets) > 0:
            with multiprocessing.Pool(processes=multiprocessing.cpu_count()) as pool:
                processed_folders = pool.map(
                    partial(self._mp_saved_data, save_path=save_path),
                    self.config["runs"],
                )
            self.config["runs"] = [
                d for d in processed_folders if d is not None
            ]  # Filter the none's

            #self.mp_dataset_load(load_datasets[0] , save_path=save_path)

            with multiprocessing.Pool(processes=multiprocessing.cpu_count()) as pool:
                load_supergraphs = pool.map(
                    partial(self.mp_dataset_load, save_path=save_path), load_datasets
                )

            for sg in load_supergraphs:
                self.supergraphs[sg.name] = sg

    def process_ensemble(self, save_path):
        # ----------------------------------------------------------------------
        # Stage-2: EnsembleGraph processing

        if len(self.supergraphs) > 1:
            name = "ensemble"
            LOGGER.profile(f"Starting supergraph {name}")
            sg = EnsembleGraph(name)

            Unify(sg, self.supergraphs)
            LOGGER.profile(f"Created supergraph {name}")

            sg.write(os.path.join(save_path, name))
            self.supergraphs[name] = sg
            LOGGER.profile(f"Stored in dictionary {name}")

    # --------------------------------------------------------------------------
    def process(self, reset=False):
        """Process the datasets using a Pipeline of operations.
        1. Each dataset is processed individually into a SuperGraph. Each
        SuperGraph is then processed according the provided config
        variables, e.g., filter_perc, filter_by.
        2. EnsembleGraph is then constructed from the processed SuperGraphs.
        """
        save_path = self.config.get("save_path", "")
        ensemble_process = self.config.get("ensemble_process", False)

        # Do not process, if already processed.
        if reset:
            process_datasets, load_datasets = self.datasets, []
        else:
            process_datasets, load_datasets = self.split_process_load_datasets()

        LOGGER.warning(
            f"-------------------- PROCESSING {len(process_datasets)} SUPERGRAPHS --------------------"
        )
        self.process_single(process_datasets, save_supergraphs=ensemble_process)

        LOGGER.warning(
            f"-------------------- LOADING {len(load_datasets)} SUPERGRAPHS --------------------"
        )
        self.load_single(load_datasets)

        LOGGER.warning(
            "-------------------- PROCESSING ENSEMBLE SUPERGRAPH --------------------"
        )
        self.process_ensemble(save_path)

    def request_general(self, operation):
        """
        Handles general requests
        """
        _OPERATIONS = ["init", "summary", "timeline", "cct"]

        assert "name" in operation
        assert operation["name"] in _OPERATIONS

        operation_name = operation["name"]

        if operation_name == "init":
            if len(self.datasets) > 1:
                sg = self.supergraphs["ensemble"]
            else:
                sg = self.supergraphs[self.datasets[0].name]

            time_columns = sg.time_columns

            # if "module_callsite_map" not in self.config.keys():
            #     module_callsite_map = sg.module_callsite_map
            # else:
            #     module_callsite_map = self.config.module_callsite_map

            # if "callsite_module_map" not in self.config.keys():
            #     callsite_module_map = sg.module_callsite_map
            # else:
            #     callsite_module_map = self.config.callsite_module_map

            return {
                **self.config,
                "time_columns": time_columns,
                "profile_format_summary": list(
                    set(map(lambda d: d["profile_format"], self.datasets))
                ),
                # "module_callsite_map": module_callsite_map,
                # "callsite_module_map": callsite_module_map
            }

        elif operation_name == "summary":
            return {sg: self.supergraphs[sg].summary() for sg in self.supergraphs}

        elif operation_name == "timeline":
            operation["ncount"] = int(operation["ncount"])
            assert operation["ntype"] in ["module", "callsite"]
            assert isinstance(operation["ncount"], int)
            assert operation["metric"] in ["time", "time (inc)"]

            # Get the top-n nodes from the "ensemble" based on the ntype.
            top_nodes_idx = self.supergraphs["ensemble"].df_get_top_by_attr(
                operation["ntype"], operation["ncount"], operation["metric"]
            )

            # Convert the indexs to the modules.
            top_nodes = [
                self.supergraphs["ensemble"].get_name(node_idx, operation["ntype"])
                for node_idx in top_nodes_idx
            ]
            # Construct the per-supergraph timeline data.
            data = {}
            data["d"] = {
                sg: self.supergraphs[sg].timeline(
                    top_nodes, operation["ntype"], operation["metric"]
                )
                for sg in self.supergraphs
                if sg != "ensemble"
            }

            # Attach the keys as the top_nodes
            data["nodes"] = top_nodes

            return data

        elif operation_name == "cct":
            sg = self.supergraphs[operation["dataset"]]
            nll = NodeLinkLayout(sg=sg, selected_runs=operation["dataset"])
            return nll.nxg

    def request_single(self, operation):
        """
        Handles requests connected to Single CallFlow.
        """
        assert isinstance(operation, dict)
        _OPERATIONS = [
            "cct",
            "supergraph",
            "split_ranks",
            "histogram",
            "scatterplot",
            "boxplots",
        ]
        assert "name" in operation
        assert operation["name"] in _OPERATIONS

        LOGGER.info(f"[Single Mode] {operation}")

        operation_name = operation["name"]
        sg = self.supergraphs[operation["dataset"]]

        if "ntype" in operation:
            ntype = operation["ntype"]

            if operation_name in ["histogram", "scatterplot", "boxplots"]:
                if ntype == "callsite":
                    aux_dict = sg.callsite_aux_dict
                elif ntype == "module":
                    aux_dict = {
                        sg.get_name(module_idx, "module"): sg.module_aux_dict[
                            module_idx
                        ]
                        for module_idx in sg.module_aux_dict.keys()
                    }

        if operation_name == "supergraph":
            ssg = SankeyLayout(
                grp_column="group_path",
                sg=sg,
                esg=None,
                nbins=operation.get("nbins", 20),
                reveal_callsites=operation.get("reveal_callsites", []),
                split_entry_module=operation.get("split_entry_module", []),
                split_callee_module=operation.get("split_callee_module", []),
            )
            return ssg.nxg

        elif operation_name == "split_ranks":
            selected_ranks = operation["ranks"]

            selected_sg = SankeyLayout(
                sg=sg,
                path_column="group_path",
                selected_runs=[operation["dataset"]],
                ranks=selected_ranks,
            )

            non_selected_sg = SankeyLayout(
                sg=sg,
                path_column="group_path",
                selected_runs=[operation["dataset"]],
                ranks=selected_ranks,
            )

            return {"selected": selected_sg.nxg, "non_selected": non_selected_sg.nxg}

        elif operation_name == "histogram":
            node = operation.get("node", None)
            nbins = int(operation.get("nbins", 20))

            hist = Histogram(
                dataframe=aux_dict[node],
                relative_to_df=None,
                histo_types=["rank"],
                node_type=ntype,
                bins=nbins,
                proxy_columns=sg.proxy_columns,
            )

            return hist.unpack()

        elif operation_name == "scatterplot":
            node = operation["node"]
            orientation = operation["orientation"]

            scatterplot = Scatterplot(
                df=aux_dict[node],
                relative_to_df=None,
                node_type=ntype,
                orientation=orientation,
                proxy_columns=sg.proxy_columns,
            )

            return scatterplot.unpack()

        elif operation_name == "boxplots":
            callsites = operation["callsites"]

            result = {}
            for callsite in callsites:
                bp = BoxPlot(
                    sg=sg, name=callsite, ntype=ntype, proxy_columns=sg.proxy_columns
                )
                result[callsite] = bp.unpack()

            return result

    def request_ensemble(self, operation):  # noqa: C901
        """
        Handles all the socket requests connected to Single CallFlow.
        """
        _OPERATIONS = [
            "supergraph",
            "module_hierarchy",
            "projection",
            "compare",
            "histogram",
            "boxplots",
            "scatterplot",
            "gradients",
        ]

        assert "name" in operation
        assert operation["name"] in _OPERATIONS

        _OPERATIONS_WO_DATASET = ["projection", "module_hierarchy", "compare"]
        if not (operation["name"] in _OPERATIONS_WO_DATASET):
            assert "dataset" in operation

        _OPERATION_W_COMPARE = ["compare"]
        if operation["name"] in _OPERATION_W_COMPARE:
            assert "targetRun" in operation
            assert "compareRun" in operation

        LOGGER.info(f"[Ensemble Mode] {operation}")

        operation_name = operation["name"]
        e_sg = self.supergraphs["ensemble"]

        if "dataset" in operation:
            sg = self.supergraphs[operation["dataset"]]

        e_aux_dict = {}

        if "ntype" in operation:
            ntype = operation["ntype"]

            if operation_name in ["histogram", "scatterplot", "boxplots"]:
                if ntype == "callsite":
                    e_aux_dict = e_sg.callsite_aux_dict
                elif ntype == "module":
                    e_aux_dict = {
                        e_sg.get_name(module_idx, "module"): e_sg.module_aux_dict[
                            module_idx
                        ]
                        for module_idx in e_sg.module_aux_dict.keys()
                    }

        if "dataset" in operation:
            t_aux_dict = {}
            tgt_dataset = operation["dataset"]
            t_sg = self.supergraphs[tgt_dataset]

            if operation_name in ["histogram", "scatterplot", "boxplots"]:
                if ntype == "callsite":
                    t_aux_dict = t_sg.callsite_aux_dict
                elif ntype == "module":
                    t_aux_dict = {
                        t_sg.get_name(module_idx, "module"): t_sg.module_aux_dict[
                            module_idx
                        ]
                        for module_idx in t_sg.module_aux_dict.keys()
                    }

        if operation_name == "supergraph":
            ssg = SankeyLayout(
                grp_column="group_path",
                sg=sg,
                esg=e_sg,
                nbins=int(operation.get("nbins", 20)),
                reveal_callsites=operation.get("reveal_callsites", []),
                split_entry_module=operation.get("split_entry_module", []),
                split_callee_module=operation.get("split_callee_module", []),
            )
            return ssg.nxg

        elif operation_name == "module_hierarchy":
            nbins = int(operation.get("nbins", 20))
            dataset = operation.get("dataset")
            hl = HierarchyLayout(
                sg=sg,
                esg=e_sg,
                dataset=dataset,
                node=operation.get("node"),
                nbins=nbins,
            )
            return hl.nxg

        elif operation_name == "projection":
            selected_runs = operation.get("selected_runs", [])
            n_cluster = operation.get("n_cluster", 3)

            pp = ParameterProjection(
                sg=e_sg,
                selected_runs=selected_runs,
                n_cluster=n_cluster,
            )
            return pp.result.to_json(orient="columns")

        elif operation_name == "compare":
            compare_dataset = operation.get("compareRun", None)
            target_dataset = operation.get("targetRun", None)
            selected_metric = operation.get("selectedMtric", "time")

            dv = DiffView(e_sg, compare_dataset, target_dataset, selected_metric)
            return dv.result

        elif operation_name == "histogram":
            node = operation["node"]
            nbins = int(operation.get("nbins", 20))

            hist = Histogram(
                dataframe=t_aux_dict[node],
                relative_to_df=e_aux_dict[node],
                histo_types=["rank"],
                node_type=ntype,
                bins=nbins,
                proxy_columns=t_sg.proxy_columns,
            )

            return hist.unpack()

        elif operation_name == "scatterplot":
            node = operation["node"]
            orientation = operation["orientation"]

            scatterplot = Scatterplot(
                df=t_aux_dict[node],
                relative_to_df=e_aux_dict[node],
                node_type=ntype,
                orientation=orientation,
                proxy_columns=t_sg.proxy_columns,
            )

            return scatterplot.unpack()

        elif operation_name == "boxplots":
            callsites = operation.get("callsites", [])
            iqr = float(operation.get("iqr", 1.5))

            result = {}
            for callsite in callsites:
                bp = BoxPlot(
                    sg=sg,
                    relative_sg=e_sg,
                    name=callsite,
                    ntype=ntype,
                    iqr_scale=iqr,
                    proxy_columns=t_sg.proxy_columns,
                )
                result[callsite] = bp.unpack()

            return result

        elif operation_name == "gradients":
            name = operation.get("node", None)
            ntype = operation.get("ntype", None)
            nbins = int(operation.get("nbins", 20))

            # Gradients are computed only for the ensemble mode.
            esg = self.supergraphs["ensemble"]
            esg_nid = esg.get_idx(name, ntype)

            return esg.get_gradients(esg_nid, ntype, nbins)
