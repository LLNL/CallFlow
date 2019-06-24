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

#!/usr/bin/env python

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
        self.config.callflow_dir = self.config.server_dir + '/.callflow'
        self.config.preprocess = self.args.preprocess
        
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
            dataset_dir = self.config.server_dir + '/.callflow/' + dataset['name']
            if not os.path.exists(dataset_dir):
                if self.debug:
                    print('Creating .callflow directory for dataset : {0}'.format(dataset['name']))
                os.makedirs(dataset_dir)

            files = ["entire_df.csv", "filter_df.csv", "entire_graph.json", "filter_graph.json"]
            for f in files:
                if not os.path.exists(dataset_dir + '/' + f):
                    os.mknod(dataset_dir + '/' + f)

    def create_socket_server(self):
        @sockets.on('init', namespace='/')
        def init():
            config_json = json.dumps(self.config, default=lambda o: o.__dict__)
            emit('init', config_json, json=True)


        @sockets.on('filter', namespace='/')
        def filter(data):
            if self.debug == True:
                self.print('[Request] Filter the dataset.', data)
            dataset = data['dataset']
            graphFormat = data['format']
            filterBy = data['filterBy']
            filterPerc = data['filterPerc']
            obj = {
                "name": "filter",
                "filterBy": filterBy,
                "filterPerc": filterPerc,
                "dataset1": dataset,
            }
            if(graphFormat == 'CCT'):
                groupByAttr = 'name'
                obj['groupBy'] = groupByAttr    
                g = self.callflow.update(obj)
            elif(graphFormat == 'Callgraph'):
                groupByAttr = 'module'
                obj['groupBy'] = groupByAttr
                g = self.callflow.update(obj)
            result = json_graph.node_link_data(g)
            emit('filter', result, json=True)

        @sockets.on('group', namespace='/')
        def group(data):
            if self.debug == True:
                self.print('[Request] Group the dataset.', data)
            dataset = data['dataset']
            graphFormat = data['format']
            print('[Group] Dataset: {0}, format: {1}'.format(dataset, graphFormat))
            obj = {
                "name": "group",
                "dataset1": dataset
            }
            if(graphFormat == 'CCT'):
                groupByAttr = 'name'
                obj['groupBy'] = groupByAttr
                g = self.callflow.update(obj)
            elif(graphFormat == 'Callgraph'):
                groupByAttr = 'module'
                obj['groupBy'] = groupByAttr
                g = self.callflow.update(obj)
            result = json_graph.node_link_data(g)
            emit('group', result, json=True)

        @sockets.on('diff', namespace='/')
        def diff(data):
            if self.debug == True:
                print('[Request] Diff the dataset.', data)
            dataset1 = data['dataset1']
            dataset2 = data['dataset2']
            graph_format = data['format']
            print('[Diff] Comapring {0} and {1}'.format(dataset1, dataset2))
            if(graph_format == 'CCT'):
                group_by_attr = 'default'
                g = self.callflow.update({
                    "name": 'diff',
                    "groupBy": group_by_attr,
                    "dataset1": dataset1,
                    "dataset2": dataset2
                })
            elif(graph_format == 'Callgraph'):
                group_by_attr = 'module'
                g = self.callflow.update({
                    "name": 'diff',
                    "groupBy": group_by_attr,
                    "dataset1": dataset1,
                    "dataset2": dataset2
                })
            result = json.dumps(g)
            emit('diff', result, json=True)

        @sockets.on('hierarchy', namespace='/')
        def module_hierarchy(data):
            if self.debug == True:
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
            if self.debug == True:
                self.print('[Request] Uncertainity of the dataset.')
            result = {}
            emit('uncertainity', result, json=True)

        @sockets.on('histogram', namespace="/")
        def histogram(data):
            if self.debug == True:
                self.print('[Request] Histogram of a Module', data['module'])
            dataset = data['dataset1']
            result = self.callflow.update({
                "name": "histogram",
                "dataset1": dataset,
                "module": data['module'],
            })            
            emit('histogram', result, json=True)

    def create_server(self):
        app.debug = True
        app.__dir__ = os.path.join(os.path.dirname(os.getcwd()), '')
        # App routes 
        @app.route('/')
        def root():
            print("App directory", app.__dir__)
            return send_from_directory(app.__dir__, 'index.html')
        
        @app.route('/splitLevel')
        def splitLevel():
            level = 3
            self.callflow.update('split-level', {
                "module": 'lulesh2.0',
                "level": 3
            })
            ret = []
            for idx, state in self.callflow.states.items():
                json_result = json_graph.node_link_data(state.g)
                ret.append(json_result)
            return json.dumps(ret)    

        @app.route('/getMeans')
        def getMeans():
            aggr_times = {}
            for idx, cfg in enumerate(self.cfgs):
                df = cfg.df
                pivot = pd.pivot_table(state.df, values=['CPUTIME (usec) (I)'], index=['module'], columns=['rank'])
                for idx, row in enumerate(pivot.iterrows()):
                    if(row[0] not in aggr_times):
                        aggr_times[row[0]] = []
                    aggr_times[row[0]].append(row[1].mean())
            return json.dumps(aggr_times)
        
        @app.route('/getCCT')
        def getCCT():
            ret = []
            self.ccts = self.create_ccts(self.gfs, 'default', '')
            ret = []
            for idx, cct in enumerate(self.ccts):
                ret.append(cct.json_graph)
            return json.dumps(ret)

        @app.route('/getDotCCT')
        def getDotCCT():
            ret = []
            self.create_ccts()
            for idx, gf in enumerate(self.gfs):
                self.ccts[idx].update('default-dot', '')
                ret.append(self.ccts[idx].cfg)
            return json.dumps(ret)
    
        @app.route('/splitCaller')
        def splitCaller():
            ret = []
            idList = json.loads(request.args.get('in_data'))
            self.callflow.update('split-caller', idList)
            return json.dumps(ret)

        @app.route('/getGraphEmbedding')
        def getGraphEmbedding():
            if len(self.ccts) == 0 :
                self.create_ccts()
            for idx, cct in enumerate(self.ccts):
                cct.update('graphml-format', str(self.config.paths[idx]).split('/')[-1])
            
        @app.route('/getHistogramData')
        def getHistogramData():
            data_json = json.loads(request.args.get('in_data'))
            n_index = data_json['n_index']
            mod_index = data_json['mod_index']
            
            sct = []
            for idx, cfg in enumerate(self.cfgs):
                df = cfg.state.df
                func_in_module = df[df.mod_index == mod_index]['name'].unique().tolist()
                for idx2, func in enumerate(func_in_module):
                    sct.append({
                        "dataset": cfg.dataset,
                        "name": func,
                        "inc" : df.loc[df['name'] == func]['CPUTIME (usec) (I)'].mean(),
                        "exc" : df.loc[df['name'] == func]['CPUTIME (usec) (E)'].mean(),
                        "dataset_index": idx
                    })
            sct_df = pd.DataFrame(sct)
            return sct_df.to_json(orient="columns")

        @app.route('/getFunctionLists')
        def getFunctionLists():
            data_json = json.loads(request.args.get('in_data'))
            n_index = data_json['n_index']
            mod_index = data_json['mod_index']            
            df = self.callflow.state.df
            entry_funcs = df[df.n_index == n_index]['callers'].values.tolist()[0]
            other_funcs = list(set(df[df.mod_index == mod_index]['name']))

            entry_funcs_json = []
            for func in entry_funcs:
                x_df = df[df.name == func]
                entry_funcs_json.append({
                    "name": func,
                    "value_inc": x_df['CPUTIME (usec) (I)'].values.tolist(),
                    "value_exc": x_df['CPUTIME (usec) (E)'].values.tolist(),
                    "component_path": x_df['component_path'].values.tolist()[0],
                    "group_path": x_df['group_path'].values.tolist()[0],
                    "n_index": x_df['n_index'].values.tolist()[0]
                })

            other_funcs_json = []
            for func in other_funcs:
                x_df = df[df.name == func]
                other_funcs_json.append({
                    "name": func,
                    "value_inc": x_df['CPUTIME (usec) (I)'].values.tolist(),
                    "value_exc": x_df['CPUTIME (usec) (E)'].values.tolist(),                    
                    "component_path": x_df['component_path'].values.tolist()[0],
                    "group_path": x_df['group_path'].values.tolist()[0],
                    "n_index": x_df['n_index'].values.tolist()[0]
                })

                
            return json.dumps({
                "entry_funcs": entry_funcs_json,
                "other_funcs": other_funcs_json
            })

      
            
                                  
if __name__ == '__main__':
    App()
