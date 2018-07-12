from hatchet import *
import math
import sys

debug = True

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
                    nodes.append(root)
        except StopIteration:
            pass
        finally:
            del root
        print nodes
        return nodes

    # Get the inclusive runtime of the root
    def getRunTime(self, gf):
        root_metrics = self.lookup(gf.dataframe, gf.graph.roots[0])
        return root_metrics[['CPUTIME (usec) (I)']].max()[0]

    # TODO: Move to a new file if we need to filter by more attributes
    def filterNodesByIncTime(self, gf):
        max_inclusive_time =  self.getRunTime(gf)
        filter_df = gf.dataframe[(gf.dataframe['CPUTIME (usec) (I)'] > 0.01*max_inclusive_time)]
        if debug:
            print '[Filter] Removed {0} nodes by threshold {1}'.format(gf.dataframe.shape[0] - filter_df.shape[0], max_inclusive_time)
        return filter_df

    # create new data frame from the nodes
    def createdf(self, nodes):
        df = 
        return df

    # Construct the nodes for the graph.
    def construct_nodes(self, gf):
        nodes_map = {}
        num_pes = 3
        nodes = []

        # Filter the dataframe. Should I filter the graph or just check if it is in the frame. 
        filter_df = self.filterNodesByIncTime(gf)

        nodes = self.dfs(gf, filter_df)

        # group the frame by the module and name
        # grouped_df = filter_df.groupby(['module','name'])

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
        #     print len(nodes_map[node_key]["fns"])
            
            
        #     for key, item in nodes_map.iteritems():
        #         nodes.append({
        #             'module': key,
        #             'props': item
        #         })
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
