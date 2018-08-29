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

import utils


def groupBy(gf, attr):
    graph = gf.graph
    df = gf.dataframe
    
    groupsTracked = {}
    
    root = graph.roots[0]
    node_gen = graph.roots[0].traverse()

    group_path_map = {}
    show_node_map = {}
    node_name_map = {}

    nodesTracked = {}
    
    # convert to pandas group dataframe
    gdf = df.groupby(attr, as_index=True, squeeze=True)  
    gdfKeys = gdf.groups.keys()
    
    rootdf = utils.lookup(df, root)
    group_path_map[rootdf.node[0]] = tuple(['<program root>'])
    node_name_map[rootdf.node[0]] = '<program root>'
    show_node_map[rootdf.node[0]] = True
    
    try:
        while root.callpath != None:
            root = next(node_gen)
            target = utils.lookup(df, root)
            source = utils.lookup(df, root.parent)

            
            # check if there are entries for the source and target
            # Note: need to work on it more....
            if target.empty or source.empty:
                continue

            group_path_map[target.node[0]] = create_group_paths(df, source.path[0])
                
            if target.module.isin(groupsTracked)[0]:
                show_node_map[target.node[0]] = False
                node_name_map[target.node[0]] = ''
            else:
                show_node_map[target.node[0]] = True
                node_name_map[target.node[0]] = find_a_good_node_name(df, target.node[0], attr, groupsTracked)
                groupsTracked[target[attr][0]] = True
    except StopIteration:
        pass
    finally:
        del root

    utils.update_df(df, 'group_path', group_path_map)
    utils.update_df(df, 'show_node', show_node_map)
    utils.update_df(df, 'vis_node_name', node_name_map)

    return gf

def create_group_paths(df, path):
    group_path = ['<program root>']
    temp = None
    for i, elem in enumerate(path):
        module = utils.lookupByName(df, elem).module[0]
        if temp == None or module != temp:
            group_path.append(module)
            temp = module
    return tuple(group_path)


def find_a_good_node_name(df, node, attr, modules_tracked):
    node_name = utils.lookupByAttr(df, node, attr)[0]
    if len(node_name) != 0:
        if node_name in modules_tracked:
            return 'Module already assigned'
        else:
            print node_name 
            return node_name
    else:
        return ''


def splitCaller(df, node):
    show_node_map = {}
    children_of_node = df[df['node'] == node].children
    for nod in children_of_node:
        show_node_map[node] = True

    utils.update_df(df, 'show_node', show_node_map)

def splitCallee(df, node):
    ret = {}
    return retx

def bfs(self, gf):
    visited, queue = set(), gf.graph.roots[0]
    while queue:
        node = queue.pop(0)
        if node not in visited:
            visited.add(vertex)
#                queue.extend()

        
