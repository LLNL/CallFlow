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

from flask import Flask, jsonify, render_template, send_from_directory, current_app, request
import os
import sys
import json
import uuid
import argparse
from flask_cors import CORS

from callflow import *
from configFileReader import * 
import utils
from logger import log
import networkx as nx
from networkx.readwrite import json_graph

app = Flask(__name__, static_url_path='/public')
CORS(app)

class App():
    def __init__(self):
        self.callflow_path = os.path.abspath(os.path.join(__file__, '../../..'))
        self.app = None # App state
        self.args = None # Arguments passed through the CLI
        self.ccts = []
        self.cfgs = [] # CallFlow graphs
        self.props = {
            'filterBy': 'IncTime',
        }
        self.debug = False # Debug gives time, other information
        
        self.create_parser()  # Parse the input arguments
        self.verify_parser()  # Raises expections if something is not provided. 
        
        self.config = configFileReader(self.args.config_file)
        self.callflow = CallFlow(self.config, self.props)
        self.create_server()
        app.run(debug = self.debug, use_reloader=True)
        
#         if self.args.filter:        
#             self.gfs = self.filter_gfs(True)
# #            self.cfgs = self.create_cfgs(self.gfs, 'default', '')
#             self.display_stats()
# #            self.write_gfs(self.gfs, self.cfgs)           

#        if not self.args.filter:
#            self.read_data()
        # self.ccts = self.create_ccts(self.gfs, 'default', '')
#        self.write_gfs_graphml()

    def create_parser(self):
        parser = argparse.ArgumentParser()
        parser.add_argument("--verbose", help="Display debug points")
        parser.add_argument("--config_file", help="Config file to read")
        parser.add_argument("--input_format", default="hpctoolkit", help="caliper | hpctoolkit")
        parser.add_argument("--filter", action="store_true", help="Filter the dataframe")
        parser.add_argument("--filterBy", default="IncTime", help="IncTime | ExcTime, [Default = IncTime] ")
        parser.add_argument("--filtertheta", default="0.01", help="Threshold [Default = 0.01]")
        self.args = parser.parse_args()
        self.debug = self.args.verbose

    def verify_parser(self):
        # Check if the config file is provided and exists! 
        if not self.args.config_file:
            log.error("Please provide a config file. To see options, use --help")
            raise Exception()
        else:
            if not os.path.isfile(self.args.config_file):
                log.error("Please check the config file path. There exists no such file in the path provided")
                raise Exception()

    #     # Parse the file (--file) according to the format. 
    # def parse_config_file(self): 

    #     if 'format' not in self.config.data:
    #         log.warn('File formats not provided. Automatically looking for the files with experiment')
    #         self.gfs_format = self.automatic_gfs_format_lookup(self.config.paths)
    #     else:
    #         self.gfs_format = self.config.format

    # # Find the file format automatically.  Automatic look up for the format
    # # args: paths (from config file)
    # # return : Array(gf_format)
    # # Todo: Write better regex to eliminate looping through mdb files
    # def automatic_gfs_format_lookup(self, paths):
    #     ret = []
    #     pattern = 'experiment*'
    #     for path in paths:
    #         filtered_path =  fnmatch.filter(os.listdir(path), pattern)
    #         for file in filtered_path:
    #             if file.endswith('.xml'):
    #                 ret.append('hpctoolkit')
    #             elif file.endswith('.json'):
    #                 ret.append('caliper')
    #                 log.info("Found formats = {0}".format(ret))
    #     return ret

        
    # Write graphframes to csv files
    def write_gfs(self, fgfs):
        for idx, fgf in enumerate(fgfs):
            datapath = str(self.config.paths[idx]).split('/')[-1] +'_filtered_d_{0}.json'.format(idx)
            log.info("Writing the filtered dataframe to {0}".format(datapath))
            fgf.dataframe.to_pickle(datapath)
            graphpath = str(self.config.paths[idx]).split('/')[-1] +'_filtered_g_{0}.json'.format(idx)
            log.info("Writing the filtered graph to {0}".format(graphpath))
            with open(graphpath, 'w') as gfile:
                json.dump(self.cfgs[idx], gfile)

    def read_data(self):
        self.gfs = []
        self.cfgs = []
        for idx, path in enumerate(self.config.paths):
            datapath = str(self.config.paths[idx]).split('/')[-1] +'_filtered_d_{0}.json'.format(idx)
            self.gfs.append(pd.read_pickle(datapath))
            graphpath = str(self.config.paths[idx]).split('/')[-1] +'_filtered_g_{0}.json'.format(idx)
            with open(graphpath) as g:
                js_graph = json.load(g)
            self.cfgs.append(json_graph.node_link_graph(js_graph))
        log.warn("Read from the data files")

    def create_server(self):
        app.debug = True
        app.__dir__ = os.path.join(os.path.dirname(os.getcwd()), '')
        # App routes 
        @app.route('/')
        def root():
            print("App directory", app.__dir__)
            return send_from_directory(app.__dir__, 'index.html')
        
        @app.route('/<path:filename>')
        def send_js(filename):
            return send_from_directory(os.path.join(app.__dir__, 'public'), filename)
        
        @app.route('/callgraph')
        def callgraph():
            group_by_attr = 'module'
            # Create the callflow graph frames from graphframes given by hatchet
            self.callflow.update('group', 'module')
            ret = []
            for idx, state in self.callflow.states.items():
                json_result = json_graph.node_link_data(state.g)
                ret.append(json_result)
            return json.dumps(ret)

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
                    
        @app.route('/getMaps')
        def getMaps():
            return json.dumps(self.callflow.state.map)

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

        @app.route('/getHierarchy')
        def getHierarchy():
            data_json = json.loads(request.args.get('in_data'))
            n_index = data_json['n_index']
            df = self.callflow.state.df
            cct_df = self.cctflow.state.df

            def module_hierarchy_graph(module):
                g = self.ccts[0].state.g
                print(g.nodes(data=True))
                hierarchy = nx.Graph()
                source_target_data = []
                nodes = [x for x,y in g.nodes(data=True) if 'module' in y and y['module'] == [module]]
                node = nodes[0]
                for idx, node in enumerate(nodes):
                    neighbors = sorted(g[node].items(), key=lambda edge: edge[1]['weight'])
                    for idx, n in enumerate(neighbors):
                        print("source: {0}, target: {1}".format(node, n[0]))
                        source_node = node
                        target_node = n[0]
                        weight = n[1]['weight']
                        level = idx
                        if(cct_df[cct_df['name'] == n[0]]['module'].unique()[0] != module):
                            type_node = 'exit'
                            level = -1
                            print('{0} is an exit node'.format(n[0]))
                        else:
                            type_node = 'normal'
                        source_target_data.append({
                            "source": source_node,
                            "target": target_node,
                            "weight": weight,
                            "level": level,
                            "type": type_node
                        })
                isExit = {}
                for idx, data in enumerate(source_target_data):
                    if data['level'] == -1:
                        isExit[data['target']] = True
                    else:
                        isExit[data['target']] = False
                return isExit

            mod_index = df[df['n_index'] == n_index]['mod_index'].values.tolist()[0]
            df = df[df.mod_index == mod_index]
            module = df.loc[df['n_index'] == n_index]['module'].unique().tolist()[0]            

            is_exit = module_hierarchy_graph(module)
            paths = []
            func_in_module = df.loc[df['mod_index'] == mod_index]['name'].unique().tolist()
            print("Number of functions inside the {0} module: {1}".format(module, len(func_in_module)))
            for idx, func in enumerate(func_in_module):
                if func not in is_exit:
                    print(func)
                    is_exit[func] = False
                else:
                    is_exit[func] = True
                paths.append({
                    "func": func,
                    "exit": is_exit[func],
                    "module": module,
                    "path": df.loc[df['name'] == func]['component_path'].unique().tolist()[0],
                    "inc_time" : df.loc[df['name'] == func]['CPUTIME (usec) (I)'].mean(),
                    "exclusive" : df.loc[df['name'] == func]['CPUTIME (usec) (E)'].mean(),
                    "imbalance_perc" : df.loc[df['name'] == func]['imbalance_perc'].mean(),
                    "component_level": df.loc[df['name'] == func]['component_level'].unique().tolist()[0],
                })
            paths_df = pd.DataFrame(paths)

            max_level = paths_df['component_level'].max()
            print("Max levels inside the node: {0}".format(max_level))
            
            return paths_df.to_json(orient="columns")
            
                                  
if __name__ == '__main__':
    App()
