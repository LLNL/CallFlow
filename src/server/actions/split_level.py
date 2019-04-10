import pandas as pd


class splitLevel:
    def __init__(self, state, attr):
        self.graph = state.graph
        self.df = state.df
        # self.df_index = df_index
        self.module = attr['module']
        self.level = attr['level']
        self.run(state)
        
    def run(self, state):    
        ret = {}
        nodes = self.df.loc[self.df['module'] == self.module]
        callees = nodes['callees']
        component_nodes = nodes.loc[nodes['component_level'] == float(self.level)]
        for idx, name in enumerate(component_nodes['name'].unique()):
            print(name)
            df = self.df[self.df['name'] == name]
            pd.options.mode.chained_assignment = None
            df['vis_node_name'] = self.module + ':' + str(name)

        root = self.graph.roots[0]
        node_gen = self.graph.roots[0].traverse()



        try:
            while root.callpath != None:
                root = next(node_gen)    
                t = state.lookup_with_node(root)
                s = state.lookup_with_node(root.parent)

                if t.empty or s.empty:
                    continue

                snode = s.node.tolist()[0]
                tnode = t.node.tolist()[0]

                spath = s.path.tolist()[0]
                tpath = t.path.tolist()[0]

                print(snode, tnode)
                #print(spath, tpath)

        except StopIteration:
            pass
        finally:
            del root