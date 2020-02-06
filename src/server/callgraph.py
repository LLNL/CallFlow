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

import networkx as nx
from logger import log
import math
import json
from ast import literal_eval as make_tuple
import ete3


class CallGraph(nx.Graph):
	def __init__(self, state, path_name, add_info, group_by):
	    super(CallGraph, self).__init__()
	    self.state = state
	    self.path_name = path_name
	    self.graph = self.state.graph
	    self.df = self.state.df
	    self.root = state.lookup_with_node(self.graph.roots[0])['vis_node_name'][0]
	    self.group_by = group_by
	    # self.callbacks = self.state.callbacks
	    self.callbacks = []

	    
	    self.rootRunTimeInc = self.root_runtime_inc()
	    self.edge_direction = {}        
	    self.g = nx.DiGraph(rootRunTimeInc = int(self.rootRunTimeInc))

	    debug = True
	    if(debug):
	        log.warn('Modules: {0}'.format(self.df['module'].unique()))
	        log.warn('Top 10 Inclusive time: ')
	        top = 10
	        rank_df = self.df.groupby(['name', 'nid']).mean()
	        top_inclusive_df = rank_df.nlargest(top, 'time (inc)', keep="first")
	        for name, row in top_inclusive_df.iterrows():
	            log.info('{0} [{1}]'.format(name, row["time (inc)"]))

	        log.warn('Top 10 Enclusive time: ')
	        top_exclusive_df = rank_df.nlargest(top, 'time', keep="first")
	        for name, row in top_exclusive_df.iterrows():
	            log.info('{0} [{1}]'.format(name, row["time"]))
	
	    self.add_paths(path_name)
	    # self.add_callback_paths()

	    if add_info == True:
	        log.info('Creating a Graph with node or edge attributes.', self.path_name)
	        self.add_node_attributes()
	        self.add_edge_attributes()
	    else:
	        log.info('Creating a Graph without node or edge attributes.')
	        pass

	    for node in self.g.nodes(data=True):
	        log.info("Node: {0}".format(node))
	    for edge in self.g.edges():
	        log.info("Edge: {0}".format(edge))
	    
	    if debug:
	        log.warn("Nodes in the tree: {0}".format(len(self.g.nodes)))
	        log.warn("Edges in the tree: {0}".format(len(self.g.edges)))
	        log.warn("Is it a tree? : {0}".format(nx.is_tree(self.g)))    
	        log.warn("Flow hierarchy: {0}".format(nx.flow_hierarchy(self.g)))

	def root_runtime_inc(self):
	    root = self.graph.roots[0]
	    root_metrics = self.state.lookup_with_node(root)
	    return root_metrics['time (inc)'].max()

	def no_cycle_path(self, path):
	    ret = []
	    mapper = {}
	    for idx, elem in enumerate(path):
	        if elem not in mapper:
	            mapper[elem] = 1
	            ret.append(elem)
	        else:
	            ret.append(elem + "/" + str(mapper[elem]))
	            mapper[elem] += 1
	    return tuple(ret)
	
	def add_paths(self, path_name):
	    for idx, row in self.df.iterrows():
	        # if row.show_node:
	            path = row[path_name]
	            # TODO: Sometimes the path becomes a string. Find why it happens. 
	            # If it becomes a string 
	            if isinstance(path, str):
	                path = make_tuple(path)
 
	            corrected_path = self.no_cycle_path(path)
	            if(len(corrected_path) >= 2):   
	                source = corrected_path[-2]
	                target = corrected_path[-1]

	                if not self.g.has_edge(source, target):
	                    self.g.add_edge(source, target)

	def add_callback_paths(self):
	    for from_module, to_modules in self.callbacks.items():
	        for idx, to_module in enumerate(to_modules):
	            self.g.add_edge(from_module, to_module, type="callback")

	def add_node_attributes(self):        
	    time_inc_mapping = self.generic_map(self.g.nodes(), 'time (inc)')
	    nx.set_node_attributes(self.g, name='time (inc)', values=time_inc_mapping)

	    time_mapping = self.generic_map(self.g.nodes(), 'time')
	    nx.set_node_attributes(self.g, name="time", values=time_mapping)

	    name_mapping = self.generic_map(self.g.nodes(), 'vis_node_name')
	    nx.set_node_attributes(self.g, name='name', values=name_mapping)

	    nid_mapping = self.generic_map(self.g.nodes(), 'nid')
	    nx.set_node_attributes(self.g, name='nid', values=nid_mapping)

	    # type_mapping = self.generic_map(self.g.nodes(), 'type')
	    # nx.set_node_attributes(self.g, name='type', values=type_mapping)

	    # n_index_mapping = self.generic_map(self.g.nodes(), 'n_index')
	    # nx.set_node_attributes(self.g, name='n_index', values=n_index_mapping)

	    # module_mapping = self.generic_map(self.g.nodes(), 'module')
	    # nx.set_node_attributes(self.g, name='module', values=module_mapping)

	    # mod_index_mapping = self.generic_map(self.g.nodes(), 'mod_index')
	    # nx.set_node_attributes(self.g, name='mod_index', values=mod_index_mapping)

	    # imbalance_perc_mapping = self.generic_map(self.g.nodes(), 'imbalance_perc')
	    # nx.set_node_attributes(self.g, name='imbalance_perc', values=imbalance_perc_mapping)

	    # show_node_mapping = self.generic_map(self.g.nodes(), 'show_node')
	    # nx.set_node_attributes(self.g, name='show_node', values=imbalance_perc_mapping)

	    # self.level_mapping = self.assign_levels()               
	    # nx.set_node_attributes(self.g, name='level', values=self.level_mapping)

	    # children_mapping = self.immediate_children()
	    # nx.set_node_attributes(self.g, name='children', values=children_mapping)

	    entry_function_mapping = self.generic_map(self.g.nodes(), 'entry_functions')
	    nx.set_node_attributes(self.g, name='entry_functions', values=entry_function_mapping)

	def generic_map(self, nodes, attr):
	    ret = {}
	    for node in nodes:
	        if self.group_by == 'module':
	            groupby = 'module'
	        elif self.group_by == 'name':
	            groupby = 'name'
	        elif self.path_name == 'path':
	            groupby = '_name'

	        if "=" in node:
	            log.info('Super node: {0}'.format(node))
	            corrected_module = node.split('=')[0]
	            corrected_function = node.split('=')[1]
	            corrected_node = corrected_module
	            groupby = 'module'
	        elif '/' in node:
	            log.info('Meta node: {0}'.format(node))
	            corrected_module = node.split('/')[0]
	            corrected_function = node.split('/')[1]
	            corrected_node = corrected_function
	            log.info("Getting dets of [module={0}], function={1}".format(corrected_module, corrected_node))
	            groupby = 'name'
	        else:
	            log.info('Node: {0}'.format(node))
	            corrected_node = node
	            corrected_function = node
	            groupby = 'module'
 
	        if attr == 'time (inc)':
	            group_df = self.df.groupby([groupby]).max()
	            # log.info("Group df by {0} = \n {1}".format(groupby, group_df))
	            ret[node] = group_df.loc[corrected_node, 'time (inc)']
	        
	        elif attr == 'entry_functions':
	            module_df = self.df.loc[self.df['module'] == corrected_node]
	            entry_func_df = module_df.loc[(module_df['component_level'] == 2)]
	            if(entry_func_df.empty):
	                ret[node] = json.dumps({
	                    'name': '',
	                    'time': [],
	                    'time (inc)': []
	                })
	            else:
	                name = entry_func_df['name'].unique().tolist()
	                time = entry_func_df['time'].mean().tolist()
	                time_inc = entry_func_df['time (inc)'].mean().tolist()
	            
	                ret[node] = json.dumps({
	                    'name': entry_func_df['name'].unique().tolist(),
	                    'time': entry_func_df['time'].mean().tolist(),
	                    'time (inc)': entry_func_df['time (inc)'].mean().tolist()
	                })

	        elif attr == 'imbalance_perc':
	            module_df = self.df.loc[self.df['module'] == corrected_node]
	            max_incTime = module_df['time (inc)'].max()
	            min_incTime = module_df['time (inc)'].min()
	            avg_incTime = module_df['time (inc)'].mean()

	            ret[node] = (max_incTime - avg_incTime)/max_incTime

	        elif attr == 'time':
	            module_df = self.df.loc[self.df['module'] == corrected_node]
	            if self.group_by == 'module':
	                group_df = self.df.groupby([groupby]).max()
	            elif self.group_by == 'name':
	                group_df = self.df.groupby([groupby]).mean()
	            ret[node] = group_df.loc[corrected_node, 'time']
	    
	        elif attr == 'vis_node_name':
	            ret[node] = [node] 
	        
	        elif attr == 'nid':
	            ret[node] = self.df.loc[self.df['name'] == corrected_function]['nid'].tolist()
	            
	        else:
	            group_df = self.df.groupby(['name']).mean()
	            ret[node] = group_df.loc[corrected_node, attr]
	    return ret

	def tailhead(self, edge):
	    return edge[0], edge[1]

	def tailheadDir(self, edge):
	    return str(edge[0]), str(edge[1]), self.edge_direction[edge]
	                            
	def add_edge_attributes(self):
	    log.warn('=============Edges==============')
	    capacity_mapping = self.calculate_flows(self.g)
	    # type_mapping = self.edge_type(self.g)
	    # flow_mapping = self.flow_map()
	    nx.set_edge_attributes(self.g, name='weight', values=capacity_mapping)
	    # nx.set_edge_attributes(self.g, name='type', values=type_mapping)
	    # nx.set_edge_attributes(self.g, name='flow', values=flow_mapping)

	# Calculate the sankey flows from source node to target node.        
	def calculate_flows(self, graph):
	    ret = {}
	    edges = graph.edges(data=True)
	    additional_flow = {}
	    
	    # # Calculates the costs in cycles and aggregates to one node.
	    # for edge in edges:
	    #     source = edge[0]
	    #     target = edge[1]
	        
	    #     if source.endswith('_'):
	    #         cycle_node = source
	    #         cycle_node_df = self.state.lookup_with_vis_nodeName(cycle_node[:-1])
	    #         additional_flow[cycle_node] = cycle_node_df['time (inc)'].max()
	    #     elif target.endswith('_'):
	    #         cycle_node = target
	    #         cycle_node_df = self.state.lookup_with_vis_nodeName(cycle_node[:-1])
	    #         additional_flow[cycle_node] = cycle_node_df['time (inc)'].max()
	            
	    for edge in edges:
	        log.warn('--------------------------------')
	        added_flow = 0
	        # if edge[0].endswith('_'):              
	        #     ret[edge] = additional_flow[edge[0]]
	        #     continue
	        # elif edge[1].endswith('_'):
	        #     ret[edge] = additional_flow[edge[1]]
	        #     continue

	        # source edge 
	        if '/' in edge[0]:
	            source_module = edge[0].split('/')[0]
	            source_function = edge[0].split('/')[1]
	            source_df = self.df.loc[(self.df['name'] == source_function)]
	        elif '=' in edge[0]:
	            source_module = edge[0].split('=')[0]
	            source_function = edge[0].split('=')[1]
	            source_df = self.df.loc[(self.df['module'] == source_module)]

	        source_inc = source_df['time (inc)'].mean()
	        # print(source_df)
	        
	        # For target edge
	        if '/' in edge[1]:
	            target_module = edge[1].split('/')[0]
	            target_function = edge[1].split('/')[1]
	            target_df = self.df.loc[(self.df['name'] == target_function)]
	        elif '=' in edge[1]:
	            target_module = edge[1].split('=')[0]
	            target_function = edge[1].split('=')[1]
	            target_df = self.df.loc[(self.df['module'] == target_module)]

	        target_inc = target_df['time (inc)'].mean()
	        # print(target_df)
	                             
	        log.info("Source node : {0}[{1}], time : {2}".format(source_function, source_module, source_inc))
	        log.info("Target node : {0}[{1}], time : {2}".format(target_function, target_module, target_inc))

	        if source_inc == target_inc:
	            ret[(edge[0], edge[1])] = source_inc
	        else:
	            ret[(edge[0], edge[1])] = target_inc

	        if math.isnan(ret[(edge[0], edge[1])]):
	            ret[(edge[0], edge[1])] = 0
	    return ret