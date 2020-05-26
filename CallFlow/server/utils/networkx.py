import networkx as nx
from networkx.readwrite import json_graph

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
                log.info(result)
                level += 1
                dfs_recurse(node, level)

    level = 0
    for root in graph.roots:
        print("Root = {0} [{1}]".format("Root", root._hatchet_nid))
        dfs_recurse(root, level)