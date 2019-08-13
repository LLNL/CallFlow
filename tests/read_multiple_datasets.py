from hatchet import *
import pandas as pd
import numpy as np
from state import State
import matplotlib.pyplot as plt
import json
import utils
import networkx as nx
from ast import literal_eval as make_tuple

def replace_str_with_Node(df, graph):
    mapper = {}
    def dfs_recurse(root):
        for node in root.children: 
            mapper[node.callpath[-1]] = Node(node.nid, node.callpath, None)
            dfs_recurse(node)
    for root in graph.roots:
        mapper[root.callpath[-1]] = Node(root.nid, root.callpath, None)
        dfs_recurse(root)
    df['node'] = df['node'].apply(lambda node: mapper[node] if node in mapper else '')
    return df

def read_gf(name):
    dir_name = "/Users/jarus/ucd/Research/Visualisation/projects/CallFlow/.callflow/"
    state = State()
    path = dir_name + name
    
    df_filepath = path + '/filter_df.csv'
    entire_df_filepath = path + '/entire_df.csv'
    group_df_filepath = path + '/group_df.csv'
    graph_filepath = path + '/filter_graph.json'
    entire_graph_filepath = path + '/entire_graph.json'   

    with open(graph_filepath, 'r') as graphFile:
        data = json.load(graphFile)

    state.gf = GraphFrame()
    state.gf.from_literal(data)

    with open(entire_graph_filepath, 'r') as entire_graphFile:
        entire_data = json.load(entire_graphFile)
            
    state.entire_gf = GraphFrame()
    state.entire_gf.from_literal(entire_data)
    state.df = pd.read_csv(df_filepath)
    state.entire_df = pd.read_csv(entire_df_filepath)
    state.group_df = pd.read_csv(group_df_filepath)

    state.graph = state.gf.graph
    state.entire_graph = state.entire_gf.graph

    # replace df['node'] from str to the Node object.
    state.df = replace_str_with_Node(state.df, state.graph)
    state.entire_df = replace_str_with_Node(state.entire_df, state.entire_graph)
    state.group_df = replace_str_with_Node(state.group_df, state.graph)

    # add path to the dataframes. 
    # state.df['path'] = state.df['node'].apply(lambda node: node.callpath)
    # state.entire_df['path'] = state.entire_df['node'].apply(lambda node: node.callpath if node else [])

    return state

def add_paths(g, df, path_name):
    for idx, row in df.iterrows():
        path = row[path_name]
        if isinstance(path, str):
            path = make_tuple(row[path_name])
        g.add_path(path)

def get_networkx_graph(df, path):
    ret = nx.DiGraph()
    add_paths(ret, df, path)
    return ret

def run(datasets):
    states = {}
    for dataset in datasets:
        states[dataset] = read_gf(dataset)
        states[dataset].entire_g = get_networkx_graph(states[dataset].entire_df, 'path')
        states[dataset].g = get_networkx_graph(states[dataset].df, 'path')
        states[dataset].group_g = get_networkx_graph(states[dataset].group_df, 'path')
    return states