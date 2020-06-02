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
import json


# ------------------------------------------------------------------------------
# i see similar functions in graphframe.py (copied from state.py)
# why are these different
def lookup(df, node):
    return df.loc[df["name"] == getNodeName(node)]


def lookup_with_name(df, name):
    return df.loc[df["name"] == name]


# Input : ./xxx/xxx/yyy
# # Output: yyy
# def sanitizeName(name):
#     if name == None or isinstance(name, float):
#         return "Unknown(NA)"
#     name_split = name.split("/")
#     return name_split[len(name_split) - 1]

# ------------------------------------------------------------------------------
# a similar function in utils/hatchet.py
def sanitizeName(name):
    ret_name = ""
    if name is None:
        ret_name = "Unknown"
        return ret_name
    if "/" in name:
        name_split = name.split("/")
        ret_name = name_split[len(name_split) - 1]
    else:
        ret_name = name
    return ret_name


def sanitizeAMMName(name):
    if "::" in name:
        name = name.split("::")[-1]
    else:
        name = name
    return name

# ------------------------------------------------------------------------------

def visModuleCallsiteName(name, df):
    return df.groupby(["name"]).unique()["module"]


def avg(l):
    """uses floating-point division."""
    return sum(l) / float(len(l))


def getMaxIncTime(state):
    df = state.df
    ret = float(df["time (inc)"].max())
    return ret


# TODO: Get the maximum exclusive time from the graphframe.
def getMaxExcTime(state):
    df = state.df
    ret = float(df["time"].max())
    return ret


def getAvgIncTime(state):
    ret = 0.0
    graph = state.new_gf.graph
    df = state.new_gf.df
    for root in gf.graph.roots:
        ret += lookup(df, root)["time (inc)"].mean()
    return ret / len(gf.graph.roots)


def getAvgExcTime(state):
    df = state.df
    ret = df["time"].mean()
    return ret


def getMinIncTime(state):
    return 0


def getMinExcTime(state):
    return 0


def getNumOfNodes(state):
    df = state.df
    return df["module"].count()


def getNumbOfRanks(state):
    df = state.entire_df
    return len(df["rank"].unique())


def getMaxIncTime_from_gf(graph, dataframe):
    ret = 0.0
    for root in graph.roots:
        node_df = lookup(dataframe, root)
        ret = max(ret, float(max(node_df["time (inc)"].tolist())))
    return ret


def getMaxExcTime_from_gf(graph, dataframe):
    ret = float(dataframe["time"].max())
    return ret


def getAvgIncTime_from_gf(graph, dataframe):
    ret = 0.0
    for root in graph.roots:
        ret += lookup(dataframe, root)["time (inc)"].mean()
    return ret / len(graph.roots)


def getAvgExcTime_from_gf(graph, dataframe):
    ret = dataframe["time"].mean()
    return ret


def getMinIncTime_from_gf(graph, dataframe):
    return 0

def getMinExcTime_from_gf(graph, dataframe):
    return 0

def getNumOfNodes_from_gf(graph, dataframe):
    return dataframe["module"].count()

def getNumbOfRanks_from_gf(graph, dataframe):
    return len(dataframe["rank"].unique())

# ------------------------------------------------------------------------------

def debugWriteToFile(action="", data={}):
    action = "[callfow.py] Action: {0}".format(action)
    if bool(data):
        data_string = "" + json.dumps(data, indent=4, sort_keys=True)
    else:
        data_string = ""


def convertStringToList(string):
    res = string.strip("][").split(", ")
    return res


def is_json(myjson):
    try:
        json_object = json.loads(myjson)
    except ValueError as e:
        return False
    return True

# ------------------------------------------------------------------------------
