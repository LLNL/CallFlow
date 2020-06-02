##############################################################################
# Copyright (c) 2017-2019, Lawrence Livermore National Security, LLC.
# Produced at the Lawrence Livermore National Laboratory.
#
# This file is part of Hatchet.
# Created by Abhinav Bhatele <bhatele@llnl.gov>.
# LLNL-CODE-741008. All rights reserved.
#
# For details, see: https://github.com/LLNL/hatchet
# Please also read the LICENSE file for the MIT License notice.
##############################################################################

import numpy as np
import json

print ('WARNING: ({}) is unused in the code and should be deleted!'.format(__file__))

def trees_to_literal(graph, dataframe):
    """ Calls to_json in turn for each tree in the graph/forest
    """
    print("DFS on the graph")
    # print("============================================")
    # dfs(graph, dataframe, 100)
    print("Number of nodes in graph", len(graph))
    print("============================================")
    print("Dataframe Information")
    print("Size:", dataframe.shape)
    nodes = dataframe.groupby(["name", "nid"]).groups.keys()
    print("Number of nodes in dataframe: ", len(nodes))
    # print("Nodes: {0}".format(nodes))
    literal = []
    nodes = dataframe["name"].unique()
    adj_idx_map = {}
    for idx, node in enumerate(nodes):
        adj_idx_map[node] = idx

    num_of_nodes = len(nodes)
    adj_matrix = np.zeros(shape=(num_of_nodes, num_of_nodes))

    mapper = {}

    def add_nodes_and_children(hnode):
        node_df = dataframe.loc[
            (dataframe["name"] == hnode.callpath[-1]) & (dataframe["nid"] == hnode.nid)
        ]
        node_id = node_df["nid"].unique()[0]
        node_name = hnode.callpath[-1]
        children = []

        for child in hnode.children:
            # print(child, child.nid)
            child_df = dataframe.loc[
                (dataframe["name"] == child.callpath[-1])
                & (dataframe["nid"] == child.nid)
            ]

            if not child_df.empty:
                child_name = child_df["name"].unique()[0]
                # print(child_name)
                if child_name in adj_idx_map and node_name in adj_idx_map:
                    source_idx = adj_idx_map[node_name]
                    target_idx = adj_idx_map[child_name]
                    if adj_matrix[source_idx][target_idx] == 0.0:
                        adj_matrix[source_idx, target_idx] = 1.0
                children.append(add_nodes_and_children(child))

        return {
            "name": node_name,
            "children": children,
            "nid": int(node_id),
            "metrics": {
                "time (inc)": node_df["time (inc)"].mean(),
                "time": node_df["time"].mean(),
            },
        }

    for root in graph.roots:
        literal.append(add_nodes_and_children(root))

    return literal


def dfs(graph, dataframe, limit):
    def dfs_recurse(root, level):
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
                module = "Module = " + str(node_df["module"].unique()[0])
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
                print(result)
                level += 1
                dfs_recurse(node, level)

    level = 0
    for root in graph.roots:
        print("Root = {0} [{1}]".format(root, root.nid))
        dfs_recurse(root, level)
