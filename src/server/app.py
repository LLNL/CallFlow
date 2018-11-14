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

#!/usr/bin/env pythonx

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

app = Flask(__name__, static_url_path='/public')

class App():
    def __init__(self):
        self.callflow_path = os.path.abspath(os.path.join(__file__, '../../..'))
        self.app = None # App state
        self.args = None # Arguments passed through the CLI
        self.config = None # Config file json 
        self.gfs_format = [] # Graph formats in array for the paths
        self.gfs = [] # Graphframes returned by hatchet
        self.cfgs = [] # CallFlow graphs
        self.debug = False # Debug gives time, other information
        self.callflow = {}
        
        self.create_parser()  # Parse the input arguments
        self.verify_parser()  # Raises expections if something is not provided. 
        self.create_variables() # Setup variables which are common to filter and server (like gf, config, etc)

        self.gfs = self.create_gfs()

        if self.args.filter:        
            self.gfs = self.filter_gfs()
            
        self.display_stats()
        self.create_server()
        self.launch_webapp()
        
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
        log.info("[Create] Nodes count: {0} (time={1})".format(gf.dataframe.shape[0], time.time() - t))
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
            log.info("Filtering....")
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
            log.info('[Filter] Removed {0} nodes. (time={1})'.format(gf.dataframe.shape[0] - filter_gf.dataframe.shape[0], time.time() - t))
            log.info("Graftin......")
            t = time.time()
            filter_gf = filter_gf.graft()
            log.info("[Graft] {1} nodes left (time={0})".format(time.time() - t, filter_gf.dataframe.shape[0]))
            fgfs.append(filter_gf)
        if write:
            self.write_gfs(fgfs)            
        return fgfs

    # Display stats 
    def display_stats(self):
        for idx, gf in enumerate(self.gfs):
            log.warn('==========================')
            log.info('Stats: Dataset () '.format(idx))
            log.warn('==========================')
            max_inclusive_time = utils.getMaxIncTime(gf)
            max_exclusive_time = utils.getMaxExcTime(gf)
            log.info('Inclusive time = {0} '.format(max_inclusive_time))
            log.info('Exclusive time = {0} '.format(max_exclusive_time))
            log.info('Number of nodes = {0}'.format(184))
        
    # Write graphframes to csv files
    def write_gfs(self, fgfs):
        for idx, fgf in enumerate(fgfs):
            filepath = self.config.paths[idx] +'calc-pi_filtered_{0}.json'.format(idx)
            CaliperWriter(fgf, filepath)
                  
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
            group_by_attr = str(request.args.get('group_by'))
            
            # Create the callflow graph frames from graphframes given by hatchet
            self.cfgs = self.create_cfgs(self.gfs, group_by_attr)
            return json.dumps(self.cfgs)

        @app.route('/getCCT')
        def getCCT():
            ret = []
            for idx, gf in enumerate(self.gfs):
                self.cct = CallFlow(gf)
                self.cct.update('default', '')
                ret.append(self.cct.cfg)
            return json.dumps(ret)
            
        @app.route('/getMaps')
        def getMaps():
            return json.dumps(self.callflow.state.map)

        @app.route('/splitCaller')
        def splitCaller():
            ret = []
            idList = request.args.get('idList')
#            print(idList, type(idList), type(request.args.get('idList')))
            self.callflow.update('split-caller', idList)
            return json.dumps(ret)
                
        @app.route('/getHistogramData')
        def getHistogramData():
            df_index = int(request.args.get('df_index'))
            dataMap = self.callflow.state.map

            for key in dataMap['incTime'].keys():
                if key == df_index:
                    return jsonify({
                        "inc": dataMap['incTime'][key],
                        "exc": dataMap['excTime'][key]
                        })

        @app.route('/getFunctionLists')
        def getFunctionLists():
            df_index = int(request.args.get('df_index'))
            mod_index = int(request.args.get('mod_index'))
            df = self.callflow.state.df
            entry_funcs = df[df.df_index == df_index]['callees'].values.tolist()[0]
            other_funcs = list(set(df[df.mod_index == mod_index]['name']))

            entry_funcs_json = []
            for func in entry_funcs:
                x_df = df[df.name == func]
                entry_funcs_json.append({
                    "name": func,
                    "value_inc": x_df['CPUTIME (usec) (I)'].values.tolist()[0],
                    "value_exc": x_df['CPUTIME (usec) (E)'].values.tolist()[0],
                    "df_index": x_df['df_index'].values.tolist()[0]
                })


            other_funcs_json = []
            for func in other_funcs:
                x_df = df[df.name == func]
                print(x_df)
                other_funcs_json.append({
                    "name": func,
                    "value_inc": x_df['CPUTIME (usec) (I)'].values.tolist()[0],
                    "value_exc": x_df['CPUTIME (usec) (E)'].values.tolist()[0],                    
                    "df_index": x_df['df_index'].values.tolist()[0]
                })

            

            return json.dumps({
                "entry_funcs": entry_funcs_json,
                "other_funcs": other_funcs_json
            })

            
    def launch_webapp(self):
        # Load the graph frames from an intermediate format.
#        self.gfs = self.create_gfs()

        # Create the callflow graph frames from graphframes given by hatchet
        self.cfgs = self.create_cfgs(self.gfs, 'module')
        
        # Launch the flask app
        app.run(debug = self.debug, use_reloader=True)

    # Loops through the graphframes and creates callflow graph format
    def create_cfgs(self, gfs, group_by_attr):        
        ret = []
        for idx, gf in enumerate(gfs):
            self.callflow = CallFlow(gf)
            self.callflow.update('groupBy', group_by_attr)
            ret.append(self.callflow.cfg)
        return ret
  
if __name__ == '__main__':
    App()
