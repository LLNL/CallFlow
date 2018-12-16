#!/usr/bin/env python3

from functools import total_ordering
from utils import lookup

#@total_ordering
class CCT:
    # depth first search for  the graph.
    # TODO: add level to the node attribs
    def dfs(self, gf, df):
        nodes = []
        root = gf.graph.roots[0]
        node_gen = gf.graph.roots[0].traverse()
        try:
            while root != None:
                if root == None:
                    break
                root = next(node_gen)
                metrics = lookup(df, root)
                # Check if the node is in the filtered_df and it has a module name 
                # TODO : Check if root.module == "None"
                if not metrics.empty:
                    nodes.append({ "source": root.parent, "target": root })
        except StopIteration:
            pass
        finally:
            del root
        return nodes
