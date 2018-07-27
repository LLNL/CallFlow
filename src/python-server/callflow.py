from hatchet import *
import math
import sys
import time
from collections import defaultdict
import networkx as nx
from collections import deque
import utils
import matplotlib.pyplot as plt

class Node:
    def __init__(self, node_type):
        self.node_type = node_type
        self.split = NO_SPLIT
        self.index_in_root = -1
        self.comp_num = -1
        self.is_separated = False

class callflow:
    def __init__(self, gf):
        self.gf = gf
        self.graph = defaultdict(list)        
        self.g = self.create_graph()
        mapping = {}
        self.sg = self.create_super_graph(self.g, mapping)
        #        self.run(gfs)

    # TODO : make a NX graph by the callpath. Much easier on Computation. No need to dfs. 
    def create_graph(self):
        print self.gf.dataframe.loc[self.gf.dataframe['node'] == self.gf.graph.roots[0]]['node'][0].callpath
        self.gf.dataframe['path'] =  self.gf.dataframe['node'].apply(lambda node: node.callpath)
        print self.gf.dataframe['path']
        graph = self.dfs(self.gf)
        print len(graph)
        g = nx.from_pandas_dataframe(graph, source='source', target='target') 
        module_mapping = self.create_module_map(g.nodes(), 'module')
        name_mapping = self.create_module_map(g.nodes(), 'name')
        file_mapping = self.create_module_map(g.nodes(), 'file')
        type_mapping = self.create_module_map(g.nodes(), 'type')
        nx.set_node_attributes(g, 'module', module_mapping)
        nx.set_node_attributes(g, 'name', name_mapping)
        nx.set_node_attributes(g, 'file', file_mapping)
        nx.set_node_attributes(g, 'type', type_mapping)
        print g
        return g

    def create_super_graph(self, g, mapping):
        g = {}
        return g

    def create_module_map(self, nodes, attribute):
        ret = {}
        for node in nodes:
            ret[node] = utils.lookupByAttribute(self.gf.dataframe, node, attribute)
        return ret
        
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
            print df[['name']]
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

    # create new data frame from the nodes
    def createdf(self, nodes):
        df = None
        return df

    def getNodes(self, graph):
        ret = []
        print graph

    def getEdges(self, graph):
        ret = []

    # Construct the nodes for the graph.
    def construct_nodes(self, gf):
        nodes_map = {}
        ret = []

        t = time.time()
        # List of nodes of interest
        graph = self.dfs(gf, filter_df)
        if debug:
            print time.time() - t


        nodesInGraph = getNodes(graph)
        edgesInGraph = getEdges(graph)
        
        # Convert the nodes into a dataframe.
        node_metrics = []
        for node in nodes:
            node_metrics.append(self.lookup(filter_df , node['target']))
        node_metrics_df = pd.concat(node_metrics)

        # # group the frame by the module and name        
        # grouped_df = node_metrics_df.groupby(['module', 'name'])
            
        # # Structure creation
        # for key, item in grouped_df:
        #     if debug:
        #         print 'Module name: {0}, function: {1}'.format(key[0], key[1])
        #     node_key = key[0]
        #     nodes_map[node_key] = {}
        #     nodes_map[node_key]["fns"] = []


        # for key, item in grouped_df:
        #     print "Shape:", item.shape
        #     node_key = key[0]
        #     metrics_pes = []
        #     for rank_keys, rank_items in item.groupby(['rank']):
        #         metrics_pes.append(self.metrics(rank_items))
                    
        #     nodes_map[node_key]["fns"].append({ 
        #         "fn_name": key[1], 
        #         "metrics": metrics_pes
        #     })
        # print nodes_map
            
            
        # for key, item in nodes_map.iteritems():
        #     print item
        #     ret.append({
        #         'module': key,
        #         'props': item
        #     })
        return ret
    

    def assign_levels(self, gf):
        ret = {}
        ret['<program root>'] = 0
        visited, queue = set(), gf.graph.roots
        while queue:
            node = queue.pop(0)
            # Not the right way
            current = self.sanitizeName(node.module)
            parent = self.sanitizeName(node.parentModule)
            if current not in ret.keys():
                ret[current] = ret[parent] + 1
                
            if node not in visited:
                visited.add(node)
                queue.extend(node.children)
        return ret

    def construct_edges(self, gf, level):
        # Not sure why there is a need to initialize gf again 
        gf = GraphFrame()
        gf.from_hpctoolkit('/Users/kesavan1/Suraj/llnl/CallFlow/data/calc-pi/')
        ret = []
        edges = []
        edgeMap = {}
        count = 0 
        v, q = set(), gf.graph.roots
        while q:
            node = q.pop(0)
            
            source = node.parentModule
            target = node.module
            
            source = self.sanitizeName(source)
            target = self.sanitizeName(target)

            if source != None and target != None and level[source] != level[target]:
                edgeLabel = source + '-' + target 
                edge = {}
                edge['sourceInfo'] = {
                    'level' : level[source],
                    'label': self.label[source],
                    'name': source
                }
                edge['sourceID'] = self.sankeyIDMap[source]
                edge['targetInfo'] = {
                    'level': level[target],
                    'label': self.label[target],
                    'name': target
                }
                edge['targetID'] = self.sankeyIDMap[target]
                edge['value'] = self.runtime[source]
                edgeMap[edgeLabel] = count
                edges.append(edge)
                count += 1
          
            if node.module not in ret:
                ret.append(node.module)

            if node not in v:
                v.add(node)
                q.extend(node.children)
        return edges
