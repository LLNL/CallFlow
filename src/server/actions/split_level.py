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
        