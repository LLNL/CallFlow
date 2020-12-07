# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# Library imports
import callflow
from callflow.server.endpoints import Endpoints

import json
import warnings
from flask import Flask
from flask_socketio import SocketIO, emit
from networkx.readwrite import json_graph

app = Flask(__name__, static_url_path="")
sockets = SocketIO(app, cors_allowed_origins="*")

LOGGER = callflow.get_logger(__name__)


class SocketProvider:
    """Socket provider class for CallFlow

    Keyword arguments:
    ensemble -- True, if number of datasets > 1, else False.
    """

    def __init__(self, host: str, port: str, ensemble: bool) -> None:
        self.handle_general()
        self.handle_single()
        if ensemble:
            self.handle_ensemble()

        sockets.run(
            app,
            host=host,
            debug=False,
            use_reloader=True,
            port=port,
        )

    @staticmethod
    def emit_json(socket_id: str, json_data: any) -> None:
        """
        Package JSON and emit the converted data JSON.
        """
        try:
            if callflow.utils.is_valid_json(json_data):
                json_result = json.dumps(json_data)
                emit("", json_result, json=True)
            else:
                emit("config", json_data, json=False)
        except ValueError:
            warnings.warn("[Socket: config] emits no data")

    def handle_general(self) -> None:
        """
        General socket requests.
        """

        @sockets.on("reset", namespace="/")
        def reset(data):
            """
            # TODO: This might have to be deleted.
            """
            LOGGER.debug("[Socket request] reset: {}".format(data))
            result = self.callflow.request(
                {
                    "name": "reset",
                    "filterBy": data["filterBy"],
                    "filterPerc": data["filterPerc"],
                    "dataset1": data["dataset"],
                }
            )
            SocketProvider.emit_json("reset", result)

        @sockets.on("config", namespace="/")
        def config(data):
            result = self.callflow.request_single({"name": "init"})
            SocketProvider.emit_json("config", result)

        @sockets.on("init", namespace="/")
        def init(data):
            """
            Essential data house for single callflow.
            :return: Config file (JSON Format).
            """
            result = Endpoints.init(data=data)
            SocketProvider.emit_json("init", result)

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
            SocketProvider.emit_json("ensemble_callsite_data", result)

        @sockets.on("reveal_callsite", namespace="/")
        def reveal_callsite(data):
            """
            Reveal the callpaths of selected callsites.
            :return: networkx graph (JSON)
            """
            LOGGER.debug(f"[Socket request] reveal_callsite: {data}")
            if data["mode"] == "Single":
                nxg = self.callflow.request_single(
                    {
                        "name": "supergraph",
                        "groupBy": "module",
                        "dataset": data["dataset"],
                        "reveal_callsites": data["reveal_callsites"],
                    }
                )
                result = json_graph.node_link_data(nxg)
            elif data["mode"] == "Ensemble":
                nxg = self.callflow.request_ensemble(
                    {
                        "name": "supergraph",
                        "groupBy": "module",
                        "datasets": data["datasets"],
                        "reveal_callsites": data["reveal_callsites"],
                    }
                )
                result = json_graph.node_link_data(nxg)
            else:
                result = {}
            SocketProvider.emit_json("reveal_callsite", result)

        @sockets.on("split_by_entry_callsites", namespace="/")
        def split_by_entry_callsites(data):
            """
            Reveal the entry callsite of selected module.
            :return: networkx graph (JSON)
            """
            LOGGER.debug("Split by entry: {}".format(data))
            if data["mode"] == "Single":
                nxg = self.callflow.request_single(
                    {
                        "name": "supergraph",
                        "groupBy": "module",
                        "dataset": data["dataset"],
                        "split_entry_module": data["selectedModule"],
                    }
                )
                result = json_graph.node_link_data(nxg)
            elif data["mode"] == "Ensemble":
                nxg = self.callflow.request_ensemble(
                    {
                        "name": "supergraph",
                        "groupBy": "module",
                        "datasets": data["datasets"],
                        "split_entry_module": data["selectedModule"],
                    }
                )
                result = json_graph.node_link_data(nxg)
            else:
                result: dict = {}

            SocketProvider.emit_json("reveal_callsite", result)

        @sockets.on("split_by_callees", namespace="/")
        def split_by_callees(data):
            """
            Reveal the callees of selected module.
            :return: networkx graph (JSON)
            """
            LOGGER.debug("Split by callees: {}".format(data))
            if data["mode"] == "Single":
                nxg = self.callflow.request_single(
                    {
                        "name": "supergraph",
                        "groupBy": "module",
                        "dataset": data["dataset"],
                        "split_by_callees": data["selectedModule"],
                    }
                )
                result = json_graph.node_link_data(nxg)
            elif data["mode"] == "Ensemble":
                nxg = self.callflow.request_ensemble(
                    {
                        "name": "supergraph",
                        "groupBy": "module",
                        "datasets": data["datasets"],
                        "split_by_callees": data["selectedModule"],
                    }
                )
                result = json_graph.node_link_data(nxg)
            else:
                result = {}
            SocketProvider.emit_json("split_by_callees", result)

    def handle_single(self):
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
            SocketProvider.emit_json("auxiliary", result)

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
            SocketProvider.emit_json("cct", result)

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
            SocketProvider.emit_json("single_supergraph", result)

    def handle_ensemble(self):
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
            SocketProvider.emit_json("ensemble_cct", result)

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
            SocketProvider.emit_json("ensemble_supergraph", result)

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
            SocketProvider.emit_json("ensemble_similarity", result)

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
            SocketProvider.emit_json("module_hierarchy", result)

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
            SocketProvider.emit_json("parameter_projection", result)

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
            SocketProvider.emit_json("parameter_information", result)

        @sockets.on("compare", namespace="/")
        def compare(data):
            """
            Compare two super-graphs.
            :return: Gradients in some JSON format.
            """
            LOGGER.debug("[Socket request] compare_supergraph {data}")
            result = self.callflow.request_ensemble(
                {
                    "name": "compare",
                    "targetDataset": data["targetDataset"],
                    "compareDataset": data["compareDataset"],
                    "selectedMetric": data["selectedMetric"],
                }
            )
            SocketProvider.emit_json("compare", result)

        @sockets.on("split_mpi_distribution", namespace="/")
        def split_mpi_rank(data):
            """
            Split a single run based on MPI distribution
            """
            LOGGER.debug("[Socket request] compare_supergraph {data}")
            result = self.callflow.request_single(
                {
                    "name": "split_mpi_distribution",
                    "dataset": data["dataset"],
                    "ranks": data["ranks"],
                }
            )
            SocketProvider.emit_json("split_mpi_distribution", result)
