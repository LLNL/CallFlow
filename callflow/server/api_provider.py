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
    def __init__(self, host: str, port: str, ensemble: bool) -> None:
        self.endpoints = Endpoints()
        app.run(host=host, port=port, threaded=True)

    
    @staticmethod
    def emit_json(endpoint: str, json_data: any) -> str:
        """
        Emit the json data to the endpoint
        """
        try: 
            if callflow.utils.is_valid_json(json_data):       
                json_result = json.dumps(json_data)
                return jsonify(isError= False,
                    message= "Success",
                    statusCode= 200,
                    data= json_result)
        except:
            warnings.warn("[Socket: config] emits no data")

    def _handle_general(self, parameter_list):
        """
        docstring
        """
        @app.route("/")
        def index():
            return app.send_static_file("index.html")

        @app.route("/init", methods=["POST"])
        def init():
            request_json = request.get_json(force=True)
            result = self.endpoints.init(request_json)
            APIProvider.emit_json(result)

        @app.route("/config", methods=['GET'])
        def config():
            result = self.endpoints.config()
            APIProvider.emit_json(result)