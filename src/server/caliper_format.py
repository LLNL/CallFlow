from hatchet import *

class caliper_callflow_format(object):
    
    def __init__(self):
        self.graphs = []

    def run(self, gfs):
        ret = {}
        for gf in gfs:
            level = self.assign_levels(gf)
            # graphID = 0
        # for gf in gfs:
        #     print gf.graph.to_string(gf.graph.roots, gf.dataframe, threshold=0.0)
        #     level = self.assign_levels(gf)
        #     nodes = self.construct_nodes(gf, level)
        #     edges = self.construct_edges(gf, level)
        #     self.graphs.append({ "nodes": nodes, "edges": edges, "graphID": graphID })
        #     graphID += 1
        # ret = { "graphs" : self.graphs }
        return ret

    def assign_levels(self, gf):
        ret = {}
        ret['<program root>'] = 0
        visited, queue = set(), gf.graph.roots
        while queue:
            node = queue.pop(0)
#            print node.parent
            # Not the right way
            # current = self.sanitizeName(node.module)
            # parent = self.sanitizeName(node.parentModule)
            # if current in ret.keys():
            #     ret[current] = ret[current]
            # else:
            #     ret[current] = ret[parent] + 1

            
            if node not in visited:
                visited.add(node)
                queue.extend(node.children)
        return ret

        return {}
        
    def construct_nodes(self, gf, level):
        return {}
        
    def construct_edges(self, gf, level):
        return {}
