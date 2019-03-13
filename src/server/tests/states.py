import networkx as nx
import pandas
from hatchet import *
import os
import platform

from groupBy import groupBy
from state import State
from preprocess import PreProcess

# pd.options.display.max_rows = 10
# pd.options.display.float_format = '{:,.2f}'.format
# plt.rcParams['figure.figsize'] = (16, 12)

# Linux path
if platform.system() == "Linux":
	callflow_path = "/home/vidi/Work/llnl/CallFlow/"
else:
	#Mac OSx path
	callflow_path = "/Users/jarus/ucd/Research/Visualisation/projects/CallFlow"

dataset_path = ["data/lulesh-1/db-ampi4-100-1", "data/lulesh-1/db-ampi4-100-8"]
dataset = ['db-ampi4-100-1', 'db-ampi4-100-8']    

# Create Graphframes.
def create_gfs(file_format, paths):    
	print("Creating graphframes....")                                                                                             
	ret = []                                                                                                                         
	for idx, path in enumerate(paths):
		path = os.path.abspath(os.path.join(callflow_path, path)) 
		gf = GraphFrame()   
		gf.from_hpctoolkit(path, 3)                                                                            
		ret.append(gf) 
		print(str(idx) + ":" + path)                                                                                              
	return ret 

# util functions
def lookup(df, node):                                                                                                                    
	return df.loc[df['node'] == node] 

def lookup_with_name(df, name):
	return df.loc[df['name'] == name]

def getMaxIncTime(gf):                                                                                                                   
	ret = 0.0                                                                                                                            
	for root in gf.graph.roots:                                                                                                          
		ret = max(ret, lookup(gf.dataframe, root)['time (inc)'].max())                                                           
	return ret                                                                                                                           
																																		 
def getMaxExcTime(gf):                                                                                                                   
	ret  = gf.dataframe['time'].max()                                                                                      
	return ret                                                                                                                           
			   
def special_lookup(gf, df_index):   
	return gf.dataframe.loc[gf.dataframe['name'] == df_index] 

# Filter graphframe and graph
def filter_gfs(gfs, filterBy):                                                                                                   
	# Create the graph frames from the paths and corresponding format using hatchet                                                  
	fgfs = []                                                                                                                        
	# Filter graphframes based on threshold                                                                                          
	for idx, gf in enumerate(gfs):                                                                                              
		print("Filtering the dataframe!")                                                                                         
		if filterBy == "IncTime":                                                                                          
			max_inclusive_time = getMaxIncTime(gf)                                                                             
			filter_gf = gf.filter(lambda x: True if(x['time (inc)'] > 0.01*max_inclusive_time) else False)                   
		elif self.args.filterBy == "ExcTime":                                                                                        
			max_exclusive_time = getMaxExcTime(gf)                                                                             
			print('[Filter] By Exclusive time = {0})'.format(max_exclusive_time))                                                 
			filter_gf = gf.filter(lambda x: True if (x['time'] > 0.01*max_exclusive_time) else False)                  
		else:                                                                                                                        
			print("Not filtering.... Can take forever. Thou were warned")                                                         
			filter_gf = gf                                                                                                           
		print('[Filter] Removed {0} rows.)'.format(gf.dataframe.shape[0] - filter_gf.dataframe.shape[0]))                                                                                                                            
		print("Grafting the graph!")                                                                                            
		filter_gf = filter_gf.graft()                                                                                                
		print("[Graft] {0} rows left".format(filter_gf.dataframe.shape[0]))                           
		fgfs.append(filter_gf)                                                                                                       
	return fgfs      

# add n_index to the dataframe.
def add_n_index(gf):
	gf.dataframe['n_index'] = gf.dataframe.groupby('nid').ngroup()

def df_index_name_mapper(graph, df):
	ret = {}
	node_count = 0
	root = graph.roots[0]
	node_gen = graph.roots[0].traverse()
	try:
		while root.callpath != None:
			node_count += 1
			root = next(node_gen)
			ret[root.callpath[-1]] = root.df_index
	except StopIteration:
		pass
	finally:
		print("Total nodes in graph: ", node_count)
		del root
	return ret

# add df_index to the dataframe
def add_df_index(gf):
	df_index_name_map = df_index_name_mapper(gf.graph, gf.dataframe)
	gf.dataframe['df_index'] = gf.dataframe['name'].apply(lambda node: df_index_name_map[node] if node in df_index_name_map else 'as ')   

# add callee and caller data into the dataframe
def add_callers_and_callee(graph, df):
	callees = {}
	callers = {}
	root = graph.roots[0]
	node_gen = graph.roots[0].traverse()
	root_df = root.callpath[-1]
	callers[root_df] = []
	callees[root_df] = []
	try:                                                                                                                        
		while root.callpath != None:                                                                                            
			root = next(node_gen)                                                                                               
			if root.parent:                                                                                                     
				root_df = root.callpath[-1]                                                                                     
				parent_df = root.parent.callpath[-1]                                                                            
				if parent_df not in callees:                                                                                    
					callees[parent_df] = []              
				callees[parent_df].append(root_df)                                                                              
																																		
				if root_df not in callers:                                                                                      
					callers[root_df] = []                                                                                       
				callers[root_df].append(parent_df)                                                                              
																																		
	except StopIteration:                                                                                                       
		pass                                                                                                                    
	finally:                                                                                                                    
		del root                                                                                                                
																																		
	df['callees'] = df['name'].apply(lambda node: callees[node] if node in callees else [])                           
	df['callers'] = df['name'].apply(lambda node: callers[node] if node in callers else []) 

#pre-process dataframe to add more information. 
def preprocess(state):
	preprocess = PreProcess.Builder(state).add_df_index().add_n_index().add_mod_index().add_path().add_callers_and_callees().add_show_node().add_vis_node_name().update_module_name().clean_lib_monitor().add_max_incTime().add_incTime().add_excTime().add_avg_incTime().add_imbalance_perc().build() 


def main(dataset_path):
	dataset = []
	for idx, path in enumerate(dataset_path):
		dataset.append(path.split('/')[0])

	gfs = create_gfs('hpctoolkit', dataset_path)
	# filtered graph frames.
	fgfs = filter_gfs(gfs, 'IncTime')  
	
	states = []
	for idx, fgf in enumerate(fgfs):
		print("Shape of the dataframe from graph ({0}): {1}".format(dataset[idx], fgf.dataframe.shape))
		state = State(fgf)
		preprocess(state)
		groupBy(state, 'module')
		states.append(state)
	return states