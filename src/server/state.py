class State(object):
    def __init__(self, gf):
        self.df = gf.dataframe
        self.graph = gf.graph
        self.root = None
        self.node_hash = self.add_node_hash()

    def add_node_hash(self):
        ret = {}
        for idx, row in self.df.iterrows():
            df_node_index = str(row.node.df_index)
            ret[df_node_index] = row.node
        return ret
    
    def lookup_by_column(self, _hash, col_name):
        ret = []
        node_df = self.df.loc[self.df['node'] == self.node_hash[str(_hash)]]
        node_df_T = node_df.T.squeeze()
        node_df_T_attr = node_df_T.loc[col_name]
        if node_df_T_attr is not None:
            if type(node_df_T_attr) is str or type(node_df_T_attr) is float:
                ret.append(node_df_T_attr)
            else:
                ret = node_df_T_attr.tolist()
        return ret
        
    def lookup(self, _hash):
        return self.df.loc[self.df['node'] == self.node_hash[str(_hash)]]

    def lookup_with_node(self, node):
        return self.df.loc[self.df['node'] == node]

    def lookup_with_nodeName(self, name):
        return self.df.loc[self.df['name'] == name]

    def lookup_with_vis_nodeName(self, name):
        return self.df.loc[self.df['vis_node_name'] == name]

    def update_df(self, col_name, mapping):
        self.df[col_name] = self.df['node'].apply(lambda node: mapping[node] if node in mapping.keys() else '')

    def grouped_df(self, attr):
        self.gdf[attr] = self.df.groupby(attr, as_index=True, squeeze=True)  
        self.gdfKeys= self.gdf[attr].groups.keys()
