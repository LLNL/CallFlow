# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import os
import warnings

from flask import Flask, request, json, jsonify
from flask_cors import CORS, cross_origin
from networkx.readwrite import json_graph

import callflow
from .provider_base import BaseProvider
from callflow.utils.utils import NumpyEncoder


# Globals
CF_FOLDER_PATH = os.path.abspath(os.path.dirname(callflow.__file__))
STATIC_FOLDER_PATH = os.path.join(CF_FOLDER_PATH, "app/dist/")
LOGGER = callflow.get_logger(__name__)

# Create a Flask server.
app = Flask(__name__, static_url_path="", static_folder=STATIC_FOLDER_PATH)

# Enable CORS
cors = CORS(app, automatic_options=True)
app.config["CORS_HEADERS"] = "Content-Type"


# ------------------------------------------------------------------------------
# API Provider Class
# ------------------------------------------------------------------------------
class APIProvider(BaseProvider):
    """
    APIProvider class handles the incoming RESTFul requests for CallFlow.
        * It abstracts the requests into 3 categores:
            General: common requests for both ensemble and single.
                a) / - routes to index.html
                b) /init - GET request to load processed data from
                c) /supergraph - TBD....
            Single: requests for single dataset processing.
                a)
            Ensemble: requests for ensemble dataset processing.
                a)
                b) ...
    """

    def __init__(self, config: dict = None) -> None:
        """
        Constructor to APIProvider class.

        :param config: CallFlow config object
        """
        super().__init__(config)
        # self.production = production
        self.handle_routes()

    def start(self, host: str, port: int) -> None:
        """
        Launch the Flask application.

        :param host: host to run CallFlow API server
        :param port: port to run CallFlow API server
        :return: None
        """
        LOGGER.info("Starting the API service")
        app.run(host=host, port=port, threaded=True)

    # --------------------------------------------------------------------------
    @staticmethod
    def emit_json(endpoint: str, json_data: any) -> str:
        """
        Emit the json data to the endpoint

        :param endpoint: Endpoint to emit information to.
        :param json_data: Data to emit to the endpoint
        :return response: Response packed with data (in JSON format).
        """
        try:
            response = app.response_class(
                response=json.dumps(json_data, cls=NumpyEncoder),
                status=200,
                mimetype="application/json",
            )
            response.headers.add("Access-Control-Allow-Headers", "*")
            response.headers.add("Access-Control-Allow-Methods", "*")
            return response
        except ValueError:
            warnings.warn(f"[API: {endpoint}] emits no data.")
            return jsonify(isError=True, message="Error", statusCode=500)

    def handle_routes(self) -> None:  # noqa: C901
        """
        API endpoints
        """

        @app.route("/")
        @cross_origin()
        def index():
            return app.send_static_file("index.html")

        @app.route("/config", methods=["GET"])
        @cross_origin()
        def init():
            result = self.request_general({"name": "init"})
            return APIProvider.emit_json("config", result)

        @app.route("/summary", methods=["POST"])
        @cross_origin()
        def summary():
            data = request.json
            result = self.request_general(
                {
                    "name": "summary",
                    **data,
                }
            )
            return APIProvider.emit_json("summary", result)

        @app.route("/timeline", methods=["POST"])
        @cross_origin()
        def time_series():
            data = request.json
            result = self.request_general(
                {
                    "name": "timeline",
                    **data,
                }
            )
            return APIProvider.emit_json("timeline", result)

        @app.route("/single_supergraph", methods=["POST"])
        @cross_origin()
        def single_supergraph():
            data = request.json
            nxg = self.request_single({"name": "supergraph", **data})
            result = json_graph.node_link_data(nxg)
            return APIProvider.emit_json("single_supergraph", result)

        @app.route("/cct", methods=["POST"])
        @cross_origin()
        def single_cct():
            data = request.json
            nxg = self.request_general({"name": "cct", **data})
            result = json_graph.node_link_data(nxg)
            return APIProvider.emit_json("cct", result)

        @app.route("/split_ranks", methods=["POST"])
        @cross_origin()
        def split_mpi_distribution():
            data = request.json
            result = self.request_single(
                {
                    "name": "split_ranks",
                    **data,
                }
            )
            return APIProvider.emit_json("split_mpi_distribution", result)

        @app.route("/ensemble_supergraph", methods=["POST"])
        @cross_origin()
        def ensemble_supergraph():
            data = request.json
            nxg = self.request_ensemble({"name": "supergraph", **data})
            result = json_graph.node_link_data(nxg)
            return APIProvider.emit_json("ensemble_supergraph", result)

        @app.route("/similarity", methods=["POST"])
        @cross_origin()
        def similarity():
            data = request.json
            result = self.request_ensemble({"name": "similarity", **data})
            return APIProvider.emit_json("similarity", result)

        @app.route("/module_hierarchy", methods=["POST"])
        @cross_origin()
        def module_hierarchy():
            data = request.json
            nxg = self.request_ensemble({"name": "module_hierarchy", **data})
            result = json_graph.tree_data(nxg, root=data.get("node"))
            return APIProvider.emit_json("module_hierarchy", result)

        @app.route("/projection", methods=["POST"])
        @cross_origin()
        def parameter_projection():
            data = request.json
            result = self.request_ensemble({"name": "projection", **data})
            return APIProvider.emit_json("projection", result)

        @app.route("/compare", methods=["POST"])
        @cross_origin()
        def compare():
            data = request.json
            result = self.request_ensemble({"name": "compare", **data})
            return APIProvider.emit_json("compare", result)

        @app.route("/single_histogram", methods=["POST"])
        @cross_origin()
        def single_histogram():
            data = request.json
            result = self.request_single({"name": "histogram", **data})
            return APIProvider.emit_json("single_histogram", result)

        @app.route("/single_scatterplot", methods=["POST"])
        @cross_origin()
        def single_scatterplot():
            data = request.json
            result = self.request_single({"name": "scatterplot", **data})
            return APIProvider.emit_json("single_scatterplot", result)

        @app.route("/single_boxplots", methods=["POST"])
        @cross_origin()
        def single_boxplot():
            data = request.json
            result = self.request_single({"name": "boxplots", **data})
            return APIProvider.emit_json("single_boxplots", result)

        @app.route("/ensemble_histogram", methods=["POST"])
        @cross_origin()
        def ensemble_histogram():
            data = request.json
            result = self.request_ensemble({"name": "histogram", **data})
            return APIProvider.emit_json("ensemble_histogram", result)

        @app.route("/ensemble_scatterplot", methods=["POST"])
        @cross_origin()
        def ensemble_scatterplot():
            data = request.json
            result = self.request_ensemble({"name": "scatterplot", **data})
            return APIProvider.emit_json("ensemble_scatterplot", result)

        @app.route("/ensemble_boxplots", methods=["POST"])
        @cross_origin()
        def ensemble_boxplot():
            data = request.json
            result = self.request_ensemble({"name": "boxplots", **data})
            return APIProvider.emit_json("ensemble_boxplots", result)

        @app.route("/gradients", methods=["POST"])
        @cross_origin()
        def gradients():
            data = request.json
            result = self.request_ensemble({"name": "gradients", **data})
            return APIProvider.emit_json("gradients", result)


# ------------------------------------------------------------------------------
