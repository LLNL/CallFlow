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

#!/usr/bin/env python3

import pandas as pd
from collections import defaultdict

class splitCaller:
    def __init__(self, state, idList):
        self.graph = state.graph
        self.df = state.df
        self.d_graph = defaultdict(list)
        self.nodes = self.find_df(idList)
        print(self.nodes, len(self.nodes))

    def find_df(self, nodes):
        ret = []
        nodes = nodes.replace('"', '')
        nodes = nodes.replace('[', '')
        nodes = nodes.replace(']', '')
        nodes = nodes.split(',')

        for node in nodes:
            print(node)
            df = self.df[self.df.name == node]
            ret.append(df)
            return ret

    def entry_functions(self, state):
        root = self.graph.roots[0]
        node_gen = self.graph.roots[0].traverse()
        
        try:
            while root.callpath != None:
                root = next(node_gen)
                t = state.lookup_with_node(root)
                s = state.lookup_with_node(root.parent)

                if len(s['vis_node_name']) != 0:
                    if s['module'][0] == self.node:
                        print(len(s['group_path'][0]))
                        if len(s['group_path'][0]) == 4:
                            print(s['name'][0])
                            print(s['path'][0], s['group_path'][0], s['component_path'][0])
                    
        except StopIteration:
            pass
        finally:
            del root
            
    def getChildren(self):
        return []
        show_node_map = {}
        children_of_node = df[df['node'] == node].children
        for nod in children_of_node:
            show_node_map[node] = True

        utils.update_df(df, 'show_node', show_node_map)
