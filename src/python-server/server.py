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

class CallFlow():
    def __init__(self):
        self.app = None
        self.args = None
        self.cfg = None
        self.gf = None
        self.debug = False
        self.config = None 
         
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
        
    def setup_variables(self):
        file_ext = os.path.splitext(self.args.input_file)[1]
        print file_ext
        # Set the format (caliper | hpctoolkit)
#        file_format = if self.args.file_format
  
        # Parse the file (--file) according to the format. 
        self.config = configFileReader(self.args.input_file)
  
        # Create the graph frame 
        gfs = self.create_gf(self.config.paths, file_format)

    def process(self):
        # Parse using the hpctoolkit format
        if file_format == 'hpctoolkit':
            self.cfg = hpctoolkit_format(gfs);
        elif file_format == 'caliper':
            self.cfg = caliper_callflow_format().run(gfs);
            
        self.app.run(debug = self.debug, use_reloader=False)
  

    # Input: paths array from JSON file
    # Output: Array of graphFrames
    def create_gf(self, paths, file_format):
        ret = []
        gf = GraphFrame()
        if file_format == 'hpctoolkit':
            gf.from_hpctoolkit(paths[0])
        elif file_format == 'caliper':
            gf.from_caliper(paths[0])
        ret.append(gf)
        return ret


if __name__ == '__main__':
    CallFlow()
