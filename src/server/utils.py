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

# Lookup by the node hash
def lookup(df, node_hash):
    return df.loc[df['node'] == node_hash] 

def lookupByName(df, name):
    return df.loc[df['name'] == name]

def lookupByNodeName(df, name):
    return df.loc[df['vis_node_name'] == name]

def lookupByAttr(df, node_hash, attr):
    ret = []
    node_df = df.loc[df['node'] == node_hash]
    node_df_T = node_df.T.squeeze()
    node_df_T_attr = node_df_T.loc[attr]
    if node_df_T_attr is not None:
        if type(node_df_T_attr) is str or type(node_df_T_attr) is float:
            ret.append(node_df_T_attr)
        else:
            ret = node_df_T_attr.tolist()
    return ret

# Get the max Inclusive time from the root of the CCT.
def getMaxIncTime(gf):
    ret = 0.0
    for root in gf.graph.roots:
        ret = max(ret, lookup(gf.dataframe, root)['CPUTIME (usec) (I)'].max())
    return ret

# TODO: Get the maximum exclusive time from the graphframe. 
def getMaxExcTime(gf):
    ret  = gf.dataframe['CPUTIME (usec) (E)'].max()
    return ret

def update_df(df, column_name, data):
    df[column_name] = df['node'].apply(lambda node: data[node] if node in data.keys() else '')
    return df


