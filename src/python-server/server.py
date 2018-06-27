from flask import Flask, jsonify, render_template, send_from_directory, current_app
from hatchet import *
import os
import sys
import json
import uuid
import argparse
from hpctoolkit_format import *
from caliper_format import *

format = ""
gfs = []
graphs = {}
app = Flask(__name__, static_url_path='/public')
app.debug = True
app.__dir__ = os.path.join(os.path.dirname(os.getcwd()), '')

def parse_arguments():
  parser = argparse.ArgumentParser()
  parser.add_argument("--file_format", help="Format: caliper(.json) | hpctoolkit")
  parser.add_argument("--input_file", help="Input file")
  args = parser.parse_args()
  return args

# Input: JSON File
# Output: path to the data
def read_file(jsonfile):
  f = open(jsonfile, 'r')
  path = json.loads(f.read())['path']
  return path

# Input: paths array from JSON file
# Output: Array of graphFrames
def create_gf(paths, file_format):
  ret = []
  for i in range(0, len(paths)):
    gf = GraphFrame()
    if file_format == 'hpctoolkit':
      gf.from_hpctoolkit(paths[i])
    elif file_format == 'caliper':
      gf.from_caliper(paths[i])
    ret.append(gf)
  print gf.graph.to_string(gf.graph.roots, gf.dataframe, threshold=0.0)
  return ret

def caliper_format(gfs):
  ret = {}
  return ret

# App routes 
@app.route('/')
def root():
  print "App directory", app.__dir__
  return send_from_directory(app.__dir__, 'index.html')
                                   
@app.route('/<path:filename>')
def send_js(filename):
    return send_from_directory(os.path.join(app.__dir__, 'public'), filename)

@app.route('/getSankey')
def getSankey():
  return jsonify(graphs)
  
@app.route('/dataSetInfo')
def dataSetInfo():
  return jsonify({
    "g": 1
    })

if __name__ == '__main__':
  # Read arguments from command line
  args = parse_arguments()
  
  # Set the format (caliper | hpctoolkit)
  file_format = args.file_format
  
  # Parse the file (--file) according to the format. 
  paths = read_file(args.input_file)

  gf = GraphFrame()
  
  # Create the graph frame 
  gfs = create_gf(paths, file_format)

  # Parse using the hpctoolkit format
  if file_format == 'hpctoolkit':
    graphs = hpctoolkit_format().run(gfs);
  elif file_format == 'caliper':
    graphs = caliper_callflow_format().run(gfs);

  app.run(debug = True, use_reloader=True)
