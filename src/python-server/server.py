from flask import Flask, jsonify, render_template, send_from_directory, current_app
from hatchet import *
import os
import sys
import json
import uuid
import argparse
from hpctoolkit_format import *
from caliper_format import *
from configFileReader import * 
from Callflow_filter import *

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
        self.setup_variables() # Setup variables which are common to filter and server (like gf, config, etc)

        if not self.args.filter:
            self.create_server()
            self.launch()
        else:
            self.filter_gfs()
        
    def create_server(self):
        self.app = Flask(__name__, static_url_path='/public')
        self.app.debug = True
        self.app.__dir__ = os.path.join(os.path.dirname(os.getcwd()), '')
        
        # App routes 
        @self.app.route('/')
        def root():
            print "App directory", app.__dir__
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
                
    def create_parser(self):
        parser = argparse.ArgumentParser()
        parser.add_argument("--verbose", help="Display debug points")
        parser.add_argument("--input_file", help="Input file")
        parser.add_argument("--filter", action="store_true", help="Filter the dataframe")
        parser.add_argument("--filterBy", default="IncTime", help="IncTime | ExcTime, [Default = IncTime] ")
        parser.add_argument("--filtertheta", default="0.01", help="Threshold [Default = 0.01]")
        self.args = parser.parse_args()
        self.debug = self.args.verbose

    # Find the file format automatically. 
    def find_file_format(self, path):
        file_ext = None
        files = os.listdir(path)
        for file in files:
            if file.endswith('.xml'):
                file_ext = 'hpctoolkit'
            elif file.endswith('.json'):
                file_ext = 'caliper'
        return file_ext

    def setup_variables(self): 
        # Parse the file (--file) according to the format. 
        self.config = configFileReader(self.args.input_file)

        for path in self.config.paths:
            self.gfs_format.append(self.find_file_format(path))

    def filter_gfs(self):
        # Create the graph frames from the paths and corresponding format using hatchet
        gfs = self.create_gfs()
        fgfs = []
        
        # Filter graphframes based on threshold
        for gf in gfs:
            if self.args.filterBy == "IncTime":
                fgfs.append(byIncTime(gf))
                #fgfs.append(byIncTime(gf, self.args.filtertheta))
            elif self.args.filterBy == "ExcTime":
                fgfs.append(byExcTime(gf))
                #fgfs.append(Callflow_filter.byExcTime(gf, self.args.filtertheta))
            else:
                fgfs.append(gf)

        self.write_gfs(fgfs)
        
    # Write graphframes to csv files
    def write_gfs(self, fgfs):
        for idx, fgf in enumerate(fgfs):
            fgf.to_csv('calc-pi_filtered_{0}.csv'.format(idx))
            
    def launch_webapp(self):
        # Load the graph frames from the files. 
        self.gfs = self.load_gfs()

        # Create the callflow graph frames from graphframes given by hatchet
        self.cfgs = self.create_cfgs()

        # Launch the flask app
        self.app.run(debug = self.debug, use_reloader=False)
        
    # Loops over the config.paths and gets the graphframe from hatchet
    def create_gfs(self):
        ret = []
        print self.config.paths
        for idx, path in enumerate(self.config.paths):
            gf = GraphFrame()
            if self.gfs_format[idx] == 'hpctoolkit':
                gf.from_hpctoolkit(path)
            elif self.gfs_format[idx] == 'caliper':
                gf.from_caliper(path)
            ret.append(gf)
        return ret

    # Loops through the graphframes and creates callflow graph format
    def create_cfgs(self):
        ret = []
        for gf in self.gfs:
            if file_format == 'hpctoolkit':
                ret.append(hpctoolkit_format(gf))
            elif file_format == 'caliper':
                ret.append(caliper_callflow_format().run(gf))
        return ret
  


if __name__ == '__main__':
    CallFlow()
