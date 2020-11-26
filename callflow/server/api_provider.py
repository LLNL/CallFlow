# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

# Library imports
from callflow.server.endpoints import Endpoints
import json
import warnings
from flask import Flask, request, jsonify

# CallFlow imports
import callflow

# Create a Flask server.
app = Flask(__name__, static_url_path="")


class APIProvider:
    """

    """

    def __init__(
        self, callflow: callflow.CallFlow, host: str, port: str, ensemble: bool
    ) -> None:
        self.callflow = callflow
        self._handle_general()

        app.run(host=host, port=port, threaded=True)

    @staticmethod
    def emit_json(endpoint: str, json_data: any) -> str:
        """
        Emit the json data to the endpoint
        """
        try:
            # if callflow.utils.is_valid_json(json_data):
            # json_result = json.dumps(json_data)
            return jsonify(
                isError=False, message="Success", statusCode=200, data=json_data
            )
        except:
            warnings.warn(f"[API: {endpoint}] emits no data. Check the JSON format.")
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
