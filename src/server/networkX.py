##############################################################################
# Copyright (c) 2018-2019, Lawrence Livermore National Security, LLC.
# Produced at the Lawrence Livermore National Laboratory.
#
# This file is part of Callflowt.
# Created by Suraj Kesavan <kesavan1@llnl.gov>.
# LLNL-CODE-741008. All rights reserved.
#
# For details, see: https://github.com/LLNL/Callflow
# Please also read the LICENSE file for the MIT License notice.
##############################################################################

#!/usr/bin/env python3

import ete3
import networkx as nx
import utils
from logger import log

class NetworkX():
    def __init__(self, gf, path_name):
        self.graph = gf.graph
        self.df = gf.dataframe
        
        self.root = list(set(utils.lookup(self.df, self.graph.roots[0]).name))[0]
        self.rootRunTimeInc = self.get_root_runtime_Inc()
        
        self.g = nx.DiGraph(rootRunTimeInc = self.rootRunTimeInc)       
        
        for idx, row in self.df.iterrows():
            if row.show_node:
                self.g.add_path(row[path_name])
#                print 'Adding for node: {0}'.format(row.node)
#            else:
                
                #                print 'Not showing the node: {0}'.format(row.node)

        print("Nodes", self.g.nodes(data=True))
        print("Edges", self.g.edges())
                
#        log.warn("Flow hierarchy: {0}".format(nx.flow_hierarchy(self.g)))
        self.is_tree = nx.is_tree(self.g)
        log.warn("Is it a tree? : {0}".format(self.is_tree))
                
        self.check_and_remove_cycles()
#        self.check_and_retain_cycles()
        
        module_mapping = self.create_module_map(self.g.nodes(), 'module')
        name_mapping = self.create_module_map(self.g.nodes(), 'node_name')
        file_mapping = self.create_module_map(self.g.nodes(), 'file')
        type_mapping = self.create_module_map(self.g.nodes(), 'type')
        time_mapping = self.create_module_map(self.g.nodes(), 'CPUTIME (usec) (I)')
        #        children_mapping = self.immediate_children(g)
        level_mapping = self.hierarchy_level(self.g, self.root)
        

        nx.set_node_attributes(self.g, name='module', values=module_mapping)
        nx.set_node_attributes(self.g, name='weight', values=time_mapping)
        nx.set_node_attributes(self.g, name='name', values=name_mapping)
        nx.set_node_attributes(self.g, name='file', values=file_mapping)
        nx.set_node_attributes(self.g, name='type', values=type_mapping)
        #        nx.set_node_attributes(self.g, name='children', values=children_mapping)
        nx.set_node_attributes(self.g, name='level', values=level_mapping)
        
        capacity_mapping = self.calculate_flows(self.g)        
        nx.set_edge_attributes(self.g, name='weight', values=capacity_mapping)                

        print("Nodes", self.g.nodes(data=True))
        print("Edges", self.g.edges())

        
    def get_root_runtime_Inc(self):
        root = self.graph.roots[0]
        root_metrics = utils.lookup(self.df, root)
        return root_metrics['CPUTIME (usec) (I)'].max()

    def check_and_remove_cycles(self):    
        if not self.is_tree:
            log.info("Removing the cycles from graph.....")
            cycles = nx.find_cycle(self.g, self.root)
            for cycle in cycles:
                log.warn("Removing cycles: {0} -> {1}".format(cycle[0], cycle[1]))
                self.g.remove_edge(*cycle)

    def check_and_retain_cycles(self):
        temp = {}
        if not self.is_tree:
            log.info("Renaming the cycles upto a certain level")
            cycles = nx.find_cycle(self.g, self.root)
            print cycles
            for cycle in cycles:
                if cycle[0] not in temp:
                    temp[cycle[0]] = 0
                if cycle[1] not in temp:
                    temp[cycle[1]] = 0

                temp[cycle[0]] += 1
                temp[cycle[1]] += 1

                    
                if cycle[0] == cycle[1]:
                    temp_src_trgt = (cycle[0], cycle[1]+'_')
                    self.g.add_edge(*temp_src_trgt)
                    self.g.remove_edge(*cycle)
                    break
                
                if temp[cycle[0]] > 1:
                    temp_src_trgt = (cycle[0], cycle[1]+'_')
                    print "adding {0} : {1}".format(temp_src_trgt[0], temp_src_trgt[1])
                    self.g.add_edge(*temp_src_trgt)
                    self.g.remove_edge(*cycle)
                elif temp[cycle[1]] > 1:
                    temp_src_trgt = (cycle[0], cycle[1] + '_')
                    print "adding {0} : {1}".format(temp_src_trgt[0], temp_src_trgt[1])
                    self.g.add_edge(*temp_src_trgt)
                    self.g.remove_edge(*cycle)
                    
                
    def create_module_map(self, nodes, attr):
        ret = {}
        for node in nodes:
            if attr == 'CPUTIME (usec) (I)':
                if len(self.df[self.df['node_name'] == node][attr]) != 0:
                    ret[node] =  self.df[self.df['node_name'] == node][attr].max().tolist()
                else:
                    ret[node] = 0
            else:
                ret[node] =  list(set(self.df[self.df['node_name'] == node][attr].tolist()))            
        return ret

    def draw_tree(self, g):
        subtrees = {node: ete3.Tree(name = node) for node in g.nodes()}
        [map(lambda edge:subtrees[edge[0]].add_child(subtrees[edge[1]]), g.edges())]
        tree = subtrees[self.root]        
        log.info(tree)
        return tree

    def hierarchy_level(self, G, root, level = None, parent = None):
        if level == None:
            level = {}
            level[root] = 0
        else:
            level[root] = level[parent] + 1
        neighbors = G.neighbors(root)
        if  neighbors == None:
            print "None"+ neighbors
        if neighbors != None:
            for neighbor in neighbors:
                self.hierarchy_level(G, neighbor, level=level, parent = root)
        return level

    def leaves_below(self, graph, node):
        return set(sum(([vv for vv in v if graph.out_degree(vv) == 0]
                    for k, v in nx.dfs_successors(graph, node).items()), []))

    def immediate_children(self, graph):
        ret = {}
        parentChildMap = nx.dfs_successors(graph, self.graph.roots[0])
        nodes = graph.nodes()
        for node in nodes:
            if node in parentChildMap.keys():
                ret[node] =  parentChildMap[node]
        return ret

    def calculate_flows(self, graph):
        ret = {}
        edges = graph.edges()
        for edge in edges:
            source = utils.lookupByNodeName(self.df, edge[0])
            target = utils.lookupByNodeName(self.df, edge[1])
            
            source_inc = source['CPUTIME (usec) (I)'].max()
            target_inc = target['CPUTIME (usec) (I)'].max()
            
            if source_inc == target_inc:
                ret[edge] = source_inc
            else:
                ret[edge] = target_inc
        return ret
