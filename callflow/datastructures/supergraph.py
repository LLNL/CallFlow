# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

import os
import json

# CallFlow imports
import callflow
from callflow.timer import Timer
from callflow.algorithms import DeltaConSimilarity
from callflow.operations import Process, Group, Filter
from callflow.modules import EnsembleAuxiliary, SingleAuxiliary

LOGGER = callflow.get_logger(__name__)


class SuperGraph(object):
    """
    SuperGraph class to handle processing of a an input Dataset.
    """

    # --------------------------------------------------------------------------
    _FILENAMES = {"params": "env_params.txt", "aux": "auxiliary_data.json"}

    # --------------------------------------------------------------------------
    def __init__(self, config={}, tag="", mode="process"):
        """
        Arguments:
            props (dict): dictionary to store the configuration. CallFlow appends more information while processing.
            tag (str): Tag for each call graph.
            mode (str): process|render. process performs pre-processing, and render calculates layout for the client.
        """
        assert mode in ["process", "render"]
        self.timer = Timer()
        self.dirname = os.path.join(config["save_path"], tag)
        self.config = config
        self.tag = tag
        self.mode = mode

        self.create_gf()

    # --------------------------------------------------------------------------
    def _create_for_render(self):

        assert self.mode == "render"
        self.gf = callflow.GraphFrame()
        # self.gf.read(self.dirname)

        # Read only if "read_parameters" is specified in the config file.
        if self.config["read_parameter"]:
            self.parameters = SuperGraph.read_parameters(self.dirname)
        self.auxiliary_data = SuperGraph.read_auxiliary_data(self.dirname)

    def create_gf(self):
        """Create a graphframe based on the mode.
        If mode is process, union operation is performed on the df and graph.
        If mode is render, corresponding files from .callflow/ensemble are read.
        """
        if self.mode == "process":
            self.gf = callflow.GraphFrame.from_config(self.config, self.tag)

        elif self.mode == "render":
            self._create_for_render()

    # -------------------------------------------------------------------------
    def get_module_name(self, callsite):
        """
        Get the module name for a callsite.
        Note: The module names can be specified using the config file.
        If such a mapping exists, this function returns the module based on mapping. Else, it queries the graphframe for a module name.

        Return:
            module name (str) - Returns the module name
        """
        if "callsite_module_map" in self.config:
            if callsite in self.config["callsite_module_map"]:
                return self.config["callsite_module_map"][callsite]

        if "module" in self.gf.df.columns:
            return self.gf.lookup_with_name(callsite)["module"].unique()[0]
        else:
            return callsite

    # ------------------------------------------------------------------------
    # The next block of functions attach the calculated result to the variable `gf`.
    def process_gf(self):
        """
        Process graphframe to add properties depending on the format.
        Current processing is supported for hpctoolkit and caliper.

        Note: Process class follows a builder pattern.
        (refer: https://en.wikipedia.org/wiki/Builder_pattern#:~:text=The%20builder%20pattern%20is%20a,Gang%20of%20Four%20design%20patterns.)
        """
        profile_format = self.config["parameter_props"]["profile_format"][self.tag]
        if profile_format == "hpctoolkit":

            process = (
                Process.Builder(self.gf, self.tag)
                .add_path()
                .create_name_module_map()
                .add_callers_and_callees()
                .add_dataset_name()
                # .add_imbalance_perc()
                .add_module_name_hpctoolkit()
                .add_vis_node_name()
                .build()
            )

        elif profile_format == "caliper_json" or profile_format == "caliper":
            if "callsite_module_map" in self.config:
                process = (
                    Process.Builder(self.gf, self.tag)
                    .add_time_columns()
                    .add_rank_column()
                    .add_callers_and_callees()
                    .add_dataset_name()
                    .add_imbalance_perc()
                    .add_module_name_caliper(self.config["callsite_module_map"])
                    .create_name_module_map()
                    .add_vis_node_name()
                    .add_path()
                    .build()
                )
            else:
                process = (
                    Process.Builder(self.gf, self.tag)
                    .add_time_columns()
                    .add_rank_column()
                    .add_callers_and_callees()
                    .add_dataset_name()
                    .add_imbalance_perc()
                    .create_name_module_map()
                    .add_vis_node_name()
                    .add_path()
                    .build()
                )

        elif profile_format == "gprof":
            process = (
                Process.Builder(self.gf, self.tag)
                .add_nid_column()
                .add_time_columns()
                .add_rank_column()
                .add_callers_and_callees()
                .add_dataset_name()
                .add_imbalance_perc()
                .create_name_module_map()
                .add_vis_node_name()
                .add_path()
                .build()
            )

        self.gf = process.gf

    def group_gf(self, group_by="module"):
        """
        Group the graphframe based on `group_by` parameter.
        """
        self.gf = Group(self.gf, group_by).gf

    def filter_gf(self, mode="single"):
        """
        Filter the graphframe.
        """
        self.gf = Filter(
            gf=self.gf,
            mode=mode,
            filter_by=self.config["filter_by"],
            filter_perc=self.config["filter_perc"],
        ).gf

    # --------------------------------------------------------------------------
    # Question: These functions just call another class, should we just call the corresponding classes directly?
    def write_gf(self, write_df=True, write_graph=False, write_nxg=True):
        self.gf.write(self.dirname, write_df, write_graph, write_nxg)

    # --------------------------------------------------------------------------
    def ensemble_auxiliary(
        self, datasets, props, MPIBinCount=20, RunBinCount=20, process=True, write=True
    ):
        EnsembleAuxiliary(
            self.gf,
            props=props,
            datasets=datasets,
            MPIBinCount=MPIBinCount,
            RunBinCount=RunBinCount,
            process=process,
        )

    def single_auxiliary(self, dataset="", binCount=20, process=True):
        SingleAuxiliary(
            self.gf,
            dataset=dataset,
            props=self.config,
            MPIBinCount=binCount,
            process=process,
        )

    # ------------------------------------------------------------------------
    # Read/Write functions for parameter file, auxiliary information (for the client), and pair-wise similarity.
    @staticmethod
    def read_parameters(path):
        """
        Read parameters from "dataset_path/env_params.txt".
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["params"])
        LOGGER.info(f"[Read] {fname}")

        parameters = None
        for line in open(fname, "r"):
            for num in line.strip().split(","):
                split_num = num.split("=")
                parameters[split_num[0]] = split_num[1]

        return parameters

    @staticmethod
    def read_auxiliary_data(path):
        """
        Read the data stored in auxiliary_data.json
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["aux"])
        LOGGER.info(f"[Read] {fname}")
        data = None
        with open(fname, "r") as fptr:
            data = json.load(fptr)
        return data

    @staticmethod
    def _unused_write_similarity(datasets, states, type):
        """
        # Write the pair-wise graph similarities into .callflow/ensemble directory.
        """
        assert False
        ret = {}
        for idx, dataset in enumerate(datasets):
            ret[dataset] = []
            for idx_2, dataset2 in enumerate(datasets):
                union_similarity = DeltaConSimilarity(
                    states[dataset2].g, states[dataset].g
                )
                ret[dataset].append(union_similarity.result)
        dirname = os.path.dirname(os.path.realpath(__file__))
        similarity_filepath = os.path.join(dirname, "/ensemble/similarity.json")
        with open(similarity_filepath, "w") as json_file:
            json.dump(ret, json_file)

    # ------------------------------------------------------------------------
