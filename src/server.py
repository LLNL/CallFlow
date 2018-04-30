from flask import Flask, jsonify, render_template, send_from_directory, current_app
from hatchet import *
import os
import sys
import json
import uuid
import argparse
from hpctoolkit_format import *

format = ""
runtime = {}
label = {}
sankeyIDMap = {}
gfs = []
graphs = {}
app = Flask(__name__, static_url_path='/public')
app.__dir__ = os.path.join(os.path.dirname(os.getcwd()), 'src')

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
  return json.loads(f.read())['path']

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
      print gf
    ret.append(gf)
  return ret

def caliper_format(gfs):
  ret = {}
  return ret

# App routes 
@app.route('/')
def root():
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

  # Create the graph frame 
  gfs = create_gf(paths, file_format)

  # Parse using the hpctoolkit format
  if file_format == 'hpctoolkit':
    a = hpctoolkit_format()
    graphs = a.run(gfs)
  elif file_format == 'caliper':
    graphs = caliper_format(gfs)

  
    
  app.run(debug = True, use_reloader=True)
