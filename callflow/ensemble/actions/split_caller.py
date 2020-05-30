##############################################################################
# Copyright (c) 2018-2019, Lawrence Livermore National Security, LLC.
# Produced at the Lawrence Livermore National Laboratory.
#
# This file is part of Callflow.
# Created by Suraj Kesavan <kesavan1@llnl.gov>.
# LLNL-CODE-741008. All rights reserved.
#
# For details, see: https://github.com/LLNL/Callflow
# Please also read the LICENSE file for the MIT License notice.
##############################################################################

import pandas as pd
from collections import defaultdict


class SplitCaller:
    def __init__(self, state, idList):
        self.graph = state.new_gf.graph
        self.df = state.new_gf.df
        self.d_graph = defaultdict(list)
        self.module = []
        self.nodes = []
        self.map_to_df_row(idList)

    def map_to_df_row(self, df_indices):
        df_indices = df_indices.replace('"', "")
        df_indices = df_indices.replace("[", "")
        df_indices = df_indices.replace("]", "")
        df_indices = df_indices.split(",")

        for idx, df_index in enumerate(df_indices):
            node = self.df[self.df["df_index"] == int(df_index)]
            self.module.append(node["module"].tolist()[0])
            new_node_name = self.module[idx] + ":" + node["name"].tolist()[0]
            node["vis_node_name"] = self.module[idx] + ":" + node["name"].tolist()[0]
            print(node["vis_node_name"])
            self.df.update(node)
            self.nodes.append(node)
            self.add_vis_node_name(self.module[idx], new_node_name)

        print("modules: {0}".format(self.module))
        print("nodes: {0}".format(self.nodes))

    def change_group_path(self):
        for node in self.nodes:
            print(node)

    def add_vis_node_name(self, module, node_name):
        nodes_in_vis = self.df[self.df["vis_node_name"] != ""]
        group_paths_df = nodes_in_vis["group_path"]

        for idx, row in group_paths_df.items():
            if module in row:
                row = list(row)
                for idx, el in enumerate(row):
                    if el == module:
                        row.insert(idx + 1, node_name)

        self.df["group_path"].update(group_paths_df)
        print(self.df["group_path"])

    def entry_functions(self, state):
        root = self.graph.roots[0]
        node_gen = self.graph.roots[0].traverse()

        try:
            while root.callpath != None:
                root = next(node_gen)
                t = state.lookup_with_node(root)
                s = state.lookup_with_node(root.parent)

                if len(s["vis_node_name"]) != 0:
                    if s["module"][0] == self.node:
                        print(len(s["group_path"][0]))
                        if len(s["group_path"][0]) == 4:
                            print(s["name"][0])
                            print(
                                s["path"][0], s["group_path"][0], s["component_path"][0]
                            )

        except StopIteration:
            pass
        finally:
            del root

    def getChildren(self):
        return []
        show_node_map = {}
        children_of_node = df[df["node"] == node].children
        for nod in children_of_node:
            show_node_map[node] = True

        utils.update_df(df, "show_node", show_node_map)
