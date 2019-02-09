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
from logger import log

class CallGraph(nx.Graph):
    def __init__(self, state, path_name, add_info):
        super(CallGraph, self).__init__()
        self.state = state
        self.graph = self.state.graph
        self.df = self.state.df
        self.root = state.lookup_with_node(self.graph.roots[0])['vis_node_name'][0]
        
        self.rootRunTimeInc = self.root_runtime_inc()
        self.edge_direction = {}        
        self.g = nx.DiGraph(rootRunTimeInc = int(self.rootRunTimeInc))
        
        self.add_paths(path_name)
        if add_info == True:
            self.add_node_attributes()
            self.add_edge_attributes()
        else:
            print('not adding attributes')
            pass

        # self.adj_matrix = nx.adjacency_matrix(self.g)
        # print(self.adj_matrix.todense())

#        print("Nodes", self.g.nodes(data=True))
#        print("Edges", self.g.edges(data=True))

        log.warn("Nodes in the tree: {0}".format(len(self.g.nodes)))
        log.warn("Edges in the tree: {0}".format(len(self.g.edges)))
        log.warn("Is it a tree? : {0}".format(nx.is_tree(self.g)))    
        log.warn("Flow hierarchy: {0}".format(nx.flow_hierarchy(self.g)))

    def get_graph(self):
        return self.g

    def root_runtime_inc(self):
        root = self.graph.roots[0]
        root_metrics = self.state.lookup(root.df_index)
        return root_metrics['CPUTIME (usec) (I)'].max()
    
    def add_paths(self, path_name):
        for idx, row in self.df.iterrows():
            if row.show_node:
                self.g.add_path(row[path_name])                

    def add_node_attributes(self):        
#        module_mapping = self.create_module_map(self.g.nodes(), 'module')
#        file_mapping = self.create_module_map(self.g.nodes(), 'file')
#        type_mapping = self.create_module_map(self.g.nodes(), 'type')
#        children_mapping = self.create_module_map(self.g.nodes(), 'children')

#        nx.set_node_attributes(self.g, name='module', values=module_mapping)
#        nx.set_node_attributes(self.g, name='file', values=file_mapping)
#        nx.set_node_attributes(self.g, name='type', values=type_mapping)

        time_mapping = self.generic_map(self.g.nodes(), 'CPUTIME (usec) (I)')
        nx.set_node_attributes(self.g, name='weight', values=time_mapping)

        name_mapping = self.generic_map(self.g.nodes(), 'vis_node_name')
        nx.set_node_attributes(self.g, name='name', values=name_mapping)

        type_mapping = self.generic_map(self.g.nodes(), 'type')
        nx.set_node_attributes(self.g, name='type', values=type_mapping)
        
        df_index_mapping = self.generic_map(self.g.nodes(), 'df_index')
        nx.set_node_attributes(self.g, name='df_index', values=df_index_mapping)

        n_index_mapping = self.generic_map(self.g.nodes(), 'n_index')
        nx.set_node_attributes(self.g, name='n_index', values=n_index_mapping)

        mod_index_mapping = self.generic_map(self.g.nodes(), 'mod_index')
        nx.set_node_attributes(self.g, name='mod_index', values=mod_index_mapping)

        imbalance_perc_mapping = self.generic_map(self.g.nodes(), 'imbalance_perc')
        nx.set_node_attributes(self.g, name='imbalance_perc', values=imbalance_perc_mapping)

        show_node_mapping = self.generic_map(self.g.nodes(), 'show_node')
        nx.set_node_attributes(self.g, name='show_node', values=imbalance_perc_mapping)

        self.level_mapping = self.assign_levels()               
        nx.set_node_attributes(self.g, name='level', values=self.level_mapping)

        children_mapping = self.immediate_children()
        nx.set_node_attributes(self.g, name='children', values=children_mapping)

#        self.find_bridge_nodes()
        
    def generic_map(self, nodes, attr):
        ret = {}
        for node in nodes:            
            # For back edges, name = 'backedge', weight = -1
            if node.endswith('_'):
                if attr == 'vis_node_name':
                    ret[node] = [node]
                    continue
                if attr == 'CPUTIME (usec) (I)':
                    ret[node] = self.df[self.df['vis_node_name'] == node[:-1]][attr].max().tolist()
                    continue
                if attr == 'node_type':
                    ret[node] = 'back_edge'
                    continue
            
            if attr == 'CPUTIME (usec) (I)':
                if len(self.df[self.df['vis_node_name'] == node][attr]) != 0:
                    ret[node] =  self.df[self.df['vis_node_name'] == node][attr].max().tolist()
                else:
                    ret[node] = 0
            elif attr == 'node_type':
                ret[node] = 'normal_edge'
            else:
                ret[node] =  list(set(self.df[self.df['vis_node_name'] == node][attr].tolist()))            
        return ret

    def tailhead(self, edge):
        return edge[0], edge[1]

    def tailheadDir(self, edge):
        print(str(edge[0]), str(edge[1]), self.edge_direction[edge])

    def edges_from(self, node):
        for e in self.g.edges(node):
            yield e + ('forward',)            

    def edge_id(self, edge):
        return edge[:-1]

    def assign_levels(self):
        levelMap = {}
        track_level = 0
        nodes = self.g.nbunch_iter(self.root)
        
        for start_node in nodes:            
            active_nodes = [start_node]
            levelMap[self.root] = 0
            
            for edge in nx.edge_dfs(self.g, start_node, 'original'):                
                log.warn("[Graph] Edge: {0}".format(edge))
                head_level = None
                tail_level = None
                head, tail = self.tailhead(edge)
                
                if head != start_node:
                    active_nodes.append(head)

                # if cycle is found 
                if head in active_nodes and head != start_node and tail in active_nodes:
                    log.warn('Cycle found : {0} <====> {1}'.format(head, tail))
                    self.edge_direction[(head, tail+'_')] = 'back_edge'
                    edge_data = self.g.get_edge_data(*edge)
                    self.g.add_node(tail+'_')
                    self.g.add_edge(head, tail+'_', data=edge_data)
                    self.g.node[tail+'_']['name'] = [tail + '_']
                    self.g.node[tail+'_']['weight'] = self.g.node[tail]['weight']
                    self.g.remove_edge(edge[0], edge[1])
                    levelMap[tail+'_'] = track_level + 1
                    continue
                else:
                    self.edge_direction[(head, tail)] = 'forward_edge'
                    levelMap[tail] = levelMap[head] +  1                    
                    track_level += 1
                    log.warn("level for {0}: {1}".format(tail, levelMap[tail]))
                # Since dfs, set level = 0 when head is the start_node. 
                if head == start_node:
                    active_nodes = [start_node]
                    track_level = 0

        return levelMap
        
    def flow_map(self):
        flowMap = {}
        nodes = self.g.nbunch_iter(self.root)
        for start_node in nodes:            
            for edge in nx.edge_dfs(self.g, start_node, 'original'):                                
                head_level = None
                tail_level = None
                head, tail = self.tailhead(edge)
                
                # Check if there is an existing level mapping for the head node and assign. 
                if head in self.level_mapping.keys():
                    head_level =  self.level_mapping[head]

                # Check if there is an existing level mapping for the tail node and assign. 
                if tail in self.level_mapping.keys():
                    tail_level = self.level_mapping[tail]

                flowMap[(edge[0], edge[1])] = (int(head_level), int(tail_level))
        return flowMap
                                
    def add_edge_attributes(self):
        capacity_mapping = self.calculate_flows(self.g)
        type_mapping = self.edge_type(self.g)
        flow_mapping = self.flow_map()
        print(flow_mapping)
        nx.set_edge_attributes(self.g, name='weight', values=capacity_mapping)
        nx.set_edge_attributes(self.g, name='type', values=type_mapping)
        nx.set_edge_attributes(self.g, name='flow', values=flow_mapping)

    def draw_tree(self, g):
        subtrees = {node: ete3.Tree(name = node) for node in g.nodes()}
        [map(lambda edge:subtrees[edge[0]].add_child(subtrees[edge[1]]), g.edges())]
        tree = subtrees[self.root]        
        log.info(tree)
        return tree

    def leaves_below(self, graph, node):
        return set(sum(([vv for vv in v if graph.out_degree(vv) == 0]
                    for k, v in nx.dfs_successors(graph, node).items()), []))

    def immediate_children(self):
        ret = {}
        parentChildMap = nx.dfs_successors(self.g, self.root)
        nodes = self.g.nodes()
        for node in nodes:
            if node in parentChildMap.keys():
                ret[node] =  parentChildMap[node]
        return ret

    def edge_type(self, graph):
        ret = {}
        edges = graph.edges()
        for edge in edges:
            source = edge[0]
            target = edge[1]

            if source.endswith('_') or target.endswith('_'):
                ret[edge] = 'back_edge'
            else:
                ret[edge] = 'forward_edge'
        return ret
            

    def calculate_flows(self, graph):
        ret = {}
        edges = graph.edges()
        additional_flow = {}
        
        # Calculates the costs in cycles and aggregates to one node.
        for edge in edges:
            source = edge[0]
            target = edge[1]
            
            if source.endswith('_'):
                cycle_node = source
                cycle_node_df = self.state.lookup_with_vis_nodeName(cycle_node[:-1])
                additional_flow[cycle_node] = cycle_node_df['CPUTIME (usec) (I)'].max()
            elif target.endswith('_'):
                cycle_node = target
                cycle_node_df = self.state.lookup_with_vis_nodeName(cycle_node[:-1])
                additional_flow[cycle_node] = cycle_node_df['CPUTIME (usec) (I)'].max()
                
        for edge in edges:
            added_flow = 0
            if edge[0].endswith('_'):              
                ret[edge] = additional_flow[edge[0]]
                continue
                # source_name = edge[0]
                # target_name = edge[1]
                # added_flow = additional_flow[source_name]
            elif edge[1].endswith('_'):
                ret[edge] = additional_flow[edge[1]]
                continue
                # source_name = edge[0]
                # target_name = edge[1]
                # added_flow = additional_flow[target_name]
            source = self.state.lookup_with_vis_nodeName(edge[0])
            target = self.state.lookup_with_vis_nodeName(edge[1])           
            
            source_inc = source['CPUTIME (usec) (I)'].max()
            target_inc = target['CPUTIME (usec) (I)'].max()


            if source_inc == target_inc:
                ret[edge] = source_inc
            else:
                ret[edge] = target_inc

        return ret
