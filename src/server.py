from flask import Flask, jsonify, render_template, send_from_directory, current_app
from hatchet import *
import os
import sys
import json

app = Flask(__name__, static_url_path='/public')
app.__dir__ = os.path.join(os.path.dirname(os.getcwd()), 'src')

def sanitizeName(name):
  name_split = name.split('/')
  return name_split[len(name_split) - 1]


def construct_node_object(gf):
  ret = []
  sankeyID = 0;
  for key, item in gf:
    node = {}
    #    print gf.get_group(key)
#    ret['inc'] = gf[['CPUTIME (usec) (I)']].get_group(key).apply(lambda x: x.to_json(orient='records'));
    node['inc'] = str(gf[['CPUTIME (usec) (I)']].get_group(key).sum()[0])
    node['exc'] = str(gf[['CPUTIME (usec) (E)']].get_group(key).sum()[0])
    node['name'] = sanitizeName(key)
    node['sankeyID'] = sankeyID
    sankeyID = sankeyID + 1
    ret.append(node)
  return ret

def assign_levels(gf):
  ret = {}
  ret['Root'] = 0
  visited, queue = set(), gf.graph.roots
  while queue:
    node = queue.pop(0)
    if node.module in ret.keys():
      ret[node.module] = ret[node.module]
    else:
      ret[node.module] = ret[node.parentModule] + 1

    if node not in visited:
      visited.add(node)
      queue.extend(node.children)
  return ret


def construct_edge_object(gf):
  ret = []
  edges = []
  edgeMap = {}
  count = 0 
  v, q = set(), gf.graph.roots
  while q:
    node = q.pop(0)
    
    source = node.parentModule
    target = node.module

    if source != None and target != None and level[source] != level[target]:
      edgeLabel = sanitizeName(source) + '-' + sanitizeName(target) 
      if edgeLabel  in edgeMap.keys():
        edgeMap[edgeLabel].count += 1
      else:
        print count
        edge = {}
        edge["sourceID"] = level[source]
        edge["targetID"] = level[target]
        edge["source"] = sanitizeName(source)
        edge["target"] = sanitizeName(target)
        edge = json.dumps(edge)
        edges.append(edge)
          
    if node.module not in ret:
      ret.append(node.module)

    if node not in v:
      v.add(node)
      q.extend(node.children)

  return edges
  
@app.route('/')
def root():
  return send_from_directory(app.__dir__, 'index.html')
                                   
@app.route('/<path:filename>')
def send_js(filename):
    return send_from_directory(os.path.join(app.__dir__, 'public'), filename)

@app.route('/getSankey')
def getSankey():
  grouped_df = gf.dataframe.groupby('module')
  edges = construct_edge_object(gf)
  nodes = construct_node_object(grouped_df)
  return jsonify({ "nodes": nodes, "edges": edges})


@app.route('/dataSetInfo')
def dataSetInfo():
  return jsonify({
    "g": 1
    })

gf = GraphFrame()
#gf.from_hpctoolkit('../data/lulesh-1/db-ampi4-100-1')
gf.from_hpctoolkit('../data/calc-pi')
grouped_df = gf.dataframe.groupby('module')
print gf.graph.to_string(gf.graph.roots, gf.dataframe, threshold=0.0)
level = assign_levels(gf)
gf = GraphFrame()
#gf.from_hpctoolkit('../data/lulesh-1/db-ampi4-100-1')
gf.from_hpctoolkit('../data/calc-pi')


if __name__ == '__main__':
  app.run(debug = True, use_reloader=True)
  
