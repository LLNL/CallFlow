# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.nonparametric.api as smnp


# ------------------------------------------------------------------------------
# pandas dataframe utils
# ------------------------------------------------------------------------------
def df_unique(df, column):
    return df[column].unique()


def df_count(df, column):
    return len(df_unique(df, column))


def df_lookup_by_column(df, column, value):
    return df.loc[df[column] == value]


def df_lookup_and_list(df, col_lookup, val_lookup, col_list):
    return df_unique(df_lookup_by_column(df, col_lookup, val_lookup), col_list)


def df_group_by(df, columns):
    if isinstance(columns, list):
        return df.groupby(columns)
    else:
        assert isinstance(columns, str)
        return df.groupby([columns])


# ------------------------------------------------------------------------------
# statistics utils
# ------------------------------------------------------------------------------
def histogram(data, data_range=None, bins=20):
    if len(data) == 0:
        return np.array([]), np.array([])

    if data_range is None:
        data_range = [data.min(), data.max()]
    else:
        assert isinstance(data_range, (list, np.ndarray))
        assert len(data_range) == 2
    h, b = np.histogram(data, range=data_range, bins=bins)
    return 0.5 * (b[1:] + b[:-1]), h


def freedman_diaconis_bins(arr):
    """Calculate number of hist bins using Freedman-Diaconis rule."""
    # From https://stats.stackexchange.com/questions/798/

    n = len(arr)
    if n < 2:
        return 1

    # Calculate the iqr ranges.
    iqr = [stats.scoreatpercentile(arr, _) for _ in [25, 75]]

    # Calculate the h
    h = 2 * (iqr[1] - iqr[0]) / (n ** (1 / 3))

    # fall back to sqrt(a) bins if iqr is 0
    if h == 0:
        return int(np.sqrt(arr.size))

    else:
        return int(np.ceil((arr.max() - arr.min()) / h))


def outliers(data, scale=1.5, side='both'):

    assert isinstance(data, (pd.Series, np.ndarray))
    assert len(data.shape) == 1
    assert isinstance(scale, float)
    assert side in ['gt', 'lt', 'both']

    d_q13 = np.percentile(data, [25., 75.])
    iqr_distance = np.multiply(stats.iqr(data), scale)

    if side in ["gt", "both"]:
        upper_range = d_q13[1] + iqr_distance
        upper_outlier = np.greater(data - upper_range.reshape(1), 0)

    if side in ["lt", "both"]:
        lower_range = d_q13[0] - iqr_distance
        lower_outlier = np.less(data - lower_range.reshape(1), 0)

    if side == "gt":
        return upper_outlier
    if side == "lt":
        return lower_outlier
    if side == "both":
        return np.logical_or(upper_outlier, lower_outlier)


def kde(data, gridsize=10, fft=True,
        kernel="gau", bw="scott", cut=3, clip=(-np.inf, np.inf)):

    if bw == "scott":
        bw = stats.gaussian_kde(data).scotts_factor() * data.std(ddof=1)

    kde = smnp.KDEUnivariate(data)

    # create the grid to fit the estimation.
    support_min = min(max(data.min() - bw * cut, clip[0]), 0)
    support_max = min(data.max() + bw * cut, clip[1])
    x = np.linspace(support_min, support_max, gridsize)

    kde.fit("gau", bw, fft, gridsize=gridsize, cut=cut, clip=clip)
    y = kde.density
    return x, y

# ------------------------------------------------------------------------------
# JSON utilities
# ------------------------------------------------------------------------------
import json
import jsonschema

def jsonify_string(string: str) -> any:
    """
    Convert a string input to a json object.

    :param string: String to be converted to JSON.
    :return JSON object
    """
    assert isinstance(string, str)
    _ = json.loads(string, object_hook=byteify)
    return byteify(_, ignore_dicts=True)


def byteify(data: str, ignore_dicts: bool=False) -> any:
    """
    Byteify a string into a JSON-valid object.

    :param data: data as string
    :param ignore_dicts: True will ignore dictionaries in deeper levels (used in recursive strategy)
    :return: JSON object
    """
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

def read_json(filename: str) -> any:
    """
    Read a JSON file as text and convert to JSON format.

    :param filename: File's name to be read
    :return JSON formatted text.
    """
    f = open(filename, "r").read()
    json_data = jsonify_string(f)
    return json_data

def write_json(json_data, filename) -> None:
    """
    Write a JSON object into a file.

    :param json_data: JSON data to put in the file.
    :param filename: Filename to store the JSON object.
    :return: None
    """
    with open(filename, "w") as fp:
        fp.write(json.dumps(json_data, default=lambda o: o.__dict__, sort_keys=True, indent=2))

def is_valid_json(data: any) -> bool:
    """
    Check if data is a valid JSON object.
    """
    try:
        json.loads(data)
    except ValueError as err:
        print(err)
        return False
    return True

def is_valid_json_with_schema(data: any, schema: any) -> any:
    jsonschema.validate(instance=data, schema=schema)

# ------------------------------------------------------------------------------
# Directory utilities
# ------------------------------------------------------------------------------
def list_subdirs(path: str, exclude_subdirs: list=[]) -> list:
    """
    List the sub directories in path. This excludes the subdirs in exclude_names.

    :param path: Path to list sub directories.
    :param exclude_subdirs: Exclude array
    :return: list of sub directories in the given path
    """
    subdirs = [os.path.basename(f.path) for f in os.scandir(path)
               if f.is_dir()]
    return [_ for _ in subdirs if _ not in exclude_subdirs]


def list_files(path: str, include_file_extn: str, exclude_files: list=[]) -> list:
    """
    List files in path.

    :param path:
    :param include_file_extn:
    :param exclude_files:
    :return:
    """
    files = [os.path.basename(_) for _ in os.scandir(path)
             if os.path.splitext(_)[1] == include_file_extn]
    return [_ for _ in files if _ not in exclude_files]


# ------------------------------------------------------------------------------
# Subprocess utilities
# ------------------------------------------------------------------------------
import subprocess
import os

def execute_cmd(cmd: str) -> None:
    """
    cmd is expected to be something like "cd [place]"
    """
    cmd = cmd + " && pwd"
    p = subprocess.Popen(
        cmd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
    )

    out = p.stdout.read()
    err = p.stderr.read()

    if out != "":
        os.chdir(out[0 : len(out) - 1])
    if err != "":
        print(err)
    return

# ------------------------------------------------------------------------------
# Hatchet utilities
# ------------------------------------------------------------------------------
import hatchet

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

# ------------------------------------------------------------------------------

'''
def to_delete_sanitize_name(name: str):
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


def to_delete_sanitizeAMMName(name: str):
    """
    Sanitize the callsites for AMM dataset.
    """
    if "::" in name:
        name = name.split("::")[-1]
    else:
        name = name
    return name

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

'''

# --------------------------------------------------------------------------
# callflow.nxg utilities.
# --------------------------------------------------------------------------
'''
def notused_add_prefix(graph, prefix):
    """
    Rename graph to obtain disjoint node labels
    """
    assert isinstance(graph, nx.DiGraph)
    if prefix is None:
        return graph

    def label(x):
        if isinstance(x, str):
            name = prefix + x
        else:
            name = prefix + repr(x)
        return name

    return nx.relabel_nodes(graph, label)

def notused_tailhead(edge):
    return (edge[0], edge[1])

def notused_tailheadDir(edge, edge_direction):
    return (str(edge[0]), str(edge[1]), edge_direction[edge])

def notused_leaves_below(nxg, node):
    assert isinstance(nxg, nx.DiGraph)
    return set(
        sum(
            (
                [vv for vv in v if nxg.out_degree(vv) == 0]
                for k, v in nx.dfs_successors(nxg, node).items()
            ),
            [],
        )
    )

def convertStringToList(string: object) -> object:
    """
    Convert a string which is an array to an array
    """
    return string.strip("][").split(", ")
    
def string_to_list(string: str, sep: str):
    """
    Converts the string to list separated by the sep attribute.
    Uses floating-point division.
    """
    return string.strip("][").split(sep)
'''

'''
# --------------------------------------------------------------------------
# callflow.sanitizer utilities.
# --------------------------------------------------------------------------
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
    assert frame.get("type") in ["function", "statement", "loop", "region"]

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
    elif frame["type"] == "region":
        return {"name": frame.get("name"), "line": "NA", "type": "region"}
'''

'''
# --------------------------------------------------------------------------
# callflow.debugging utilities.
# --------------------------------------------------------------------------
# commenting due to import issues.
def dfs(gf: callflow.SuperGraph, limit: int):
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
'''