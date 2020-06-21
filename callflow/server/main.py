# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT


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

# ------------------------------------------------------------------------------
# CallFlow imports.
import callflow
from callflow import CallFlow
from callflow.operations import ConfigFileReader

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
        self.process = args.process

        # Read the config file using config file reader.
        self.config = ConfigFileReader(args.config)

        ndatasets = len(self.config.datasets)
        assert ndatasets > 0
        self.callflow = callflow.CallFlow(config = self.config,
                                          process = self.process,
                                          ensemble = ndatasets > 1)

        # Create server if not processing.
        if not self.process:
            self._create_server()

    # ------------------------------------------------------------------------------
    # Private methods.
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
        """
        Create server's request handler and starts the server.
        Current version abstracts the requests into 3 categores:
        General: common requests for both ensemble and single.
        Single: requests for single dataset processing.
        Ensemble: requests for ensemble dataset processing.
        """

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

        @sockets.on("reset", namespace="/")
        def reset(data):
            """
            # TODO: This might have to be deleted.
            """
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
            Essential data house for single callflow.
            :return: Config file (JSON Format).
            """
            LOGGER.debug(f"[Socket request] init: {data}")
            if data["mode"] == "Ensemble":
                result = self.callflow.request_ensemble({"name": "init"})
            elif data["mode"] == "Single":
                result = self.callflow.request_single({"name": "init"})
            json_result = json.dumps(result)
            emit("init", json_result, json=True)

        @sockets.on("reveal_callsite", namespace="/")
        def reveal_callsite(data):
            """
            Reveal the callpaths of selected callsites.
            :return: networkx graph (JSON)
            """
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

    def _request_handler_single(self):
        @sockets.on("single_callsite_data", namespace="/")
        def single_callsite_data(data):
            """
            Data house for single callflow.
            :return: Auxiliary data.
            """
            LOGGER.debug("[Socket request] single_callsite_data. {}".format(data))
            result = self.callflow.request_single(
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
            LOGGER.debug("[Socket request] Single CCT: {}".format(data))
            nxg = self.callflow.request_single(
                {
                    "name": "cct",
                    "dataset": data["dataset"],
                    "functionsInCCT": data["functionsInCCT"],
                }
            )
            result = json_graph.node_link_data(nxg)
            json_result = json.dumps(result)

            emit("single_cct", result, json=True)

        @sockets.on("single_supergraph", namespace="/")
        def single_supergraph(data):
            """
            Single SuperGraph.
            :return: both SuperGraph networkx graphs (JSON format).
            """
            LOGGER.debug("[Socket request] single_supergraph: {}".format(data))
            dataset = data["dataset"]
            groupBy = data["groupBy"].lower()
            nxg = self.callflow.request_single(
                {"name": "supergraph", "groupBy": groupBy, "dataset": dataset}
            )
            result = json_graph.node_link_data(nxg)
            json_result = json.dumps(result)
            emit("single_supergraph", json_result, json=True)

    def _request_handler_ensemble(self):
        @sockets.on("ensemble_callsite_data", namespace="/")
        def ensemble_callsite_data(data):
            """
            Data house for ensemble callflow.
            :return: Auxiliary data.
            """
            LOGGER.debug("[Socket request] ensemble_callsite_data: {}".format(data))
            result = self.callflow.request_ensemble(
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
            LOGGER.debug("[Socket request] ensemble_cct: {}".format(data))
            nxg = self.callflow.request_ensemble(
                {
                    "name": "ensemble_cct",
                    "datasets": data["datasets"],
                    "functionsInCCT": data["functionsInCCT"],
                }
            )
            result = json_graph.node_link_data(nxg)
            # json_result = json.dumps(result)
            emit("ensemble_cct", result, json=True)

        @sockets.on("ensemble_supergraph", namespace="/")
        def ensemble_supergraph(data):
            """
            Ensemble SuperGraph.
            :return: both SuperGraph networkx graphs (JSON format).
            """
            LOGGER.debug("[Socket request] ensemble_supergraph: {}".format(data))
            datasets = data["datasets"]
            groupBy = data["groupBy"].lower()
            nxg = self.callflow.request_ensemble(
                {"name": "supergraph", "groupBy": groupBy, "datasets": datasets}
            )
            result = json_graph.node_link_data(nxg)
            json_result = json.dumps(result)
            emit("ensemble_supergraph", json_result, json=True)

        @sockets.on("ensemble_similarity", namespace="/")
        def ensemble_similarity(data):
            """
            Similarity Matrix for all callgraphs in ensemble.
            :return: Pair-wise similarity matrix
            """
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
            LOGGER.debug(f"module_hierarchy {data}")
            nxg = self.callflow.request_ensemble(
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
            LOGGER.debug(f"parameter_projection: {data}")
            result = self.callflow.request_ensemble(
                {
                    "name": "projection",
                    "datasets": data["datasets"],
                    "targetDataset": data["targetDataset"],
                    "numOfClusters": data["numOfClusters"],
                }
            )
            emit("parameter_projection", result, json=True)

        # Not used now. But lets keep it. Will be useful.
        @sockets.on("parameter_information", namespace="/")
        def parameter_information(data):
            """
            TODO: Verify the return type.
            Parameter information
            :return: { "parameter1": [Array], "parameter2": [Array] ...  }.
            """
            LOGGER.debug(f"[Socket request] parameter_information: {data}")
            result = self.callflow.request(
                {"name": "run-information", "datasets": data["datasets"]}
            )
            emit("parameter_information", json.dumps(result), json=True)

        @sockets.on("compare", namespace="/")
        def compare(data):
            """
            Compare two super-graphs.
            :return: Gradients in some JSON format.
            """
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


if __name__ == "__main__":
    # if verbose, level = 1
    # else, level = 2
    callflow.init_logger(level=1)
    CallFlowServer()
