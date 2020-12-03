# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

# Library imports
import os
import warnings
from flask import Flask, request, json

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

        LOGGER.info("Starting the API service")
        app.run(host=host, port=port, threaded=True)

    @staticmethod
    def emit_json(endpoint: str, json_data: any) -> str:
        """
        Emit the json data to the endpoint
        """
        try:
            response = app.response_class(
                response=json.dumps(json_data),
                status=200,
                mimetype='application/json'
            )
            response.headers.add("Access-Control-Allow-Origin", "*")
            response.headers.add("Access-Control-Allow-Headers", "*")
            response.headers.add("Access-Control-Allow-Methods", "*")
            return response
        except:
            warnings.warn(f"[API: {endpoint}] emits no data.")
            return jsonify(isError=True, message="Error", statusCode=500, data={"a": 1})

    def _handle_general(self):
        """
        General API requests
        """

        @app.route("/")
        def index():
            return app.send_static_file("index.html")

        @app.route("/init", methods=["GET"])
        def init():
            result = self.callflow.request_general({"name": "init"})
            return APIProvider.emit_json("init", result)

        @app.route("/supergraph_data", methods=["POST"])
        def supergraph_data():
            data = request.json
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
            return APIProvider.emit_json("init", result)
