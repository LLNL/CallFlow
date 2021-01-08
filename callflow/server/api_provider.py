# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

# Library imports
import os
import warnings
from flask import Flask, request, json, jsonify
from networkx.readwrite import json_graph


# CallFlow imports
import callflow

STATIC_FOLDER_PATH = os.path.abspath("app/dist/")

# Create a Flask server.
app = Flask(__name__, static_url_path="", static_folder=STATIC_FOLDER_PATH)

LOGGER = callflow.get_logger(__name__)


class APIProvider:
    """
    """

    def __init__(
        self, callflow: callflow.CallFlow, host: str, port: str, ensemble: bool
    ) -> None:
        self.callflow = callflow
        self._handle_general()
        self._handle_single()
        self._handle_ensemble()

        LOGGER.info("Starting the API service")
        app.run(host=host, port=port, threaded=True)

    @staticmethod
    def emit_json(endpoint: str, json_data: any) -> str:
        """
        Emit the json data to the endpoint
        """
        try:
            response = app.response_class(
                response=json.dumps(json_data), status=200, mimetype="application/json"
            )
            response.headers.add("Access-Control-Allow-Origin", "*")
            response.headers.add("Access-Control-Allow-Headers", "*")
            response.headers.add("Access-Control-Allow-Methods", "*")
            return response
        except ValueError:
            warnings.warn(f"[API: {endpoint}] emits no data.")
            return jsonify(isError=True, message="Error", statusCode=500, data={"a": 1})

    def _handle_general(self):
        """
        General API requests
        """

        @app.route("/")
        def index():
            return app.send_static_file("index.html")

        @app.route("/init", methods=["POST"])
        def init():
            data = request.json
            result = self.callflow.request_general({"name": "supergraph_data", **data,})
            return APIProvider.emit_json("init", result)

    def _handle_single(self):
        """
        Single CallFlow API requests
        """

        @app.route("/single_supergraph", methods=["POST"])
        def single_supergraph():
            data = request.json
            nxg = self.callflow.request_single({"name": "supergraph", **data})
            result = json_graph.node_link_data(nxg)
            return APIProvider.emit_json("single_supergraph", result)

        @app.route("/single_cct", methods=["POST"])
        def single_cct():
            data = request.json
            nxg = self.callflow.request_single({"name": "cct", **data})
            result = json_graph.node_link_data(nxg)
            return APIProvider.emit_json("single_cct", result)

        @app.route("/split_mpi_distribution", methods=["POST"])
        def split_mpi_distribution():
            data = request.json
            result = self.callflow.request_single(
                {"name": "split_mpi_distribution", **data,}
            )
            return APIProvider.emit_json("split_mpi_distribution", result)

    def _handle_ensemble(self):
        """
        Ensemble CallFlow API requests
        """

        @app.route("/ensemble_supergraph", methods=["POST"])
        def ensemble_supergraph():
            data = request.json
            nxg = self.callflow.request_ensemble({"name": "supergraph", **data})
            result = json_graph.node_link_data(nxg)
            return APIProvider.emit_json("ensemble_supergraph", result)

        @app.route("/ensemble_cct", methods=["POST"])
        def ensemble_cct():
            data = request.json
            nxg = self.callflow.request_ensemble({"name": "ensemble_cct", **data})
            result = json_graph.node_link_data(nxg)
            return APIProvider.emit_json("ensemble_cct", result)

        @app.route("/similarity", methods=["POST"])
        def similarity():
            data = request.json
            result = self.callflow.request_ensemble({"name": "similarity", **data})
            return APIProvider.emit_json("similarity", result)

        @app.route("/module_hierarchy", methods=["POST"])
        def module_hierarchy():
            data = request.json
            nxg = self.callflow.request_ensemble({"name": "module_hierarchy", **data})
            result = json_graph.tree_data(nxg, root=data["module"])
            return APIProvider.emit_json("module_hierarchy", result)

        @app.route("/projection", methods=["POST"])
        def parameter_projection():
            data = request.json
            result = self.callflow.request_ensemble({"name": "projection", **data})
            return APIProvider.emit_json("projection", result)

        @app.route("/compare", methods=["POST"])
        def compare():
            data = request.json
            result = self.callflow.request_ensemble({"name": "compare", **data})
            return APIProvider.emit_json("compare", result)
