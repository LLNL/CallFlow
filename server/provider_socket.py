# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import json
import warnings

from flask import Flask
from flask_socketio import SocketIO, emit
from networkx.readwrite import json_graph

import callflow
from .provider_base import BaseProvider


LOGGER = callflow.get_logger(__name__)

app = Flask(__name__, static_url_path="")
sockets = SocketIO(app, cors_allowed_origins="*")


# ------------------------------------------------------------------------------
# Socket Provider Class (Not used).
# ------------------------------------------------------------------------------
class SocketProvider(BaseProvider):
    """
    Socket provider class for CallFlow
    """

    def __init__(self, config: dict = None) -> None:
        super().__init__(config)
        # self.production = production
        self.handle_general()
        self.handle_single()
        self.handle_ensemble()

    def start(self, host: str, port: int):
        LOGGER.info("Starting the Socket service")
        sockets.run(app, host=host, port=port, debug=False, use_reloader=True)

    # --------------------------------------------------------------------------
    @staticmethod
    def emit_json(endpoint: str, json_data: any) -> None:
        """Emit the json data to the endpoint

        :param endpoint: Endpoint to emit information to.
        :param json_data: Data to emit to the endpoint
        :return response: Response packed with data (in JSON format).
        """
        try:
            if json.loads(json_data):
                json_result = json.dumps(json_data)
                emit(endpoint, json_result, json=True)
            else:
                warnings.warn(f"[Socket: {endpoint}] has invalid JSON formatting.")

        except ValueError:
            warnings.warn(f"[Socket: {endpoint}] emits no data")

    def handle_general(self) -> None:
        """
        General socket requests.
        """

        @sockets.on("init", namespace="/")
        def init():
            """
            Essential data house for single callflow.
            :return: Config file (JSON Format).
            """
            result = self.request_general({"name": "init"})
            SocketProvider.emit_json("init", result)

        @sockets.on("supergraph_data", namespace="/")
        def ensemble_callsite_data(data):
            result = self.request_general(
                {
                    "name": "supergraph_data",
                    **data,
                }
            )
            SocketProvider.emit_json("ensemble_callsite_data", result)

        @sockets.on("reveal_callsite", namespace="/")
        def reveal_callsite(data):
            """
            Reveal the callpaths of selected callsites.
            :return: networkx graph (JSON)
            """
            if data["mode"] == "Single":
                nxg = self.request_single(
                    {
                        "name": "supergraph",
                        **data,
                    }
                )
            else:
                nxg = self.request_ensemble(
                    {
                        "name": "supergraph",
                        **data,
                    }
                )
            result = json_graph.node_link_data(nxg)
            SocketProvider.emit_json("reveal_callsite", result)

        @sockets.on("split_by_entry_callsites", namespace="/")
        def split_by_entry_callsites(data):
            """
            Reveal the entry callsite of selected module.
            :return: networkx graph (JSON)
            """
            if data["mode"] == "Single":
                nxg = self.request_single(
                    {
                        "name": "supergraph",
                        **data,
                        "split_entry_module": data["selectedModule"],
                    }
                )
            else:
                nxg = self.request_ensemble(
                    {
                        "name": "supergraph",
                        **data,
                        "split_entry_module": data["selectedModule"],
                    }
                )
            result = json_graph.node_link_data(nxg)
            SocketProvider.emit_json("reveal_callsite", result)

        @sockets.on("split_by_callees", namespace="/")
        def split_by_callees(data):
            """
            Reveal the callees of selected module.
            :return: networkx graph (JSON)
            """
            if data["mode"] == "Single":
                nxg = self.request_single(
                    {
                        "name": "supergraph",
                        **data,
                        "split_by_callees": data["selectedModule"],
                    }
                )
            else:
                nxg = self.request_ensemble(
                    {
                        "name": "supergraph",
                        **data,
                        "split_by_callees": data["selectedModule"],
                    }
                )
            result = json_graph.node_link_data(nxg)
            SocketProvider.emit_json("split_by_callees", result)

    def handle_single(self):
        @sockets.on("single_cct", namespace="/")
        def single_cct(data):
            """
            Single CCT.
            :return: CCT networkx graph (JSON format).
            """
            nxg = self.request_single({"name": "cct", **data})
            result = json_graph.node_link_data(nxg)
            SocketProvider.emit_json("cct", result)

        @sockets.on("single_supergraph", namespace="/")
        def single_supergraph(data):
            """
            Single SuperGraph.
            :return: both SuperGraph networkx graphs (JSON format).
            """
            nxg = self.request_single({"name": "supergraph", **data})
            result = json_graph.node_link_data(nxg)
            SocketProvider.emit_json("single_supergraph", result)

        @sockets.on("split_mpi_distribution", namespace="/")
        def split_mpi_rank(data):
            """
            Split a single run based on MPI distribution
            """
            result = self.request_single(
                {
                    "name": "split_mpi_distribution",
                    **data,
                }
            )
            SocketProvider.emit_json("split_mpi_distribution", result)

    def handle_ensemble(self):
        @sockets.on("ensemble_cct", namespace="/")
        def ensemble_cct(data):
            """
            Union of all CCTs.
            :return: CCT networkx graph (JSON format).
            """
            nxg = self.request_ensemble({"name": "supergraph", **data})
            result = json_graph.node_link_data(nxg)
            SocketProvider.emit_json("ensemble_cct", result)

        @sockets.on("ensemble_supergraph", namespace="/")
        def ensemble_supergraph(data):
            """
            Ensemble SuperGraph.
            :return: both SuperGraph networkx graphs (JSON format).
            """
            nxg = self.request_ensemble({"name": "ensemble_cct", **data})
            result = json_graph.node_link_data(nxg)
            SocketProvider.emit_json("ensemble_supergraph", result)

        @sockets.on("similarity", namespace="/")
        def ensemble_similarity(data):
            """
            Similarity Matrix for all callgraphs in ensemble.
            :return: Pair-wise similarity matrix
            """
            result = self.request_ensemble({"name": "similarity", **data})
            SocketProvider.emit_json("ensemble_similarity", result)

        @sockets.on("module_hierarchy", namespace="/")
        def module_hierarchy(data):
            """
            Module hierarchy of the supergraph.
            :return: CCT networkx graph (JSON format).
            """
            nxg = self.request_ensemble({"name": "module_hierarchy", **data})
            result = json_graph.tree_data(nxg, root=data["module"])
            SocketProvider.emit_json("module_hierarchy", result)

        @sockets.on("projection", namespace="/")
        def parameter_projection(data):
            """
            Parameter projection of the datasets.
            """
            result = self.request_ensemble({"name": "projection", **data})
            SocketProvider.emit_json("parameter_projection", result)

        @sockets.on("compare", namespace="/")
        def compare(data):
            """
            Compare two super-graphs.
            :return: Gradients in some JSON format.
            """
            result = self.request_ensemble({"name": "compare", **data})
            SocketProvider.emit_json("compare", result)


# ------------------------------------------------------------------------------
