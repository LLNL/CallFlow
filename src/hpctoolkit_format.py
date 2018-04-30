from hatchet import *

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
            print gf.graph.to_string(gf.graph.roots, gf.dataframe, threshold=0.0)
            level = self.assign_levels(gf)
            nodes = self.construct_nodes(gf, level)
            edges = self.construct_edges(gf, level)
            self.graphs.append({ "nodes": nodes, "edges": edges, "graphID": graphID })
            graphID += 1
        ret = { "graphs" : self.graphs }
        return ret

    # Input : ./xxx/xxx/yyy
    # Output: yyy
    def sanitizeName(self, name):
        if name == None:
            return None
        name_split = name.split('/')
        return name_split[len(name_split) - 1]  

    
    def construct_nodes(self, gf, level):
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
            if current in ret.keys():
                ret[current] = ret[current]
            else:
                ret[current] = ret[parent] + 1
                
            if node not in visited:
                visited.add(node)
                queue.extend(node.children)
        return ret


    def construct_edges(self, gf, level):
        # Not sure why there is a need to initialize gf again 
        gf = GraphFrame()
        gf.from_hpctoolkit('../data/calc-pi')
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
