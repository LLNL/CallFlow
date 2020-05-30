

import os
import time

import hatchet as ht
from callflow.utils.logger import Log

class GraphFrame(ht.GraphFrame):

    def __init__(self):
        pass

    # --------------------------------------------------------------------------
    # create a graph frame directly from the config
    def from_config(self, config, name):

        # TODO: not proper use of logger
        log = Log("create_graphframe")
        log.info(f"Creating graphframes: {name}")
        log.info(f"Data path: {config.data_path}")

        if config.format[name] == "hpctoolkit":
            gf = ht.GraphFrame.from_hpctoolkit(config.data_path)

        elif config.format[name] == "caliper":
            gf = ht.GraphFrame.from_caliper(config.data_path)

        elif config.format[name] == "caliper_json":
            gf = ht.GraphFrame.from_caliper(config.data_path, query="")

        elif config.format[name] == "gprof":
            gf = ht.GraphFrame.from_grof_dot(config.data_path)

        elif config.format[name] == "literal":
            gf = ht.GraphFrame.from_literal(config.data_path)

        elif config.format[name] == "lists":
            gf = ht.GraphFrame.from_lists(config.data_path)

        self.graph = gf.graph
        self.dataframe = gf.dataframe
        self.exc_metrics = list(gf.exc_metrics),
        self.inc_metrics = list(gf.inc_metrics),

    # --------------------------------------------------------------------------
