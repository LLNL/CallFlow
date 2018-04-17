from flask import Flask, jsonify, render_template, send_from_directory, current_app
from hatchet import *
import os
import sys

app = Flask(__name__, static_url_path='/public')
app.__dir__ = os.path.join(os.path.dirname(os.getcwd()), 'src')

gf = GraphFrame()
gf.from_hpctoolkit('../data/calc-pi')


def construct_graph_object(gf):
  ret = {}
  for key, item in gf:
    print key 
    print "Inclusive Time: "
#    ret['inc'] = gf[['CPUTIME (usec) (I)']].get_group(key).apply(lambda x: x.to_json(orient='records'));
    ret['inc'] = str(gf[['CPUTIME (usec) (I)']].get_group(key).sum())
    print gf[['CPUTIME (usec) (I)']].get_group(key).sum()
    print gf[['CPUTIME (usec) (E)']].get_group(key).sum()
    
    print '\n'
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
  return jsonify(construct_graph_object(grouped_df))
  
#  return gf.graph.to_string(gf.graph.roots, gf.dataframe, threshold=0.0)

@app.route('/dataSetInfo')
def dataSetInfo():
  return jsonify({
    "g": 1
    })


  
if __name__ == '__main__':
    app.run(debug = True, use_reloader=True)
