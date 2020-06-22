# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------
# Library imports
import os
import json
import networkx as nx
from networkx.readwrite import json_graph

# ------------------------------------------------------------------------------
# i see similar functions in graphframe.py (copied from state.py)
# why are these different
def lookup(df, node):
    return df.loc[df["name"] == getNodeName(node)]


def lookup_with_name(df, name):
    return df.loc[df["name"] == name]


# ------------------------------------------------------------------------------
# a similar function in utils/hatchet.py
def sanitize_name(name):
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


def median(arr):
    """
        Returns the median and its index in the array.
    """
    indices = []

    list_size = len(arr)
    median = 0
    if list_size % 2 == 0:
        indices.append(int(list_size / 2) - 1)  # -1 because index starts from 0
        indices.append(int(list_size / 2))
        median = (arr[indices[0]] + arr[indices[1]]) / 2
    else:
        indices.append(int(list_size / 2))
        median = arr[indices[0]]

    return median, indices


def avg(arr):
    """
        Returns the average of the array.
        Uses floating-point division.
    """
    return sum(arr) / float(len(arr))


def string_to_list(string: str, sep: str):
    """
        Converts the string to list separated by the sep attribute.
        Uses floating-point division.
    """
    return string.strip("][").split(sep)


# ------------------------------------------------------------------------------
# networkx utilities
# ------------------------------------------------------------------------------
# not sure if this is used anywhere
# Also, why is this not consistent with the rest of the style (ie, actions)
def dfs(graph, dataframe, limit):
    def _dfs_recurse(root, level):
        for node in root.children:
            result = ""
            if level < limit:
                for i in range(0, level):
                    result += "- "
                node_df = dataframe.loc[
                    (dataframe["nid"] == node.nid)
                    & (dataframe["name"] == node.callpath[-1])
                ]
                inclusive_runtime = " time (inc) = " + str(node_df["time (inc)"].mean())
                exclusive_runtime = " time = " + str(node_df["time"].mean())
                # module = "Module = " + str(node_df['module'].unique()[0])
                module = ""
                result += (
                    "Node = "
                    + node.callpath[-1]
                    + "["
                    + module
                    + ":"
                    + str(node.nid)
                    + "]"
                    + inclusive_runtime
                    + exclusive_runtime
                )
                level += 1
                dfs_recurse(node, level)

    level = 0
    for root in graph.roots:
        print("Root = {0} [{1}]".format("Root", root._hatchet_nid))
        _dfs_recurse(root, level)


# ------------------------------------------------------------------------------
def graphmltojson(graphfile, outfile):
    # unused. cannot work without importing json
    assert False
    """
	Converts GraphML file to json while adding communities/modularity groups
	using python-louvain. JSON output is usable with D3 force layout.
	"""
    G = nx.read_graphml(graphfile)

    # finds best community using louvain
    #    partition = community_louvain.best_partition(G)

    # adds partition/community number as attribute named 'modularitygroup'
    #    for n,d in G.nodes_iter(data=True):
    #        d['modularitygroup'] = partition[n]

    node_link = json_graph.node_link_data(G)
    json_data = json.dumps(node_link)

    # Write to file
    fo = open(outfile, "w")
    fo.write(json_data)
    fo.close()


# ------------------------------------------------------------------------------
def bfs_hatchet(graph):
    ret = {}
    node_count = 0
    roots = graph.roots
    for root in roots:
        node_gen = graph.roots[0].traverse()

        callpaths = root.paths()
        try:
            while callpaths != None:
                node_count += 1
                ret[root.callpath[-1]] = root.df_index
                root = next(node_gen)
        except StopIteration:
            pass
        finally:
            print("Total nodes in the graph", node_count)
            del root
            return ret


def getNodeCallpath(node):
    ret = []
    list_of_frames = list(node.path())
    for frame in list_of_frames:
        name = frame.get("name")
        if name != None:
            ret.append(frame.get("name"))
        else:
            ret.append(frame.get("file"))
    return ret


def getNodeParents(node):
    return node.parents


def get_callsite_name_from_frame(node):
    name = node.frame.get("name")
    if name != None:
        return node.frame.get("name")
    else:
        return node.frame.get("file")


def node_dict_from_frame(frame):
    """
    Constructs callsite's name from Hatchet's frame.
    """
    if frame["type"] == "function":
        return {"name": frame["name"], "line": "NA", "type": "function"}
    elif frame["type"] == "statement":
        return {"name": frame["file"], "line": frame["line"], "type": "statement"}
    elif frame["type"] == "loop":
        return {"name": frame["file"], "line": frame["line"], "type": "loop"}
    else:
        return {}


def path_list_from_frames(frames):
    """
    Constructs callsite's path from Hatchet's frame.
    """
    paths = []
    for frame in frames:
        path = []
        for f in frame:
            if f["type"] == "function":
                path.append(f["name"])
            elif f["type"] == "statement":
                path.append(f["file"] + ":" + str(f["line"]))
            elif f["type"] == "loop":
                path.append(f["file"] + ":" + str(f["line"]))
        paths.append(path)
    return path
