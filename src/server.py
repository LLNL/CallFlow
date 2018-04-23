from flask import Flask, jsonify, render_template, send_from_directory, current_app
from hatchet import *
import os
import sys
import json
import uuid

runtime = {}
label = {}
sankeyIDMap = {}
gfs = []
graphs = {}
app = Flask(__name__, static_url_path='/public')
app.__dir__ = os.path.join(os.path.dirname(os.getcwd()), 'src')


# Input: JSON File
# Output: path to the data
def read_file(jsonfile):
  f = open(jsonfile, 'r')
  return json.loads(f.read())['path']

# Input: paths array from JSON file
# Output: Array of graphFrames
def create_gf(paths):
  ret = []
  for i in range(0, len(paths)):
    gf = GraphFrame()
    gf.from_hpctoolkit(paths[i])
    ret.append(gf)
  return ret

# Input : ./xxx/xxx/yyy
# Output: yyy
def sanitizeName(name):
  if name == None:
    return None
  name_split = name.split('/')
  return name_split[len(name_split) - 1]  

def construct_nodes(gf, level):
  ret = []
  sankeyID = 1
  module_df = gf.dataframe.groupby('module')

  runtime['<program root>'] = 2998852.0
  label['<program root>'] = 'LM0'
  sankeyIDMap['<program root>'] = 0
  ret.append({ 'exc': 0.0, 'inc': 2998852.0, 'name': "<program root>", 'sankeyID': 1, 'lmID': 'LM0', 'level': 0 })
  nodeCount = 1;

  for key, item in module_df:
    node = {}
    node['inc'] = module_df[['CPUTIME (usec) (I)']].get_group(key).sum()[0]
    node['exc'] = module_df[['CPUTIME (usec) (E)']].get_group(key).sum()[0]
    node['name'] = sanitizeName(key)
    node['level'] = level[sanitizeName(key)]
    node['lmID'] = 'LM' + str(nodeCount)
    runtime[sanitizeName(key)] = module_df[['CPUTIME (usec) (E)']].get_group(key).sum()[0]    
    label[sanitizeName(key)] = 'LM' + str(nodeCount)
    sankeyIDMap[sanitizeName(key)] = sankeyID
    node['sankeyID'] = sankeyID
    sankeyID = sankeyID + 1
    nodeCount += 1
    ret.append(node)
  # label[''] = 'LM' + str(nodeCount)
  # sankeyIDMap[''] = nodeCount
  # ret.append({'exc': 0.0, 'inc': 0.0, 'name': '', 'sankeyID': sankeyID, 'lmID': label[''], 'level': 6 })
  return ret

def assign_levels(gf):
  ret = {}
  ret['<program root>'] = 0
  visited, queue = set(), gf.graph.roots
  while queue:
    node = queue.pop(0)
    # Not the right way
    current = sanitizeName(node.module)
    parent = sanitizeName(node.parentModule)
    if current in ret.keys():
      ret[current] = ret[current]
    else:
      ret[current] = ret[parent] + 1
        
    if node not in visited:
      visited.add(node)
      queue.extend(node.children)
  return ret


def construct_edges(gf, level):
  # Not sure why there is a need to initialize gf again 
  gf = GraphFrame()
  gf.from_hpctoolkit('../data/calc-pi')
  ret = []
  edges = []
  edgeMap = {}
  count = 0 
  v, q = set(), gf.graph.roots
  while q:
    node = q.pop(0)
    
    source = node.parentModule
    target = node.module

    source = sanitizeName(source)
    target = sanitizeName(target)

    if source != None and target != None and level[source] != level[target]:
      edgeLabel = source + '-' + target 
      edge = {}
      edge['sourceInfo'] = {
        'level' : level[source],
        'label': label[source],
        'name': source
      }
      edge['sourceID'] = sankeyIDMap[source]
      edge['targetInfo'] = {
        'level': level[target],
        'label': label[target],
        'name': target
      }
      edge['targetID'] = sankeyIDMap[target]
      edge['value'] = runtime[source]
      edgeMap[edgeLabel] = count
      edges.append(edge)
      count += 1
          
    if node.module not in ret:
      ret.append(node.module)

    if node not in v:
      v.add(node)
      q.extend(node.children)
  return edges

# Input : [<GraphFrame>, <GraphFrame>,...]
# Output: { graphs: [{ nodes: [], edges: [] }, ...] } 
def callflow_format(gfs):
  ret = {}
  graphs = []
  graphID = 0
  for gf in gfs:
    print gf.graph.to_string(gf.graph.roots, gf.dataframe, threshold=0.0)
    level = assign_levels(gf)
    nodes = construct_nodes(gf, level)
    edges = construct_edges(gf, level)
    graphs.append({ "nodes": nodes, "edges": edges, "graphID": graphID })
    graphID += 1
  ret = { "graphs" : graphs }
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
  paths = read_file(sys.argv[1])
  gfs = create_gf(paths)
  graphs = callflow_format(gfs)
  app.run(debug = True, use_reloader=True)
