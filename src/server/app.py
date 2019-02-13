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

from hatchet import *
from callflow import *
from configFileReader import * 
import utils
from logger import log
import networkx as nx

app = Flask(__name__, static_url_path='/public')

class App():
    def __init__(self):
        self.callflow_path = os.path.abspath(os.path.join(__file__, '../../..'))
        self.app = None # App state
        self.args = None # Arguments passed through the CLI
        self.config = None # Config file json 
        self.gfs_format = [] # Graph formats in array for the paths
        self.ccts = []
        self.gfs = [] # Graphframes returned by hatchet
        self.cfgs = [] # CallFlow graphs
        self.debug = False # Debug gives time, other information
        self.callflow = {}

        
        self.create_parser()  # Parse the input arguments
        self.verify_parser()  # Raises expections if something is not provided. 
        self.create_variables() # Setup variables which are common to filter and server (like gf, config, etc)

        self.gfs = self.create_gfs()
        
        if self.args.filter:        
            self.gfs = self.filter_gfs(True)
#            self.cfgs = self.create_cfgs(self.gfs, 'default', '')
            self.display_stats()
#            self.write_gfs(self.gfs, self.cfgs)           

#        if not self.args.filter:
#            self.read_data()
        self.create_server()
        self.launch_webapp()
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

    def create_variables(self): 
        # Parse the file (--file) according to the format. 
        self.config = configFileReader(self.args.config_file)

        if 'format' not in self.config.data:
            log.warn('File formats not provided. Automatically looking for the files with experiment')
            self.gfs_format = self.automatic_gfs_format_lookup(self.config.paths)
        else:
            self.gfs_format = self.config.format

    # Loops over the config.paths and gets the graphframe from hatchet
    def create_gfs(self):
        log.info("Creating graphframes....")
        t = time.time()
        ret = []
        for idx, path in enumerate(self.config.paths):
            path = os.path.abspath(os.path.join(self.callflow_path, path))
            gf = GraphFrame()
            if self.gfs_format[idx] == 'hpctoolkit':
                gf.from_hpctoolkit(path, int(self.config.nop))
            elif self.gfs_format[idx] == 'caliper':                
                gf.from_caliper(path)
            ret.append(gf)
            log.info(str(idx) + ":" + path)
            log.info("[Create] Rows in dataframe: {0} (time={1})".format(gf.dataframe.shape[0], time.time() - t))
        return ret

    # Find the file format automatically.  Automatic look up for the format
    # args: paths (from config file)
    # return : Array(gf_format)
    # Todo: Write better regex to eliminate looping through mdb files
    def automatic_gfs_format_lookup(self, paths):
        ret = []
        pattern = 'experiment*'
        for path in paths:
            filtered_path =  fnmatch.filter(os.listdir(path), pattern)
            for file in filtered_path:
                if file.endswith('.xml'):
                    ret.append('hpctoolkit')
                elif file.endswith('.json'):
                    ret.append('caliper')
                    log.info("Found formats = {0}".format(ret))
        return ret

    # ===============================================================================
            # Filtering Graphframes
    # ===============================================================================    
    def filter_gfs(self, write=False):
        # Create the graph frames from the paths and corresponding format using hatchet
        fgfs = []
        # Filter graphframes based on threshold
        for idx, gf in enumerate(self.gfs):            
            log.info("Filtering the dataframe!")
            t = time.time()
            if self.args.filterBy == "IncTime":
                max_inclusive_time = utils.getMaxIncTime(gf)
                filter_gf = gf.filter(lambda x: True if(x['CPUTIME (usec) (I)'] > 0.01*max_inclusive_time) else False)
            elif self.args.filterBy == "ExcTime":
                max_exclusive_time = utils.getMaxExcTime(gf)
                log.info('[Filter] By Exclusive time = {0})'.format(max_exclusive_time))
                filter_gf = gf.filter(lambda x: True if (x['CPUTIME (usec) (E)'] > 0.01*max_exclusive_time) else False)
            else:
                log.warn("Not filtering.... Can take forever. Thou were warned")
                filter_gf = gf
            log.info('[Filter] Removed {0} rows. (time={1})'.format(gf.dataframe.shape[0] - filter_gf.dataframe.shape[0], time.time() - t))
            log.info("Grafting the graph!")
            t = time.time()
            filter_gf = filter_gf.graft()
            log.info("[Graft] {1} rows left (time={0})".format(time.time() - t, filter_gf.dataframe.shape[0]))
            fgfs.append(filter_gf)
#            print(filter_gf.graph.to_string(None, filter_gf.dataframe))
        return fgfs

    # Display stats 
    def display_stats(self):
        for idx, gf in enumerate(self.gfs):
            log.warn('==========================')
            log.info('Stats: Dataset ({0}) '.format(idx))
            log.warn('==========================')
            max_inclusive_time = utils.getMaxIncTime(gf)
            max_exclusive_time = utils.getMaxExcTime(gf)
            avg_inclusive_time = utils.getAvgIncTime(gf)
            avg_exclusive_time = utils.getAvgExcTime(gf)
            num_of_nodes = utils.getNumOfNodes(gf)
            log.info('Max Inclusive time = {0} '.format(max_inclusive_time))
            log.info('Max Exclusive time = {0} '.format(max_exclusive_time))
            log.info('Avg Inclusive time = {0} '.format(avg_inclusive_time))
            log.info('Avg Exclusive time = {0} '.format(avg_exclusive_time))
            log.info('Number of nodes in CCT = {0}'.format(num_of_nodes))
        
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

    def launch_webapp(self):
        # Load the graph frames from an intermediate format.
        #        self.gfs = self.create_gfs()

        # Create the callflow graph frames from graphframes given by hatchet
        #        self.cfgs = self.create_cfgs(self.gfs, 'module')
        
        # Launch the flask app
        app.run(debug = self.debug, use_reloader=True)

    # Loops through the graphframes and creates callflow graph format
    def create_cfgs(self, gfs, action, group_by_attr):        
        ret = []
        for idx, gf in enumerate(gfs):
            self.callflow = CallFlow(gf)
            self.callflow.dataset = self.config.paths[idx]
            self.callflow.update(action, group_by_attr)
            ret.append(self.callflow)
        return ret

    # Loops through gfs and creates their respective CCTs.
    # Method exists because the CCTs are not create by default. 
    def create_ccts(self):
        for idx, gf in enumerate(self.gfs):
            temp = CallFlow(gf)
            self.ccts.append(temp)

    # ==============================================================================
                # Callflow server 
    # ==============================================================================
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
        
        @app.route('/getSankey')
        def getSankey():
            group_by_attr = json.loads(request.args.get('in_data'))
            # Create the callflow graph frames from graphframes given by hatchet
            self.cfgs = self.create_cfgs(self.gfs, 'groupBy', group_by_attr)
            ret_cfg = []
            for idx, cfg in enumerate(self.cfgs):
                ret_cfg.append(cfg.cfg)
            return json.dumps(ret_cfg)

        @app.route('/getCCT')
        def getCCT():
            ret = []
            self.create_ccts()
            for idx, gf in enumerate(self.gfs):
                self.ccts[idx].update('default', '')
                ret.append(self.ccts[idx].cfg)
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
            print(idList)
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
            mod_index = df[df['n_index'] == n_index]['mod_index'].values.tolist()[0]
            df = df[df.mod_index == mod_index]

            paths = []
            func_in_module = df.loc[df['mod_index'] == mod_index]['name'].unique().tolist()
            module = df.loc[df['n_index'] == n_index]['module'].unique().tolist()[0]
            print("Number of functions inside the {0} module: {1}".format(module, len(func_in_module)))
            for idx, func in enumerate(func_in_module):
                paths.append({
                    "module": module,
                    "path": df.loc[df['name'] == func]['component_path'].unique().tolist()[0],
                    "inc_time" : df.loc[df['name'] == func]['CPUTIME (usec) (I)'].mean(),
                    "exc_time" : df.loc[df['name'] == func]['CPUTIME (usec) (E)'].mean(),
                    "load_imb" : df.loc[df['name'] == func]['imbalance_perc'].mean(),
                    "component_level": df.loc[df['name'] == func]['component_level'].unique().tolist()[0],
                })
            paths_df = pd.DataFrame(paths)

            max_level = paths_df['component_level'].max()
            print("Max levels inside the node: {0}".format(max_level))
            
            return paths_df.to_json(orient="columns")
            
                                  
if __name__ == '__main__':
    App()
