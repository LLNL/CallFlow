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
import pandas as pd
import time
import utils
from logger import log
import os
import hatchet as ht


class Create:
    """
    Creates a graph frame.
    Input : config variable, and dataset name
    Output : State object containing components of graphframe as separate object variables.
    """

    def __init__(self, config, name):
        utils.debug("Creating graphframes: ", name)
        self.config = config
        self.callflow_path = config.callflow_path
        self.name = name
        self.run()

    def run(self):
        data_path = os.path.abspath(
            os.path.join(self.callflow_path, self.config.paths[self.name])
        )

        # if self.config.format[self.name] == "caliper_json":
        #     module_path = os.path.abspath(
        #         os.path.join(self.callflow_path, self.config.module_paths[self.name])
        #     )
        #     print(module_path)

        if self.config.format[self.name] == "hpctoolkit":
            self.gf = ht.GraphFrame.from_hpctoolkit(data_path)
        elif self.config.format[self.name] == "caliper":
            self.gf = ht.GraphFrame.from_caliper(data_path)
        elif self.config.format[self.name] == "caliper_json":
            # self.gf = ht.GraphFrame.from_caliper_json_with_module(
            #     data_path, module_path
            # )
            self.gf = ht.GraphFrame.from_caliper(data_path, query='')
        elif self.config.format[self.name] == "gprof":
            self.gf = ht.GraphFrame.from_grof_dot(data_path)
        elif self.config.format[self.name] == "literal":
            self.gf = ht.GraphFrame.from_literal(data_path)
        elif self.config.format[self.name] == "lists":
            self.gf = ht.GraphFrame.from_lists(data_path)

        self.df = self.gf.dataframe
        self.graph = self.gf.graph
