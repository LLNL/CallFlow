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
        # self.verify_parser()

        self.debug = True
        self.production = False

        if (self.args.process):
            self.print("Pre-processing the datasets.")
            self.processPipeline()
        else:
            self.renderPipeline(self.args.runName)
            self.create_socket_server()
            if self.production == True:
                sockets.run(app, host="0.0.0.0", debug=self.debug, use_reloader=True)
            else:
                sockets.run(app, debug=False, use_reloader=True)

    def processPipeline(self):
        self.config = ConfigFileReader(self.args.config_dir + self.args.run + '.json')
        self.config.server_dir = os.getcwd()
        self.config.callflow_dir = (
            self.callflow_path + '/' + self.config.save_path + '/' + self.config.runName
        )
        self.config.process = self.args.process
        self.config.ensemble = self.args.ensemble

        self.create_dot_callflow_folder()

        if(self.config.ensemble):
            self.callflow = EnsembleCallFlow(self.config)
            # self.single_callflow = SingleCallFlow(self.config)
        else:
            self.single_callflow = SingleCallFlow(self.config)

    def renderPipeline(self, config_file_name):
        print(config_file_name)
        self.config = ConfigFileReader(self.args.config_dir + config_file_name + '.json')
        self.config.server_dir = os.getcwd()
        self.config.callflow_dir = (
            self.callflow_path + '/' + self.config.save_path + '/' + self.config.runName
        )
        self.config.ensemble = self.args.ensemble
        self.config.process = self.args.process

        if(self.config.ensemble):
            self.callflow = EnsembleCallFlow(self.config)
            # self.single_callflow = SingleCallFlow(self.config)
        else:
            self.single_callflow = SingleCallFlow(self.config)

    # Custom print function.
    def print(self, action, data={}):
        action = "{0}".format(action)
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
        parser.add_argument("--config_dir", help="Config file directory.")
        parser.add_argument(
            "--run", default="", help="Config file name to be processed."
        )
        parser.add_argument(
            "--ensemble", action="store_true", help="Ensemble mode processing."
        )
        parser.add_argument(
            "--process", action="store_true", help="Process mode. To preprocess at the required level of granularity, use the options --filter, --entire. If you are preprocessing multiple callgraphs, use --ensemble option."
        )
        parser.add_argument(
            "--runName", help="Run name."
        )
        self.args = parser.parse_args()
        print(self.args)
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
            print(dataset_dir)
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
        @sockets.on("init", namespace="/")
        def init(data):
            caseStudy = data['caseStudy']
            log.info(f"Case Study: {caseStudy}")
            # self.renderPipeline(caseStudy)
            self.config = self.callflow.request({
                "name":"init"
            })
            config_json = json.dumps(self.config, default=lambda o: o.__dict__)
            emit("init", config_json, json=True)

        @sockets.on("reset", namespace="/")
        def filter(data):
            if self.debug:
                self.print("Filter the dataset.", data)
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

        @sockets.on("single_callsite_data", namespace="/")
        def callsites(data):
            if self.debug:
                self.print("Callsite information: ", data)
            result = self.single_callflow.request(
                {
                    "name": "auxiliary",
                    "dataset": data["dataset"],
                    "sortBy": data['sortBy'],
                    "binCount": data['binCount'],
                    "module": data['module']
                }
            )
            emit("single_callsite_data", result, json=True)

        @sockets.on("ensemble_callsite_data", namespace="/")
        def callsites(data):
            if self.debug:
                self.print("Callsite information: ", data)
            result = self.callflow.request(
                {
                    "name": "auxiliary",
                    "datasets": data["datasets"],
                    "sortBy": data['sortBy'],
                    "binCount": data['binCount'],
                    "module": data['module']
                }
            )
            emit("ensemble_callsite_data", result, json=True)

        ################## CCT requests #########################
        @sockets.on("single_cct", namespace="/")
        def cct(data):
            if self.debug:
                self.print("CCT of the run", data)

            g = self.single_callflow.request(
                {
                    "name": "cct",
                    "dataset": data["dataset"],
                    "functionsInCCT": data["functionsInCCT"],
                }
            )
            result = json_graph.node_link_data(g)
            emit("single_cct", result, json=True)

        @sockets.on("comp_cct", namespace="/")
        def comp_cct(data):
            if self.debug:
                self.print("Comp-CCT for the two datasets.", data)
            g1 = self.callflow.request(
                {
                    "name": "cct",
                    "dataset1": data["dataset1"],
                    "functionInCCT": data["functionInCCT"],
                }
            )
            g2 = self.callflow.request(
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

        @sockets.on("ensemble_cct", namespace="/")
        def ensemble_cct(data):
            if self.debug:
                self.print("Ensemble-CCT for the datasets", data)

            ensemble_cct = self.callflow.request(
                {
                    "name": "ensemble_cct",
                    "datasets": data["datasets"],
                    "functionsInCCT": data["functionsInCCT"],
                }
            )
            result = json_graph.node_link_data(ensemble_cct)
            emit("ensemble_cct", result, json=True)


        ################## CCT requests #########################
        @sockets.on("single_supergraph", namespace="/")
        def single_supergraph(data):
            result = {}
            if self.debug:
                self.print("Single SuperGraph.", data)
            dataset = data["dataset"]
            groupBy = data["groupBy"].lower()
            nx_graph = self.single_callflow.request(
                {
                    "name": "supergraph",
                    "groupBy": groupBy,
                    "dataset": dataset
                }
            )
            result = json_graph.node_link_data(nx_graph)
            result = json.dumps(result)
            emit("single_supergraph", result, json=True)

        @sockets.on("ensemble_supergraph", namespace="/")
        def ensemble_supergraph(data):
            result = {}
            if self.debug:
                self.print("Ensemble SuperGraph.", data)
            datasets = data["datasets"]
            groupBy = data["groupBy"].lower()
            nx_graph = self.callflow.request(
                {
                    "name": "supergraph",
                    "groupBy": groupBy,
                    "datasets": datasets}
            )
            result = json_graph.node_link_data(nx_graph)
            json_result = json.dumps(result)
            emit("ensemble_supergraph", json_result, json=True)

        @sockets.on("ensemble_similarity", namespace="/")
        def ensemble_similarity(data):
            result = {}
            if self.debug:
                self.print("Similarity of the datasets", data)
            result = self.callflow.request(
                {
                    "name": "similarity",
                    "datasets": data["datasets"],
                    "algo": data["algo"],
                    "module": data["module"]
                }
            )
            emit("ensemble_similarity", result, json=True)

        @sockets.on("module_hierarchy", namespace="/")
        def module_hierarchy(data):
            if self.debug:
                self.print("Topology of the module", data)
            hierarchy_graph = self.callflow.request(
                {
                    "name": "hierarchy",
                    "datasets": data["datasets"],
                    "module": data["module"],
                }
            )
            result = json_graph.tree_data(hierarchy_graph, root=data['module'])
            json_result = json.dumps(result)
            emit("module_hierarchy", json_result, json=True)

        @sockets.on("parameter_projection", namespace="/")
        def parameter_projection(data):
            if self.debug:
                self.print("Projection for the runs", data)

            result = self.callflow.request(
                {
                    "name": "projection",
                    "datasets": data["datasets"],
                    "targetDataset": data['targetDataset'],
                    # "algo": data["algo"],
                }
            )
            emit("parameter_projection", result, json=True)

        @sockets.on("parameter_information", namespace="/")
        def parameter_information(data):
            if self.debug:
                self.print("Run information: ", data)

            result = self.callflow.request(
                {"name": "run-information", "datasets": data["datasets"]}
            )
            emit("parameter_information", json.dumps(result), json=True)


        @sockets.on('compare', namespace='/')
        def compare(data):
            if self.debug:
                self.print("Compare: ", data)
            result = self.callflow.request(
                {
                    "name": "compare",
                    "targetDataset": data["targetDataset"],
                    "compareDataset": data["compareDataset"],
                    "selectedMetric": data['selectedMetric']
                }
            )
            emit('compare', result, json=True)

        @sockets.on("split_caller", namespace="/")
        def split_caller(data):
            if self.debug:
                self.print("Split callgraph by rank", data)

            # result = self.callflow.update({
            #     "name": "split-caller",
            #     "dataset1": data['dataset1'],
            #     "split": data['split']
            # })
            emit("split_caller", {}, json=True)

        @sockets.on("split_callee", namespace="/")
        def split_caller(data):
            if self.debug:
                self.print("Split callgraph by rank", data)

            # result = self.callflow.update({
            #     "name": "split-caller",
            #     "dataset1": data['dataset1'],
            #     "split": data['split']
            # })
            emit("split_caller", {}, json=True)

        @sockets.on("ensemble_scatterplot", namespace="/")
        def ensemble_scatterplot(data):
            if self.debug:
                self.print("Dist-Scatterplot request for module.")
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
            emit("ensemble_scatterplot", result, json=True)

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