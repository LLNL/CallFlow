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
         
        self.create_parser()
        self.create_server()
        self.launch()
         
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
            print graphs
            return jsonify(graphs)
        
        @self.app.route('/dataSetInfo')
        def dataSetInfo():
            return jsonify({
                "g": 1
            })
                
    def create_parser(self):
        parser = argparse.ArgumentParser()
        parser.add_argument("--verbose", help="Display debug points")
        parser.add_argument("--file_format", help="Format: caliper(.json) | hpctoolkit")
        parser.add_argument("--input_file", help="Input file")
        self.args = parser.parse_args()

        self.debug = self.args.verbose

    def launch(self):
        # Set the format (caliper | hpctoolkit)
        file_format = self.args.file_format
  
        # Parse the file (--file) according to the format. 
        self.config = configFileReader(self.args.input_file)
  
        # Create the graph frame 
        gfs = self.create_gf(paths, file_format)

        # Parse using the hpctoolkit format
        if file_format == 'hpctoolkit':
            self.cfg = hpctoolkit_format().run(gfs);
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
