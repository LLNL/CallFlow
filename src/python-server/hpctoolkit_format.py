from hatchet import *
import math
import sys

class hpctoolkit_format(object):
    def __init__(self):
        self.runtime = {}
        self.label = {}
        self.sankeyIDMap = {}
        self.graphs = []

    # Input : [<GraphFrame>, <GraphFrame>,...]
    # Output: { graphs: [{ nodes: [], edges: [] }, ...] } 
    def run(self, gfs):
        ret = {}
        graphID = 0
        for gf in gfs:
            #            level = self.assign_levels(gf)
            nodes = self.construct_nodes(gf)
            #            edges = self.construct_edges(gf, level)
            self.graphs.append({ "nodes": nodes })
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
        for metric in metric_list:
            for procs in range(0, len(df[['name']])):
                metrics[metric].append(df[metric][procs])
        return metrics

    # Lookup by the node hash
    def lookup(self, gf, node_hash):
        df = gf.dataframe
        return df.loc[df['node'] == node_hash]

    # depth first search of the graph. 
    def dfs(self, gf):
        root = gf.graph.roots[0]
        node_gen = gf.graph.roots[0].traverse()
        while root != None:
            root = next(node_gen)
            print root, node_lookup(gf, root)

    # Get the inclusive runtime of the root
    # Sum of the inclusive times of all the ranks or the max??
    def getRunTime(self, gf):
        root_metrics = self.lookup(gf, gf.graph.roots[0])
        return root_metrics[['CPUTIME (usec) (I)']].max()[0]

    # TODO: Filter the dataframe to reduce the amount of nodes we parse through
    def filterNodes(self, gf):
        max_inclusive_time =  self.getRunTime(gf)

        filter_df = gf.dataframe.groupby(['module','name'])                
        print len(filter_df.groups)
        filter_df.filter(lambda x:  x[['CPUTIME (usec) (E)']].max()[0]/num_pes > 0.1*max_inclusive_time)
        print len(name_df.groups)

        return filter_df

    # Construct the nodes for the graph.
    def construct_nodes(self, gf):
        name_df = gf.dataframe.groupby(['module','name'])
        nodes_map = {}
        num_pes = 100

        nodes = []
        max_inclusive_time =  self.getRunTime(gf)        

        # Structure creation
        for key, item in name_df:
            node_key = key[0]
            nodes_map[node_key] = {}
            nodes_map[node_key]["fns"] = []

        for key, item in name_df:
            if item[['CPUTIME (usec) (I)']].sum()[0]/num_pes > 0.01*max_inclusive_time:
                print "Shape:", item.shape
                print key
                node_key = key[0]
                metrics_pes = []
                for rank_keys, rank_items in item.groupby(['rank']):
                    metrics_pes.append(self.metrics(rank_items))
                    
                nodes_map[node_key]["fns"].append({ 
                    "fn_name": key[1], 
                    "metrics": metrics_pes
                })
                print len(nodes_map[node_key]["fns"])

                
                for key, item in nodes_map.iteritems():
                    nodes.append({
                        'module': key,
                        'props': item
                    })
            else:
                print 'Omitting node for less time', key, item[['CPUTIME (usec) (E)']].sum()[0]
        return nodes
    
    def construdct_nodes(self, gf, level):
        ret = []
        sankeyID = 1
        module_df = gf.dataframe.groupby('module')
        
        self.runtime['<program root>'] = 2998852.0
        self.label['<program root>'] = 'LM0'
        self.sankeyIDMap['<program root>'] = 0
        ret.append({ 'exc': 0.0, 'inc': 2998852.0, 'name': "<program root>", 'sankeyID': 1, 'lmID': 'LM0', 'level': 0 })
        nodeCount = 1;

        for key, item in module_df:
            node = {}
            node['inc'] = module_df[['CPUTIME (usec) (I)']].get_group(key).sum()[0]
            node['exc'] = module_df[['CPUTIME (usec) (E)']].get_group(key).sum()[0]
            node['name'] = self.sanitizeName(key)
            node['level'] = level[self.sanitizeName(key)]
            node['lmID'] = 'LM' + str(nodeCount)
            node['sankeyID'] = sankeyID
            self.runtime[self.sanitizeName(key)] = module_df[['CPUTIME (usec) (E)']].get_group(key).sum()[0]    
            self.label[self.sanitizeName(key)] = 'LM' + str(nodeCount)
            self.sankeyIDMap[self.sanitizeName(key)] = sankeyID
            sankeyID = sankeyID + 1
            nodeCount += 1
            ret.append(node)
            # label[''] = 'LM' + str(nodeCount)
            # sankeyIDMap[''] = nodeCount
            # ret.append({'exc': 0.0, 'inc': 0.0, 'name': '', 'sankeyID': sankeyID, 'lmID': label[''], 'level': 6 })

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
