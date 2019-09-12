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
        self.config.entire = self.args.entire
        self.config.filter = self.args.filter

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
        parser.add_argument("--filter", action="store_true", help="Save the filtered dataframe.")
        parser.add_argument("--entire", action="store_true", help="Save the entire dataframe.")
        parser.add_argument("--filterBy", default="IncTime", help="IncTime | ExcTime, [Default = IncTime] ")
        parser.add_argument("--filtertheta", default="10", help="Threshold [Default = 10]")
        parser.add_argument("--preprocess", action="store_true", help="Preprocess the file")
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
                log.info("Please check the config file path. There exists no such file in the path provided")
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
            result = self.callflow.update(obj)
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
            print("Group graph: \n", result)
            emit('group', result, json=True)

    
        # @sockets.on('group', namespace='/')
        # def group(data):
        #     result = '{"directed":"True","multigraph":"False","graph":{"rootRunTimeInc":194595257},"nodes":[{"time (inc)":1.94516928E8,"time":0,"name":["libmonitor.so.0.0.0"],"type":["PF"],"n_index":[3],"module":["libmonitor.so.0.0.0"],"mod_index":[0],"children":["kripke"],"entry_functions":{"name":["<program root>"],"time":0,"time (inc)":1.94516928E8},"id":"libmonitor.so.0.0.0"},{"time (inc)":1.94148576E8,"time":5992,"name":["kripke"],"type":["PF"],"n_index":[4],"module":["kripke"],"mod_index":[1],"children":["Unknown(NA)"],"entry_functions":{"name":["main","Kernel_3d_DGZ::LTimes","Kernel_3d_DGZ::scattering","Kernel_3d_DGZ::LPlusTimes","SweepSubdomains","SweepComm::readySubdomains","ParallelComm::testRecieves","Kernel_3d_DGZ::sweep","Grid_Data::particleEdit"],"time":2.2576244E7,"time (inc)":4.9567268E7},"id":"kripke"},{"time (inc)":4.3454728E7,"time":6.1528596E7,"name":["Unknown(NA)"],"type":["PF","S","L"],"n_index":[389,520,529,531,533,535,536,537,538,800,674,1717,566,1718,1719,1720,1721,1722,1723,581,583,585,586,1484,1486,1487,1489,1491,1492,478,481,490,492,494,496,497],"module":["libmpi.so.12.0.5","Unknown(NA)","kripke"],"mod_index":[1,2,9],"children":["kripke:Kernel_3d_DGZ::LTimes","libc-2.17.so","kripke:Kernel_3d_DGZ::scattering","kripke:Kernel_3d_DGZ::LPlusTimes","kripke:SweepSubdomains","kripke:Grid_Data::particleEdit"],"entry_functions":{"name":"","time":[],"time (inc)":[]},"id":"Unknown(NA)"},{"time (inc)":1.94148576E8,"time":5992,"name":["kripke:Kernel_3d_DGZ::LTimes"],"type":["PF"],"n_index":[4],"module":["kripke"],"mod_index":[1],"entry_functions":{"name":["main","Kernel_3d_DGZ::LTimes","Kernel_3d_DGZ::scattering","Kernel_3d_DGZ::LPlusTimes","SweepSubdomains","SweepComm::readySubdomains","ParallelComm::testRecieves","Kernel_3d_DGZ::sweep","Grid_Data::particleEdit"],"time":2.2576244E7,"time (inc)":4.9567268E7},"id":"kripke:Kernel_3d_DGZ::LTimes"},{"time (inc)":2276253.5,"time":0,"name":["libc-2.17.so"],"type":["PF"],"n_index":[521,482],"module":["libc-2.17.so"],"mod_index":[6],"entry_functions":{"name":["__memset_sse2"],"time":0,"time (inc)":2276253.5},"id":"libc-2.17.so"},{"time (inc)":1.94148576E8,"time":5992,"name":["kripke:Kernel_3d_DGZ::scattering"],"type":["PF"],"n_index":[4],"module":["kripke"],"mod_index":[1],"entry_functions":{"name":["main","Kernel_3d_DGZ::LTimes","Kernel_3d_DGZ::scattering","Kernel_3d_DGZ::LPlusTimes","SweepSubdomains","SweepComm::readySubdomains","ParallelComm::testRecieves","Kernel_3d_DGZ::sweep","Grid_Data::particleEdit"],"time":2.2576244E7,"time (inc)":4.9567268E7},"id":"kripke:Kernel_3d_DGZ::scattering"},{"time (inc)":1.94148576E8,"time":5992,"name":["kripke:Kernel_3d_DGZ::LPlusTimes"],"type":["PF"],"n_index":[4],"module":["kripke"],"mod_index":[1],"entry_functions":{"name":["main","Kernel_3d_DGZ::LTimes","Kernel_3d_DGZ::scattering","Kernel_3d_DGZ::LPlusTimes","SweepSubdomains","SweepComm::readySubdomains","ParallelComm::testRecieves","Kernel_3d_DGZ::sweep","Grid_Data::particleEdit"],"time":2.2576244E7,"time (inc)":4.9567268E7},"id":"kripke:Kernel_3d_DGZ::LPlusTimes"},{"time (inc)":1.94148576E8,"time":5992,"name":["kripke:SweepSubdomains"],"type":["PF"],"n_index":[4],"module":["kripke"],"mod_index":[1],"children":["Unknown(NA):Loop@<unknown file> [kripke]:0"],"entry_functions":{"name":["main","Kernel_3d_DGZ::LTimes","Kernel_3d_DGZ::scattering","Kernel_3d_DGZ::LPlusTimes","SweepSubdomains","SweepComm::readySubdomains","ParallelComm::testRecieves","Kernel_3d_DGZ::sweep","Grid_Data::particleEdit"],"time":2.2576244E7,"time (inc)":4.9567268E7},"id":"kripke:SweepSubdomains"},{"time (inc)":4.3454728E7,"time":6.1528596E7,"name":["Unknown(NA):Loop@<unknown file> [kripke]:0"],"type":["PF","S","L"],"n_index":[389,520,529,531,533,535,536,537,538,800,674,1717,566,1718,1719,1720,1721,1722,1723,581,583,585,586,1484,1486,1487,1489,1491,1492,478,481,490,492,494,496,497],"module":["libmpi.so.12.0.5","Unknown(NA)","kripke"],"mod_index":[1,2,9],"children":["kripke:SweepComm::readySubdomains","kripke:Kernel_3d_DGZ::sweep"],"entry_functions":{"name":"","time":[],"time (inc)":[]},"id":"Unknown(NA):Loop@<unknown file> [kripke]:0"},{"time (inc)":1.94148576E8,"time":5992,"name":["kripke:SweepComm::readySubdomains"],"type":["PF"],"n_index":[4],"module":["kripke"],"mod_index":[1],"children":["Unknown(NA):Loop@<unknown file> [kripke]:0_1"],"entry_functions":{"name":["main","Kernel_3d_DGZ::LTimes","Kernel_3d_DGZ::scattering","Kernel_3d_DGZ::LPlusTimes","SweepSubdomains","SweepComm::readySubdomains","ParallelComm::testRecieves","Kernel_3d_DGZ::sweep","Grid_Data::particleEdit"],"time":2.2576244E7,"time (inc)":4.9567268E7},"id":"kripke:SweepComm::readySubdomains"},{"time (inc)":4.3454728E7,"time":6.1528596E7,"name":["Unknown(NA):Loop@<unknown file> [kripke]:0_1"],"type":["PF","S","L"],"n_index":[389,520,529,531,533,535,536,537,538,800,674,1717,566,1718,1719,1720,1721,1722,1723,581,583,585,586,1484,1486,1487,1489,1491,1492,478,481,490,492,494,496,497],"module":["libmpi.so.12.0.5","Unknown(NA)","kripke"],"mod_index":[1,2,9],"children":["libmpi.so.12.0.5"],"entry_functions":{"name":"","time":[],"time (inc)":[]},"id":"Unknown(NA):Loop@<unknown file> [kripke]:0_1"},{"time (inc)":2578232,"time":0,"name":["libmpi.so.12.0.5"],"type":["PF"],"n_index":[803,1716],"module":["libmpi.so.12.0.5"],"mod_index":[9],"entry_functions":{"name":["PMPI_Testany","PMPI_Reduce"],"time":0,"time (inc)":2608848.5},"id":"libmpi.so.12.0.5"},{"time (inc)":1.94148576E8,"time":5992,"name":["kripke:Kernel_3d_DGZ::sweep"],"type":["PF"],"n_index":[4],"module":["kripke"],"mod_index":[1],"entry_functions":{"name":["main","Kernel_3d_DGZ::LTimes","Kernel_3d_DGZ::scattering","Kernel_3d_DGZ::LPlusTimes","SweepSubdomains","SweepComm::readySubdomains","ParallelComm::testRecieves","Kernel_3d_DGZ::sweep","Grid_Data::particleEdit"],"time":2.2576244E7,"time (inc)":4.9567268E7},"id":"kripke:Kernel_3d_DGZ::sweep"},{"time (inc)":1.94148576E8,"time":5992,"name":["kripke:Grid_Data::particleEdit"],"type":["PF"],"n_index":[4],"module":["kripke"],"mod_index":[1],"entry_functions":{"name":["main","Kernel_3d_DGZ::LTimes","Kernel_3d_DGZ::scattering","Kernel_3d_DGZ::LPlusTimes","SweepSubdomains","SweepComm::readySubdomains","ParallelComm::testRecieves","Kernel_3d_DGZ::sweep","Grid_Data::particleEdit"],"time":2.2576244E7,"time (inc)":4.9567268E7},"id":"kripke:Grid_Data::particleEdit"}],"links":[{"weight":1.94595264E8,"source":"libmonitor.so.0.0.0","target":"kripke"},{"weight":1.93836256E8,"source":"kripke","target":"Unknown(NA)"},{"weight":3432889,"source":"kripke","target":"libmpi.so.12.0.5"},{"weight":1.94595264E8,"source":"Unknown(NA)","target":"kripke:Kernel_3d_DGZ::LTimes"},{"weight":2443120,"source":"Unknown(NA)","target":"libc-2.17.so"},{"weight":1.94595264E8,"source":"Unknown(NA)","target":"kripke:Kernel_3d_DGZ::scattering"},{"weight":1.94595264E8,"source":"Unknown(NA)","target":"kripke:Kernel_3d_DGZ::LPlusTimes"},{"weight":1.94595264E8,"source":"Unknown(NA)","target":"kripke:SweepSubdomains"},{"weight":1.94595264E8,"source":"Unknown(NA)","target":"kripke:Grid_Data::particleEdit"},{"weight":1.93836256E8,"source":"kripke:SweepSubdomains","target":"Unknown(NA):Loop@<unknown file> [kripke]:0"},{"weight":1.94595264E8,"source":"Unknown(NA):Loop@<unknown file> [kripke]:0","target":"kripke:SweepComm::readySubdomains"},{"weight":1.94595264E8,"source":"Unknown(NA):Loop@<unknown file> [kripke]:0","target":"kripke:Kernel_3d_DGZ::sweep"},{"weight":1.93836256E8,"source":"kripke:SweepComm::readySubdomains","target":"Unknown(NA):Loop@<unknown file> [kripke]:0_1"},{"weight":3432889,"source":"Unknown(NA):Loop@<unknown file> [kripke]:0_1","target":"libmpi.so.12.0.5"}]}'
        #     emit('group', result, json=True)

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
                self.print('[Request] Histogram of a Module', data['nid'])
            dataset = data['dataset1']
            result = self.callflow.update({
                "name": "histogram",
                "dataset1": dataset,
                "module": data['module'],
                "nid": data['nid'],
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
                "nid": data['nid'],
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
                "functionInCCT": data['functionInCCT'],
            })
            result = json_graph.node_link_data(g)
            emit('cct', result, json=True)

        @sockets.on('splitcaller', namespace='/')
        def split_rank(data):
            if self.debug:
                self.print("[Request] Split callgraph by rank", data)
            
            # result = self.callflow.update({
            #     "name": "split-caller",
            #     "dataset1": data['dataset1'],
            #     "split": data['split']
            # })
            emit('splitcaller', {}, json=True)

        @sockets.on('function', namespace='/')
        def function(data):
            if self.debug: 
                self.print('[Request] Function request for module', data)

            result = self.callflow.update({
                'name': 'function',
                'dataset1': data['dataset1'],
                'module': data['module'],
                'nid': data['nid']
            })
            emit('function', result, json=True)

        @sockets.on('diff_scatterplot', namespace='/')
        def diffscatterplot(data):
            if self.debug:
                self.print('[Request] Diff-Scatterplot request for module.')
            result = self.callflow.update_diff({
                "name": "scatterplot",
                "datasets": data['datasets'],
                "dataset1": data["dataset1"],
                "dataset2": data["dataset2"],
                'col': data['col'],
                'catcol': data['catcol'],
                'plot': data['plot']
            })
            emit('diff_scatterplot', result, json=True)

        @sockets.on('diff_histogram', namespace='/')
        def diffhistogram(data):
            if self.debug:
                self.print('[Request] Diff-Histogram request for module.')
            
            emit('diff_histogram', result, json=True)

        @sockets.on('diff_cct', namespace='/')
        def diffcct(data):
            if self.debug:
                self.print('[Request] Diff-CCT for the two datasets.', data)
            g1 = self.callflow.update({
                "name": "cct",
                "dataset1": data['dataset1'],
                "functionInCCT": data['functionInCCT'],
            })
            g2 = self.callflow.update({
                "name": "cct",
                "dataset1": data['dataset2'],
                "functionInCCT": data['functionInCCT'],
            })
            g1_result = json_graph.node_link_data(g1)
            g2_result = json_graph.node_link_data(g2)
            emit('diff_cct', {
                data['dataset1']: g1_result,
                data['dataset2']: g2_result
            }, json=True)

        @sockets.on('diff_init', namespace='/')
        def diffinit(data):
            if self.debug:
                self.print('[Request] Init the diff mode')
            groupBy = data['groupBy'].lower()
            datasets = data['datasets']
            self.callflow.update_diff({
                'name': 'init',
                'groupBy': groupBy,
                'datasets': datasets
            })

        @sockets.on('diff_group', namespace='/')
        def diff(data):
            result = {}
            if self.debug:
                self.print('[Request] Diff the dataset.', data)
            datasets = data['datasets']
            groupBy = data['groupBy'].lower()
            nx = self.callflow.update_diff({
                "name": 'group',
                "groupBy": groupBy,
                "datasets": datasets
            })
            # for idx, (dataset, nx) in enumerate(nx.items()):
            result = json_graph.node_link_data(nx)
            print(result)
            emit('diff_group', result, json=True)

        @sockets.on('diff_gradients', namespace='/')
        def gradients(data):
            result = {}
            if self.debug:
                self.print('[Request] Gradients for all datasets', data)
            result = self.callflow.update_diff({
                "name": "gradients",
                "datasets": data['datasets'],
                'plot': data['plot']
            })
            emit('diff_gradients', result, json=True)
            
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
