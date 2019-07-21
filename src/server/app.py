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
from flask import Flask, jsonify, render_template, send_from_directory, current_app, request
from flask_socketio import SocketIO, emit, send
import os
import sys
import json
import uuid
import argparse
from flask_cors import CORS
from networkx.readwrite import json_graph

# Callflow imports
from callflow import *
from configFileReader import *
import utils
from logger import log

app = Flask(__name__, static_url_path='/public')
sockets = SocketIO(app)
CORS(app)

class App():
    def __init__(self):
        self.callflow_path = os.path.abspath(os.path.join(__file__, '../../..'))

        self.create_parser()
        self.verify_parser()

        self.debug = True
        self.config = configFileReader(self.args.config)
        self.config.server_dir = os.getcwd()
        self.config.callflow_dir = self.callflow_path + '/.callflow'
        self.config.preprocess = self.args.preprocess

        if self.config.preprocess:
            self.create_dot_callflow_folder()

        # self.create_dot_callflow_folder()
        self.callflow = CallFlow(self.config)

        # Start server if preprocess is not called.
        if not self.config.preprocess:
            self.create_socket_server()
            sockets.run(app, debug = self.debug, use_reloader=True)

    # Custom print function.
    def print(self, action, data = {}):
        action = 'Action: {0}'.format(action)
        if bool(data):
            data_string = 'Data: ' + json.dumps(data, indent=4, sort_keys=True)
        else:
            data_string = ''
        log.info('[app.py] {0} {1}'.format(action, data_string))

    # Parse the input arguments
    def create_parser(self):
        parser = argparse.ArgumentParser()
        parser.add_argument("--verbose", action="store_true", help="Display debug points")
        parser.add_argument("--config", help="Config file to read")
        parser.add_argument("--input_format", default="hpctoolkit", help="caliper | hpctoolkit")
        parser.add_argument("--filter", action="store_true", help="Filter the dataframe")
        parser.add_argument("--filterBy", default="IncTime", help="IncTime | ExcTime, [Default = IncTime] ")
        parser.add_argument("--filtertheta", default="10", help="Threshold [Default = 10]")
        parser.add_argument("--preprocess", action="store_true", help="Preprocess the file")
        self.args = parser.parse_args()
        self.debug = self.args.verbose

    # Raises expections if something is not provided
    def verify_parser(self):
        # Check if the config file is provided and exists!
        if not self.args.config:
            log.error("Please provide a config file. To see options, use --help")
            raise Exception()
        else:
            if not os.path.isfile(self.args.config):
                log.error("Please check the config file path. There exists no such file in the path provided")
                raise Exception()

    def create_dot_callflow_folder(self):
        if self.debug:
            self.print('Create .callflow directiory.')
        if not os.path.exists(self.config.callflow_dir):
            os.makedirs(self.config.callflow_dir)

        for dataset in self.config.datasets:
            dataset_dir = self.config.callflow_dir + '/' + dataset['name']
            if not os.path.exists(dataset_dir):
                if self.debug:
                    print('Creating .callflow directory for dataset : {0}'.format(dataset['name']))
                os.makedirs(dataset_dir)

            files = ["entire_df.csv", "filter_df.csv", "entire_graph.json", "filter_graph.json"]
            for f in files:
                if not os.path.exists(dataset_dir + '/' + f):
                    open(os.path.join(dataset_dir, f), 'w').close()
                    #os.mknod(dataset_dir + '/' + f)

    def create_socket_server(self):
        @sockets.on('init', namespace='/')
        def init():
            self.callflow.update({
                'name': "init",
            })
            config_json = json.dumps(self.config, default=lambda o: o.__dict__)
            emit('init', config_json, json=True)

        # @sockets.on('config')
        # def config(data):
        #     result = self.callflow.update({
        #         "name": "config",
        #         "datasets": data['datasets'],
        #     })
        #     emit('config', result, json=True)

        @sockets.on('reset', namespace='/')
        def filter(data):
            if self.debug:
                self.print('[Request] Filter the dataset.', data)
            dataset = data['dataset']
            filterBy = data['filterBy']
            filterPerc = data['filterPerc']
            obj = {
                "name": "reset",
                "filterBy": filterBy,
                "filterPerc": filterPerc,
                "dataset1": dataset,
            }   
            g = self.callflow.update(obj)
            result = json_graph.node_link_data(g)
            emit('reset', result, json=True)

        @sockets.on('group', namespace='/')
        def group(data):
            if self.debug:
                self.print('[Request] Group the dataset.', data)
            dataset = data['dataset']
            graphFormat = data['format']
            groupBy = data['groupBy'].lower()
            print('[Group] Dataset: {0}, format: {1}'.format(dataset, graphFormat))
            obj = {
                "name": "group",
                "groupBy": groupBy,
                "dataset1": dataset
            }
            g = self.callflow.update(obj)
            result = json_graph.node_link_data(g)
            emit('group', result, json=True)

        @sockets.on('diff', namespace='/')
        def diff(data):
            if self.debug:
                print('[Request] Diff the dataset.', data)
            dataset1 = data['dataset1']
            dataset2 = data['dataset2']
            print('[Diff] Comapring {0} and {1}'.format(dataset1, dataset2))
            groupBy = data['groupBy'].lower()
            g = self.callflow.update({
                "name": 'group',
                "groupBy": groupBy,
                "dataset1": dataset1,
                "dataset2": dataset2
            })
            result = json_graph.node_link_data(g)
            emit('diff', result, json=True)

        @sockets.on('hierarchy', namespace='/')
        def module_hierarchy(data):
            if self.debug:
                print('[Request] Module hierarchy of the dataset.', data)
            nid = data['nid']
            dataset = data['dataset1']
            result = self.callflow.update({
                "name": 'hierarchy',
                "nid": nid,
                "dataset1": dataset,
            })
            emit('hierarchy', result, json=True)

        @sockets.on('uncertainity', namespace='/')
        def uncertainity(data):
            if self.debug:
                self.print('[Request] Uncertainity of the dataset.')
            result = {}
            emit('uncertainity', result, json=True)

        @sockets.on('histogram', namespace="/")
        def histogram(data):
            if self.debug:
                self.print('[Request] Histogram of a Module', data['module'])
            dataset = data['dataset1']
            result = self.callflow.update({
                "name": "histogram",
                "dataset1": dataset,
                "module": data['module'],
            })
            emit('histogram', result, json=True)

        @sockets.on('scatterplot', namespace="/")
        def scatterplot(data):
            if self.debug:
                self.print('[Request] ScatterPlot of a Module', data['module'])
            dataset = data['dataset1']
            result = self.callflow.update({
                "name": "histogram",
                "dataset1": dataset,
                "module": data['module'],
            })
            emit('scatterplot', result, json=True)

        @sockets.on('miniHistogram', namespace="/")
        def histogram(data):
            if self.debug:
                self.print("[Request] Mini-histogram", data)
            dataset = data['dataset1']
            result = self.callflow.update({
                "name": "mini-histogram",
                "dataset1": dataset,
            })
            emit('miniHistogram', result, json=True)

        @sockets.on('hierarchy', namespace="/")
        def hierarchy(data):
            if self.debug:
                self.print("[Request] Hierarchy of module", data)
            result = self.callflow.update({
                "name": "hierarchy",
                "dataset1": data['dataset1'],
                "module": data['module']
            })
            emit('hierarchy', result, json=True)

        @sockets.on('tooltip', namespace="/")
        def tooltip(data):
            if self.debug:
                self.print("[Request] Tooltip of node", data)
            result = self.callflow.update({
                "name": "tooltip",
                "dataset1": data['dataset1'],
                "module": data["module"]
            })
        
        @sockets.on('cct', namespace="/")
        def cct(data):
            if self.debug:
                self.print("[Request] CCT of the run", data)

            g = self.callflow.update({
                "name": "cct",
                "dataset1": data['dataset'],
            })
            result = json_graph.node_link_data(g)
            emit('cct', result, json=True)

        @sockets.on('split-rank', namespace='/')
        def split_rank(data):
            if self.debug:
                self.print("[Request] Split callgraph by rank", data)
            
            result = self.callflow.update({
                "name": "split-rank",
                "dataset1": data['dataset'],
                "ids": data['ids']
            })
            emit('split-rank', result, json=True)

    def create_server(self):
        app.debug = True
        app.__dir__ = os.path.join(os.path.dirname(os.getcwd()), '')
        # App routes
        @app.route('/')
        def root():
            print("App directory", app.__dir__)
            return send_from_directory(app.__dir__, 'index.html')

if __name__ == '__main__':
    App()
