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
    def __init__(self, state, path_name):
        super(CallGraph, self).__init__()
        self.state = state
        self.graph = self.state.graph
        self.df = self.state.df

        self.root = self.state.lookup(self.graph.roots[0].df_index).name[0]
        self.rootRunTimeInc = self.get_root_runtime_Inc()
        
        self.g = nx.DiGraph(rootRunTimeInc = self.rootRunTimeInc)       
        
        for idx, row in self.df.iterrows():
            if row.show_node:
                self.g.add_path(row[path_name])
                
        log.warn("Flow hierarchy: {0}".format(nx.flow_hierarchy(self.g)))
        self.is_tree = nx.is_tree(self.g)
        log.warn("Is it a tree? : {0}".format(self.is_tree))

        print("Nodes", self.g.nodes(data=True))
        print("Edges", self.g.edges(data=True))

        self.root = 'libmonitor.so.0.0.0'

        self.add_node_attributes()
        self.add_edge_attributes()

        print("Nodes", self.g.nodes(data=True))
        print("Edges", self.g.edges(data=True))


    def add_node_attributes(self):        
#        module_mapping = self.create_module_map(self.g.nodes(), 'module')
#        file_mapping = self.create_module_map(self.g.nodes(), 'file')
#        type_mapping = self.create_module_map(self.g.nodes(), 'type')
#        children_mapping = self.immediate_children(g)
#        children_mapping = self.create_module_map(self.g.nodes(), 'children')

#        nx.set_node_attributes(self.g, name='module', values=module_mapping)
#        nx.set_node_attributes(self.g, name='file', values=file_mapping)
#        nx.set_node_attributes(self.g, name='type', values=type_mapping)
#        nx.set_node_attributes(self.g, name='children', values=children_mapping)

        time_mapping = self.create_module_map(self.g.nodes(), 'CPUTIME (usec) (I)')
        nx.set_node_attributes(self.g, name='weight', values=time_mapping)

        name_mapping = self.create_module_map(self.g.nodes(), 'vis_node_name')
        nx.set_node_attributes(self.g, name='name', values=name_mapping)

        type_mapping = self.create_module_map(self.g.nodes(), 'type')
        nx.set_node_attributes(self.g, name='type', values=type_mapping)
        
        df_index_mapping = self.create_module_map(self.g.nodes(), 'df_index')
        nx.set_node_attributes(self.g, name='df_index', values=df_index_mapping)
        
        self.level_mapping = self.level_map()               
        nx.set_node_attributes(self.g, name='level', values=self.level_mapping)
        
    def add_edge_attributes(self):
        capacity_mapping = self.calculate_flows(self.g)
        type_mapping = self.edge_type(self.g)
        flow_mapping = self.flow_map()
        nx.set_edge_attributes(self.g, name='weight', values=capacity_mapping)
        nx.set_edge_attributes(self.g, name='type', values=type_mapping)
        nx.set_edge_attributes(self.g, name='flow', values=flow_mapping)
        
    def get_root_runtime_Inc(self):
        root = self.graph.roots[0]
        root_metrics = self.state.lookup(root.df_index)
        return root_metrics['CPUTIME (usec) (I)'].max()

    def check_and_remove_cycles(self):    
        log.info("Removing the cycles from graph.....")
        cycles = nx.find_cycle(self.g, self.root, orientation='ignore')
        for cycle in cycles:
             log.warn("Removing cycles: {0} -> {1}".format(cycle[0], cycle[1]))
             
    def tailhead(self, edge):
        return edge[0], edge[1]

    def edges_from(self, node):
        for e in self.g.edges(node):
            yield e + ('forward',)            

    def edge_id(self, edge):
        return edge[:-1] 
    
    def hierarchy_level1(self):
        level = {}
        level[self.root] = 0
        nodes = self.g.nbunch_iter(self.root)

        v_nodes = set()
        v_edges = set()
        edges = {}
        
        for start_node in nodes:
            seen = [start_node]
            active_nodes = {start_node}

            level = 0
            while seen:
                curr_node = seen[-1]
                if curr_node not in v_nodes:
                    edges[curr_node] = self.edges_from(curr_node)
                    v_nodes.add(curr_node)

                try:
                    edge = next(edges[curr_node])
                    if edge[-1] == 'forward':
                        print 'level up', edge[0], edge[1]
#                        level[edge[1]] = level[edge[0]] + 1                        
                except StopIteration:
                    seen.pop()
                    level = 0
                else:
                    edgeid = self.edge_id(edge)
                    if edgeid not in v_edges:
                        v_edges.add(edgeid)
                        if edge[-1] == 'reverse':
                            seen.append(edge[0])
                        else:
                            seen.append(edge[1])                
        return level

    def level_map(self):
        levelMap = {}
        track_level = 0
        nodes = self.g.nbunch_iter(self.root)
        
        for start_node in nodes:            
            active_nodes = [start_node]
            levelMap[self.root] = 0
            
            for edge in nx.edge_dfs(self.g, start_node, 'original'):                
                print "Edge:", edge
                head_level = None
                tail_level = None
                head, tail = self.tailhead(edge)

                if head in active_nodes and head != start_node and tail in active_nodes:
                    print 'Cycle found', head, tail
                    edge_data = self.g.get_edge_data(*edge)
#                    node_data = self.g.get_node_data(tail)
                    self.g.add_node(tail+'_')
                    self.g.add_edge(head, tail+'_', data=edge_data)
                    self.g.node[tail+'_']['name'] = [tail + '_']
                    self.g.node[tail+'_']['weight'] = self.g.node[tail]['weight']
                    self.g.remove_edge(*edge)
                    levelMap[tail+'_'] = track_level + 1
                    continue
                else:
                    if head != start_node:
                        active_nodes.append(head)
                    levelMap[tail] = levelMap[head] +  1
                    track_level += 1

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

                flowMap[edge] = (head_level, tail_level)
        return flowMap
                                
    def check_and_retain_cycles(self, allow_level):
        temp = {}
        if not self.is_tree:
            cycles = self.find_cycle()
            print nx.convert_node_labels_to_integers(self.g)
            log.info("Renaming the cycles upto a certain level")
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
                
                if temp[cycle[0]] > allow_level:
                    temp_src_trgt = (cycle[0], cycle[1]+'_')                    
                    print "adding {0} : {1}".format(temp_src_trgt[0], temp_src_trgt[1])
                    self.g.add_node(cycle[1]+'_')
                    self.g.add_edge(*temp_src_trgt)
                    self.g.remove_edge(cycle[0], cycle[1])
                elif temp[cycle[1]] > allow_level:
                    temp_src_trgt = (cycle[0] + '_', cycle[1])
                    print "adding {0} : {1}".format(temp_src_trgt[0], temp_src_trgt[1])
                    self.g.add_node(cycle[0]+'_')
                    self.g.add_edge(*temp_src_trgt)
                    self.g.remove_edge(cycle[0], cycle[1])
                    
                
    def create_module_map(self, nodes, attr):
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

    def draw_tree(self, g):
        subtrees = {node: ete3.Tree(name = node) for node in g.nodes()}
        [map(lambda edge:subtrees[edge[0]].add_child(subtrees[edge[1]]), g.edges())]
        tree = subtrees[self.root]        
        log.info(tree)
        return tree

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
