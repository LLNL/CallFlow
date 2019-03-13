#!/usr/bin/env python
# coding: utf-8
import networkx as nx
import pandas
from hatchet import *
import os
import states as states 

# get_ipython().run_line_magic('matplotlib', 'inline')
# pd.options.display.max_rows = 10
# pd.options.display.float_format = '{:,.2f}'.format
# plt.rcParams['figure.figsize'] = (16, 12)

# ## Load the datasets and create Dataframes
dataset_path = ["data/lulesh-1/db-ampi4-100-1", "data/lulesh-1/db-ampi4-100-8"]
states = states.main(dataset_path)


# ## Gets the paths of functions inside the module and converts to a dataframe.
def getHierarchyfromdf(state, module):
    df = state.df
    paths = []
    func_in_module = df.loc[df['module'] == module]['name'].unique().tolist()
    print("Number of functions inside the {0} module: {1}".format(module, len(func_in_module)))
    for idx, func in enumerate(func_in_module):
        mean_inc_time = df.loc[df['name'] == func]['CPUTIME (usec) (I)'].mean()
        mean_exc_time = df.loc[df['name'] == func]['CPUTIME (usec) (E)'].mean()
        paths.append({
            "module": module,
            "opath": df.loc[df['name'] == func]['path'].unique().tolist()[0],
            "path": df.loc[df['name'] == func]['component_path'].unique().tolist()[0],
            "inc_time" : df.loc[df['name'] == func]['CPUTIME (usec) (I)'].mean(),
            "exclusive" : df.loc[df['name'] == func]['CPUTIME (usec) (E)'].mean(),
            "imbalance_perc" : df.loc[df['name'] == func]['imbalance_perc'].mean(),
            "component_level": df.loc[df['name'] == func]['component_level'].unique().tolist()[0],
        })
    return pd.DataFrame(paths)

for idx, state in enumerate(states):
    modules = state.df['module'].unique().tolist()
    print("In dataset {0}, there are {1} modules".format(dataset_path[idx], len(modules)))
    for idx, module in enumerate(modules):
        paths = getHierarchyfromdf(state, module)
        state.paths_df = paths 
        #paths.to_csv(str(module + ".csv"))


# ## Methods to add data into NxGraph
def add_paths(state, path_name):
    for idx, row in state.df.iterrows():
        state.g.add_path(row[path_name])

def add_levels(state):
    levelMap = {}
    track_level = 0
    nodes = state.g.nbunch_iter(state.root)
    
    for start_node in nodes:
        print("Start node", start_node)
        active_nodes = [start_node]
        levelMap[state.root] = 0
        
        for edge in nx.edge_dfs(state.g, start_node, 'original'):
            #rint("Edge {0}".format(edge))
            head_level = None
            tail_level = None
            head, tail = edge[0], edge[1]
            
            if head != start_node:
                active_nodes.append(head)
                
            if head in active_nodes and head != start_node and tail in active_nodes:
                #rint("Cycle", edge)
                edge_data = state.g.get_edge_data(*edge)                                                                             
                state.g.add_node(tail+'_')                                                                                           
                state.g.add_edge(head, tail+'_', data=edge_data)                                                                     
                state.g.node[tail+'_']['name'] = [tail + '_']                                                                        
                #state.g.node[tail+'_']['weight'] = state.g.node[tail]['weight']   
                state.g.remove_edge(edge[0], edge[1])
    return levelMap

def flow_map(state):                                                                                                                 
       flowMap = {}                                                                                                                    
       nodes = state.g.nbunch_iter(state.root)                                                                                           
       for start_node in nodes:                                                                                                        
           for edge in nx.edge_dfs(state.g, start_node, 'original'):                                                                    
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

def calculate_flows(state):
    graph = state.g
    ret = {}                                                                                                                                                                                                                                                                          
    edges = graph.edges()                                                                                                                                                                                                                                                             
    additional_flow = {}                                                                                                                                                                                                                                                              
                                                                                                                                                                                                                                                                                          
    # Calculates the costs in cycles and aggregates to one node.                                                                                                                                                                                                                      
    for edge in edges:                                                                                                                                                                                                                                                                
        source = edge[0]                                                                                                                                                                                                                                                              
        target = edge[1]                                                                                                                                                                                                                                                              
                                                                                                                                                                                                                                                                                          
        if source.endswith('_'):                                                                                                                                                                                                                                                      
            cycle_node = source                                                                                                                                                                                                                                                       
            cycle_node_df = self.state.lookup_with_nodeName(cycle_node[:-1])                                                                                                                                                                                                      
            additional_flow[cycle_node] = cycle_node_df['CPUTIME (usec) (I)'].max()                                                                                                                                                                                                   
        elif target.endswith('_'):                                                                                                                                                                                                                                                    
            cycle_node = target                                                                                                                                                                                                                                                       
            cycle_node_df = state.lookup_with_nodeName(cycle_node[:-1])                                                                                                                                                                                                      
            additional_flow[cycle_node] = cycle_node_df['CPUTIME (usec) (I)'].max()                                                                                                                                                                                                   
                                                                                                                                                                                                                                                                                          
    for edge in edges:                                                                                                                                                                                                                                                                
        added_flow = 0                                                                                                                                                                                                                                                                
        if edge[0].endswith('_'):                                                                                                                                                                                                                                                     
            ret[edge] = additional_flow[edge[0]]                                                                                                                                                                                                                                      
            continue                                                                                                                                                                                                                                                                  
        elif edge[1].endswith('_'):                                                                                                                                                                                                                                                   
            ret[edge] = additional_flow[edge[1]]                                                                                                                                                                                                                                      
            continue                                                                                                                                                                                                                                                                  
        source = state.lookup_with_nodeName(edge[0])                                                                                                                                                                                                                         
        target = state.lookup_with_nodeName(edge[1])                                                                                                                                                                                                                         
                                                                                                                                                                                                                                                                                          
        source_inc = source['CPUTIME (usec) (I)'].max()                                                                                                                                                                                                                               
        target_inc = target['CPUTIME (usec) (I)'].max()                                                                         
                                                                                                                                                                                                                                                                                          
        if source_inc == target_inc:                                                                                                                                                                                                                                                  
            ret[edge] = source_inc                                                                                                                                                                                                                                                    
        else:                                                                                                                                                                                                                                                                         
            ret[edge] = target_inc    
    return ret   

def add_edge_attributes(state):
    capacity_mapping = calculate_flows(state)    
    nx.set_edge_attributes(state.g, name='weight', values=capacity_mapping)

def generic_map(df, nodes, attr):
    ret = {}
    for node in nodes:            
        if attr == 'CPUTIME (usec) (I)':
            ret[node] = df[df['name'] == node][attr].mean()
        else:
            ret[node] = df[df['name'] == node][attr].unique().tolist()     
    return ret

def add_node_attributes(state):
    module_mapping = generic_map(state.df, state.g.nodes(), 'module')
    nx.set_node_attributes(state.g, name='module', values=module_mapping)
    
    time_mapping = generic_map(state.df, state.g.nodes(), 'CPUTIME (usec) (I)')
    nx.set_node_attributes(state.g, name='CPUTIME (usec) (E)', values=time_mapping)

# ## Create NxGraph
def create_nx_graph(states):
    console.log('a')
    for idx, state in enumerate(states):
        state.g = nx.DiGraph()
        state.root = state.lookup_with_node(state.graph.roots[0])['name'][0]
        state.rootInc = state.lookup_with_node(state.graph.roots[0])['CPUTIME (usec) (I)'].max()
        add_paths(state, 'path')
        state.levelMap = add_levels(state)
        add_node_attributes(state)
        add_edge_attributes(state)  
    return states