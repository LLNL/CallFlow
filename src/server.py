from flask import Flask, jsonify, render_template, send_from_directory, current_app
from hatchet import *
import os

app = Flask(__name__, static_url_path='/public')
app.__dir__ = os.path.join(os.path.dirname(os.getcwd()), 'src')

@app.route('/')
def root():
  gf = GraphFrame()
  gf.from_hpctoolkit('../data/calc-pi')
  grouped_df = gf.dataframe.groupby('module')
  print grouped_df.dtype
  for key, item in grouped_df:
      print grouped_df[['CPUTIME (usec) (E)']].get_group(key)
  print gf.graph.to_string(gf.graph.roots, gf.dataframe, threshold=0.0)
  return send_from_directory(app.__dir__, 'index.html')
                                   
@app.route('/<path:filename>')
def send_js(filename):
    return send_from_directory(os.path.join(app.__dir__, 'public'), filename)
    
if __name__ == '__main__':
    app.run(debug = True, use_reloader=True)
