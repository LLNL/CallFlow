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

import callflow
from callflow import SingleCallFlow, EnsembleCallFlow
from callflow.pipeline import ConfigFileReader


LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
# Create a Flask server.
app = Flask(__name__, static_url_path="/public")
sockets = SocketIO(app, cors_allowed_origins="*")

# ------------------------------------------------------------------------------
# Server class.
class CallFlowServer:
    def __init__(self):
        # Parse the arguments passed.
        args = self._create_parser()

        # Verify if only valid things are passed.
        self._verify_parser(args)

        self.debug = args.verbose or True
        self.production = args.production or False
        configFile = args.config
        self.process = args.process

        # Read the config file using config file reader.
        self.config = ConfigFileReader(configFile)

        # Call the version of callflow corresponding to number of datasets.
        if len(self.config.datasets) == 1:
            self.callflow = SingleCallFlow(config=self.config, process=self.process)
        else:
            self.callflow = EnsembleCallFlow(config=self.config, process=self.process)

        # Create server if not processing.
        if not self.process:
            self._create_server()

    @staticmethod
    def _create_parser():
        """
        Parse the input arguments
        """
        parser = argparse.ArgumentParser()
        parser.add_argument(
            "--verbose", action="store_true", help="Display debug points"
        )
        parser.add_argument("--config", help="Config file to be processed.")
        parser.add_argument("--production", help="Launch app on production server.")

        parser.add_argument(
            "--process",
            action="store_true",
            help="Process mode. To preprocess at the required level of granularity, use the options --filter, --entire. If you are preprocessing multiple callgraphs, use --ensemble option.",
        )
        args = parser.parse_args()
        return args

    @staticmethod
    def _verify_parser(args):
        """
        Raises expections if something is not provided
        Check if the config file is provided and exists!
        """
        if not args.config:
            LOGGER.info("Please provide a config file. To see options, use --help")
            raise Exception()
        else:
            if not os.path.isfile(args.config):
                LOGGER.info(
                    "Please check the config file path. There exists no such file in the path provided"
                )
                raise Exception()

    def _create_server(self):
        # Socket request handlers
        self._request_handler_general()
        if len(self.config.datasets) == 1:
            self._request_handler_single()
        else:
            self._request_handler_single()
            self._request_handler_ensemble()

        # Start the server.
        if self.production == True:
            sockets.run(app, host="0.0.0.0", debug=self.debug, use_reloader=True)
        else:
            sockets.run(app, debug=False, use_reloader=True)

    def _request_handler_general(self):
        """
        General socket requests.
        """

        # TODO: Find a better way to debug.
        @sockets.on("reset", namespace="/")
        def reset(data):
            """
            # TODO: This might have to be deleted.
            """
            if self.debug:
                LOGGER.debug("[Socket request] reset: {}".format(data))
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

        @sockets.on("init", namespace="/")
        def init(data):
            """
            # TODO: Change request tag to "config".
            # TODO: Remove case study.
            Essential data house for single callflow.
            :return: Config file (JSON Format).
            """
            if self.debug:
                LOGGER.debug(f"[Socket request] init: {data}")

            caseStudy = data["caseStudy"]
            result = json.dumps(self.config, default=lambda o: o.__dict__)
            emit("init", result, json=True)

        @sockets.on("reveal_callsite", namespace="/")
        def reveal_callsite(data):
            """
            Reveal the callpaths of selected callsites.
            :return: networkx graph (JSON)
            """
            if self.debug:
                LOGGER.debug(f"[Socket request] reveal_callsite: {data}")
            nxg = self.callflow.request(
                {
                    "name": "supergraph",
                    "groupBy": "module",
                    "datasets": data["datasets"],
                    "reveal_callsites": data["reveal_callsites"],
                }
            )
            result = json_graph.node_link_data(nxg)
            json_result = json.dumps(result)
            emit("ensemble_supergraph", json_result, json=True)

        @sockets.on("split_by_entry_callsites", namespace="/")
        def split_by_entry_callsites(data):
            """
            Reveal the entry callsite of selected module.
            :return: networkx graph (JSON)
            """
            if self.debug:
                LOGGER.debug("Split by entry: {}".format(data))
            nxg = self.callflow.request(
                {
                    "name": "supergraph",
                    "groupBy": "module",
                    "datasets": data["datasets"],
                    "split_entry_module": data["selectedModule"],
                }
            )
            result = json_graph.node_link_data(nxg)
            json_result = json.dumps(result)
            emit("ensemble_supergraph", json_result, json=True)

        @sockets.on("split_by_callees", namespace="/")
        def split_by_callees(data):
            """
            Reveal the callees of selected module.
            :return: networkx graph (JSON)
            """
            if self.debug:
                LOGGER.debug("Split by callees: {}".format(data))
            nxg = self.callflow.request(
                {
                    "name": "supergraph",
                    "groupBy": "module",
                    "datasets": data["datasets"],
                    "split_by_callees": data["selectedModule"],
                }
            )
            result = json_graph.node_link_data(nxg)
            json_result = json.dumps(result)
            emit("ensemble_supergraph", json_result, json=True)

        # @sockets.on("mpi_range_data", namespace="/")
        # def mpi_range_data(data):
        #     if self.debug:
        #         LOGGER.debug("MPI range data: {}".format(data))
        #     nx_graph = self.callflow.request(
        #         {
        #             "name": "mpi_range_data",
        #             "datasets": data["datasets"],
        #             "range_from": data["range_from"],
        #             "range_to": data["range_to"],
        #         }
        #     )

    def _request_handler_single(self):
        @sockets.on("single_callsite_data", namespace="/")
        def single_callsite_data(data):
            """
            TODO: Not sure if we can merge this with init.
            TODO: Needs discussion and a better naming convention.

            Data house for single callflow.
            :return: Auxiliary data.
            """
            if self.debug:
                LOGGER.debug("[Socket request] single_callsite_data. {}".format(data))

            result = self.callflow.request(
                {
                    "name": "auxiliary",
                    "dataset": data["dataset"],
                    "sortBy": data["sortBy"],
                    "binCount": data["binCount"],
                    "module": data["module"],
                }
            )
            emit("single_callsite_data", result, json=True)

        @sockets.on("single_cct", namespace="/")
        def single_cct(data):
            """
            Single CCT.
            :return: CCT networkx graph (JSON format).
            """
            if self.debug:
                LOGGER.debug("[Socket request] Single CCT: {}".format(data))

            nxg = self.callflow.request(
                {
                    "name": "cct",
                    "dataset": data["dataset"],
                    "functionsInCCT": data["functionsInCCT"],
                }
            )
            result = json_graph.node_link_data(nxg)
            emit("single_cct", result, json=True)

        @sockets.on("single_supergraph", namespace="/")
        def single_supergraph(data):
            """
            Single SuperGraph.
            :return: both SuperGraph networkx graphs (JSON format).
            """
            if self.debug:
                LOGGER.debug("[Socket request] single_supergraph: {}".format(data))

            dataset = data["dataset"]
            groupBy = data["groupBy"].lower()
            nxg = self.callflow.request(
                {"name": "supergraph", "groupBy": groupBy, "dataset": dataset}
            )
            result = json_graph.node_link_data(nxg)
            # json_result = json.dumps(result)
            emit("single_supergraph", result, json=True)

    def _request_handler_ensemble(self):
        @sockets.on("ensemble_callsite_data", namespace="/")
        def ensemble_callsite_data(data):
            """
            TODO: Not sure if we can merge this with init.
            TODO: Needs discussion and a better naming convention.

            Essential data house for ensemble callflow.
            :return: Auxiliary data.
            """
            if self.debug:
                LOGGER.debug("[Socket request] ensemble_callsite_data: {}".format(data))
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

        @sockets.on("ensemble_cct", namespace="/")
        def ensemble_cct(data):
            """
            Union of all CCTs.
            :return: CCT networkx graph (JSON format).
            """
            if self.debug:
                LOGGER.debug("[Socket request] ensemble_cct: {}".format(data))
            nxg = self.callflow.request(
                {
                    "name": "ensemble_cct",
                    "datasets": data["datasets"],
                    "functionsInCCT": data["functionsInCCT"],
                }
            )
            result = json_graph.node_link_data(nxg)
            emit("ensemble_cct", result, json=True)

        @sockets.on("ensemble_supergraph", namespace="/")
        def ensemble_supergraph(data):
            """
            Ensemble SuperGraph.
            :return: both SuperGraph networkx graphs (JSON format).
            """
            if self.debug:
                Logger.debug("[Socket request] ensemble_supergraph: {}".format(data))

            datasets = data["datasets"]
            groupBy = data["groupBy"].lower()
            nxg = self.callflow.request(
                {"name": "supergraph", "groupBy": groupBy, "datasets": datasets}
            )
            result = json_graph.node_link_data(nxg)
            # json_result = json.dumps(result)
            emit("ensemble_supergraph", result, json=True)

        @sockets.on("ensemble_similarity", namespace="/")
        def ensemble_similarity(data):
            """
            Similarity Matrix for all callgraphs in ensemble.
            :return: Pair-wise similarity matrix
            """
            if self.debug:
                LOGGER.debug("ensemble_similarity: {data}")

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
            """
            Module hierarchy of the supergraph.
            :return: CCT networkx graph (JSON format).
            """
            if self.debug:
                LOGGER.debug(f"module_hierarchy {data}")
            nxg = self.callflow.request(
                {
                    "name": "hierarchy",
                    "datasets": data["datasets"],
                    "module": data["module"],
                }
            )
            result = json_graph.tree_data(nxg, root=data["module"])
            json_result = json.dumps(result)
            emit("module_hierarchy", json_result, json=True)

        @sockets.on("parameter_projection", namespace="/")
        def parameter_projection(data):
            """
            TODO: Verify the return type.
            Parameter projection of the datasets.
            :return: PCs. I guess.
            """
            if self.debug:
                LOGGER.debug(f"parameter_projection: {data}")
            result = self.callflow.request(
                {
                    "name": "projection",
                    "datasets": data["datasets"],
                    "targetDataset": data["targetDataset"],
                    "numOfClusters": data["numOfClusters"],
                }
            )
            emit("parameter_projection", result, json=True)

        @sockets.on("parameter_information", namespace="/")
        def parameter_information(data):
            """
            TODO: Verify the return type.
            Parameter information
            :return: { "parameter1": [Array], "parameter2": [Array] ...  }.
            """
            if self.debug:
                LOGGER.debug(f"[Socket request] parameter_information: {data}")

            result = self.callflow.request(
                {"name": "run-information", "datasets": data["datasets"]}
            )
            emit("parameter_information", json.dumps(result), json=True)

        @sockets.on("compare", namespace="/")
        def compare(data):
            """
            TODO: Verify the return type.
            Compare two super-graphs.
            :return: Gradients in some JSON format.
            """
            if self.debug:
                LOGGER.debug("[Socket request] compare_supergraph {data}")
            result = self.callflow.request(
                {
                    "name": "compare",
                    "targetDataset": data["targetDataset"],
                    "compareDataset": data["compareDataset"],
                    "selectedMetric": data["selectedMetric"],
                }
            )
            emit("compare", result, json=True)

    def create_server(self):
        app.debug = True
        app.__dir__ = os.path.join(os.path.dirname(os.getcwd()), "")
        # CallFlowServer routes
        @app.route("/")
        def root():
            print("CallFlowServer directory", app.__dir__)
            return send_from_directory(app.__dir__, "index.html")


if __name__ == "__main__":

    # if verbose, level = 1
    # else, level = 2
    callflow.init_logger(level=1)
    CallFlowServer()
