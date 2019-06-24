##############################################################################
# Copyright (c) 2018-2019, Lawrence Livermore National Security, LLC.
# Produced at the Lawrence Livermore National Laboratory.
#
# This file is part of Callflowt.
# Created by Suraj Kesavan <kesavan1@llnl.gov>.
# LLNL-CODE-741008. All rights reserved.
#
# For details, see: https://github.com/LLNL/Callflow
# Please also read the LICENSE file for the MIT License notice.
##############################################################################

import os
import fnmatch
from logger import log

# For converting graphml to json
import networkx as nx
#from community import community_louvain
from networkx.readwrite import json_graph
import json

def lookup(df, node):
    return df.loc[df['node'] == node]

# Input : ./xxx/xxx/yyy
# Output: yyy
def sanitizeName(name):
    if name == None:
        return "Unkno"
    name_split = name.split('/')
    return name_split[len(name_split) - 1]

def avg(l):
    """uses floating-point division."""
    return sum(l) / float(len(l))

# Get the max Inclusive time from the root of the CCT.
def getMaxIncTime(gf):
    ret = 0.0
    for root in gf.graph.roots:
        ret = max(ret, lookup(gf.dataframe, root)['time (inc)'].max())
    return ret

# TODO: Get the maximum exclusive time from the graphframe. 
def getMaxExcTime(gf):
    ret  = gf.dataframe['time'].max()
    return ret

def getAvgIncTime(gf):
    ret = 0.0
    for root in gf.graph.roots:
        ret += lookup(gf.dataframe, root)['time (inc)'].mean()
    return ret/len(gf.graph.roots)

def getAvgExcTime(gf):
    ret = gf.dataframe['time'].mean()
    return ret

def getNumOfNodes(gf):
    return gf.dataframe['module'].count()

def graphmltojson(graphfile, outfile):
    """
    Converts GraphML file to json while adding communities/modularity groups
    using python-louvain. JSON output is usable with D3 force layout.
    """
    G = nx.read_graphml(graphfile)

    #finds best community using louvain
#    partition = community_louvain.best_partition(G)

    #adds partition/community number as attribute named 'modularitygroup'
#    for n,d in G.nodes_iter(data=True):
#        d['modularitygroup'] = partition[n]

    node_link = json_graph.node_link_data(G)
    json_data = json.dumps(node_link)

    # Write to file
    fo = open(outfile, "w")
    fo.write(json_data);
    fo.close()

def debug(action='', data={}):
    action = '[callfow.py] {0}'.format(action)
    if bool(data):
        data_string = 'Data: ' + json.dumps(data, indent=4, sort_keys=True)
    else:
        data_string = ''
    log.info(' {0} {1}'.format(action, data_string))

def dfs(graph, limit):
    self.level = 0
    def dfs_recurse(root):
        for node in root.children:
            if(self.level < limit):
                print('Node =', node)
                self.level += 1
                dfs_recurse(node)
        
    for root in graph.roots:
        print("Root = ", root)
        dfs_recurse(root)

def node_hash_mapper(df):
    ret = {}
    for idx, row in df.iterrows():
        df_node_index = str(row.nid)
        ret[df_node_index] = row.node
    return ret  