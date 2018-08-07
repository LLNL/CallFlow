from hatchet import *
import math
import sys
import time
from collections import defaultdict
import networkx as nx
from networkx.readwrite import json_graph
from collections import deque
import utils
import matplotlib.pyplot as plt
import ete3
from logger import log

class Node:
    def __init__(self, node_type):
        self.node_type = node_type
        self.split = NO_SPLIT
        self.index_in_root = -1
        self.comp_num = -1
        self.is_separated = False

class Callflow():
    def __init__(self, gf):
        self.gf = gf
        self.df = gf.dataframe
        self.graph = gf.graph
        self.pre_process()
        self.g = self.create_graph()
        self.tree = self.create_subtrees(self.g)
        self.sg = self.create_super_graph(self.g, {})
        self.cfg = self.convert_graph(self.tree)

    def pre_process(self):
        self.df['path'] =  self.df['node'].apply(lambda node: node.callpath)
        self.df = self.df.reset_index(drop=True)
        self.df.groupby(['node'], as_index=True, squeeze=True)
        self.root = list(set(utils.lookup(self.df, self.graph.roots[0]).name))[0]
        self.rootRunTimeInc = self.getRootRunTimeInc() 
        print self.df
        
    def create_graph(self):        
        g = nx.DiGraph(rootRunTimeInc = self.rootRunTimeInc)        
        for path in self.df['path']:
            g.add_path(path)

        g = self.check_cycles(g)
        
        module_mapping = self.create_module_map(g.nodes(), 'module')
        name_mapping = self.create_module_map(g.nodes(), 'name')
        file_mapping = self.create_module_map(g.nodes(), 'file')
        type_mapping = self.create_module_map(g.nodes(), 'type')
        time_mapping = self.create_module_map(g.nodes(), 'CPUTIME (usec) (E)')
        children_mapping = self.immediate_children(g)
        level_mapping = self.hierarchy_level(g, self.root)
#        render_mapping = self.is_renderable_node(g, query)

        nx.set_node_attributes(g, 'module', module_mapping)
        nx.set_node_attributes(g, 'weight', time_mapping)
        nx.set_node_attributes(g, 'name', name_mapping)
        nx.set_node_attributes(g, 'file', file_mapping)
        nx.set_node_attributes(g, 'type', type_mapping)
        nx.set_node_attributes(g, 'children', children_mapping)
        nx.set_node_attributes(g, 'level', level_mapping)
#        nx.set_node_attributes(g, 'is_render', render_mapping)
        
        capacity_mapping = self.calculate_flows(g)
        nx.set_edge_attributes(g, 'weight', capacity_mapping)

        return g

    def check_cycles(self, g):
        log.warn("Flow hierarchy: {0}".format(nx.flow_hierarchy(g)))
        self.is_tree = nx.is_tree(g)
        log.warn("Is it a tree? : {0}".format(self.is_tree))

        if not self.is_tree:
            log.info("Removing the cycles from graph.....")
            cycles = nx.find_cycle(g, self.root)
            for cycle in cycles:
                log.warn("Removing cycles: {0} -> {1}".format(cycle[0], cycle[1]))
                g.remove_edge(*cycle)
        return g
    
    def create_subtrees(self, g):
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
        if len(neighbors)!=0:
            for neighbor in neighbors:
                self.hierarchy_level(G, neighbor, level=level, parent = root)
        return level

    def leaves_below(self, graph, node):
        return set(sum(([vv for vv in v if graph.out_degree(vv) == 0]
                    for k, v in nx.dfs_successors(graph, node).items()), []))

    def immediate_children(self, graph):
        ret = {}
        parentChildMap = nx.dfs_successors(graph, self.root)
        nodes = graph.nodes()
        for node in nodes:
            if node in parentChildMap.keys():
                ret[node] =  parentChildMap[node]
        return ret

    def calculate_flows(self, graph):
        ret = {}
        edges = graph.edges()
        for edge in edges:
            source = utils.lookupByName(self.df, edge[0])
            target = utils.lookupByName(self.df, edge[1])

            source_inc = source['CPUTIME (usec) (E)'].max()
            target_inc = target['CPUTIME (usec) (E)'].max()
            
            if source_inc == target_inc:
                ret[edge] = source_inc
            else:
                ret[edge] = source_inc - target_inc
        return ret
            
    
    def create_super_graph(self, graph, query):
        g = {}
        return g

    def create_module_map(self, nodes, attribute):
        ret = {}
        for node in nodes:
            if attribute == 'CPUTIME (usec) (I)':
                ret[node] =  self.df[self.df['name'] == node][attribute].max().tolist()
            else:
                ret[node] =  list(set(self.df[self.df['name'] == node][attribute].tolist()))            
#            ret[node] = utils.lookupByAttribute(self.gf.dataframe, node, attribute)
        return ret
    
    def convert_graph(self, graph):
        return json_graph.node_link_data(self.g)
        
    def getCFG(self):
        return self.cfg

    def getRootRunTimeInc(self):
        root = self.graph.roots[0]
        root_metrics = utils.lookup(self.df, root)
        return root_metrics['CPUTIME (usec) (E)'].max()

    # Input : [<GraphFrame>, <GraphFrame>,...]
    # Output: { graphs: [{ nodes: [], edges: [] }, ...] } 
    def run(self, gfs):
        ret = {}
        graphID = 0
        for gf in gfs:
            nodes = self.construct_nodes(gf)
            self.graphs.append({
                "load_modules": gf.tables.load_modules,
                "src_files": gf.tables.src_files,
                "procedure_names": gf.tables.procedure_names,
                "metric_names": gf.tables.metric_names,
                "nodes": nodes
            })
        ret = { "graphs" : self.graphs }
        return ret

    # get metrics for a dataframe grouped object
    def metrics(self, df):
        metrics = {}
        metric_list = ['CPUTIME (usec) (E)', 'CPUTIME (usec) (I)', 'file', 'line', 'type', 'name']
        for metric in metric_list:
            metrics[metric] = []
        for metric in metric_list:
            for procs in range(0, len(df[['name']])):
                metrics[metric].append(df[metric][procs])
        return metrics
   
    # depth first search for  the graph.
    # TODO: add level to the node attribs
    # Check if the node is in the filtered_df and it has a module name 
    # TODO : Check if root.module == "None"
    def dfs(self, gf):
        graph = pd.DataFrame(dict(source=[], target=[], metrics=[]))
        root = gf.graph.roots[0]
        node_gen = gf.graph.roots[0].traverse()
        df = gf.dataframe
        try:
            while root != None:
                root = next(node_gen)                
                target_metrics = utils.lookup(df, root)
                source_metrics = utils.lookup(df, root.parent)
                if not target_metrics.empty and not source_metrics.empty:
                    temp = pd.DataFrame(dict(source =[root.parent], target =[root], source_metrics=[source_metrics], target_metrics= [target_metrics]))                    
                    graph = pd.concat([graph, temp])
        except StopIteration:
            pass
        finally:
            del root
        return graph

