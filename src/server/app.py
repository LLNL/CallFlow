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
from single.callflow import SingleCallFlow
from ensemble.callflow import EnsembleCallFlow
from pipeline.config_file_reader import ConfigFileReader
from utils.logger import log

app = Flask(__name__, static_url_path="/public")
sockets = SocketIO(app, cors_allowed_origins="*")

class App:
    def __init__(self):
        self.callflow_path = os.path.abspath(os.path.join(__file__, "../../.."))

        self.create_parser()
        self.verify_parser()

        self.debug = True

        self.config = ConfigFileReader(self.args.config)
        self.config.server_dir = os.getcwd()
        self.config.callflow_dir = (
            self.callflow_path + '/' + self.config.save_path + '/' + self.config.runName
        )
        self.config.process = self.args.process
        self.config.entire = self.args.entire
        self.config.filter = self.args.filter
        self.config.ensemble = self.args.ensemble
        self.config.production = self.args.production

        # Create the save path folder for saving the processed data.
        if self.config.process:
            self.print("Pre-processing the datasets.")
            self.create_dot_callflow_folder()

        if(self.config.ensemble):
            self.callflow = EnsembleCallFlow(self.config)
        else:
            self.callflow = SingleCallFlow(self.config)

        # Start server if preprocess is not called.
        if not self.config.process:
            self.callflow.request({
                "name": "init",
                "groupBy": self.config.group_by,
                "datasets": self.config.dataset_names
            })
            self.create_socket_server()
            if self.config.production == True:
                sockets.run(app, host="0.0.0.0", debug=self.debug, use_reloader=True)
            else:
                sockets.run(app, debug=False, use_reloader=True)

    # Custom print function.
    def print(self, action, data={}):
        action = "[Request] {0}".format(action)
        if bool(data):
            data_string = "Data: " + json.dumps(data, indent=4, sort_keys=True)
        else:
            data_string = ""
        log.info("[app.py] {0} {1}".format(action, data_string))

    # Parse the input arguments
    def create_parser(self):
        parser = argparse.ArgumentParser()
        parser.add_argument(
            "--verbose", action="store_true", help="Display debug points"
        )
        parser.add_argument(
            "--production", action="store_true", help="Make the server run on port 80 for production."
        )
        parser.add_argument("--config", help="Config file to read")
        parser.add_argument(
            "--input_format", default="hpctoolkit", help="caliper | hpctoolkit"
        )
        parser.add_argument(
            "--filter", action="store_true", help="Filter mode processing. Use --filterby to set the metric to filter by. --filtertheta to specify the threshold to filter by. "
        )
        parser.add_argument(
            "--entire", action="store_true", help="Entire mode processing."
        )
        parser.add_argument(
            "--ensemble", action="store_true", help="Ensemble mode processing."
        )
        parser.add_argument(
            "--filterBy",
            default="IncTime",
            help="IncTime | ExcTime, [Default = IncTime] ",
        )
        parser.add_argument(
            "--filtertheta", default="10", help="Threshold [Default = 10]"
        )
        parser.add_argument(
            "--process", action="store_true", help="Process mode. To preprocess at the required level of granularity, use the options --filter, --entire. If you are preprocessing multiple callgraphs, use --ensemble option."
        )
        self.args = parser.parse_args()
        self.debug = self.args.verbose

    # Raises expections if something is not provided
    def verify_parser(self):
        # Check if the config file is provided and exists!
        if not self.args.config:
            log.info("Please provide a config file. To see options, use --help")
            raise Exception()
        else:
            if not os.path.isfile(self.args.config):
                log.info(
                    "Please check the config file path. There exists no such file in the path provided"
                )
                raise Exception()

    def create_dot_callflow_folder(self):
        if self.debug:
            self.print(f"Create .callflow directiory.: {self.config.callflow_dir}")
        if not os.path.exists(self.config.callflow_dir):
            os.makedirs(self.config.callflow_dir)

        for dataset in self.config.datasets:
            dataset_dir = self.config.callflow_dir + "/" + dataset["name"]
            if not os.path.exists(dataset_dir):
                if self.debug:
                    print(
                        "Creating .callflow directory for dataset : {0}".format(
                            dataset["name"]
                        )
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
        @sockets.on("config", namespace="/")
        def config():
            self.config = self.callflow.request({
                "name":"config"
            })
            print(self.config)
            config_json = json.dumps(self.config, default=lambda o: o.__dict__)
            emit("init", config_json, json=True)

        @sockets.on("reset", namespace="/")
        def filter(data):
            if self.debug:
                self.print("[Request] Filter the dataset.", data)
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

        @sockets.on("tooltip", namespace="/")
        def tooltip(data):
            if self.debug:
                self.print("[Request] Tooltip of node", data)
            result = self.callflow.update(
                {
                    "name": "tooltip",
                    "dataset": data["dataset"],
                    "module": data["module"],
                }
            )

        @sockets.on("single_cct", namespace="/")
        def cct(data):
            if self.debug:
                self.print("[Request] CCT of the run", data)

            g = self.callflow.update(
                {
                    "name": "cct",
                    "dataset": data["dataset"],
                    "functionsInCCT": data["functionsInCCT"],
                }
            )
            result = json_graph.node_link_data(g)
            emit("cct", result, json=True)

        @sockets.on("splitcaller", namespace="/")
        def split_rank(data):
            if self.debug:
                self.print("[Request] Split callgraph by rank", data)

            # result = self.callflow.update({
            #     "name": "split-caller",
            #     "dataset1": data['dataset1'],
            #     "split": data['split']
            # })
            emit("splitcaller", {}, json=True)


        @sockets.on("dist_scatterplot", namespace="/")
        def distscatterplot(data):
            if self.debug:
                self.print("[Request] Dist-Scatterplot request for module.")
            result = self.callflow.request(
                {
                    "name": "scatterplot",
                    "datasets": data["datasets"],
                    "dataset": data["dataset"],
                    "dataset2": data["dataset2"],
                    "col": data["col"],
                    "catcol": data["catcol"],
                    "plot": data["plot"],
                }
            )
            emit("dist_scatterplot", result, json=True)

        @sockets.on("comp_cct", namespace="/")
        def compcct(data):
            if self.debug:
                self.print("[Request] Comp-CCT for the two datasets.", data)
            g1 = self.callflow.request(
                {
                    "name": "cct",
                    "dataset1": data["dataset1"],
                    "functionInCCT": data["functionInCCT"],
                }
            )
            g2 = self.callflow.update(
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

        @sockets.on("dist_cct", namespace="/")
        def distcct(data):
            if self.debug:
                self.print("[Request] Dist-CCT for the two datasets.", data)

            ensemble_cct = self.callflow.request(
                {
                    "name": "cct",
                    "datasets": data["datasets"],
                    "functionsInCCT": data["functionsInCCT"],
                }
            )
            result = json_graph.node_link_data(ensemble_cct)
            emit("cct", result, json=True)

        @sockets.on("dist_group", namespace="/")
        def dist(data):
            result = {}
            if self.debug:
                self.print("[Request] Dist the dataset.", data)
            datasets = data["datasets"]
            groupBy = data["groupBy"].lower()
            nx_graph = self.callflow.request(
                {"name": "group", "groupBy": groupBy, "datasets": datasets}
            )
            result = json_graph.node_link_data(nx_graph)
            result = json.dumps(result)
            # print(utils.is_json(json.dumps(result))
            emit("dist_group", result, json=True)

        @sockets.on("dist_group_highlight", namespace="/")
        def dist(data):
            result = {}
            if self.debug:
                self.print("[Group highlight] Dist the dataset.", data)
            datasets = data["datasets"]
            groupBy = data["groupBy"].lower()
            nx_graph = self.callflow.request(
                {"name": "group", "groupBy": groupBy, "datasets": datasets}
            )
            result = json_graph.node_link_data(nx_graph)
            adjList = nx.adjacency_matrix(nx_graph).todense()
            # result['adj_matrix'] = json.dumps({'test': adjList}, cls=NDArrayEncoder, indent=4)
            result = json.dumps(result)

            emit("dist_group_highlight", result, json=True)

        @sockets.on("dist_gradients", namespace="/")
        def gradients(data):
            result = {}
            if self.debug:
                self.print("[Request] Gradients for all datasets", data)
            result = self.callflow.request(
                {
                    "name": "gradients",
                    "datasets": data["datasets"],
                    "plot": data["plot"],
                }
            )
            emit("dist_gradients", result, json=True)

        @sockets.on("dist_similarity", namespace="/")
        def similarity(data):
            result = {}
            if self.debug:
                self.print("[Request] Similarity of the datasets", data)
            result = self.callflow.request(
                {
                    "name": "similarity",
                    "datasets": data["datasets"],
                    "algo": data["algo"],
                    "module": data["module"]
                }
            )
            emit("dist_similarity", result, json=True)

        @sockets.on("dist_hierarchy", namespace="/")
        def dist_hierarchy(data):
            if self.debug:
                self.print("[Request] Topology of the module", data)
            result = self.callflow.request(
                {
                    "name": "hierarchy",
                    "datasets": data["datasets"],
                    "module": data["module"],
                }
            )
            print(result)
            emit("dist_hierarchy", result, json=True)

        @sockets.on("dist_projection", namespace="/")
        def dist_projection(data):
            if self.debug:
                self.print("[Request] Projection for the runs", data)

            result = self.callflow.request(
                {
                    "name": "projection",
                    "datasets": data["datasets"],
                    "algo": data["algo"],
                }
            )
            emit("dist_projection", result, json=True)

        @sockets.on("run_information", namespace="/")
        def run_information(data):
            if self.debug:
                self.print("[Request] Run information: ", data)

            result = self.callflow.request(
                {"name": "run-information", "datasets": data["datasets"]}
            )
            print(result)
            emit("run_information", json.dumps(result), json=True)

        @sockets.on("dist_auxiliary", namespace="/")
        def run_information(data):
            if self.debug:
                self.print("[Request] Auxiliary: ", data)
            result = self.callflow.request(
                {
                    "name": "auxiliary",
                    "datasets": data["datasets"],
                    "sortBy": data['sortBy'],
                    "module": data['module']
                }
            )
            emit("auxiliary", result, json=True)

        @sockets.on('compare', namespace='/')
        def compare(data):
            if self.debug:
                self.print("[Request] Compare: ", data)
            result = self.callflow.request(
                {
                    "name": "compare",
                    "targetDataset": data["targetDataset"],
                    "compareDataset": data["compareDataset"],
                    "selectedMetric": data['selectedMetric']
                }
            )
            emit('compare', result, json=True)

        @sockets.on("ensemble_histogram", namespace="/")
        def disthistogram(data):
            if self.debug:
                self.print("[Request] Dist-Histogram request for module.")
            datasets = data['datasets']
            result = self.callflow.request(
                {
                    "name": "histogram",
                    "datasets": datasets,
                    "module": data["module"],
                }
            )
            emit("ensemble_histogram", result, json=True)

    def create_server(self):
        app.debug = True
        app.__dir__ = os.path.join(os.path.dirname(os.getcwd()), "")
        # App routes
        @app.route("/")
        def root():
            print("App directory", app.__dir__)
            return send_from_directory(app.__dir__, "index.html")


if __name__ == "__main__":
    App()
