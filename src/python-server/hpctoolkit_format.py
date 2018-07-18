from hatchet import *
import math
import sys
import time
import CCT

debug = True

class hpctoolkit_preprocess(object):
    def __init__(self, gfs, filter=False, filterBy="IncTime"):
        self.graphs = []
        self.run(gfs)
        
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

    # Input : ./xxx/xxx/yyy
    # Output: yyy
    def sanitizeName(self, name):
        if name == None:
            return None
        name_split = name.split('/')
        return name_split[len(name_split) - 1]  

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

    # Lookup by the node hash
    def lookup(self, df, node_hash):
        return df.loc[df['node'] == node_hash] 
    
    # depth first search for  the graph.
    # TODO: add level to the node attribs
    def dfs(self, gf, df):
        nodes = []
        root = gf.graph.roots[0]
        node_gen = gf.graph.roots[0].traverse()
        try:
            while root != None:
                root = next(node_gen)
                metrics = self.lookup(df, root)
                # Check if the node is in the filtered_df and it has a module name 
                # TODO : Check if root.module == "None"
                if not metrics.empty:
                    nodes.append({ "source": root.parent, "target": root })
        except StopIteration:
            pass
        finally:
            del root
        return nodes

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
