# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

# ------------------------------------------------------------------------------
#  Utility functions used by callflow.
# ------------------------------------------------------------------------------
import callflow
import hatchet
import json


def sanitize_name(name: str):
    """
    Sanitize the callsites for general dataset.
    """
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


def sanitizeAMMName(name: str):
    """
    Sanitize the callsites for AMM dataset.
    """
    if "::" in name:
        name = name.split("::")[-1]
    else:
        name = name
    return name


def convertStringToList(string: str):
    """
    Convert a string which is an array to an array
    """
    return string.strip("][").split(", ")


def median(arr: list):
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


def avg(arr: list):
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


def jsonify_string(string: str):
    """
    Convert a string input to a json object

    """
    assert isinstance(string, str)
    _ = json.loads(string, object_hook=byteify)
    return byteify(_, ignore_dicts=True)


def byteify(data, ignore_dicts=False):

    # if this is a unicode string, return its string representation
    if isinstance(data, bytes):
        return data.encode("utf-8")

    # if this is a list of values, return list of byteified values
    if isinstance(data, list):
        return [byteify(item, ignore_dicts=True) for item in data]

    # if this is a dictionary, return dictionary of byteified keys and values
    # but only if we haven't already byteified it
    if isinstance(data, dict) and not ignore_dicts:
        return {
            byteify(key, ignore_dicts=True): byteify(value, ignore_dicts=True)
            for key, value in data.items()
        }
    # if it's anything else, return it in its original form
    return data


def dfs(gf: callflow.GraphFrame, limit: int):
    """
    Depth first search for debugging purposes.
    """
    dataframe = gf.dataframe
    graph = gf.graph

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


def bfs(gf):
    """
    Breadth first search for debugging purposes.
    """
    graph = gf.graph
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


def get_node_callpath(node: hatchet.node):
    """
    Return the call path for a given callflow.GraphFrame.graph.Node
    """
    ret = []
    list_of_frames = list(node.path())
    for frame in list_of_frames:
        name = frame.get("name")
        if name is not None:
            ret.append(frame.get("name"))
        else:
            ret.append(frame.get("file"))
    return ret


def get_node_parents(node: hatchet.node):
    """
    Return parents of a hatchet.node
    """
    return node.parents


def get_callsite_name_from_frame(node: hatchet.node):
    """
    Return callsite name for hatchet.node
    """
    name = node.frame.get("name")
    if name is not None:
        return node.frame.get("name")
    else:
        return node.frame.get("file")


def node_dict_from_frame(frame: hatchet.frame):
    """
    Constructs callsite's name from Hatchet's frame.
    """
    if frame.get("type") is None and frame["name"] is not None:
        return {"name": frame.get("name"), "type": "function"}

    if frame["type"] == "function":
        return {"name": frame.get("name"), "line": "NA", "type": "function"}
    elif frame["type"] == "statement":
        return {
            "name": frame.get("file"),
            "line": frame.get("line"),
            "type": "statement",
        }
    elif frame["type"] == "loop":
        return {"name": frame.get("file"), "line": frame.get("line"), "type": "loop"}
    else:
        return {}


def path_list_from_frames(frames: list):
    """
    Constructs callsite's path from Hatchet's frame.
    """
    paths = []
    for frame in frames:
        path = []
        for f in frame:
            if f.get("type") == "function":
                path.append(f.get("name"))
            elif f.get("type") == "statement":
                path.append(f.get("file") + ":" + str(f.get("line")))
            elif f.get("type") == "loop":
                path.append(f.get("file") + ":" + str(f.get("line")))
            else:
                path.append(f.get("name"))
        paths.append(path)
    return path
