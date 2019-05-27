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
import time
from hatchet import *
from abc import ABCMeta, abstractmethod

class Action():
    __metaclass__ = ABCMeta
     
    def __init__(self):
        pass
    
    def dfs(self, graph, limit):
        self.level = 0
        
        def dfs_recurse(root):
            for node in root.children:
                if(self.level < limit):
                    print("Node : ", node)
                    self.level += 1
                    dfs_recurse(node)
        
        for root in graph.roots:
            dfs_recurse(root)

    def create_group_path(self, node):
        group_path = []
        temp = None
        path = node.callpath
        for i, elem in enumerate(path):
            elem_df = self.state.lookup_with_nodeName(elem)
            if(elem_df.empty):
                grouping = 'Unkno'
            else:
                grouping = elem_df[self.group_by].tolist()[0]
            if temp == None or grouping != temp:
                group_path.append(grouping)
                temp = grouping
        return tuple(group_path)

    def find_a_good_node_name(self, node):
        node_name = self.state.lookup_with_node(node)[self.group_by].tolist()[0]
        return node_name

    def create_component_path(self, path, group_path):
        component_path = []
        path = list(path)
        component_module = self.state.lookup_with_nodeName(path[-1])[self.group_by].tolist()[0]
        component_path.append(component_module)

        filter_path = [node for node in path if component_module == self.state.lookup_with_nodeName(node)[self.group_by].tolist()[0]]
       
        for i, elem in enumerate(filter_path):            
             component_path.append(elem)                    
        return tuple(component_path)

    def create_component_level(self, component_path):
        return len(component_path) - 1

    # Assign a "Module" name to a given hatchet node. 
    def group_by_name(self, node):
        # start = time.time()
        df = self.state.lookup_with_nodeName(node.callpath[-1])
        unique_modules = df[self.group_by].unique()
        if(len(unique_modules) == 1):
            return unique_modules[0]
        elif(len(unique_modules) == 0): 
            # print('Entry not found in dataframe')
            return 'Unkno'
        else:
            print('Error! Multiple modules for a node.')
            return None

    @abstractmethod
    def run():
        pass

class groupGraph(Graph):
    """ A group node in the call graph.
    """
    def __init__(self):
        self.nodes = []
        self.edges = []
        # Map to check if such element exist in the graph. 
        self.nodeMap = {}
        self.roots = []
    
    def is_module(self, node_name):
        for idx, module in enumerate(self.nodes):
            if(node_name == module.name):
                return True
        return False

    def add_module(self, module):
        assert isinstance(module, groupNode)
        self.nodes.append(module)
        self.nodeMap[module.name] = module

    def add_inner_node(self, module_name, inner_node):
        assert isinstance(inner_node, Node)
        group_node = self.nodeMap[module_name]
        group_node.hierarchy.append(inner_node)

    def print(self):
        print("Nodes: ", self.nodes)
        for idx, node in enumerate(self.nodes):
            print("Node name: {0}, \n hierarchy: {1}".format(node.name, node.hierarchy))
    def split_by_entry_function(self):
        return 

    def split_by_caller_function(self):
        return

    def get_hierarchy():
        return

    def split_level(self):
        return 

class groupNode(Node):
    def __init__(self, nid, name, callpath_tuple, parent):
        self.nid = nid
        self.name = name
        self.callpath = callpath_tuple
        
        self.parents = []
        if parent is not None:
            self.add_parent(parent)
        self.children = []
        self.entry_funcs = []
        self.caller_funcs = []
        self.hierarchy = []

    def add_parent(self, node):
        self.parents.append(node)

    def add_child(self, node):
        assert isinstance(node, groupNode)
        self.children.append(node)

    def add_entry_funcs(self, node):
        assert isinstance(node, Node)
        self.entry_funcs.append(node)

    def __str__(self):
        """ Returns a string representation of the node.
        """
        return '[Node] name: {0}, number_of_parents: {1}, number_of_children: {2}, entry_funcs: {3}'.format(self.callpath, len(self.parents), len(self.children), len(self.entry_funcs))

class groupBy(Action):
    def __init__(self, state, group_by):
        self.state = state
        self.graph = state.graph
        self.df = state.df
        self.group_by = group_by
        self.node_count = 0
        self.run()

    def add_node(self, node, source, is_root=False):
        count = self.node_count
        module_name = self.group_by_name(node)
        callpath = self.create_group_path(node)
        # hatchet_hash = self.state.lookup_with_node(node.callpath[-1])['node'].unique()

        if(self.group_graph.is_module(module_name)):
            group_node = groupNode(count, module_name, callpath, source) 
            self.group_graph.add_inner_node(module_name, group_node)
        else:
            group_node = groupNode(count, module_name, callpath, source)
            self.group_graph.add_module(group_node)
 
        if(is_root):
            self.group_graph.roots.append(group_node)

    def add_edge(self, target, source):
        target_name = self.group_by_name(target)
        source_name = self.group_by_name(source)
        self.group_graph.add_edge(target_name, source_name)
        
    def run(self):  
        roots = self.graph.roots
        # New roots of the grouped graph.
        new_roots = []
        self.group_graph = groupGraph()

        for root in roots:
            level = 0
            node_gen = root.traverse()    
            self.add_node(root, None, True)
            print(self.group_by_name(root))

            try:
                while root.callpath != None:
                    source = root
                    target = next(node_gen)
                    self.add_node(target, source)
                    # self.add_edge(target, source)
                    root = target

            except StopIteration:
                pass
            finally:
                del root

        # self.group_graph.print()

        group_roots = self.group_graph.roots
        for root in group_roots:
            group_node_gen = root.traverse()
            print(root.callpath)
            try:
                while root.callpath != None:
                    source = root
                    target = next(group_node_gen)
                    print(source, target)
                    print(source.name, target.name)
            except StopIteration:
                pass
            finally: 
                del root
            