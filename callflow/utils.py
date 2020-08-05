# *******************************************************************************
# * Copyright (c) 2020, Lawrence Livermore National Security, LLC.
# * Produced at the Lawrence Livermore National Laboratory.
# *
# * Written by Suraj Kesavan <htpnguyen@ucdavis.edu>.
# *
# * LLNL-CODE-740862. All rights reserved.
# *
# * This file is part of CallFlow. For details, see:
# * https://github.com/LLNL/CallFlow
# * Please also read the LICENSE file for the MIT License notice.
# ******************************************************************************

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


def convertStringToList(string):
    res = string.strip("][").split(", ")
    return res


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
                _dfs_recurse(node, level)

    level = 0
    for root in graph.roots:
        print("Root = {0} [{1}]".format("Root", root._hatchet_nid))
        _dfs_recurse(root, level)


# ------------------------------------------------------------------------------
def bfs_hatchet(graph):
    ret = {}
    node_count = 0
    roots = graph.roots
    for root in roots:
        node_gen = graph.roots[0].traverse()

        callpaths = root.paths()
        try:
            while callpaths is not None:
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
        if name is not None:
            ret.append(frame.get("name"))
        else:
            ret.append(frame.get("file"))
    return ret


def getNodeParents(node):
    return node.parents


def get_callsite_name_from_frame(node):
    name = node.frame.get("name")
    if name is not None:
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
