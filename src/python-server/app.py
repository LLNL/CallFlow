#!/usr/bin/env python

from flask import Flask, jsonify, render_template, send_from_directory, current_app
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
from CCT import *

class CallFlow():
    def __init__(self):
        self.app = None # App state
        self.args = None # Arguments passed through the CLI
        self.config = None # Config file json 
        self.gfs_format = [] # Graph formats in array for the paths
        self.gfs = [] # Graphframes returned by hatchet
        self.cfgs = [] # CallFlow graphs
        self.debug = False # Debug gives time, other information

        self.create_parser()  # Parse the input arguments
        self.verify_parser()  # Raises expections if something is not provided. 
        self.create_variables() # Setup variables which are common to filter and server (like gf, config, etc)
        
        if not self.args.filter:
            self.create_server()
            self.launch_webapp()
        else:
            self.gfs = self.create_gfs()
            self.fgfs = self.filter_gfs()
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
            self.gfs_format = utils.automatic_gfs_format_lookup(self.config.paths)
        else:
            self.gfs_format = self.config.format

    # Loops over the config.paths and gets the graphframe from hatchet
    def create_gfs(self):
        log.info("Creating graphframes....")
        t = time.time()
        ret = []
        for idx, path in enumerate(self.config.paths):
            gf = GraphFrame()
            if self.gfs_format[idx] == 'hpctoolkit':
                gf.from_hpctoolkit(path)
            elif self.gfs_format[idx] == 'caliper':                
                gf.from_caliper(path)
            ret.append(gf)
        log.info("[Create] Nodes count: {0} (time={1})".format(gf.dataframe.shape[0], time.time() - t))
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
                log.info('[Filter] By Inclusive time = {0} '.format(max_inclusive_time))
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
   
        
    # Write graphframes to csv files
    def write_gfs(self, fgfs):
        for idx, fgf in enumerate(fgfs):
            filepath = self.config.paths[idx] +'calc-pi_filtered_{0}.json'.format(idx)
            CaliperWriter(fgf, filepath)
                  
    # ==============================================================================
                # Callflow server 
    # ==============================================================================
    def create_server(self):
        self.app = Flask(__name__, static_url_path='/public')
        self.app.debug = True
        self.app.__dir__ = os.path.join(os.path.dirname(os.getcwd()), '')
        
        # App routes 
        @self.app.route('/')
        def root():
            print("App directory", app.__dir__)
            return send_from_directory(app.__dir__, 'index.html')
        
        @self.app.route('/<path:filename>')
        def send_js(filename):
            return send_from_directory(os.path.join(app.__dir__, 'public'), filename)
        
        @self.app.route('/getSankey')
        def getSankey():
            return jsonify(graphs)
        
        @self.app.route('/dataSetInfo')
        def dataSetInfo():
            return jsonify({
                "g": 1
            })

    def launch_webapp(self):
        # Load the graph frames from an intermediate format.
#        self.gfs = self.create_gfs()

        # Create the callflow graph frames from graphframes given by hatchet
        self.cfgs = self.create_cfgs()

        # Launch the flask app
        self.app.run(debug = self.debug, use_reloader=True)

    def load_gfs(self):
        return 0
        
    # Loops through the graphframes and creates callflow graph format
    def create_cfgs(self):        
        ret = []
        for idx, gf in enumerate(self.gfs):
            ret.append(callflow(gf))
        return ret
  
if __name__ == '__main__':
    CallFlow()
