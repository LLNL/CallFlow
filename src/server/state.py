from logger import log
import os
from hatchet import *

class State(object):
    # TODO: Assign self.g, self.root... 
    def __init__(self):
        self.g = None
        self.roots = None
        self.gf = None
        self.df = None
        self.graph = None
        self.map = None
        
    def node_hash_mapper(self):
        ret = {}
        for idx, row in self.df.iterrows():
            df_node_index = str(row.nid)
            ret[df_node_index] = row.node
        self.node_hash_map = ret
        return ret
    
    def lookup_by_column(self, _hash, col_name):
        ret = []
        node_df = self.df.loc[self.df['node'] == self.map[str(_hash)]]
        node_df_T = node_df.T.squeeze()
        node_df_T_attr = node_df_T.loc[col_name]
        if node_df_T_attr is not None:
            if type(node_df_T_attr) is str or type(node_df_T_attr) is float:
                ret.append(node_df_T_attr)
            else:
                ret = node_df_T_attr.tolist()
        return ret
        
    def lookup(self, _hash):
        return self.df.loc[self.df['node'] == self.node_hash_map[str(_hash)]]

    def lookup_with_node(self, node):
        # print(type(self.df['node'][0]))
        # print(self.df.loc[self.df['node'] == node]) 
        return self.df.loc[self.df['node'] == node]

    def lookup_with_nodeName(self, name):
        return self.df.loc[self.df['name'] == name]

    def lookup_with_vis_nodeName(self, name):
        return self.df.loc[self.df['vis_node_name'] == name]

    def update_df(self, col_name, mapping):
        self.df[col_name] = self.df['node'].apply(lambda node: mapping[node] if node in mapping.keys() else '')
        self.df = self.df

    def lookup_with_df_index(self, df_index):
        return self.df.loc[self.df['df_index'] == df_index]
    
    def grouped_df(self, attr):
        self.gdf[attr] = self.df.groupby(attr, as_index=True, squeeze=True)  
        self.gdfKeys= self.gdf[attr].groups.keys()
