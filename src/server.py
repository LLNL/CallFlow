from flask import Flask, jsonify, render_template, send_from_directory, current_app
from hatchet import *
import os
import sys

app = Flask(__name__, static_url_path='/public')
app.__dir__ = os.path.join(os.path.dirname(os.getcwd()), 'src')

gf = GraphFrame()
gf.from_hpctoolkit('../data/calc-pi')

def sanitizeName(name):
  name_split = name.split('/')
  return name_split[len(name_split) - 1]


def construct_node_object(gf):
  ret = []
  sankeyID = 0;
  for key, item in gf:
    node = {}
    print key 
#    print gf.get_group(key)
#    ret['inc'] = gf[['CPUTIME (usec) (I)']].get_group(key).apply(lambda x: x.to_json(orient='records'));
    node['inc'] = str(gf[['CPUTIME (usec) (I)']].get_group(key).sum()[0])
    node['exc'] = str(gf[['CPUTIME (usec) (E)']].get_group(key).sum()[0])
    node['name'] = sanitizeName(key)
    node['sankeyID'] = sankeyID
    sankeyID = sankeyID + 1
    ret.append(node)
  print ret
  return ret

def construct_edge_object(gf):
  ret = []
  visited, queue = set(), gf.graph.roots
  while queue:
    node = queue.pop(0)
    if node.name not in ret:
      ret.append(node.name)
    if node not in visited:
      visited.add(node)
      queue.extend(node.children)
  print ret
  return ret
  
@app.route('/')
def root():
  return send_from_directory(app.__dir__, 'index.html')
                                   
@app.route('/<path:filename>')
def send_js(filename):
    return send_from_directory(os.path.join(app.__dir__, 'public'), filename)

@app.route('/getSankey')
def getSankey():
  grouped_df = gf.dataframe.groupby('module')
  construct_edge_object(gf)
  return jsonify(construct_node_object(grouped_df))


@app.route('/dataSetInfo')
def dataSetInfo():
  return jsonify({
    "g": 1
    })


  
if __name__ == '__main__':
    app.run(debug = True, use_reloader=True)
