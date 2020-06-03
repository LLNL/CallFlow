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


# ------------------------------------------------------------------------------
# Library imports
from flask import (
    Flask,
    jsonify,
    render_template,
    send_from_directory,
    request,
)
from flask_socketio import SocketIO, emit, send
import os
import sys
import json
import uuid
import argparse
from networkx.readwrite import json_graph


# Callflow imports
from callflow import SingleCallFlow
from callflow import EnsembleCallFlow
from callflow.pipeline import ConfigFileReader

import callflow
callflow.init_logger(level=1)
LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------

app = Flask(__name__, static_url_path="/public")
sockets = SocketIO(app, cors_allowed_origins="*")

# ------------------------------------------------------------------------------
class CallFlowServer:
    def __init__(self):

        self.create_parser()
        self.verify_parser()


        self.debug = True
        self.production = False

        # processing mode!
        if self.args.process:
            LOGGER.info("Pre-processing the datasets.")
            self.processPipeline()
            return


        # else rendering mode!
        self.renderPipeline()
        self.create_socket_server()

        if self.production == True:
            sockets.run(app, host="0.0.0.0", debug=self.debug, use_reloader=True)
        else:
            sockets.run(app, debug=False, use_reloader=True)



    def processPipeline(self):
        # Parse the config file and schema
        self.config = ConfigFileReader(self.args.config)
        self.create_dot_callflow_folder()

        self.callflow = EnsembleCallFlow(self.config, process=True)
        self.single_callflow = SingleCallFlow(self.config)

    def renderPipeline(self):
        self.config = ConfigFileReader(self.args.config)

        self.callflow = EnsembleCallFlow(self.config)
        self.single_callflow = SingleCallFlow(self.config)

    # Custom print function.
    def print(self, action, data={}):
        action = "{0}".format(action)
        if bool(data):
            data_string = "Data: " + json.dumps(data, indent=4, sort_keys=True)
        else:
            data_string = ""
        LOGGER.info("{0} {1}".format(action, data_string))

    # Parse the input arguments
    def create_parser(self):
        parser = argparse.ArgumentParser()
        parser.add_argument(
            "--verbose", action="store_true", help="Display debug points"
        )
        parser.add_argument("--config", help="Config file to be processed.")
        parser.add_argument(
            "--process",
            action="store_true",
            help="Process mode. To preprocess at the required level of granularity, use the options --filter, --entire. If you are preprocessing multiple callgraphs, use --ensemble option.",
        )
        self.args = parser.parse_args()
        self.debug = self.args.verbose

    # Raises expections if something is not provided
    def verify_parser(self):
        # Check if the config file is provided and exists!
        if not self.args.config:
            LOGGER.info("Please provide a config file. To see options, use --help")
            raise Exception()
        else:
            if not os.path.isfile(self.args.config):
                LOGGER.info(
                    "Please check the config file path. There exists no such file in the path provided"
                )
                raise Exception()

    def create_dot_callflow_folder(self):
        LOGGER.info(f"Create directory.: {self.config.save_path}")
        #if self.debug:
        #    self.print(f"Create .callflow directiory.: {self.config.save_path}")

        if not os.path.exists(self.config.save_path):
            os.makedirs(self.config.save_path)

        for dataset in self.config.datasets:
            dataset_dir = os.path.join(self.config.save_path, dataset["name"])
            LOGGER.info(dataset_dir)
            if not os.path.exists(dataset_dir):
                if self.debug:
                    LOGGER.info(
                        f"Creating .callflow directory for dataset : {dataset['name']}"
                    )
                os.makedirs(dataset_dir)

            files = [
                "entire_df.csv",
                "filter_df.csv",
                "entire_graph.json",
                "filter_graph.json",
            ]
            for f in files:
                if not os.path.exists(dataset_dir + "/" + f):
                    open(os.path.join(dataset_dir, f), "w").close()

    def create_socket_server(self):
        @sockets.on("init", namespace="/")
        def init(data):
            caseStudy = data["caseStudy"]
            LOGGER.info(f"Case Study: {caseStudy}")
            self.config = self.callflow.request({"name": "init"})
            config_json = json.dumps(self.config, default=lambda o: o.__dict__)
            emit("init", config_json, json=True)

        @sockets.on("reset", namespace="/")
        def filter(data):
            #if self.debug:
            #    self.print("Filter the dataset.", data)
            LOGGER.debug("Filter the dataset. {}".format(data))
            dataset = data["dataset"]
            filterBy = data["filterBy"]
            filterPerc = data["filterPerc"]
            obj = {
                "name": "reset",
                "filterBy": filterBy,
                "filterPerc": filterPerc,
                "dataset1": dataset,
            }
            result = self.callflow.request(obj)
            emit("reset", result, json=True)

        @sockets.on("single_callsite_data", namespace="/")
        def single_callsite_data(data):
            #if self.debug:
            #    self.print("Callsite information: ", data)
            LOGGER.debug("Callsite information. {}".format(data))
            result = self.single_callflow.request(
                {
                    "name": "auxiliary",
                    "dataset": data["dataset"],
                    "sortBy": data["sortBy"],
                    "binCount": data["binCount"],
                    "module": data["module"],
                    # "re-process": data["re-process"],
                }
            )
            emit("single_callsite_data", result, json=True)

        @sockets.on("ensemble_callsite_data", namespace="/")
        def ensemble_callsite_data(data):
            #if self.debug:
            #    self.print("Callsite information: ", data)
            LOGGER.debug("Callsite information. {}".format(data))
            result = self.callflow.request(
                {
                    "name": "auxiliary",
                    "datasets": data["datasets"],
                    "sortBy": data["sortBy"],
                    "MPIBinCount": data["MPIBinCount"],
                    "RunBinCount": data["RunBinCount"],
                    "module": data["module"],
                    "re-process": data["re_process"],
                }
            )
            emit("ensemble_callsite_data", result, json=True)

        ################## CCT requests #########################
        @sockets.on("single_cct", namespace="/")
        def cct(data):
            LOGGER.debug("CCT of the run. {}".format(data))
            g = self.single_callflow.request(
                {
                    "name": "cct",
                    "dataset": data["dataset"],
                    "functionsInCCT": data["functionsInCCT"],
                }
            )
            result = json_graph.node_link_data(g)
            emit("single_cct", result, json=True)

        @sockets.on("comp_cct", namespace="/")
        def comp_cct(data):
            LOGGER.debug("Comp-CCT for the two datasets. {}".format(data))
            g1 = self.callflow.request(
                {
                    "name": "cct",
                    "dataset1": data["dataset1"],
                    "functionInCCT": data["functionInCCT"],
                }
            )
            g2 = self.callflow.request(
                {
                    "name": "cct",
                    "dataset1": data["dataset2"],
                    "functionInCCT": data["functionInCCT"],
                }
            )
            g1_result = json_graph.node_link_data(g1)
            g2_result = json_graph.node_link_data(g2)
            emit(
                "comp_cct",
                {data["dataset1"]: g1_result, data["dataset2"]: g2_result},
                json=True,
            )

        @sockets.on("ensemble_cct", namespace="/")
        def ensemble_cct(data):
            LOGGER.debug("Ensemble-CCT for the datasets. {}".format(data))
            ensemble_cct = self.callflow.request(
                {
                    "name": "ensemble_cct",
                    "datasets": data["datasets"],
                    "functionsInCCT": data["functionsInCCT"],
                }
            )
            result = json_graph.node_link_data(ensemble_cct)
            emit("ensemble_cct", result, json=True)

        ################## CCT requests #########################
        @sockets.on("single_supergraph", namespace="/")
        def single_supergraph(data):
            result = {}
            LOGGER.debug("Single SuperGraph. {}".format(data))
            dataset = data["dataset"]
            groupBy = data["groupBy"].lower()
            nx_graph = self.single_callflow.request(
                {"name": "supergraph", "groupBy": groupBy, "dataset": dataset}
            )
            result = json_graph.node_link_data(nx_graph)
            result = json.dumps(result)
            emit("single_supergraph", result, json=True)

        @sockets.on("ensemble_supergraph", namespace="/")
        def ensemble_supergraph(data):
            result = {}
            LOGGER.debug("Ensemble SuperGraph. {}".format(data))
            datasets = data["datasets"]
            groupBy = data["groupBy"].lower()
            nx_graph = self.callflow.request(
                {"name": "supergraph", "groupBy": groupBy, "datasets": datasets}
            )
            result = json_graph.node_link_data(nx_graph)
            json_result = json.dumps(result)
            emit("ensemble_supergraph", json_result, json=True)

        @sockets.on("ensemble_similarity", namespace="/")
        def ensemble_similarity(data):
            result = {}
            LOGGER.debug("Similarity of the datasets. {}".format(data))

            result = self.callflow.request(
                {
                    "name": "similarity",
                    "datasets": data["datasets"],
                    "algo": data["algo"],
                    "module": data["module"],
                }
            )
            emit("ensemble_similarity", result, json=True)

        @sockets.on("module_hierarchy", namespace="/")
        def module_hierarchy(data):
            LOGGER.debug("Hierarchy of the module. {}".format(data))
            hierarchy_graph = self.callflow.request(
                {
                    "name": "hierarchy",
                    "datasets": data["datasets"],
                    "module": data["module"],
                }
            )
            print(hierarchy_graph)
            result = json_graph.tree_data(hierarchy_graph, root=data["module"])
            json_result = json.dumps(result)
            emit("module_hierarchy", json_result, json=True)

        @sockets.on("parameter_projection", namespace="/")
        def parameter_projection(data):

            LOGGER.debug("Projection for the runs. {}".format(data))
            result = self.callflow.request(
                {
                    "name": "projection",
                    "datasets": data["datasets"],
                    "targetDataset": data["targetDataset"],
                    # "algo": data["algo"],
                    "numOfClusters": data["numOfClusters"],
                }
            )
            emit("parameter_projection", result, json=True)

        @sockets.on("parameter_information", namespace="/")
        def parameter_information(data):

            LOGGER.debug("Run Information: {}".format(data))

            result = self.callflow.request(
                {"name": "run-information", "datasets": data["datasets"]}
            )
            emit("parameter_information", json.dumps(result), json=True)

        @sockets.on("compare", namespace="/")
        def compare(data):

            LOGGER.debug("Compare: {}".format(data))
            result = self.callflow.request(
                {
                    "name": "compare",
                    "targetDataset": data["targetDataset"],
                    "compareDataset": data["compareDataset"],
                    "selectedMetric": data["selectedMetric"],
                }
            )
            emit("compare", result, json=True)

        @sockets.on("reveal_callsite", namespace="/")
        def reveal_callsite(data):
            LOGGER.debug("Reveal callsite: {}".format(data))
            nx_graph = self.callflow.request(
                {
                    "name": "supergraph",
                    "groupBy": "module",
                    "datasets": data["datasets"],
                    "reveal_callsites": data["reveal_callsites"],
                }
            )
            result = json_graph.node_link_data(nx_graph)
            json_result = json.dumps(result)
            emit("ensemble_supergraph", json_result, json=True)

        @sockets.on("split_by_entry_callsites", namespace="/")
        def split_by_entry_callsites(data):
            LOGGER.debug("Split by entry: {}".format(data))
            nx_graph = self.callflow.request(
                {
                    "name": "supergraph",
                    "groupBy": "module",
                    "datasets": data["datasets"],
                    "split_entry_module": data["selectedModule"],
                }
            )
            result = json_graph.node_link_data(nx_graph)
            json_result = json.dumps(result)
            emit("ensemble_supergraph", json_result, json=True)

        @sockets.on("split_by_callees", namespace="/")
        def split_by_callees(data):
            LOGGER.debug("Split by callees: {}".format(data))
            nx_graph = self.callflow.request(
                {
                    "name": "supergraph",
                    "groupBy": "module",
                    "datasets": data["datasets"],
                    "split_by_callees": data["selectedModule"],
                }
            )
            result = json_graph.node_link_data(nx_graph)
            json_result = json.dumps(result)
            emit("ensemble_supergraph", json_result, json=True)

        @sockets.on("mpi_range_data", namespace="/")
        def mpi_range_data(data):
            LOGGER.debug("MPI range data: {}".format(data))
            nx_graph = self.callflow.request(
                {
                    "name": "mpi_range_data",
                    "datasets": data["datasets"],
                    "range_from": data["range_from"],
                    "range_to": data["range_to"],
                }
            )

    def create_server(self):
        app.debug = True
        app.__dir__ = os.path.join(os.path.dirname(os.getcwd()), "")
        # CallFlowServer routes
        @app.route("/")
        def root():
            print("CallFlowServer directory", app.__dir__)
            return send_from_directory(app.__dir__, "index.html")


if __name__ == "__main__":
    CallFlowServer()
